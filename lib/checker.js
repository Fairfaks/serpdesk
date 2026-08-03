'use strict';
// Прогон проверки: пул воркеров по фразам, постраничный съём с ранней остановкой —
// как только домен найден, глубже не листаем (каждая страница = оплаченный запрос).

const { fetchSerpPage, makeDomainMatcher, XmlRiverError } = require('./xmlriver');

const PER_PAGE = 10;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function estimateVisualPosition(organicPosition, features) {
  if (!organicPosition || !Array.isArray(features) || !features.length) return organicPosition || 0;
  let offset = 0;
  for (const feature of features) {
    if (!feature || feature.side || ['ads_bottom', 'ads_right', 'knowledge_graph'].includes(feature.type)) continue;
    if (feature.type === 'ads_top') {
      offset += Math.max(1, Number(feature.count) || 1);
      continue;
    }
    if (feature.position === null || feature.position === undefined || feature.position === '') continue;
    const position = Number(feature.position);
    if (!Number.isFinite(position) || position >= organicPosition) continue;
    offset++;
  }
  return organicPosition + offset;
}

class Cancelled extends Error {
  constructor() { super('Проверка отменена'); this.name = 'Cancelled'; }
}

class FatalRunError extends Error {
  constructor(message) { super(message); this.name = 'FatalRunError'; }
}

class CheckRunner {
  /**
   * opts: { creds:{user,key}, cfg, depth, concurrency, domain, subdomains,
   *         keywords:[{id,phrase}], onProgress(engine, info), onResult(engine, kwId, res) }
   */
  constructor(opts) {
    this.o = opts;
    this.cancelled = false;
    this.match = makeDomainMatcher(opts.domain, !!opts.subdomains);
    // Конкуренты: [{domain, match}] — их позиции снимаем из той же выдачи.
    this.competitors = (opts.competitors || []).map((d) => ({ domain: d, match: makeDomainMatcher(d, true) }));
    this.requestsMade = 0;
  }

  cancel() { this.cancelled = true; }

  // Яндекс через Search API отдаёт до 100 позиций одним запросом; остальное — по 10.
  pageSize(engine) {
    if (engine === 'yandex' && this.o.cfg.yandexSource === 'api') {
      return Math.min(Math.max(this.o.depth || 30, 10), 100);
    }
    return PER_PAGE;
  }

  async runEngine(engine) {
    const kws = this.o.keywords;
    const conc = Math.max(1, Math.min(10, this.o.concurrency || 3));
    let next = 0;
    let done = 0;
    let fatal = null;

    const worker = async () => {
      while (!this.cancelled && !fatal) {
        const idx = next++;
        if (idx >= kws.length) return;
        const kw = kws[idx];
        let res;
        try {
          res = await this.checkKeyword(engine, kw.phrase);
        } catch (e) {
          if (e instanceof Cancelled) return;
          if (e instanceof FatalRunError) { fatal = e; return; }
          res = { position: null, url: null, error: e.message };
        }
        done++;
        this.o.onResult(engine, kw.id, res);
        this.o.onProgress(engine, { done, total: kws.length, phrase: kw.phrase, position: res.position });
      }
    };

    await Promise.all(Array.from({ length: Math.min(conc, kws.length) }, worker));
    if (fatal) throw fatal;
    if (this.cancelled) throw new Cancelled();
  }

  async checkKeyword(engine, phrase) {
    const depth = this.o.depth || 30;
    const maxPages = Math.ceil(depth / this.pageSize(engine));
    const withComp = this.competitors.length > 0;
    let organicPos = 0;
    let mine = null;
    const serpFeatures = [];
    const comp = {}; // domain → position (первое вхождение)
    for (let pi = 0; pi < maxPages; pi++) {
      if (this.cancelled) throw new Cancelled();
      // Первая страница: Яндекс = 0, Google = 1; для первой параметр не передаём.
      const page = pi === 0 ? null : (engine === 'google' ? pi + 1 : pi);
      const { docs, features = [], end } = await this.fetchWithRetry(engine, phrase, page);
      if (engine === 'yandex' && this.o.cfg.serpFeaturesBeta) {
        const pageOffset = pi * this.pageSize(engine);
        for (const feature of features) {
          serpFeatures.push({
            ...feature,
            position: feature.position == null ? null : Number(feature.position) + pageOffset,
          });
        }
      }
      for (const d of docs) {
        organicPos++;
        if (!mine && this.match(d.url)) mine = { position: organicPos, url: d.url };
        if (withComp) {
          for (const c of this.competitors) {
            if (comp[c.domain] === undefined && c.match(d.url)) comp[c.domain] = organicPos;
          }
        }
        if (organicPos >= depth) break;
      }
      // Без конкурентов — ранняя остановка (нашли свой домен). С конкурентами
      // листаем до глубины, чтобы найти и их (это выбор пользователя, стоит дороже).
      if (!withComp && mine) break;
      if (end || organicPos >= depth) break;
    }
    const competitors = withComp
      ? this.competitors.reduce((a, c) => { a[c.domain] = comp[c.domain] || 0; return a; }, {})
      : null;
    const beta = engine === 'yandex' && this.o.cfg.serpFeaturesBeta;
    if (mine) return {
      position: mine.position,
      visualPosition: beta ? estimateVisualPosition(mine.position, serpFeatures) : null,
      serpFeatures: beta ? serpFeatures : null,
      url: mine.url,
      error: null,
      competitors,
    };
    return { position: 0, visualPosition: beta ? 0 : null, serpFeatures: beta ? serpFeatures : null, url: null, error: null, competitors };
  }

  async fetchWithRetry(engine, phrase, page) {
    let attempt = 0;
    for (;;) {
      if (this.cancelled) throw new Cancelled();
      try {
        const r = await fetchSerpPage(engine, this.o.creds, this.o.cfg, phrase, page);
        this.requestsMade++;
        return r;
      } catch (e) {
        if (e instanceof XmlRiverError) {
          if (e.fatal) throw new FatalRunError(e.message);
          if (e.phraseLevel) throw e;
          if (e.retryable) {
            attempt++;
            if (attempt > 6) throw new FatalRunError(`${e.message} — каналы не освободились за 6 попыток`);
            await sleep(Math.min(2000 * attempt, 8000));
            continue;
          }
          // Неклассифицированные коды («Выполните перезапрос» и т.п.) — временные
          // сбои на стороне поисковика: повторяем, потом пишем ошибку по фразе.
          attempt++;
          if (attempt > 3) throw e;
          await sleep(1500 * attempt);
          continue;
        }
        // Сетевые сбои/таймауты — пара повторов.
        attempt++;
        if (attempt > 3) throw e;
        await sleep(1500 * attempt);
      }
    }
  }
}

module.exports = { CheckRunner, Cancelled, FatalRunError, estimateVisualPosition };
