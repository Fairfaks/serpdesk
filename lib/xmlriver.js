'use strict';
// Клиент XMLRiver API: Google (/search/xml), Яндекс (/search_yandex/xml), сервисные методы.
// Формат ответа обоих движков — Яндекс.XML-подобный:
// <yandexsearch><response><results><grouping><group><doc><url>…
// Ошибки: <response><error code="NN">текст</error>. С сентября 2025 глубина всегда 10
// результатов на страницу, топ-N собирается пагинацией (page: Google с 1, Яндекс с 0).

const { XMLParser } = require('fast-xml-parser');

const BASE = 'https://xmlriver.com';
const REQUEST_TIMEOUT_MS = 90000;

// Коды, при которых продолжать проверку бессмысленно — останавливаем весь прогон
// (доступы/бан/деньги + ошибки параметров проекта 102–108: они одинаковы для всех фраз).
const FATAL_CODES = new Set([31, 42, 45, 115, 200, 201, 102, 103, 104, 105, 106, 107, 108]);
// Коды, означающие временную занятость каналов — ретраим с паузой.
const RETRY_CODES = new Set([101, 110, 111]);
// Коды ошибок конкретной фразы — пишем ошибку по фразе, прогон продолжается.
const PHRASE_CODES = new Set([2, 16, 120]);

const ERROR_TEXT = {
  2: 'Пустой поисковый запрос',
  15: 'Нет результатов поиска',
  16: 'Слишком длинный запрос',
  31: 'Пользователь не зарегистрирован (проверьте user id)',
  42: 'Неверный ключ API',
  45: 'Сбор с вашего IP запрещён (настройки доступа по IP в кабинете XMLRiver)',
  101: 'Сервис XMLRiver на обновлении',
  102: 'Неверный параметр groupby',
  103: 'Неверный параметр lr',
  104: 'Неверный параметр loc',
  105: 'Неверный параметр country',
  106: 'Неверный параметр domain',
  107: 'По Яндексу доступен только ТОП-10 на страницу',
  110: 'Заняты все доступные каналы сбора',
  111: 'Нет свободных каналов сбора',
  115: 'Слишком много параллельных запросов — XMLRiver заблокировал сбор на 10 минут',
  120: 'Недопустимые символы или операторы в запросе',
  200: 'На счету XMLRiver закончились деньги',
  201: 'Приём запросов приостановлен сервисом',
};

class XmlRiverError extends Error {
  constructor(code, message) {
    super(message || ERROR_TEXT[code] || `Ошибка XMLRiver (код ${code})`);
    this.name = 'XmlRiverError';
    this.code = code;
    this.fatal = FATAL_CODES.has(code);
    this.retryable = RETRY_CODES.has(code);
    this.phraseLevel = PHRASE_CODES.has(code);
  }
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => name === 'group' || name === 'doc',
  parseTagValue: false,
  trimValues: true,
});

function buildSearchUrl(engine, creds, cfg, query, page) {
  // Яндекс имеет два источника: 'live' — парсинг реальной выдачи (10 позиций на запрос),
  // 'api' — Yandex Search API v1-совместимый /yandex/xml (до 100 позиций одним запросом).
  const yandexApi = engine === 'yandex' && cfg.yandexSource === 'api';
  const path = engine === 'google' ? '/search/xml' : (yandexApi ? '/yandex/xml' : '/search_yandex/xml');
  const u = new URL(path, BASE);
  u.searchParams.set('user', String(creds.user).trim());
  u.searchParams.set('key', String(creds.key).trim());
  u.searchParams.set('query', query);
  // Первая страница: Яндекс = 0, Google = 1; для первой параметр не передаём.
  if (page !== null && page !== undefined) u.searchParams.set('page', String(page));
  if (engine === 'yandex') {
    if (yandexApi) {
      const n = Math.min(Math.max(Number(cfg.apiDepth) || 100, 10), 100);
      u.searchParams.set('groupby', `attr=d.mode=deep.groups-on-page=${n}.docs-in-group=1`);
    }
    if (cfg.lr) u.searchParams.set('lr', String(cfg.lr));
    if (!yandexApi && cfg.yandexDomain) u.searchParams.set('domain', cfg.yandexDomain);
    if (!yandexApi && cfg.lang) u.searchParams.set('lang', cfg.lang);
    if (!yandexApi && cfg.serpFeaturesBeta) {
      u.searchParams.set('additional', [
        'y_topads', 'y_bottomads', 'y_rightads', 'searchsters', 'searchsters_side',
        'scroller', 'knowledge_graph_y', 'y_of', 'y_news',
      ].join(','));
    }
  } else {
    if (cfg.loc) u.searchParams.set('loc', String(cfg.loc));
    if (cfg.country) u.searchParams.set('country', String(cfg.country));
    if (cfg.googleLang) u.searchParams.set('lr', cfg.googleLang);
    if (cfg.googleDomainId) u.searchParams.set('domain', String(cfg.googleDomainId));
  }
  if (cfg.device && cfg.device !== 'desktop') u.searchParams.set('device', cfg.device);
  return u.toString();
}

async function httpGetText(url) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ac.signal });
    const text = await res.text();
    if (res.status === 429) throw new XmlRiverError(115);
    if (!res.ok && !text) throw new Error(`HTTP ${res.status}`);
    return text;
  } finally {
    clearTimeout(t);
  }
}

const asArray = (value) => value == null ? [] : (Array.isArray(value) ? value : [value]);

function parseSerpFeatures(resp) {
  const features = [];
  const add = (type, options = {}) => {
    features.push({
      type,
      name: options.name || null,
      position: Number.isFinite(Number(options.position)) ? Number(options.position) : null,
      count: Math.max(1, Number(options.count) || 1),
      side: Boolean(options.side),
    });
  };
  const queries = (name) => asArray(resp[name]?.query);
  const topAds = queries('topads');
  const bottomAds = queries('bottomads');
  const rightAds = queries('rightads');
  if (topAds.length || Number(resp.advcount) > 0) add('ads_top', { position: 0, count: topAds.length || Number(resp.advcount) });
  if (bottomAds.length) add('ads_bottom', { count: bottomAds.length });
  if (rightAds.length) add('ads_right', { count: rightAds.length, side: true });

  for (const item of asArray(resp.searchsters?.item)) {
    if (item && typeof item === 'object') add('searchster', { name: String(item.name || 'wizard'), position: item.position });
  }
  for (const item of asArray(resp.searchsters_side?.item)) {
    if (item && typeof item === 'object') add('searchster', { name: String(item.name || 'wizard'), position: item.position, side: true });
  }
  if (resp.scroller) add('scroller', { count: asArray(resp.scroller.item).length || 1 });
  if (resp.entityOffers) add('offers', { count: asArray(resp.entityOffers.item).length || 1 });
  if (resp.news) {
    const items = asArray(resp.news.item);
    add('news', { position: items[0]?.position, count: items.length || 1 });
  }
  if (resp.knowledge_graph) add('knowledge_graph', { side: true });
  for (const item of asArray(resp.ai?.item || (resp.ai ? {} : null))) {
    add('ai', { position: item?.position, side: String(item?.type || '').toLowerCase() === 'right' });
  }
  return features;
}

// Разбор XML выдачи → { docs: [{url,title}], features, end: boolean }
// end=true — выдача закончилась (нет результатов / код 15).
function parseSerpXml(xmlText) {
  let j;
  try {
    j = parser.parse(xmlText);
  } catch {
    throw new Error('Некорректный XML в ответе XMLRiver');
  }
  const resp = j && j.yandexsearch && j.yandexsearch.response;
  if (!resp) throw new Error('Неожиданный формат ответа XMLRiver');

  if (resp.error !== undefined && resp.error !== null) {
    const isObj = typeof resp.error === 'object';
    const code = Number(isObj ? resp.error['@_code'] : NaN) || 0;
    const text = isObj ? String(resp.error['#text'] || '') : String(resp.error);
    if (code === 15) return { docs: [], features: [], end: true };
    throw new XmlRiverError(code, text || undefined);
  }

  const grouping = resp.results && resp.results.grouping;
  const groups = (grouping && grouping.group) || [];
  const docs = [];
  const features = parseSerpFeatures(resp);
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const g = groups[groupIndex];
    for (const d of g.doc || []) {
      if (!d || typeof d !== 'object') continue;
      const ct = String(d.contenttype || 'organic').trim().toLowerCase();
      // Органические позиции считаем отдельно, но бета-режим сохраняет факт спецблока.
      if (ct && ct !== 'organic') {
        features.push({ type: 'content', name: ct, position: groupIndex, count: 1, side: false });
        continue;
      }
      const url = String(d.url || '').trim();
      if (!url) continue;
      docs.push({ url, title: String(d.title || '') });
    }
  }
  return { docs, features, end: docs.length === 0 };
}

async function fetchSerpPage(engine, creds, cfg, query, page) {
  const url = buildSearchUrl(engine, creds, cfg, query, page);
  const text = await httpGetText(url);
  return parseSerpXml(text);
}

async function getBalance(creds) {
  const u = new URL('/api/get_balance/', BASE);
  u.searchParams.set('user', String(creds.user).trim());
  u.searchParams.set('key', String(creds.key).trim());
  const text = (await httpGetText(u.toString())).trim();
  const num = Number(text.replace(',', '.'));
  if (Number.isFinite(num)) return num;
  throw new Error(text || 'Не удалось получить баланс');
}

// Частотность Вордстат (Wordstat New API): в popular первой строкой идёт сам запрос.
// regions — id региона Яндекса; пусто = все регионы.
async function getWordstatFreq(creds, phrase, regions) {
  const u = new URL('/wordstat/new/json', BASE);
  u.searchParams.set('user', String(creds.user).trim());
  u.searchParams.set('key', String(creds.key).trim());
  u.searchParams.set('query', phrase);
  if (regions) u.searchParams.set('regions', String(regions));
  const text = await httpGetText(u.toString());
  let j;
  try { j = JSON.parse(text); } catch { throw new Error('Некорректный ответ Wordstat'); }
  if (j.error) throw new Error(typeof j.error === 'string' ? j.error : 'Ошибка Wordstat');
  const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const list = Array.isArray(j.popular) ? j.popular : [];
  if (!list.length) return null;
  const hit = list.find((it) => norm(it.text) === norm(phrase)) || list[0];
  const n = Number(String(hit.value ?? '').replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

async function getCost(creds, engine) {
  const u = new URL(`/api/get_cost/${engine === 'yandex' ? 'yandex' : 'google'}/`, BASE);
  u.searchParams.set('user', String(creds.user).trim());
  u.searchParams.set('key', String(creds.key).trim());
  const text = (await httpGetText(u.toString())).trim();
  const num = Number(text.replace(',', '.'));
  return Number.isFinite(num) ? num : null;
}

// Хост в punycode нижним регистром, без www. Терпимо к кириллическим доменам.
function normalizeHost(input) {
  let s = String(input || '').trim().toLowerCase();
  if (!s) return '';
  if (!/^[a-z][a-z0-9+.-]*:\/\//.test(s)) s = 'http://' + s;
  try {
    return new URL(s).hostname.replace(/^www\./, '');
  } catch {
    return String(input).trim().toLowerCase().replace(/^www\./, '').split('/')[0];
  }
}

// matcher(urlFromSerp) → true, если URL принадлежит домену проекта.
function makeDomainMatcher(domain, includeSubdomains) {
  const target = normalizeHost(domain);
  return (url) => {
    const host = normalizeHost(url);
    if (!host || !target) return false;
    if (host === target) return true;
    return includeSubdomains ? host.endsWith('.' + target) : false;
  };
}

module.exports = {
  XmlRiverError,
  buildSearchUrl,
  parseSerpXml,
  parseSerpFeatures,
  fetchSerpPage,
  getBalance,
  getCost,
  getWordstatFreq,
  normalizeHost,
  makeDomainMatcher,
  ERROR_TEXT,
};
