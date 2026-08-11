'use strict';

/* ============ мок для предпросмотра в браузере (без Electron) ============ */
if (!window.api) {
  const demoRuns = [
    { id: 1, started_at: '2026-07-18T07:00:00Z', status: 'done' },
    { id: 2, started_at: '2026-07-19T07:00:00Z', status: 'done' },
    { id: 3, started_at: '2026-07-20T07:00:00Z', status: 'done' },
    { id: 4, started_at: '2026-07-21T07:00:00Z', status: 'done' },
    { id: 5, started_at: '2026-07-22T07:00:00Z', status: 'done' },
  ];
  const demoKwsRaw = [
    ['банкротство физических лиц', 18300, 'услуги', null, 2],
    ['банкротство физлиц цена', 2400, 'услуги', null, 7],
    ['списание долгов законно', 5900, 'инфо', 'https://example.ru/blog/spisanie/', 4],
    ['процедура банкротства физического лица', 3100, 'инфо', null, 15],
    ['банкротство под ключ москва', 880, 'услуги', null, 38],
    ['сколько стоит банкротство', 4200, 'инфо', null, 9],
    ['банкротство ип', 2700, null, null, 0],
    ['последствия банкротства', 6100, 'инфо', null, 27],
  ];
  const demoKws = demoKwsRaw.map((k, i) => ({ id: i + 1, phrase: k[0], freq: k[1], tag: k[2], target_url: k[3] }));
  const cells = {};
  demoKws.forEach((k, i) => {
    cells[k.id] = {};
    const base = demoKwsRaw[i][4];
    const jit = [[0,0,0,0,0],[1,-2,0,3,-1],[0,1,-1,0,2],[4,-3,2,-5,1],[6,-2,-8,3,-4],[2,-1,1,-3,0],[0,0,0,0,0],[5,-6,2,-2,3]][i];
    demoRuns.forEach((r, j) => {
      const p = base === 0 ? 0 : Math.max(1, base + jit[j]);
      let u = p ? 'https://example.ru/uslugi/bankrotstvo/' : null;
      if (i === 2 && p) u = 'https://example.ru/uslugi/spisanie-dolgov/';
      if (i === 5 && p) u = j >= 4 ? 'https://example.ru/blog/skolko-stoit/' : 'https://example.ru/uslugi/bankrotstvo/';
      cells[k.id][r.id] = { p, u, e: null };
    });
  });
  cells[7][5] = { p: null, u: null, e: 'Выполните перезапрос. Ответ от поисковой системы не получен.' };
  const demoStats = {};
  const demoMetrika = {};
  demoKws.forEach((k, i) => {
    if (i === 6) return;
    demoStats[k.id] = {
      yandex: { s: [1240, 310, 890, 150, 45, 505, 0, 210][i], c: [86, 12, 41, 3, 1, 22, 0, 6][i], r: 0.05, p: [3.2, 8.1, 4.4, 16.9, 33.1, 9.8, 0, 24.5][i], at: '2026-07-23T10:00:00Z', d: 28, df: '2026-06-25', dt: '2026-07-23' },
      google: { s: [980, 240, 700, 90, 30, 410, 0, 160][i], c: [51, 8, 30, 2, 1, 18, 0, 4][i], r: 0.04, p: [4.1, 9.3, 5.2, 19.4, 41.0, 11.2, 0, 28.9][i], at: '2026-07-23T10:00:00Z', d: 28, df: '2026-06-25', dt: '2026-07-23' },
    };
    if (i < 5) {
      demoMetrika[k.id] = {
        yandex: { v: [73, 18, 32, 7, 3][i], u: [61, 16, 28, 6, 3][i], b: [8.2, 12.5, 9.4, 17.1, 0][i], p: [2.4, 1.9, 2.8, 1.5, 3][i], t: 94, g: [5, 1, 3, 0, 1][i], at: '2026-07-23T10:00:00Z', d: 28, df: '2026-06-25', dt: '2026-07-23' },
        google: { v: [42, 11, 21, 4, 2][i], u: [38, 10, 19, 4, 2][i], b: [10.1, 14.2, 8.8, 20, 0][i], p: 2.1, t: 81, g: [3, 0, 2, 0, 0][i], at: '2026-07-23T10:00:00Z', d: 28, df: '2026-06-25', dt: '2026-07-23' },
      };
    }
  });
  window.api = {
    getSettings: async () => ({ xmlriver_user: 'demo', xmlriver_key: 'demo', concurrency: '3', autocheck_enabled: '0', autocheck_time: '07:00' }),
    setSettings: async (s) => s,
    getBalance: async () => ({ ok: true, balance: 1234.56, costYandex: 28, costGoogle: 25 }),
    listProjects: async () => [{
      id: 1, name: 'Демо · Москва', domain: 'example.ru', subdomains: true, keywordCount: demoKws.length, running: false,
      cfg: { depth: 30, device: 'desktop', deviceMode: 'both', psDays: 28, competitors: ['rival-one.ru', 'rival-two.ru'], yandex: { enabled: true, lr: '213', domain: 'ru', source: 'api', serpFeaturesBeta: false }, google: { enabled: true, loc: '', country: '' } },
    }, {
      id: 2, name: 'Демо · Петербург', domain: 'example.ru', subdomains: true, keywordCount: demoKws.length, running: false,
      cfg: { depth: 30, device: 'desktop', deviceMode: 'both', psDays: 28, competitors: [], yandex: { enabled: true, lr: '2', domain: 'ru', source: 'api', serpFeaturesBeta: false }, google: { enabled: true, loc: '', country: '' } },
    }],
    saveProject: async () => ({ id: 1 }),
    duplicateProject: async () => ({ id: 2, keywordCount: demoKws.length }),
    deleteProject: async () => ({ ok: true }),
    addKeywords: async () => ({ added: 0 }),
    pickImportFile: async () => ({ canceled: true }),
    importHistory: async () => ({ phrases: 0, dates: 0, values: 0 }),
    deleteKeywords: async () => ({ ok: true }),
    copyText: async () => ({ ok: true }),
    setKeywordTarget: async () => ({ ok: true }),
    collectFreq: async () => ({ started: false }),
    addNote: async ({ date, title, body, category }) => ({ id: Date.now(), date, title, body, category }),
    deleteNote: async () => ({ ok: true, deleted: 1 }),
    estimateCheck: async () => ({ keywordCount: demoKws.length, requests: demoKws.length, cost: 4.6, balance: 1234.56, details: [] }),
    listRequestLogs: async () => [],
    openTelegram: async () => ({ ok: true }),
    openExternalUrl: async () => ({ ok: true }),
    getGrid: async () => {
      const compPos = {};
      demoKws.forEach((k, i) => {
        compPos[k.id] = { 'rival-one.ru': [1, 4, 2, 8, 12, 5, 0, 15][i] || 0, 'rival-two.ru': [6, 9, 7, 3, 0, 11, 4, 8][i] || 0 };
      });
      return {
        runs: demoRuns, keywords: demoKws, cells, stats: demoStats, metrika: demoMetrika, notes: [],
        competitors: ['rival-one.ru', 'rival-two.ru'], compPos,
        pagination: { hasMore: false, nextCursor: null, pageSize: 20 },
      };
    },
    startCheck: async () => ({ ok: true }),
    cancelCheck: async () => ({ ok: true }),
    retryErrors: async () => ({ ok: true }),
    exportCsv: async () => ({ saved: false }),
    listBackups: async () => [],
    restoreBackup: async () => ({ restored: false }),
    exportDiagnostics: async () => ({ saved: false }),
    refreshPsStats: async () => ({ yandex: { matched: 7, total: 8 }, google: { matched: 7, total: 8 }, metrika: { matchedYandex: 5, matchedGoogle: 5, total: 8, goalsAvailable: true }, days: 28 }),
    testPsAccess: async () => ({ yavm: { ok: true, hosts: 3 }, gsc: { ok: true, sites: 5 }, metrika: { ok: true, counters: 2 } }),
    psStatsHistory: async () => ([
      { days: 28, date_from: '2026-06-25', date_to: '2026-07-23', shows: 1240, clicks: 86, ctr: 0.069, position: 3.2, fetched_at: '2026-07-23T10:00:00Z' },
      { days: 28, date_from: '2026-06-18', date_to: '2026-07-16', shows: 1105, clicks: 71, ctr: 0.064, position: 3.9, fetched_at: '2026-07-16T10:00:00Z' },
      { days: 28, date_from: '2026-06-11', date_to: '2026-07-09', shows: 987, clicks: 55, ctr: 0.056, position: 4.6, fetched_at: '2026-07-09T10:00:00Z' },
    ]),
    metrikaHistory: async () => ([
      { days: 28, date_from: '2026-06-25', date_to: '2026-07-23', visits: 73, users: 61, bounce_rate: 8.2, page_depth: 2.4, duration: 94, goal_reaches: 5, fetched_at: '2026-07-23T10:00:00Z' },
      { days: 28, date_from: '2026-06-18', date_to: '2026-07-16', visits: 55, users: 48, bounce_rate: 9.1, page_depth: 2.2, duration: 88, goal_reaches: 3, fetched_at: '2026-07-16T10:00:00Z' },
    ]),
    gscLogin: async () => ({ ok: true }),
    pickJsonFile: async () => ({ path: null }),
    getVersion: async () => 'demo',
    on: () => {},
  };
}

/* ============ состояние ============ */

const S = {
  settings: null,
  projects: [],
  activeId: null,
  engine: 'yandex',
  device: 'desktop',
  grid: null,
  progress: null,       // {engine, done, total, phrase, position}
  freqProg: null,       // {done, total}
  balance: null,
  view: { q: '', searchMode: 'contains', tag: null, sort: { key: 'phrase', runId: null, dir: 1 }, mode: 'grid' },
  dyn: { metric: 'top', tops: { 3: true, 5: true, 10: true, 30: true } }, // состояние графиков «Динамики»
  regions: { metric: 'avg', loading: false, data: null, error: null },
  cmp: { a: null, b: null },                                     // выбранные прогоны для «Сравнения»
  historyLoading: false,
  selectedKeywordIds: new Set(),
  virtual: {
    rowStart: 0,
    rowHeight: 38,
    rowWindow: 64,
    rowOverscan: 12,
    colStart: 0,
    colWindow: 14,
    colOverscan: 2,
    scrollTop: 0,
    scrollLeft: 0,
  },
};

let visibleKeywordsCache = null;
let gridMetaCache = null;
let keywordSearchTimer = null;
const PHRASE_COLUMN_WIDTH = 420;

// CTR органики по позиции (усреднённая кривая Яндекс/Google) — для видимости и трафик-прогноза.
const CTR_CURVE = [0, 0.30, 0.15, 0.10, 0.07, 0.05, 0.04, 0.032, 0.026, 0.021, 0.018];
function ctrAt(pos) {
  if (!pos || pos < 1) return 0;
  if (pos <= 10) return CTR_CURVE[pos];
  if (pos <= 20) return 0.010;
  if (pos <= 30) return 0.006;
  if (pos <= 50) return 0.003;
  if (pos <= 100) return 0.001;
  return 0;
}
const CTR_TOP1 = CTR_CURVE[1];

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = esc(msg);
  $('#toastRoot').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 350); }, 5000);
}

const activeProject = () => S.projects.find((p) => p.id === S.activeId) || null;

function fmtDate(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}`;
}
function fmtDateFull(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
const fmtFreq = (n) => (n === null || n === undefined) ? '' : Number(n).toLocaleString('ru-RU');

// URL без протокола/www/якоря/хвостового слэша — для сравнения релевантных страниц.
function normUrl(u) {
  let s = String(u || '').trim().toLowerCase();
  if (!s) return '';
  s = s.replace(/^https?:\/\//, '').replace(/^www\./, '');
  s = s.split('#')[0];
  return s.replace(/\/+$/, '');
}

const SERP_FEATURE_LABELS = {
  ads_top: 'реклама сверху',
  ads_bottom: 'реклама снизу',
  ads_right: 'реклама справа',
  scroller: 'товарная карусель',
  offers: 'цены в магазинах',
  news: 'новости',
  knowledge_graph: 'граф знаний',
  ai: 'обзор от ИИ',
  images: 'картинки',
  maps: 'карты',
  market: 'Яндекс Маркет',
  video: 'видео',
  uslugi: 'Яндекс Услуги',
  weather: 'погода',
  related_discovery: 'популярное по теме',
};

function serpFeatureLabel(feature) {
  if (!feature) return '';
  if (feature.type === 'searchster' || feature.type === 'content') {
    return SERP_FEATURE_LABELS[feature.name] || `колдунщик: ${feature.name || 'неизвестный'}`;
  }
  return SERP_FEATURE_LABELS[feature.type] || feature.type;
}

/* ============ загрузка данных ============ */

async function loadProjects(keepActive = true) {
  S.projects = await window.api.listProjects();
  if (!keepActive || !activeProject()) {
    S.selectedKeywordIds.clear();
    const saved = Number(localStorage.getItem('activeId'));
    S.activeId = S.projects.some((p) => p.id === saved) ? saved : (S.projects[0]?.id ?? null);
  }
  syncEngineToProject();
}

function syncEngineToProject() {
  const p = activeProject();
  if (!p) return;
  const en = { yandex: p.cfg.yandex.enabled, google: p.cfg.google.enabled };
  if (!en[S.engine]) S.engine = en.yandex ? 'yandex' : 'google';
  // Устройство: если проект не «both», зафиксировать доступное.
  const mode = p.cfg.deviceMode || p.cfg.device || 'desktop';
  if (mode !== 'both') S.device = mode === 'mobile' ? 'mobile' : 'desktop';
}

async function loadGrid() {
  if (!S.activeId) { S.grid = null; return; }
  S.grid = await window.api.getGrid({ projectId: S.activeId, engine: S.engine, device: S.device, limit: 20 });
  const keywordIds = new Set((S.grid.keywords || []).map((keyword) => keyword.id));
  S.selectedKeywordIds = new Set([...S.selectedKeywordIds].filter((id) => keywordIds.has(id)));
  S.virtual.rowStart = 0;
  S.virtual.scrollTop = 0;
  S.virtual.colStart = 0;
  S.virtual.scrollLeft = 0;
}

async function loadOlderHistory() {
  if (!S.grid?.pagination?.hasMore || S.historyLoading) return;
  S.historyLoading = true;
  const button = $('#btnLoadHistory');
  if (button) { button.disabled = true; button.textContent = 'Загружаю…'; }
  try {
    const older = await window.api.getGrid({
      projectId: S.activeId,
      engine: S.engine,
      device: S.device,
      limit: S.grid.pagination.pageSize || 20,
      cursor: S.grid.pagination.nextCursor,
    });
    const cells = { ...older.cells };
    for (const [keywordId, values] of Object.entries(S.grid.cells || {})) {
      cells[keywordId] = { ...(cells[keywordId] || {}), ...values };
    }
    S.grid = {
      ...S.grid,
      runs: [...older.runs, ...S.grid.runs],
      cells,
      pagination: older.pagination,
    };
    S.virtual.colStart = 0;
    S.virtual.scrollLeft = 0;
    renderMain();
  } catch (e) {
    toast(e.message.replace(/^.*Error: /, ''), 'err');
  } finally {
    S.historyLoading = false;
  }
}

async function refreshBalance() {
  const box = $('#balanceBox');
  box.textContent = '…';
  box.className = 'balance';
  const r = await window.api.getBalance();
  S.balance = r;
  if (r.ok) {
    box.textContent = `${r.balance.toFixed(2)} ₽`;
    box.className = 'balance ok';
    const parts = [];
    if (r.costYandex != null) parts.push(`Яндекс ${r.costYandex} ₽/1000`);
    if (r.costGoogle != null) parts.push(`Google ${r.costGoogle} ₽/1000`);
    box.title = 'Баланс XMLRiver' + (parts.length ? ` · ${parts.join(' · ')}` : '') + ' — нажмите, чтобы обновить';
  } else {
    box.textContent = 'нет связи';
    box.className = 'balance err';
    box.title = r.error + ' — нажмите, чтобы обновить';
  }
}

/* ============ фильтрация и сортировка ============ */

function visibleKeywords() {
  const g = S.grid;
  if (!g) return [];
  const { q, searchMode = 'contains', tag, sort } = S.view;
  const cached = visibleKeywordsCache;
  if (cached &&
      cached.grid === g &&
      cached.engine === S.engine &&
      cached.q === q &&
      cached.searchMode === searchMode &&
      cached.tag === tag &&
      cached.sortKey === sort.key &&
      cached.sortRunId === sort.runId &&
      cached.sortDir === sort.dir) {
    return cached.list;
  }
  let list = g.keywords.slice();
  if (q) {
    list = list.filter((k) => window.SerpDeskKeywordSearch.matches(k.phrase, q, searchMode));
  }
  if (tag !== null) {
    list = tag === '__none__' ? list.filter((k) => !k.tag) : list.filter((k) => k.tag === tag);
  }
  const cellRank = (k, runId) => {
    const c = (g.cells[k.id] || {})[runId];
    if (!c || c.e) return 100001;
    if (c.p === 0) return 100000;
    return c.p;
  };
  const stat = (k) => (g.stats && g.stats[k.id] && g.stats[k.id][S.engine]) || null;
  const mst = (k) => (g.metrika && g.metrika[k.id] && g.metrika[k.id][S.engine]) || null;
  list.sort((a, b) => {
    let d = 0;
    if (sort.key === 'phrase') d = a.phrase.localeCompare(b.phrase, 'ru');
    else if (sort.key === 'freq') d = (a.freq ?? -1) - (b.freq ?? -1);
    else if (sort.key === 'shows') d = (stat(a)?.s ?? -1) - (stat(b)?.s ?? -1);
    else if (sort.key === 'clicks') d = (stat(a)?.c ?? -1) - (stat(b)?.c ?? -1);
    else if (sort.key === 'realpos') d = (stat(a)?.p || 100000) - (stat(b)?.p || 100000);
    else if (sort.key === 'mvisits') d = (mst(a)?.v ?? -1) - (mst(b)?.v ?? -1);
    else if (sort.key === 'musers') d = (mst(a)?.u ?? -1) - (mst(b)?.u ?? -1);
    else if (sort.key === 'mbounce') d = (mst(a)?.b ?? -1) - (mst(b)?.b ?? -1);
    else if (sort.key === 'mgoals') d = (mst(a)?.g ?? -1) - (mst(b)?.g ?? -1);
    else if (sort.key === 'run' && sort.runId) d = cellRank(a, sort.runId) - cellRank(b, sort.runId);
    return d * sort.dir || a.phrase.localeCompare(b.phrase, 'ru');
  });
  visibleKeywordsCache = {
    grid: g,
    engine: S.engine,
    q,
    searchMode,
    tag,
    sortKey: sort.key,
    sortRunId: sort.runId,
    sortDir: sort.dir,
    list,
  };
  return list;
}

function gridMeta() {
  const g = S.grid;
  if (!g) return { hasFreq: false, hasStats: false, statAt: null, hasMetrika: false, metrikaAt: null };
  if (gridMetaCache && gridMetaCache.grid === g && gridMetaCache.engine === S.engine) return gridMetaCache;
  const hasFreq = g.keywords.some((k) => k.freq !== null && k.freq !== undefined);
  const hasStats = g.keywords.some((k) => g.stats && g.stats[k.id] && g.stats[k.id][S.engine]);
  const statAt = hasStats
    ? Object.values(g.stats).map((s) => s[S.engine]?.at).filter(Boolean).sort().pop()
    : null;
  const hasMetrika = g.keywords.some((k) => g.metrika && g.metrika[k.id] && g.metrika[k.id][S.engine]);
  const metrikaAt = hasMetrika
    ? Object.values(g.metrika).map((s) => s[S.engine]?.at).filter(Boolean).sort().pop()
    : null;
  gridMetaCache = { grid: g, engine: S.engine, hasFreq, hasStats, statAt, hasMetrika, metrikaAt };
  return gridMetaCache;
}

function setSort(key, runId = null) {
  const s = S.view.sort;
  if (s.key === key && s.runId === runId) {
    s.dir = -s.dir;
  } else {
    s.key = key;
    s.runId = runId;
    s.dir = (key === 'freq' || key === 'shows' || key === 'clicks' || key === 'mvisits' || key === 'musers' || key === 'mgoals') ? -1 : 1; // объёмные метрики — по убыванию
  }
  if (key === 'phrase') {
    S.virtual.colStart = 0;
    S.virtual.scrollLeft = 0;
  }
  refreshGrid();
}

const sortArrow = (key, runId = null) => {
  const s = S.view.sort;
  if (s.key !== key || s.runId !== runId) return '';
  return s.dir === 1 ? ' ▲' : ' ▼';
};

/* ============ рендер ============ */

function render() {
  renderSidebar();
  renderMain();
}

function renderSidebar() {
  const list = $('#projList');
  const storageKey = (domain) => `projectGroupCollapsed:${String(domain || '').trim().toLowerCase()}`;
  const projectLabel = (project) => {
    const name = String(project.name || '').trim();
    const domain = String(project.domain || '').trim();
    if (!domain || !name.toLowerCase().startsWith(domain.toLowerCase())) return name;
    const suffix = name.slice(domain.length).replace(/^[\s\-–—]+/, '').trim();
    return suffix || name;
  };
  const grouped = new Map();
  for (const project of S.projects) {
    const rawDomain = String(project.domain || '').trim();
    const key = rawDomain.toLowerCase();
    if (!grouped.has(key)) grouped.set(key, { domain: rawDomain || 'Без домена', projects: [] });
    grouped.get(key).projects.push(project);
  }
  const groups = [...grouped.values()]
    .sort((a, b) => a.domain.localeCompare(b.domain, 'ru', { sensitivity: 'base' }))
    .map((group) => ({
      ...group,
      collapsed: localStorage.getItem(storageKey(group.domain)) === '1',
      projects: group.projects.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'ru', { sensitivity: 'base' })),
    }));

  list.innerHTML = groups.map((group, index) => `
    <section class="proj-group ${group.collapsed ? 'collapsed' : ''}">
      <button class="proj-group-head" type="button" data-group="${index}" aria-expanded="${group.collapsed ? 'false' : 'true'}">
        <span class="proj-group-arrow">${group.collapsed ? '▸' : '▾'}</span>
        <span class="proj-group-domain" title="${esc(group.domain)}">${esc(group.domain)}</span>
        <span class="proj-group-count">${group.projects.length}</span>
      </button>
      <div class="proj-group-items">
        ${group.projects.map((p) => `
          <div class="proj-item ${p.id === S.activeId ? 'active' : ''}" data-id="${p.id}">
            <div class="p-name">
              ${p.running ? '<span class="run-dot"></span>' : ''}
              <span class="p-label" title="${esc(p.name)}">${esc(projectLabel(p))}</span>
              <span class="p-count" title="Фраз в проекте">${p.keywordCount}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `).join('');
  list.querySelectorAll('.proj-group-head').forEach((el) => {
    el.onclick = () => {
      const group = groups[Number(el.dataset.group)];
      if (!group) return;
      localStorage.setItem(storageKey(group.domain), group.collapsed ? '0' : '1');
      renderSidebar();
    };
  });
  list.querySelectorAll('.proj-item').forEach((el) => {
    el.onclick = async () => {
      S.activeId = Number(el.dataset.id);
      S.selectedKeywordIds.clear();
      localStorage.setItem('activeId', S.activeId);
      S.progress = null;
      S.freqProg = null;
      S.view = { q: '', searchMode: 'contains', tag: null, sort: { key: 'phrase', runId: null, dir: 1 }, mode: 'grid' };
      S.cmp = { a: null, b: null };
      syncEngineToProject();
      await loadGrid();
      render();
    };
  });
}

function bucketClass(p) {
  if (p === null || p === undefined) return 'be';
  if (p === 0) return 'b0';
  if (p <= 3) return 'b1';
  if (p <= 10) return 'b2';
  if (p <= 30) return 'b3';
  return 'b4';
}

function lastRunErrors() {
  const g = S.grid;
  if (!g || !g.runs.length) return 0;
  const lastId = g.runs[g.runs.length - 1].id;
  return g.keywords.filter((k) => (g.cells[k.id] || {})[lastId]?.e).length;
}

function renderMain() {
  const main = $('#main');
  const p = activeProject();

  if (!p) {
    main.innerHTML = `
      <div class="empty">
        <div class="e-title">Проектов пока нет</div>
        <div class="e-sub">Создайте первый проект: домен, регион, список фраз — и снимайте позиции Яндекса и Google через XMLRiver.</div>
        <button class="btn btn-primary" id="btnEmptyNew">+ Создать проект</button>
      </div>`;
    $('#btnEmptyNew').onclick = () => openProjectModal(null);
    return;
  }

  const running = p.running;
  const cfg = p.cfg;
  const errN = lastRunErrors();
  const alertCount = S.grid?.analysis?.importantCount || 0;
  const tags = [...new Set((S.grid?.keywords || []).map((k) => k.tag).filter(Boolean))];
  const canCompareRegions = regionProjects().length >= 2;

  main.innerHTML = `
    <div class="head">
      <div class="head-top">
        <h1>${esc(p.name)}</h1>
        <span class="chip">${esc(p.domain)}${p.subdomains ? ' + поддомены' : ''}</span>
        <span class="chip">глубина ТОП-${cfg.depth}</span>
        ${S.freqProg ? `<span class="chip chip-accent" id="freqChip">Вордстат: ${S.freqProg.done}/${S.freqProg.total}</span>` : ''}
        <div class="head-actions">
          ${errN && !running ? `<button class="btn btn-warn" id="btnRetry" title="Перепроверить только фразы с ошибкой в последнем столбце">Дочекать ошибки (${errN})</button>` : ''}
          ${running
            ? `<button class="btn btn-danger" id="btnCancel">Остановить</button>`
            : `<button class="btn btn-primary" id="btnUpdate">Обновить</button>`}
          <button class="btn" id="btnAddKw">+ Запросы</button>
          <button class="btn" id="btnImportHistory" title="Импортировать фразы вместе с историческими позициями из XLSX или CSV">Импорт истории…</button>
          <button class="btn" id="btnPs" title="Обновить подключённые источники: Яндекс.Вебмастер, Google Search Console и Яндекс Метрику">⟳ Данные</button>
          <button class="btn" id="btnReport" title="Красивый отчёт (PDF / печать)">Отчёт</button>
          <button class="btn" id="btnCsv" title="Экспорт CSV">CSV</button>
          <button class="icon-btn" id="btnDuplicateProj" title="Дублировать проект">⧉</button>
          <button class="icon-btn" id="btnEditProj" title="Настройки проекта">✎</button>
        </div>
      </div>
      <div class="view-nav">
        <button class="vnav ${S.view.mode === 'grid' ? 'active' : ''}" data-mode="grid">Позиции</button>
        <button class="vnav ${S.view.mode === 'changes' ? 'active' : ''}" data-mode="changes">Изменения${alertCount ? ` <span class="alert-badge">${alertCount}</span>` : ''}</button>
        <button class="vnav ${S.view.mode === 'dynamics' ? 'active' : ''}" data-mode="dynamics">Динамика</button>
        <button class="vnav ${S.view.mode === 'compare' ? 'active' : ''}" data-mode="compare">Сравнение</button>
        ${(cfg.competitors && cfg.competitors.length) ? `<button class="vnav ${S.view.mode === 'competitors' ? 'active' : ''}" data-mode="competitors">Конкуренты</button>` : ''}
        ${canCompareRegions ? `<button class="vnav ${S.view.mode === 'regions' ? 'active' : ''}" data-mode="regions">Регионы <small>β</small></button>` : ''}
      </div>
      <div class="tabs-row">
        <div class="tabs">
          <button class="tab ${S.engine === 'yandex' ? 'active' : ''} ${cfg.yandex.enabled ? '' : 'off'}" data-eng="yandex">Яндекс</button>
          <button class="tab ${S.engine === 'google' ? 'active' : ''} ${cfg.google.enabled ? '' : 'off'}" data-eng="google">Google</button>
        </div>
        ${(cfg.deviceMode || 'desktop') === 'both' ? `<div class="tabs">
          <button class="tab ${S.device === 'desktop' ? 'active' : ''}" data-dev="desktop">🖥 Десктоп</button>
          <button class="tab ${S.device === 'mobile' ? 'active' : ''}" data-dev="mobile">📱 Мобайл</button>
        </div>` : ''}
      </div>
      ${S.view.mode === 'grid' && tags.length ? `<div class="tag-chips">
        <button class="chip-btn ${S.view.tag === null ? 'on' : ''}" data-tag="">Все</button>
        ${tags.map((t) => `<button class="chip-btn ${S.view.tag === t ? 'on' : ''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}
        <button class="chip-btn ${S.view.tag === '__none__' ? 'on' : ''}" data-tag="__none__">Без группы</button>
      </div>` : ''}
    </div>
    ${S.view.mode === 'grid' ? `
      ${renderCards()}
      ${running || S.progress ? renderProgress() : ''}
      <div id="gridBox">${renderGrid()}</div>
    ` : S.view.mode === 'changes' ? renderChanges()
      : S.view.mode === 'dynamics' ? renderDynamics()
      : S.view.mode === 'competitors' ? renderCompetitors()
      : S.view.mode === 'regions' ? renderRegions()
      : renderCompare()}
  `;

  if (running) $('#btnCancel').onclick = () => window.api.cancelCheck({ projectId: p.id });
  else $('#btnUpdate').onclick = openUpdateModal;
  const rBtn = $('#btnRetry');
  if (rBtn) rBtn.onclick = retryErrors;
  $('#btnAddKw').onclick = openKeywordsModal;
  $('#btnImportHistory').onclick = openHistoryImport;
  $('#btnPs').onclick = refreshPs;
  $('#btnReport').onclick = async () => {
    try { await window.api.openReport({ projectId: p.id, engine: S.engine, device: S.device }); }
    catch (e) { toast(e.message.replace(/^.*Error: /, ''), 'err'); }
  };
  $('#btnCsv').onclick = doExport;
  $('#btnDuplicateProj').onclick = () => openProjectModal(p, { duplicate: true });
  $('#btnEditProj').onclick = () => openProjectModal(p);

  main.querySelectorAll('.vnav').forEach((b) => {
    b.onclick = async () => {
      if (S.view.mode === b.dataset.mode) return;
      S.view.mode = b.dataset.mode;
      if (S.view.mode === 'regions') await loadRegionsData();
      renderMain();
    };
  });

  main.querySelectorAll('.tab').forEach((t) => {
    t.onclick = async () => {
      const eng = t.dataset.eng;
      if (eng === S.engine) return;
      const enabled = eng === 'yandex' ? cfg.yandex.enabled : cfg.google.enabled;
      if (!enabled) { toast('Этот поисковик выключен в настройках проекта', 'err'); return; }
      S.engine = eng;
      S.regions.data = null;
      S.view.sort = { key: 'phrase', runId: null, dir: 1 };
      await loadGrid();
      if (S.view.mode === 'regions') await loadRegionsData();
      renderMain();
    };
  });

  main.querySelectorAll('.tab[data-dev]').forEach((t) => {
    t.onclick = async () => {
      if (t.dataset.dev === S.device) return;
      S.device = t.dataset.dev;
      S.regions.data = null;
      await loadGrid();
      if (S.view.mode === 'regions') await loadRegionsData();
      renderMain();
    };
  });

  main.querySelectorAll('.chip-btn').forEach((c) => {
    c.onclick = () => {
      const t = c.dataset.tag;
      S.view.tag = t === '' ? null : t;
      renderMain();
    };
  });

  if (S.view.mode === 'grid') bindGridEvents();
  else if (S.view.mode === 'changes') bindHistoryPager();
  else if (S.view.mode === 'dynamics') bindDynamicsEvents();
  else if (S.view.mode === 'compare') bindCompareEvents();
  else if (S.view.mode === 'competitors') bindCompetitorEvents();
  else if (S.view.mode === 'regions') bindRegionEvents();
}

function refreshGrid(options = {}) {
  const box = $('#gridBox');
  if (!box) return;
  const keepSearchFocus = options.focusSearch || document.activeElement?.id === 'kwSearch';
  box.innerHTML = renderGrid();
  bindGridEvents();
  if (keepSearchFocus) {
    const search = $('#kwSearch', box);
    if (search) {
      search.focus();
      search.setSelectionRange(search.value.length, search.value.length);
    }
  }
}

function refreshVirtualGrid() {
  const box = $('#gridBox');
  const wrap = box && $('.grid-wrap', box);
  if (!box || !wrap) { refreshGrid(); return; }

  const template = document.createElement('template');
  template.innerHTML = renderGrid();
  const nextGrid = $('.grid', template.content);
  const currentGrid = $('.grid', wrap);
  if (!nextGrid || !currentGrid) { refreshGrid(); return; }

  currentGrid.replaceWith(nextGrid);
  bindGridEvents();
}

async function copyKeywords(keywords) {
  const phrases = keywords.map((keyword) => keyword.phrase).filter(Boolean);
  if (!phrases.length) { toast('Нет запросов для копирования', 'err'); return; }
  try {
    await window.api.copyText({ text: phrases.join('\n') });
    toast(`Скопировано запросов: ${phrases.length}`, 'ok');
  } catch (e) {
    toast(e.message.replace(/^.*Error: /, ''), 'err');
  }
}

async function deleteKeywordIds(ids) {
  const uniqueIds = [...new Set(ids.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  if (!uniqueIds.length) return;
  const one = uniqueIds.length === 1 ? S.grid.keywords.find((keyword) => keyword.id === uniqueIds[0]) : null;
  const question = one
    ? `Удалить фразу «${one.phrase}» вместе с историей?`
    : `Удалить выбранные запросы (${uniqueIds.length}) вместе со всей их историей?`;
  if (!confirm(question)) return;
  try {
    await window.api.deleteKeywords({ ids: uniqueIds });
    uniqueIds.forEach((id) => S.selectedKeywordIds.delete(id));
    await Promise.all([loadProjects(), loadGrid()]);
    render();
    toast(`Удалено запросов: ${uniqueIds.length}`, 'ok');
  } catch (e) {
    toast(e.message.replace(/^.*Error: /, ''), 'err');
  }
}

function bindGridEvents() {
  const box = $('#gridBox');
  if (!box) return;

  box.querySelectorAll('.kw-del').forEach((el) => {
    el.onclick = (e) => {
      e.stopPropagation();
      deleteKeywordIds([Number(el.dataset.kw)]);
    };
  });

  box.querySelectorAll('.kw-copy').forEach((el) => {
    el.onclick = (e) => {
      e.stopPropagation();
      const keyword = S.grid.keywords.find((item) => item.id === Number(el.dataset.kw));
      if (keyword) copyKeywords([keyword]);
    };
  });

  box.querySelectorAll('.kw-check').forEach((el) => {
    el.onchange = (e) => {
      e.stopPropagation();
      const id = Number(el.dataset.kw);
      if (el.checked) S.selectedKeywordIds.add(id);
      else S.selectedKeywordIds.delete(id);
      refreshGrid();
    };
  });

  const selectAll = $('#kwSelectAll', box);
  if (selectAll) {
    const visibleIds = visibleKeywords().map((keyword) => keyword.id);
    const selectedVisible = visibleIds.filter((id) => S.selectedKeywordIds.has(id)).length;
    selectAll.checked = visibleIds.length > 0 && selectedVisible === visibleIds.length;
    selectAll.indeterminate = selectedVisible > 0 && selectedVisible < visibleIds.length;
    selectAll.onclick = (e) => e.stopPropagation();
    selectAll.onchange = (e) => {
      e.stopPropagation();
      visibleIds.forEach((id) => {
        if (selectAll.checked) S.selectedKeywordIds.add(id);
        else S.selectedKeywordIds.delete(id);
      });
      refreshGrid();
    };
  }

  const search = $('#kwSearch', box);
  if (search) {
    search.oninput = () => {
      S.view.q = search.value;
      clearTimeout(keywordSearchTimer);
      keywordSearchTimer = setTimeout(() => {
        S.virtual.rowStart = 0;
        S.virtual.scrollTop = 0;
        refreshGrid({ focusSearch: true });
      }, 180);
    };
    search.onkeydown = (event) => {
      if (event.key !== 'Escape' || !search.value) return;
      event.preventDefault();
      clearTimeout(keywordSearchTimer);
      search.value = '';
      S.view.q = '';
      S.virtual.rowStart = 0;
      S.virtual.scrollTop = 0;
      refreshGrid({ focusSearch: true });
    };
  }
  const searchMode = $('#kwSearchMode', box);
  if (searchMode) searchMode.onchange = () => {
    S.view.searchMode = searchMode.value;
    S.virtual.rowStart = 0;
    S.virtual.scrollTop = 0;
    refreshGrid({ focusSearch: true });
  };

  const copyVisible = $('#btnCopyVisible', box);
  if (copyVisible) copyVisible.onclick = () => copyKeywords(visibleKeywords());
  const copySelected = $('#btnCopySelected', box);
  if (copySelected) copySelected.onclick = () => {
    copyKeywords(S.grid.keywords.filter((keyword) => S.selectedKeywordIds.has(keyword.id)));
  };
  const deleteSelected = $('#btnDeleteSelected', box);
  if (deleteSelected) deleteSelected.onclick = () => deleteKeywordIds([...S.selectedKeywordIds]);
  const clearSelected = $('#btnClearSelected', box);
  if (clearSelected) clearSelected.onclick = () => {
    S.selectedKeywordIds.clear();
    refreshGrid();
  };

  box.querySelectorAll('.kw-target').forEach((el) => {
    el.onclick = (e) => {
      e.stopPropagation();
      const kw = S.grid.keywords.find((k) => k.id === Number(el.dataset.kw));
      if (kw) openTargetModal(kw);
    };
  });

  box.querySelectorAll('.kw-chart').forEach((el) => {
    el.onclick = (e) => {
      e.stopPropagation();
      const kw = S.grid.keywords.find((k) => k.id === Number(el.dataset.kw));
      if (kw) openChartModal(kw);
    };
  });

  box.querySelectorAll('.c-phrase .ph-text').forEach((el) => {
    el.onclick = () => {
      const kw = S.grid.keywords.find((k) => k.id === Number(el.dataset.kw));
      if (kw) openChartModal(kw);
    };
  });

  box.querySelectorAll('.pos.has-url').forEach((el) => {
    const openUrl = async (e) => {
      e.stopPropagation();
      try { await window.api.openExternalUrl({ url: el.dataset.url }); }
      catch (error) { toast(error.message.replace(/^.*Error: /, ''), 'err'); }
    };
    el.onclick = openUrl;
    el.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openUrl(e);
      }
    };
  });

  box.querySelectorAll('th[data-sort]').forEach((th) => {
    th.onclick = () => {
      const kind = th.dataset.sort;
      if (kind === 'run') setSort('run', Number(th.dataset.run));
      else setSort(kind);
    };
  });
  box.querySelectorAll('.kw-sort-label[data-sort]').forEach((label) => {
    label.onclick = () => setSort(label.dataset.sort);
  });

  const empty = $('#btnEmptyKw');
  if (empty) empty.onclick = openKeywordsModal;

  const wrap = $('.grid-wrap', box);
  if (wrap) {
    wrap.scrollTop = S.virtual.scrollTop || 0;
    if (S.virtual.scrollLeft === Number.MAX_SAFE_INTEGER) {
      wrap.scrollLeft = wrap.scrollWidth;
      S.virtual.scrollLeft = wrap.scrollLeft;
    } else {
      wrap.scrollLeft = S.virtual.scrollLeft || 0;
    }
    const rowCount = visibleKeywords().length;
    const meta = gridMeta();
    const fixedWidth = PHRASE_COLUMN_WIDTH + (meta.hasFreq ? 80 : 0) + (meta.hasStats ? 240 : 0) + (meta.hasMetrika ? 280 : 0);
    let scheduled = false;
    wrap.onscroll = () => {
      S.virtual.scrollTop = wrap.scrollTop;
      S.virtual.scrollLeft = wrap.scrollLeft;
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        const nextRow = window.SerpDeskVirtualGrid.nextWindowStart({
          scrollOffset: wrap.scrollTop,
          itemSize: S.virtual.rowHeight,
          viewportSize: wrap.clientHeight,
          totalItems: rowCount,
          windowStart: S.virtual.rowStart,
          windowSize: S.virtual.rowWindow,
          overscan: S.virtual.rowOverscan,
        });
        const nextCol = window.SerpDeskVirtualGrid.nextWindowStart({
          scrollOffset: Math.max(0, wrap.scrollLeft - fixedWidth),
          itemSize: 72,
          viewportSize: Math.max(0, wrap.clientWidth - fixedWidth),
          totalItems: S.grid.runs.length,
          windowStart: S.virtual.colStart,
          windowSize: S.virtual.colWindow,
          overscan: S.virtual.colOverscan,
        });
        if (nextRow === S.virtual.rowStart && nextCol === S.virtual.colStart) return;
        S.virtual.rowStart = nextRow;
        S.virtual.colStart = nextCol;
        refreshVirtualGrid();
      });
    };
  }
  bindHistoryPager(box);
}

function bindHistoryPager(root = document) {
  const button = $('#btnLoadHistory', root);
  if (button) button.onclick = loadOlderHistory;
}

function renderHistoryPager() {
  const pagination = S.grid?.pagination;
  if (!pagination?.hasMore) return '';
  return `<div class="history-pager">
    <button class="btn" id="btnLoadHistory">Загрузить ещё ${pagination.pageSize || 20} предыдущих дат</button>
    <span>Сейчас загружено: ${S.grid.runs.length}</span>
  </div>`;
}

// Сводные метрики одного прогона по всем фразам проекта.
function gridRunStats(g, runId) {
  let top3 = 0, top5 = 0, top10 = 0, top30 = 0, topAll = 0, sum = 0, found = 0;
  let visSum = 0, traffic = 0, freqKnown = false;
  for (const kw of g.keywords) {
    const c = (g.cells[kw.id] || {})[runId];
    if (!c || c.e || c.p === null || c.p === undefined) continue;
    const p = c.p;
    if (p >= 1) { topAll++; sum += p; found++; }
    if (p >= 1 && p <= 3) top3++;
    if (p >= 1 && p <= 5) top5++;
    if (p >= 1 && p <= 10) top10++;
    if (p >= 1 && p <= 30) top30++;
    visSum += ctrAt(p) / CTR_TOP1; // 1.0 за первую позицию
    if (kw.freq != null) { freqKnown = true; traffic += (kw.freq || 0) * ctrAt(p); }
  }
  const total = g.keywords.length || 1;
  return {
    top3, top5, top10, top30, topAll, found,
    avg: found ? sum / found : null,
    visibility: (visSum / total) * 100,       // % от максимально возможной видимости
    traffic: freqKnown ? Math.round(traffic) : null, // прогноз визитов/мес
  };
}

function runStats(runId) { return gridRunStats(S.grid, runId); }

function regionProjects() {
  return window.SerpDeskInsights.sameDomainProjects(S.projects, activeProject())
    .filter((project) => project.cfg?.[S.engine]?.enabled);
}

function renderCards() {
  const g = S.grid;
  if (!g || !g.runs.length || !g.keywords.length) return '';
  const last = g.runs[g.runs.length - 1];
  const prev = g.runs.length > 1 ? g.runs[g.runs.length - 2] : null;

  const statsFor = (runId) => runStats(runId);

  // Дельта средней позиции считается только по фразам, найденным в ОБОИХ прогонах,
  // иначе вход новых фраз в топ «ухудшает» среднюю.
  const commonAvg = (aId, bId) => {
    let sa = 0, sb = 0, n = 0;
    for (const kw of g.keywords) {
      const ca = (g.cells[kw.id] || {})[aId];
      const cb = (g.cells[kw.id] || {})[bId];
      if (ca && cb && !ca.e && !cb.e && ca.p > 0 && cb.p > 0) { sa += ca.p; sb += cb.p; n++; }
    }
    return n ? [sa / n, sb / n] : null;
  };

  const cur = statsFor(last.id);
  const pv = prev ? statsFor(prev.id) : null;

  const delta = (a, b, invert = false) => {
    if (b === null || b === undefined || a === null || a === undefined) return '';
    const d = Math.round((a - b) * 10) / 10;
    if (!d) return '<span class="c-delta d-zero">·</span>';
    const good = invert ? d < 0 : d > 0;
    const arrow = d > 0 ? '▲' : '▼';
    return `<span class="c-delta ${good ? 'd-up' : 'd-down'}">${arrow}${Math.abs(d)}</span>`;
  };

  let avgDelta = '';
  if (prev) {
    const pair = commonAvg(last.id, prev.id);
    if (pair) avgDelta = delta(pair[0], pair[1], true);
  }

  return `<div class="cards">
    <div class="card"><div class="c-label">Фраз</div><div class="c-value">${g.keywords.length}</div></div>
    <div class="card"><div class="c-label">ТОП-3</div><div class="c-value">${cur.top3}${pv ? delta(cur.top3, pv.top3) : ''}</div></div>
    <div class="card"><div class="c-label">ТОП-5</div><div class="c-value">${cur.top5}${pv ? delta(cur.top5, pv.top5) : ''}</div></div>
    <div class="card"><div class="c-label">ТОП-10</div><div class="c-value">${cur.top10}${pv ? delta(cur.top10, pv.top10) : ''}</div></div>
    <div class="card"><div class="c-label">ТОП-${activeProject().cfg.depth}</div><div class="c-value">${cur.topAll}${pv ? delta(cur.topAll, pv.topAll) : ''}</div></div>
    <div class="card" title="Средняя по найденным фразам; дельта — только по фразам, найденным в обоих прогонах"><div class="c-label">Средняя позиция</div><div class="c-value">${cur.avg ? cur.avg.toFixed(1) : '—'}${avgDelta}</div></div>
  </div>`;
}

function renderProgress() {
  const pr = S.progress;
  if (!pr) return '';
  const pct = pr.total ? Math.round((pr.done / pr.total) * 100) : 0;
  const engName = pr.engine === 'yandex' ? 'Яндекс' : 'Google';
  const posTxt = pr.position === 0 ? '—' : (pr.position ?? '');
  return `<div class="progress-wrap"><div class="progress-line">
    <div class="progress-text"><b>${engName}</b> · ${pr.done} / ${pr.total}${pr.phrase ? ` · «${esc(pr.phrase)}» → <b>${posTxt}</b>` : ''}</div>
    <div class="pbar"><div style="width:${pct}%"></div></div>
  </div></div>`;
}

function renderGrid() {
  const g = S.grid;
  if (!g) return '';
  if (!g.keywords.length) {
    return `<div class="empty">
      <div class="e-title">В проекте нет фраз</div>
      <div class="e-sub">Добавьте список запросов — по одному на строку — и запустите проверку.</div>
      <button class="btn btn-primary" id="btnEmptyKw">+ Добавить запросы</button>
    </div>`;
  }
  const runs = g.runs;
  const displayRuns = runs.slice().reverse();
  const kws = visibleKeywords();
  const rowStart = Math.max(0, Math.min(S.virtual.rowStart, Math.max(0, kws.length - 1)));
  const rowEnd = Math.min(kws.length, rowStart + S.virtual.rowWindow);
  const visibleKws = kws.slice(rowStart, rowEnd);
  const colStart = Math.max(0, Math.min(S.virtual.colStart, Math.max(0, displayRuns.length - 1)));
  const colEnd = Math.min(displayRuns.length, colStart + S.virtual.colWindow);
  const visibleRuns = displayRuns.slice(colStart, colEnd);
  const runIndexes = new Map(runs.map((run, index) => [run.id, index]));
  const colSpacer = (count, tag = 'td') => count > 0
    ? `<${tag} class="v-col-space" style="width:${count * 72}px;min-width:${count * 72}px"></${tag}>`
    : '';
  const { hasFreq, hasStats, statAt, hasMetrika, metrikaAt } = gridMeta();
  const psDays = activeProject().cfg.psDays || 28;
  const psName = S.engine === 'yandex' ? 'Яндекс.Вебмастера' : 'Search Console';
  const statTip = `Реальная статистика из ${psName} за ${psDays} дней${statAt ? ' · обновлено ' + fmtDateFull(statAt) : ''}. История копится с каждым «⟳ Данные» — смотри в графике фразы.`;
  const metrikaTip = `Трафик по поисковой фразе из Яндекс Метрики за ${psDays} дней${metrikaAt ? ' · обновлено ' + fmtDateFull(metrikaAt) : ''}. Метрика скрывает часть низкочастотных запросов, поэтому пустая ячейка не означает ноль.`;
  const depth = activeProject().cfg.depth;
  const selectedCount = S.selectedKeywordIds.size;
  const filtered = kws.length !== g.keywords.length;
  const bulkBar = `<div class="kw-bulkbar">
    <span class="kw-bulk-summary">${selectedCount ? `Выбрано: <b>${selectedCount}</b>` : `Запросов: <b>${kws.length}</b>`}</span>
    ${selectedCount ? `
      <button class="btn" id="btnCopySelected">⧉ Копировать выбранные</button>
      <button class="btn btn-danger" id="btnDeleteSelected">Удалить выбранные</button>
      <button class="btn btn-ghost" id="btnClearSelected">Снять выделение</button>
    ` : ''}
    <button class="btn" id="btnCopyVisible">⧉ Копировать ${filtered ? 'видимые' : 'все'}</button>
  </div>`;
  const betaBanner = S.engine === 'yandex' && activeProject().cfg.yandex.serpFeaturesBeta
    ? `<div class="beta-warning"><b>β Бета: блоки выдачи.</b> Органическая позиция остаётся основной. Маленькое β-число показывает приблизительное место с учётом блоков, которые вернул XMLRiver. Реклама и динамические элементы могут определяться не полностью.</div>`
    : '';

  const head = `<tr>
    <th class="h-phrase">
      <span class="kw-head">
        <input type="checkbox" id="kwSelectAll" title="Выбрать все ${filtered ? 'видимые' : 'запросы'}">
        <span class="kw-sort-label" data-sort="phrase">Фраза (${kws.length}${filtered ? ` из ${g.keywords.length}` : ''})${sortArrow('phrase')}</span>
        <span class="kw-search-controls">
          <input type="text" id="kwSearch" placeholder="Найти фразу…" value="${esc(S.view.q)}" title="Поиск без учёта регистра. Esc очищает поле.">
          <select id="kwSearchMode" title="Как искать">
            <option value="contains" ${(S.view.searchMode || 'contains') === 'contains' ? 'selected' : ''}>Содержит</option>
            <option value="exact" ${S.view.searchMode === 'exact' ? 'selected' : ''}>Точно</option>
          </select>
        </span>
      </span>
    </th>
    ${hasFreq ? `<th class="h-freq" data-sort="freq" title="Частотность Вордстат">Частота${sortArrow('freq')}</th>` : ''}
    ${hasStats ? `
      <th class="h-stat" data-sort="shows" title="${esc(statTip)}">Показы·${psDays}д${sortArrow('shows')}</th>
      <th class="h-stat" data-sort="clicks" title="${esc(statTip)}">Клики·${psDays}д${sortArrow('clicks')}</th>
      <th class="h-stat" data-sort="realpos" title="${esc(statTip)} — средняя позиция по реальным показам">Поз.ПС${sortArrow('realpos')}</th>` : ''}
    ${hasMetrika ? `
      <th class="h-stat h-metrika" data-sort="mvisits" title="${esc(metrikaTip)}">Визиты·М${sortArrow('mvisits')}</th>
      <th class="h-stat" data-sort="musers" title="${esc(metrikaTip)}">Люди·М${sortArrow('musers')}</th>
      <th class="h-stat" data-sort="mbounce" title="${esc(metrikaTip)}">Отказы·М${sortArrow('mbounce')}</th>
      <th class="h-stat" data-sort="mgoals" title="${esc(metrikaTip)}">Цели·М${sortArrow('mgoals')}</th>` : ''}
    ${colSpacer(colStart, 'th')}
    ${visibleRuns.map((r) => `<th data-sort="run" data-run="${r.id}" title="${esc(fmtDateFull(r.started_at))}${r.status !== 'done' ? ' · ' + r.status : ''}">${fmtDate(r.started_at)}${sortArrow('run', r.id)}</th>`).join('')}
    ${colSpacer(displayRuns.length - colEnd, 'th')}
  </tr>`;

  const rows = visibleKws.map((kw) => {
    const tds = visibleRuns.map((r) => {
      const c = (g.cells[kw.id] || {})[r.id];
      if (!c) return '<td class="c-pos"></td>';
      if (c.e) return `<td class="c-pos"><span class="pos be" title="${esc(c.e)}">!</span></td>`;
      const i = runIndexes.get(r.id);
      const prevRun = i > 0 ? runs[i - 1] : null;
      const pc = prevRun ? (g.cells[kw.id] || {})[prevRun.id] : null;
      let d = '';
      if (pc && !pc.e && pc.p > 0 && c.p > 0) {
        const diff = pc.p - c.p;
        if (diff > 0) d = `<small class="d-up">▲${diff}</small>`;
        else if (diff < 0) d = `<small class="d-down">▼${-diff}</small>`;
      } else if (pc && !pc.e && pc.p === 0 && c.p > 0) {
        d = '<small class="d-up">●</small>';
      }
      // Контроль релевантной: не та страница, что задана целью / URL сменился с прошлой проверки.
      const wrongTarget = c.p > 0 && c.u && kw.target_url && normUrl(c.u) !== normUrl(kw.target_url);
      const urlChanged = c.p > 0 && c.u && pc && !pc.e && pc.p > 0 && pc.u && normUrl(pc.u) !== normUrl(c.u);
      if (urlChanged) d += '<small class="mark-change">◆</small>';
      const label = c.p === 0 ? '—' : c.p;
      const hasUrl = Boolean(c.p > 0 && c.u);
      let tip = hasUrl ? `Открыть релевантную страницу:\n${c.u}` : (c.p === 0 ? 'Не найден в ТОП-' + depth : '');
      const features = Array.isArray(c.f) ? c.f : [];
      if (c.vp > 0 && c.vp !== c.p) tip += `\nβ Приблизительное место с учётом блоков: ${c.vp}`;
      if (features.length) {
        const featureSummary = features.slice(0, 8).map((feature) => {
          const count = Number(feature.count) > 1 ? ` ×${feature.count}` : '';
          return `${serpFeatureLabel(feature)}${count}`;
        }).join(', ');
        tip += `\nβ Обнаруженные блоки: ${featureSummary}`;
      }
      if (wrongTarget) tip += `\n⚠ Ранжируется не целевая страница.\nЦель: ${kw.target_url}`;
      if (urlChanged) tip += `\n◆ URL сменился, было: ${pc.u}`;
      const betaMark = c.vp > 0 && c.vp !== c.p
        ? `<small class="beta-pos" title="Приблизительное визуальное место">β${c.vp}</small>`
        : (features.length ? '<small class="beta-pos" title="XMLRiver обнаружил спецблоки">β</small>' : '');
      return `<td class="c-pos"><span class="pos ${bucketClass(c.p)}${wrongTarget ? ' wrong' : ''}${hasUrl ? ' has-url' : ''}"
        ${hasUrl ? `data-url="${esc(c.u)}" role="link" tabindex="0"` : ''} title="${esc(tip)}">${label}${d}${betaMark}${hasUrl ? '<small class="open-url">↗</small>' : ''}</span></td>`;
    }).join('');
    return `<tr class="${S.selectedKeywordIds.has(kw.id) ? 'selected' : ''}">
      <td class="c-phrase">
        <input type="checkbox" class="kw-check" data-kw="${kw.id}" ${S.selectedKeywordIds.has(kw.id) ? 'checked' : ''} title="Выбрать запрос">
        <span class="ph-text" data-kw="${kw.id}" title="${esc(kw.phrase)}${kw.target_url ? '\nЦель: ' + esc(kw.target_url) : ''} — клик: график">${kw.target_url ? '<span class="t-mark" title="Задан целевой URL">⌖</span>' : ''}${esc(kw.phrase)}</span>
        ${kw.tag ? `<span class="kw-tag">${esc(kw.tag)}</span>` : ''}
        <span class="kw-icons">
          <span class="kw-copy" data-kw="${kw.id}" title="Копировать запрос">⧉</span>
          <span class="kw-chart" data-kw="${kw.id}" title="График динамики">📈</span>
          <span class="kw-target" data-kw="${kw.id}" title="Целевой URL">⌖</span>
          <span class="kw-del" data-kw="${kw.id}" title="Удалить фразу">✕</span>
        </span>
      </td>
      ${hasFreq ? `<td class="c-freq">${fmtFreq(kw.freq)}</td>` : ''}
      ${hasStats ? (() => {
        const st = g.stats && g.stats[kw.id] && g.stats[kw.id][S.engine];
        if (!st) return '<td class="c-stat"></td><td class="c-stat"></td><td class="c-stat"></td>';
        const period = st.df && st.dt ? `${st.df} — ${st.dt}` : `${st.d || psDays} дней`;
        const tip = `За ${period}${st.s ? ` · CTR ${(st.r * 100).toFixed(1)}%` : ''} · обновлено ${fmtDate(st.at)}`;
        return `<td class="c-stat" title="${esc(tip)}">${fmtFreq(st.s)}</td>
          <td class="c-stat" title="${esc(tip)}">${fmtFreq(st.c)}</td>
          <td class="c-stat" title="${esc(tip)}">${st.p != null && st.s > 0 ? st.p.toFixed(1) : ''}</td>`;
      })() : ''}
      ${hasMetrika ? (() => {
        const st = g.metrika && g.metrika[kw.id] && g.metrika[kw.id][S.engine];
        if (!st) return '<td class="c-stat c-metrika"></td><td class="c-stat"></td><td class="c-stat"></td><td class="c-stat"></td>';
        const period = st.df && st.dt ? `${st.df} — ${st.dt}` : `${st.d || psDays} дней`;
        const sample = st.sampled ? ` · выборка${st.share != null ? ` ${(st.share * 100).toFixed(0)}%` : ''}` : '';
        const tip = `Яндекс Метрика за ${period}${sample} · обновлено ${fmtDate(st.at)}`;
        return `<td class="c-stat c-metrika" title="${esc(tip)}">${fmtFreq(st.v)}</td>
          <td class="c-stat" title="${esc(tip)}">${fmtFreq(st.u)}</td>
          <td class="c-stat" title="${esc(tip)}">${Number(st.b || 0).toFixed(1)}%</td>
          <td class="c-stat" title="${esc(tip)}">${st.g == null ? '' : Number(st.g).toLocaleString('ru-RU')}</td>`;
      })() : ''}
      ${colSpacer(colStart)}
      ${tds}
      ${colSpacer(displayRuns.length - colEnd)}
    </tr>`;
  }).join('');

  const emptyRuns = !runs.length
    ? `<tr><td class="c-phrase" style="color:var(--muted2)">Проверок ещё не было — нажмите «Обновить»</td></tr>`
    : '';

  const staticColumns = 1 + (hasFreq ? 1 : 0) + (hasStats ? 3 : 0) + (hasMetrika ? 4 : 0);
  const totalColumns = staticColumns + visibleRuns.length + (colStart > 0 ? 1 : 0) + (colEnd < displayRuns.length ? 1 : 0);
  const topSpacer = rowStart > 0
    ? `<tr class="v-row-space"><td colspan="${totalColumns}" style="height:${rowStart * S.virtual.rowHeight}px"></td></tr>`
    : '';
  const bottomRows = kws.length - rowEnd;
  const bottomSpacer = bottomRows > 0
    ? `<tr class="v-row-space"><td colspan="${totalColumns}" style="height:${bottomRows * S.virtual.rowHeight}px"></td></tr>`
    : '';

  return `${betaBanner}${bulkBar}${renderHistoryPager()}<div class="grid-wrap"><table class="grid">
    <thead>${head}</thead>
    <tbody>${topSpacer}${rows}${bottomSpacer}${emptyRuns}</tbody>
  </table></div>`;
}

/* ============ вид «Изменения» ============ */

function renderChanges() {
  const analysis = S.grid?.analysis;
  if (!analysis || !analysis.previousRun) {
    return `<div class="empty"><div class="e-title">Нужно минимум два прогона</div>
      <div class="e-sub">После второй проверки здесь появятся важные падения, входы в ТОП, смены URL и динамика групп.</div></div>`;
  }
  const current = analysis.current;
  const previous = analysis.previous;
  const changes = analysis.changes;
  const delta = (value, digits = 0) => {
    const rounded = Number(value || 0).toFixed(digits);
    if (Number(rounded) === 0) return '<span class="c-delta d-zero">·</span>';
    return `<span class="c-delta ${value > 0 ? 'd-up' : 'd-down'}">${value > 0 ? '▲' : '▼'}${Math.abs(Number(rounded))}</span>`;
  };
  const list = (title, items, formatter, cls = '') => `
    <div class="change-panel ${cls}">
      <div class="change-panel-head">${title}<b>${items.length}</b></div>
      <div class="change-list">
        ${items.slice(0, 30).map((item) => `<div class="change-row">
          <span title="${esc(item.phrase)}">${esc(item.phrase)}</span>
          <strong>${formatter(item)}</strong>
        </div>`).join('') || '<div class="cmp-empty">Нет</div>'}
      </div>
    </div>`;
  const serious = [
    ...changes.leftTop10.map((item) => ({ ...item, kind: 'top10' })),
    ...changes.bigDrops.map((item) => ({ ...item, kind: 'drop' })),
    ...changes.errors.map((item) => ({ ...item, kind: 'error' })),
  ];

  return `<div class="changes-wrap">
    <div class="changes-period">${fmtDateFull(analysis.previousRun.started_at)} → ${fmtDateFull(analysis.currentRun.started_at)}</div>
    <div class="cmp-summary">
      <div class="card"><div class="c-label">Видимость с частотностью</div><div class="c-value">${current.visibility.toFixed(1)}%${delta(analysis.visibilityDelta, 1)}</div></div>
      <div class="card"><div class="c-label">ТОП-3</div><div class="c-value">${current.top3}${delta(current.top3 - previous.top3)}</div></div>
      <div class="card"><div class="c-label">ТОП-10</div><div class="c-value">${current.top10}${delta(current.top10 - previous.top10)}</div></div>
      <div class="card"><div class="c-label">ТОП-30</div><div class="c-value">${current.top30}${delta(current.top30 - previous.top30)}</div></div>
      <div class="card"><div class="c-label">ТОП-100</div><div class="c-value">${current.top100}${delta(current.top100 - previous.top100)}</div></div>
    </div>
    ${analysis.importantCount ? `<div class="alert-strip">⚠ Значимых сигналов: <b>${analysis.importantCount}</b>. В системные уведомления попадают выходы из ТОП-10, резкие падения, ошибки и смены URL.</div>` : '<div class="alert-strip ok">✓ Значимых ухудшений нет</div>'}
    <div class="changes-grid">
      ${list('🚨 Важные сигналы', serious, (item) => item.kind === 'error'
        ? `<span class="d-down">ошибка</span>`
        : `<span class="d-down">${item.from || '—'} → ${item.to || 'выпала'}</span>`, 'critical')}
      ${list('✅ Вошли в ТОП-10', changes.enteredTop10, (item) => `<span class="d-up">→ ${item.to}</span>`)}
      ${list('📈 Лучший рост', changes.up, (item) => `<span class="d-up">${item.from} → ${item.to} ▲${item.diff}</span>`)}
      ${list('📉 Снижение', changes.down, (item) => `<span class="d-down">${item.from} → ${item.to} ▼${item.diff}</span>`)}
      ${list('◆ Смена релевантного URL', changes.urlChanged, (item) => `<span title="${esc(item.toUrl)}">${item.from} → ${item.to}</span>`)}
      ${list('⌖ Не целевая страница', changes.wrongTarget, (item) => `<span class="d-down">позиция ${item.position}</span>`)}
    </div>
    ${analysis.groups.length ? `<div class="insight">
      <div class="insight-title">Группы запросов <span class="insight-sub">— сначала группы с наибольшим падением видимости</span></div>
      <table class="insight-tbl">
        <tr><th>Группа</th><th>Фраз</th><th>ТОП-10</th><th>Видимость</th><th>Изменение</th></tr>
        ${analysis.groups.slice(0, 20).map((group) => `<tr>
          <td>${esc(group.name)}</td><td>${group.keywords}</td>
          <td>${group.top10Before} → ${group.top10Now}</td>
          <td>${group.visibilityNow.toFixed(1)}%</td>
          <td class="${group.visibilityDelta >= 0 ? 'gain' : 'bad'}">${group.visibilityDelta >= 0 ? '+' : ''}${group.visibilityDelta.toFixed(1)} п.п.</td>
        </tr>`).join('')}
      </table>
    </div>` : ''}
    ${analysis.cannibalization.length ? `<div class="insight">
      <div class="insight-title">Возможная каннибализация <span class="insight-sub">— за последние проверки у фразы менялся ранжируемый URL</span></div>
      <table class="insight-tbl">
        <tr><th>Фраза</th><th>Разных URL</th><th>Последние страницы</th></tr>
        ${analysis.cannibalization.slice(0, 20).map((item) => `<tr>
          <td>${esc(item.phrase)}</td><td>${item.urls.length}</td>
          <td title="${esc(item.urls.join('\n'))}">${esc(item.urls.slice(-2).map(normUrl).join(' ↔ '))}</td>
        </tr>`).join('')}
      </table>
    </div>` : ''}
    ${renderHistoryPager()}
  </div>`;
}

/* ============ вид «Динамика» ============ */

function renderDynamics() {
  const g = S.grid;
  if (!g || g.runs.length < 1) {
    return `<div class="empty"><div class="e-title">Нет данных для графиков</div>
      <div class="e-sub">Сделайте хотя бы одну проверку позиций — здесь появится динамика ТОПов, средней позиции, видимости и прогноз трафика.</div></div>`;
  }
  const m = S.dyn.metric;
  const metrics = [
    ['top', 'Динамика ТОП'],
    ['avg', 'Средняя позиция'],
    ['vis', 'Видимость'],
    ['traffic', 'Трафик-прогноз'],
  ];
  const hasFreq = g.keywords.some((k) => k.freq != null);
  return `
    <div class="dyn-wrap">
      <div class="dyn-tabs">
        ${metrics.map(([k, t]) => `<button class="dyn-tab ${m === k ? 'active' : ''} ${k === 'traffic' && !hasFreq ? 'off' : ''}" data-metric="${k}">${t}</button>`).join('')}
      </div>
      ${m === 'top' ? `<div class="dyn-legend">
        ${[[3, '--green'], [5, '--green-soft'], [10, '--yellow'], [30, '--orange']].map(([n]) => `
          <button class="lg-btn ${S.dyn.tops[n] ? 'on' : ''}" data-top="${n}"><i class="lg-dot lg-t${n}"></i>ТОП-${n}</button>`).join('')}
      </div>` : ''}
      <div class="dyn-tools">
        <button class="btn" id="btnNotes">Заметки${g.notes?.length ? ` (${g.notes.length})` : ''}</button>
        <span>Отмечайте изменения на сайте, релизы и апдейты поисковиков прямо на графике.</span>
      </div>
      <div class="dyn-chart-box"><canvas id="dynCanvas" class="dyn-canvas"></canvas></div>
      ${renderDynInsights()}
      ${renderHistoryPager()}
    </div>`;
}

// «Сверх аналогов»: трафик-потенциал (недобор из-за позиции) + синтетика vs реальные клики.
function renderDynInsights() {
  const g = S.grid;
  const last = g.runs[g.runs.length - 1];
  const hasFreq = g.keywords.some((k) => k.freq != null);
  const hasStats = g.keywords.some((k) => g.stats && g.stats[k.id] && g.stats[k.id][S.engine]);

  let potential = '';
  if (hasFreq) {
    const rows = [];
    for (const kw of g.keywords) {
      const c = (g.cells[kw.id] || {})[last.id];
      if (!c || c.e || !kw.freq) continue;
      const cur = c.p > 0 ? ctrAt(c.p) : 0;
      const gain = (kw.freq || 0) * (ctrAt(3) - cur); // потенциал выхода в ТОП-3
      if (gain > 1) rows.push({ phrase: kw.phrase, pos: c.p, freq: kw.freq, gain: Math.round(gain) });
    }
    rows.sort((a, b) => b.gain - a.gain);
    const top = rows.slice(0, 8);
    if (top.length) {
      potential = `<div class="insight">
        <div class="insight-title">🚀 Где недобираем трафик <span class="insight-sub">— подними в ТОП-3, получишь визитов/мес</span></div>
        <table class="insight-tbl">
          <tr><th>Фраза</th><th>Сейчас</th><th>Частота</th><th>+визитов при ТОП-3</th></tr>
          ${top.map((r) => `<tr><td>${esc(r.phrase)}</td><td><span class="pos ${bucketClass(r.pos)}" style="min-width:26px">${r.pos === 0 ? '—' : r.pos}</span></td><td>${fmtFreq(r.freq)}</td><td class="gain">+${fmtFreq(r.gain)}</td></tr>`).join('')}
        </table>
      </div>`;
    }
  }

  let mismatch = '';
  if (hasStats) {
    const rows = [];
    for (const kw of g.keywords) {
      const c = (g.cells[kw.id] || {})[last.id];
      const st = g.stats[kw.id] && g.stats[kw.id][S.engine];
      if (!c || c.e || c.p < 1 || c.p > 10 || !st || !st.s) continue;
      const expected = ctrAt(c.p);
      const real = st.r || 0;
      if (real < expected * 0.5 && st.s >= 20) { // реальный CTR вдвое ниже ожидаемого
        rows.push({ phrase: kw.phrase, pos: c.p, shows: st.s, real, expected });
      }
    }
    rows.sort((a, b) => b.shows - a.shows);
    const top = rows.slice(0, 6);
    if (top.length) {
      mismatch = `<div class="insight">
        <div class="insight-title">🎯 Позиция есть — кликов нет <span class="insight-sub">— хорошая позиция, но CTR ниже ожидаемого: проблема заголовка/сниппета</span></div>
        <table class="insight-tbl">
          <tr><th>Фраза</th><th>Позиция</th><th>Показы</th><th>CTR факт</th><th>CTR норма</th></tr>
          ${top.map((r) => `<tr><td>${esc(r.phrase)}</td><td><span class="pos ${bucketClass(r.pos)}" style="min-width:26px">${r.pos}</span></td><td>${fmtFreq(r.shows)}</td><td class="bad">${(r.real * 100).toFixed(1)}%</td><td>${(r.expected * 100).toFixed(1)}%</td></tr>`).join('')}
        </table>
      </div>`;
    }
  }

  let urls = '';
  if (g.runs.length > 1) {
    const currentRun = g.runs[g.runs.length - 1];
    const previousRun = g.runs[g.runs.length - 2];
    const rows = window.SerpDeskInsights.urlDynamics(g.keywords, g.cells, currentRun.id, previousRun.id);
    const growing = rows.filter((row) => row.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 5);
    const falling = rows.filter((row) => row.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 5);
    const urlRows = (items, kind) => items.map((row) => `<tr>
      <td title="${esc(row.url)}">${esc(normUrl(row.url))}</td>
      <td>${row.keywords}</td><td>${row.current.toFixed(1)}%</td>
      <td class="${kind === 'up' ? 'gain' : 'bad'}">${row.delta > 0 ? '+' : ''}${row.delta.toFixed(1)} п.п.</td>
    </tr>`).join('');
    if (growing.length || falling.length) urls = `<div class="insight">
      <div class="insight-title">Динамика страниц <span class="insight-sub">— изменение видимости URL между двумя последними проверками</span></div>
      <div class="url-dynamics-grid">
        <div><b class="url-dyn-head d-up">Растут</b><table class="insight-tbl"><tr><th>Страница</th><th>Фраз</th><th>Сейчас</th><th>Δ</th></tr>${urlRows(growing, 'up') || '<tr><td colspan="4">—</td></tr>'}</table></div>
        <div><b class="url-dyn-head d-down">Падают</b><table class="insight-tbl"><tr><th>Страница</th><th>Фраз</th><th>Сейчас</th><th>Δ</th></tr>${urlRows(falling, 'down') || '<tr><td colspan="4">—</td></tr>'}</table></div>
      </div>
    </div>`;
  }

  if (!potential && !mismatch && !urls) return '';
  return `<div class="insights">${urls}${potential}${mismatch}</div>`;
}

function bindDynamicsEvents() {
  const main = $('#main');
  main.querySelectorAll('.dyn-tab').forEach((b) => {
    b.onclick = () => {
      if (b.classList.contains('off')) { toast('Нужна частотность Вордстат — соберите её в «+ Запросы»', 'err'); return; }
      S.dyn.metric = b.dataset.metric;
      renderMain();
    };
  });
  main.querySelectorAll('.lg-btn').forEach((b) => {
    b.onclick = () => {
      const n = b.dataset.top;
      S.dyn.tops[n] = !S.dyn.tops[n];
      renderMain();
    };
  });
  const notesButton = $('#btnNotes');
  if (notesButton) notesButton.onclick = openNotesModal;
  drawDynamics();
  bindHistoryPager(main);
}

function drawDynamics() {
  const canvas = $('#dynCanvas');
  if (!canvas) return;
  const g = S.grid;
  const runs = g.runs;
  const m = S.dyn.metric;
  const cssVar = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  let series = [];
  let yMax = 100, yLabel = '%', invert = false, pct = true;
  if (m === 'top') {
    const defs = [[3, '--green'], [5, '--green-soft'], [10, '--yellow'], [30, '--orange']].filter(([n]) => S.dyn.tops[n]);
    const total = g.keywords.length || 1;
    series = defs.map(([n, col]) => ({
      label: 'ТОП-' + n,
      color: cssVar(col),
      points: runs.map((r) => (runStats(r.id)['top' + n] / total) * 100),
    }));
    yMax = 100;
  } else if (m === 'avg') {
    series = [{ label: 'Средняя позиция', color: cssVar('--accent'), points: runs.map((r) => runStats(r.id).avg) }];
    const vals = series[0].points.filter((v) => v != null);
    yMax = Math.max(10, Math.ceil((Math.max(...vals, 1)) / 5) * 5);
    invert = true; pct = false; yLabel = 'позиция';
  } else if (m === 'vis') {
    series = [{ label: 'Видимость', color: cssVar('--accent'), points: runs.map((r) => runStats(r.id).visibility) }];
    yMax = Math.max(10, Math.ceil(Math.max(...series[0].points, 1) / 10) * 10);
  } else if (m === 'traffic') {
    series = [{ label: 'Трафик-прогноз', color: cssVar('--green-soft'), points: runs.map((r) => runStats(r.id).traffic) }];
    yMax = Math.max(10, Math.ceil(Math.max(...series[0].points.filter((v) => v != null), 1) / 10) * 10);
    pct = false; yLabel = 'визитов/мес';
  }
  drawMultiLine(canvas, {
    xLabels: runs.map((r) => fmtDate(r.started_at)),
    series, yMax, yLabel, invert, pct,
    notes: g.notes || [],
    runDates: runs.map((r) => r.started_at),
  });
}

function drawMultiLine(canvas, opts) {
  const { xLabels, series, yMax, yLabel, invert, pct, notes = [], runDates = [] } = opts;
  const cssW = Math.max(640, (canvas.parentElement.clientWidth || 720) - 4), cssH = 340;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = cssW * dpr; canvas.height = cssH * dpr;
  canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const col = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  const padL = 46, padR = 16, padT = 16, padB = 30;
  const plotW = cssW - padL - padR, plotH = cssH - padT - padB;
  const n = xLabels.length;
  const x = (i) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v) => {
    const t = Math.min(Math.max(v, 0), yMax) / yMax;
    return invert ? padT + t * plotH : padT + (1 - t) * plotH;
  };

  ctx.font = '10px -apple-system, Segoe UI, sans-serif';
  ctx.fillStyle = col('--muted2');
  ctx.strokeStyle = col('--border-soft');
  ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const val = (yMax / 4) * g;
    const gy = invert ? padT + (val / yMax) * plotH : padT + (1 - val / yMax) * plotH;
    ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(cssW - padR, gy); ctx.stroke();
    ctx.fillText(pct ? val + '%' : String(Math.round(val)), 6, gy + 3);
  }

  const step = Math.max(1, Math.ceil(n / 10));
  for (let i = 0; i < n; i += step) {
    ctx.fillStyle = col('--muted');
    ctx.fillText(xLabels[i], x(i) - 12, cssH - 10);
  }

  for (const s of series) {
    ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.beginPath();
    let started = false;
    s.points.forEach((v, i) => {
      if (v == null) { started = false; return; }
      if (!started) { ctx.moveTo(x(i), y(v)); started = true; } else ctx.lineTo(x(i), y(v));
    });
    ctx.stroke();
    ctx.fillStyle = s.color;
    s.points.forEach((v, i) => {
      if (v == null) return;
      ctx.beginPath(); ctx.arc(x(i), y(v), 3, 0, Math.PI * 2); ctx.fill();
    });
  }

  if (notes.length && runDates.length) {
    const times = runDates.map((value) => new Date(value).getTime());
    const minTime = Math.min(...times), maxTime = Math.max(...times);
    ctx.save();
    ctx.font = '10px -apple-system, Segoe UI, sans-serif';
    for (const note of notes) {
      const time = new Date(`${note.note_date}T12:00:00`).getTime();
      if (!Number.isFinite(time) || time < minTime - 86400000 || time > maxTime + 86400000) continue;
      const ratio = maxTime === minTime ? 0.5 : Math.min(1, Math.max(0, (time - minTime) / (maxTime - minTime)));
      const nx = padL + ratio * plotW;
      ctx.strokeStyle = note.category === 'search' ? col('--orange') : note.category === 'release' ? col('--green-soft') : col('--accent-h');
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(nx, padT); ctx.lineTo(nx, padT + plotH); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath(); ctx.arc(nx, padT + 7, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillText(String(note.title || '').slice(0, 22), Math.min(nx + 5, cssW - 145), padT + 11);
    }
    ctx.restore();
  }
}

async function openNotesModal() {
  const notes = (S.grid?.notes || []).slice().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const categoryName = { change: 'Изменение на сайте', release: 'Релиз', search: 'Апдейт поисковика', other: 'Другое' };
  const renderRows = () => notes.map((note) => `<div class="note-row">
    <div><b>${esc(note.title)}</b><span>${esc(note.note_date)} · ${esc(categoryName[note.category] || 'Другое')}</span>${note.body ? `<small>${esc(note.body)}</small>` : ''}</div>
    <button class="icon-btn note-delete" data-id="${note.id}" title="Удалить заметку">✕</button>
  </div>`).join('') || '<div class="note-empty">Заметок пока нет.</div>';
  const m = openModal(`
    <div class="modal-head"><h2>Заметки на графике</h2><button class="icon-btn" id="mClose">✕</button></div>
    <div class="modal-body">
      <div class="row2">
        <div class="field"><label>Дата</label><input id="noteDate" type="date" value="${today}"></div>
        <div class="field"><label>Тип</label><select id="noteCategory">
          <option value="change">Изменение на сайте</option><option value="release">Релиз</option>
          <option value="search">Апдейт поисковика</option><option value="other">Другое</option>
        </select></div>
      </div>
      <div class="field"><label>Что произошло</label><input id="noteTitle" maxlength="160" placeholder="Например: обновили каталог"></div>
      <div class="field"><label>Комментарий (необязательно)</label><textarea id="noteBody" rows="3" placeholder="Что именно поменяли"></textarea></div>
      <div class="note-list">${renderRows()}</div>
    </div>
    <div class="modal-foot"><button class="btn" id="mCancel">Закрыть</button><button class="btn btn-primary" id="noteSave">Добавить</button></div>`);
  $('#mClose', m).onclick = closeModal;
  $('#mCancel', m).onclick = closeModal;
  $('#noteSave', m).onclick = async () => {
    try {
      await window.api.addNote({
        projectId: S.activeId,
        date: $('#noteDate', m).value,
        title: $('#noteTitle', m).value,
        body: $('#noteBody', m).value,
        category: $('#noteCategory', m).value,
      });
      closeModal();
      await loadGrid();
      renderMain();
      openNotesModal();
    } catch (error) { toast(error.message.replace(/^.*Error: /, ''), 'err'); }
  };
  m.querySelectorAll('.note-delete').forEach((button) => {
    button.onclick = async () => {
      if (!confirm('Удалить эту заметку?')) return;
      await window.api.deleteNote({ projectId: S.activeId, id: Number(button.dataset.id) });
      closeModal();
      await loadGrid();
      renderMain();
      openNotesModal();
    };
  });
}

/* ============ вид «Регионы β» ============ */

function projectRegionLabel(project) {
  if (S.engine === 'yandex') return project.cfg?.yandex?.lr ? `lr ${project.cfg.yandex.lr}` : 'без региона';
  return project.cfg?.google?.loc || project.cfg?.google?.country || 'без региона';
}

async function loadRegionsData() {
  const projects = regionProjects();
  S.regions.loading = true;
  S.regions.error = null;
  try {
    const rows = await Promise.all(projects.map(async (project) => ({
      project,
      grid: project.id === S.activeId
        ? S.grid
        : await window.api.getGrid({ projectId: project.id, engine: S.engine, device: S.device, limit: 60 }),
    })));
    S.regions.data = rows;
  } catch (error) {
    S.regions.data = null;
    S.regions.error = error.message.replace(/^.*Error: /, '');
  } finally {
    S.regions.loading = false;
  }
}

function renderRegions() {
  if (S.regions.loading) return '<div class="empty"><div class="e-title">Собираю сравнение регионов…</div></div>';
  if (S.regions.error) return `<div class="empty"><div class="e-title">Не удалось собрать сравнение</div><div class="e-sub">${esc(S.regions.error)}</div><button class="btn" id="btnReloadRegions">Повторить</button></div>`;
  const data = S.regions.data;
  if (!data || data.length < 2) return `<div class="empty"><div class="e-title">Нужно два проекта одного домена</div><div class="e-sub">Создайте копию проекта для другого региона. Вкладка сравнит их позиции, ТОП-10 и видимость.</div></div>`;
  const commonPhrases = commonRegionPhrases(data);
  if (!commonPhrases.size) return `<div class="empty"><div class="e-title">Нет общих запросов</div><div class="e-sub">Сравнение строится только по одинаковым фразам в проектах, чтобы разные наборы запросов не искажали результат.</div></div>`;
  const metric = S.regions.metric;
  return `<div class="regions-wrap">
    <div class="beta-notice"><b>Сравнение регионов β.</b> Сопоставляются ${commonPhrases.size} общих запросов в проектах домена ${esc(activeProject().domain)}. Разные наборы фраз не искажают график.</div>
    <div class="dyn-tabs">
      <button class="dyn-tab ${metric === 'avg' ? 'active' : ''}" data-region-metric="avg">Средняя позиция</button>
      <button class="dyn-tab ${metric === 'top10' ? 'active' : ''}" data-region-metric="top10">Фразы в ТОП-10</button>
      <button class="dyn-tab ${metric === 'visibility' ? 'active' : ''}" data-region-metric="visibility">Видимость</button>
    </div>
    <div class="region-legend">${data.map((row, index) => `<span class="region-pill"><i style="background:${regionColor(index)}"></i>${esc(row.project.name)} · ${esc(projectRegionLabel(row.project))}</span>`).join('')}</div>
    <div class="dyn-chart-box"><canvas id="regionCanvas" class="dyn-canvas"></canvas></div>
  </div>`;
}

function regionColor(index) {
  return ['#4f8cff', '#56d364', '#e3b341', '#f0883e', '#bc8cff', '#58c7da'][index % 6];
}

function commonRegionPhrases(data) {
  const sets = data.map((row) => new Set(row.grid.keywords.map((keyword) => String(keyword.phrase || '').trim().toLowerCase())));
  if (!sets.length) return new Set();
  return new Set([...sets[0]].filter((phrase) => sets.every((set) => set.has(phrase))));
}

function drawRegions() {
  const canvas = $('#regionCanvas');
  const data = S.regions.data;
  if (!canvas || !data?.length) return;
  const commonPhrases = commonRegionPhrases(data);
  const days = [...new Set(data.flatMap((row) => row.grid.runs.map((run) => run.started_at.slice(0, 10))))].sort();
  const metric = S.regions.metric;
  const series = data.map((row, index) => {
    const comparableGrid = {
      ...row.grid,
      keywords: row.grid.keywords.filter((keyword) => commonPhrases.has(String(keyword.phrase || '').trim().toLowerCase())),
    };
    const byDay = new Map();
    for (const run of comparableGrid.runs) byDay.set(run.started_at.slice(0, 10), gridRunStats(comparableGrid, run.id));
    return {
      label: row.project.name,
      color: regionColor(index),
      points: days.map((day) => {
        const stats = byDay.get(day);
        if (!stats) return null;
        if (metric === 'top10') return (stats.top10 / Math.max(1, comparableGrid.keywords.length)) * 100;
        return stats[metric];
      }),
    };
  });
  const values = series.flatMap((item) => item.points).filter((value) => value != null && Number.isFinite(value));
  const pct = metric !== 'avg';
  const yMax = pct ? 100 : Math.max(10, Math.ceil(Math.max(...values, 1) / 5) * 5);
  drawMultiLine(canvas, {
    xLabels: days.map((day) => fmtDate(`${day}T12:00:00`)),
    series,
    yMax,
    yLabel: pct ? '%' : 'позиция',
    invert: metric === 'avg',
    pct,
  });
}

function bindRegionEvents() {
  document.querySelectorAll('[data-region-metric]').forEach((button) => {
    button.onclick = () => { S.regions.metric = button.dataset.regionMetric; renderMain(); };
  });
  const reload = $('#btnReloadRegions');
  if (reload) reload.onclick = async () => { await loadRegionsData(); renderMain(); };
  drawRegions();
}

/* ============ вид «Сравнение» ============ */

function renderCompare() {
  const g = S.grid;
  if (!g || g.runs.length < 2) {
    return `<div class="empty"><div class="e-title">Нужно минимум два прогона</div>
      <div class="e-sub">Сравнение показывает, что выросло, упало, вошло и выпало между двумя проверками. Сделайте ещё одну проверку позиций.</div></div>`;
  }
  const runs = g.runs;
  if (S.cmp.b == null) { S.cmp.a = runs[runs.length - 2].id; S.cmp.b = runs[runs.length - 1].id; }
  const opts = (sel) => runs.map((r) => `<option value="${r.id}" ${r.id === sel ? 'selected' : ''}>${esc(fmtDateFull(r.started_at))}</option>`).join('');

  const changes = compareRuns(S.cmp.a, S.cmp.b);
  const box = (title, cls, arr, kind) => `
    <div class="cmp-card ${cls}">
      <div class="cmp-card-h">${title} <b>${arr.length}</b></div>
      <div class="cmp-list">
        ${arr.slice(0, 100).map((c) => `<div class="cmp-row">
          <span class="cmp-ph" title="${esc(c.phrase)}">${esc(c.phrase)}</span>
          <span class="cmp-mv">${fmtCmpMove(c, kind)}</span>
        </div>`).join('') || '<div class="cmp-empty">—</div>'}
      </div>
    </div>`;

  return `
    <div class="cmp-wrap">
      <div class="cmp-pickers">
        <span>С</span><select id="cmpA">${opts(S.cmp.a)}</select>
        <span>на</span><select id="cmpB">${opts(S.cmp.b)}</select>
      </div>
      <div class="cmp-summary">
        <div class="card up"><div class="c-label">Выросли</div><div class="c-value d-up">${changes.up.length}</div></div>
        <div class="card down"><div class="c-label">Упали</div><div class="c-value d-down">${changes.down.length}</div></div>
        <div class="card"><div class="c-label">Вошли в ТОП-${activeProject().cfg.depth}</div><div class="c-value d-up">${changes.entered.length}</div></div>
        <div class="card"><div class="c-label">Выпали</div><div class="c-value d-down">${changes.dropped.length}</div></div>
      </div>
      <div class="cmp-grid">
        ${box('📈 Выросли', 'up', changes.up, 'move')}
        ${box('📉 Упали', 'down', changes.down, 'move')}
        ${box('✅ Вошли в ТОП', 'up', changes.entered, 'enter')}
        ${box('❌ Выпали из ТОП', 'down', changes.dropped, 'drop')}
      </div>
      ${renderHistoryPager()}
    </div>`;
}

function compareRuns(aId, bId) {
  const g = S.grid;
  const up = [], down = [], entered = [], dropped = [];
  for (const kw of g.keywords) {
    const a = (g.cells[kw.id] || {})[aId];
    const b = (g.cells[kw.id] || {})[bId];
    if (!a || !b || a.e || b.e) continue;
    const pa = a.p, pb = b.p;
    const inA = pa > 0, inB = pb > 0;
    if (inA && inB) {
      if (pb < pa) up.push({ phrase: kw.phrase, from: pa, to: pb, diff: pa - pb });
      else if (pb > pa) down.push({ phrase: kw.phrase, from: pa, to: pb, diff: pb - pa });
    } else if (!inA && inB) {
      entered.push({ phrase: kw.phrase, to: pb });
    } else if (inA && !inB) {
      dropped.push({ phrase: kw.phrase, from: pa });
    }
  }
  up.sort((a, b) => b.diff - a.diff);
  down.sort((a, b) => b.diff - a.diff);
  entered.sort((a, b) => a.to - b.to);
  dropped.sort((a, b) => a.from - b.from);
  return { up, down, entered, dropped };
}

function fmtCmpMove(c, kind) {
  if (kind === 'enter') return `<span class="d-up">вошла → ${c.to}</span>`;
  if (kind === 'drop') return `<span class="d-down">${c.from} → выпала</span>`;
  const cls = c.to < c.from ? 'd-up' : 'd-down';
  const arr = c.to < c.from ? '▲' : '▼';
  return `<span class="${cls}">${c.from} → ${c.to} ${arr}${c.diff}</span>`;
}

function bindCompareEvents() {
  const a = $('#cmpA'), b = $('#cmpB');
  if (a) a.onchange = () => { S.cmp.a = Number(a.value); renderMain(); };
  if (b) b.onchange = () => { S.cmp.b = Number(b.value); renderMain(); };
  bindHistoryPager();
}

/* ============ вид «Конкуренты» ============ */

function renderCompetitors() {
  const g = S.grid;
  const comps = g.competitors || [];
  if (!comps.length) {
    return `<div class="empty"><div class="e-title">Конкуренты не заданы</div>
      <div class="e-sub">Добавьте домены-конкурентов в настройках проекта — их позиции будут сниматься из той же выдачи.</div></div>`;
  }
  if (!g.runs.length || !g.compPos || !Object.keys(g.compPos).length) {
    return `<div class="empty"><div class="e-title">Нет данных по конкурентам</div>
      <div class="e-sub">Сделайте проверку позиций — конкуренты (${comps.map(esc).join(', ')}) появятся здесь.</div></div>`;
  }
  const last = g.runs[g.runs.length - 1];
  const posCell = (p) => (p == null) ? '<td class="c-pos"></td>'
    : `<td class="c-pos"><span class="pos ${bucketClass(p)}">${p === 0 ? '—' : p}</span></td>`;

  // Сводка: у кого сколько фраз в ТОП-10.
  const tally = { me: 0 };
  comps.forEach((c) => (tally[c] = 0));
  const kws = visibleKeywords();
  for (const kw of kws) {
    const my = (g.cells[kw.id] || {})[last.id];
    if (my && !my.e && my.p >= 1 && my.p <= 10) tally.me++;
    const cp = g.compPos[kw.id] || {};
    comps.forEach((c) => { if (cp[c] >= 1 && cp[c] <= 10) tally[c]++; });
  }

  const rows = kws.map((kw) => {
    const my = (g.cells[kw.id] || {})[last.id];
    const myp = my && !my.e ? my.p : null;
    const cp = g.compPos[kw.id] || {};
    const cells = comps.map((c) => {
      const v = cp[c];
      // Подсветка: конкурент выше нас.
      const better = v >= 1 && (myp == null || myp === 0 || v < myp);
      return `<td class="c-pos">${v == null ? '' : `<span class="pos ${bucketClass(v)}${better ? ' comp-better' : ''}">${v === 0 ? '—' : v}</span>`}</td>`;
    }).join('');
    return `<tr><td class="c-phrase" title="${esc(kw.phrase)}">${esc(kw.phrase)}</td>${posCell(myp)}${cells}</tr>`;
  }).join('');

  return `
    <div class="grid-wrap"><table class="grid">
      <thead><tr>
        <th class="h-phrase">Фраза (${kws.length})</th>
        <th title="Ваш домен: ${esc(activeProject().domain)}">Вы<br><small>${tally.me} в ТОП-10</small></th>
        ${comps.map((c) => `<th title="${esc(c)}">${esc(c.length > 18 ? c.slice(0, 17) + '…' : c)}<br><small>${tally[c]} в ТОП-10</small></th>`).join('')}
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

function bindCompetitorEvents() {
  const wrap = $('.grid-wrap');
  if (wrap) wrap.scrollLeft = 0;
}

/* ============ действия ============ */

function openUpdateModal() {
  const p = activeProject();
  if (!p) return;
  if (!S.settings.xmlriver_user || !S.settings.xmlriver_key) {
    toast('Сначала укажите доступы XMLRiver в настройках (⚙ внизу слева)', 'err');
    openSettingsModal();
    return;
  }
  const enabled = [
    p.cfg.yandex.enabled ? 'yandex' : null,
    p.cfg.google.enabled ? 'google' : null,
  ].filter(Boolean);
  const missingFreq = (S.grid?.keywords || []).filter((keyword) => keyword.freq == null).length;
  const m = openModal(`
    <div class="modal-head"><h2>Обновить — ${esc(p.name)}</h2><button class="icon-btn" id="mClose">✕</button></div>
    <div class="modal-body update-options">
      <div class="engine-block">
        <div class="sect-title no-border">Позиции</div>
        <div class="hint">Выберите, по каким поисковикам снять новые позиции.</div>
        <div class="update-checks">
          ${enabled.includes('yandex') ? '<label class="check"><input type="checkbox" class="update-engine" value="yandex" checked> Яндекс</label>' : ''}
          ${enabled.includes('google') ? '<label class="check"><input type="checkbox" class="update-engine" value="google" checked> Google</label>' : ''}
        </div>
        <button class="btn btn-primary" id="mUpdatePositions">Рассчитать и обновить позиции</button>
      </div>
      <div class="engine-block">
        <div class="sect-title no-border">Частотность Wordstat</div>
        <div class="hint">Регион берётся из настроек Яндекса этого проекта: lr=${esc(p.cfg.yandex.lr || 'без региона')}.</div>
        <label class="check"><input type="radio" name="freqMode" value="all" checked> Пересобрать для всех запросов (${p.keywordCount})</label>
        <label class="check"><input type="radio" name="freqMode" value="missing"> Только без частотности (${missingFreq})</label>
        <div class="hint" id="freqEstimate"></div>
        <button class="btn" id="mUpdateFreq">Обновить частотность</button>
      </div>
    </div>
    <div class="modal-foot"><button class="btn" id="mCancel">Закрыть</button></div>
  `);
  $('#mClose', m.parentElement).onclick = closeModal;
  $('#mCancel', m).onclick = closeModal;
  const syncFreqEstimate = () => {
    const all = m.querySelector('input[name="freqMode"]:checked').value === 'all';
    const requests = all ? p.keywordCount : missingFreq;
    const price = S.balance?.ok && S.balance.costYandex != null
      ? requests * Number(S.balance.costYandex) / 1000
      : null;
    $('#freqEstimate', m).textContent = `${requests} запросов к XMLRiver${price == null ? '' : ` · примерно ${price.toFixed(2)} ₽`}`;
  };
  m.querySelectorAll('input[name="freqMode"]').forEach((radio) => { radio.onchange = syncFreqEstimate; });
  syncFreqEstimate();
  $('#mUpdatePositions', m).onclick = async () => {
    const engines = [...m.querySelectorAll('.update-engine:checked')].map((input) => input.value);
    if (!engines.length) { toast('Выберите хотя бы один поисковик', 'err'); return; }
    closeModal();
    await startCheck(engines);
  };
  $('#mUpdateFreq', m).onclick = async () => {
    const refreshAll = m.querySelector('input[name="freqMode"]:checked').value === 'all';
    const button = $('#mUpdateFreq', m);
    button.disabled = true;
    button.textContent = 'Запускаю…';
    try {
      const result = await window.api.collectFreq({ projectId: p.id, refreshAll });
      if (!result.started) {
        button.disabled = false;
        button.textContent = 'Обновить частотность';
        toast(result.reason === 'running' ? 'Частотность этого проекта уже обновляется' : 'Обновлять нечего', 'ok');
        return;
      }
      closeModal();
      S.freqProg = { done: 0, total: result.total };
      renderMain();
      toast(`Собираю частотность: ${result.total} запросов`);
    } catch (e) {
      button.disabled = false;
      button.textContent = 'Обновить частотность';
      toast(e.message.replace(/^.*Error: /, ''), 'err');
    }
  };
}

async function startCheck(engines) {
  const p = activeProject();
  if (!p) return;
  try {
    const estimate = await window.api.estimateCheck({ projectId: p.id, engines });
    const engName = (engine) => engine === 'yandex' ? 'Яндекс' : 'Google';
    const devName = (device) => device === 'mobile' ? 'мобайл' : 'десктоп';
    const money = (value) => value == null ? 'цена недоступна' : `${Number(value).toFixed(2)} ₽`;
    const m = openModal(`
      <div class="modal-head"><h2>Оценка проверки — ${esc(p.name)}</h2><button class="icon-btn" id="mClose">✕</button></div>
      <div class="modal-body">
        <div class="estimate-total">
          <div><span>Фраз</span><b>${estimate.keywordCount}</b></div>
          <div><span>Запросов максимум</span><b>${estimate.requests}</b></div>
          <div><span>Ориентировочная стоимость</span><b>${money(estimate.cost)}</b></div>
          ${estimate.balance != null ? `<div><span>Баланс после проверки, не менее</span><b>${money(Math.max(0, estimate.balance - (estimate.cost || 0)))}</b></div>` : ''}
        </div>
        <div class="estimate-parts">
          ${estimate.details.map((item) => `<div>
            <span>${engName(item.engine)} · ${devName(item.device)}</span>
            <b>до ${item.requests} запросов · ${money(item.cost)}</b>
          </div>`).join('')}
        </div>
        <div class="hint">Это верхняя оценка. Без конкурентов SerpDesk прекращает листать выдачу, когда находит ваш сайт, поэтому фактический расход часто ниже. После проверки точное число попадёт в журнал расходов.</div>
      </div>
      <div class="modal-foot">
        <button class="btn" id="mCancel">Отмена</button>
        <button class="btn btn-primary" id="mRun">Запустить проверку</button>
      </div>
    `);
    $('#mClose', m.parentElement).onclick = closeModal;
    $('#mCancel', m).onclick = closeModal;
    $('#mRun', m).onclick = async () => {
      closeModal();
      await launchCheck(p, engines);
    };
  } catch (e) {
    toast(e.message.replace(/^.*Error: /, ''), 'err');
  }
}

async function launchCheck(p, engines) {
  try {
    S.progress = { engine: engines[0] || S.engine, done: 0, total: p.keywordCount, phrase: '', position: null };
    await window.api.startCheck({ projectId: p.id, engines });
    await loadProjects();
    render();
  } catch (e) {
    S.progress = null;
    toast(e.message.replace(/^.*Error: /, ''), 'err');
    render();
  }
}

async function openRequestLogModal() {
  let rows;
  try {
    rows = await window.api.listRequestLogs({ projectId: S.activeId, limit: 150 });
  } catch (e) {
    toast(e.message.replace(/^.*Error: /, ''), 'err');
    return;
  }
  const totalRequests = rows.reduce((sum, row) => sum + Number(row.requests || 0), 0);
  const knownCosts = rows.filter((row) => row.actual_cost != null);
  const totalCost = knownCosts.reduce((sum, row) => sum + Number(row.actual_cost || 0), 0);
  const kindName = (kind) => kind === 'wordstat' ? 'Частотность' : kind === 'positions-retry' ? 'Дочек ошибок' : 'Позиции';
  const engineName = (engine) => engine === 'yandex' ? 'Яндекс' : engine === 'google' ? 'Google' : '—';
  const m = openModal(`
    <div class="modal-head"><h2>Журнал XMLRiver</h2><button class="icon-btn" id="mClose">✕</button></div>
    <div class="modal-body">
      <div class="request-summary">
        <div><span>Запросов</span><b>${fmtFreq(totalRequests)}</b></div>
        <div><span>Подтверждённый расход</span><b>${totalCost.toFixed(2)} ₽</b></div>
        <div><span>Операций</span><b>${rows.length}</b></div>
      </div>
      <div class="request-log">
        ${rows.map((row) => `<div class="request-row">
          <div>
            <b>${kindName(row.kind)}</b>
            <span>${engineName(row.engine)}${row.device ? ` · ${row.device === 'mobile' ? 'мобайл' : 'десктоп'}` : ''} · ${fmtDateFull(row.started_at)}</span>
          </div>
          <div><b>${row.requests} запросов</b><span>${row.actual_cost == null ? 'стоимость неизвестна' : Number(row.actual_cost).toFixed(2) + ' ₽'} · ${esc(row.status)}</span></div>
        </div>`).join('') || '<div class="cmp-empty">Проверок ещё не было</div>'}
      </div>
      <div class="hint">Стоимость рассчитывается по цене XMLRiver на момент запуска. Импорт истории и данные Вебмастера/Search Console в журнал не входят — они не расходуют запросы XMLRiver.</div>
    </div>
    <div class="modal-foot">
      <button class="btn" id="mRefreshBalance">Обновить баланс</button>
      <button class="btn btn-primary" id="mClose2">Закрыть</button>
    </div>
  `);
  $('#mClose', m.parentElement).onclick = closeModal;
  $('#mClose2', m).onclick = closeModal;
  $('#mRefreshBalance', m).onclick = async () => { await refreshBalance(); toast('Баланс обновлён', 'ok'); };
}

async function retryErrors() {
  const p = activeProject();
  if (!p) return;
  try {
    S.progress = { engine: S.engine, done: 0, total: lastRunErrors(), phrase: '', position: null };
    await window.api.retryErrors({ projectId: p.id, engine: S.engine, device: S.device });
    await loadProjects();
    render();
  } catch (e) {
    S.progress = null;
    toast(e.message.replace(/^.*Error: /, ''), 'err');
    render();
  }
}

async function refreshPs() {
  const p = activeProject();
  if (!p) return;
  if (!S.settings.yavm_token && !S.settings.gsc_key_path && !S.settings.gsc_refresh_token && !S.settings.metrika_token) {
    toast('Сначала подключите хотя бы один источник данных в настройках (⚙)', 'err');
    openSettingsModal();
    return;
  }
  const btn = $('#btnPs');
  if (btn) { btn.disabled = true; btn.textContent = '⟳ …'; }
  try {
    const r = await window.api.refreshPsStats({ projectId: p.id });
    const msg = [];
    if (r.yandex) msg.push(r.yandex.error ? `ЯВМ: ${r.yandex.error}` : `ЯВМ: найдено ${r.yandex.matched} из ${r.yandex.total} фраз`);
    if (r.google) msg.push(r.google.error ? `GSC: ${r.google.error}` : `GSC: найдено ${r.google.matched} из ${r.google.total} фраз`);
    if (r.metrika) msg.push(r.metrika.error
      ? `Метрика: ${r.metrika.error}`
      : `Метрика: Яндекс ${r.metrika.matchedYandex}, Google ${r.metrika.matchedGoogle} из ${r.metrika.total} фраз${r.metrika.goalsAvailable === false ? ', без целей' : ''}`);
    const hasErr = (r.yandex && r.yandex.error) || (r.google && r.google.error) || (r.metrika && r.metrika.error);
    toast(msg.join(' · ') || 'Нечего обновлять', hasErr ? 'err' : 'ok');
    await loadGrid();
    renderMain();
  } catch (e) {
    toast(e.message.replace(/^.*Error: /, ''), 'err');
    if (btn) { btn.disabled = false; btn.textContent = '⟳ Данные'; }
  }
}

async function doExport() {
  try {
    const r = await window.api.exportCsv({ projectId: S.activeId, engine: S.engine, device: S.device });
    if (r.saved) toast('CSV сохранён: ' + r.filePath, 'ok');
  } catch (e) {
    toast(e.message.replace(/^.*Error: /, ''), 'err');
  }
}

/* ============ модалки ============ */

function openModal(html) {
  const root = $('#modalRoot');
  root.innerHTML = `<div class="overlay"><div class="modal">${html}</div></div>`;
  const overlay = $('.overlay', root);
  overlay.onmousedown = (e) => { if (e.target === overlay) closeModal(); };
  document.addEventListener('keydown', escHandler);
  return $('.modal', root);
}
function escHandler(e) { if (e.key === 'Escape') closeModal(); }
function closeModal() {
  $('#modalRoot').innerHTML = '';
  document.removeEventListener('keydown', escHandler);
}

/* ---- настройки ---- */

async function openSettingsModal() {
  S.settings = await window.api.getSettings();
  const s = S.settings;
  const m = openModal(`
    <div class="modal-head"><h2>Настройки</h2><button class="icon-btn" id="mClose">✕</button></div>
    <div class="modal-body">
      <div class="field">
        <label>XMLRiver user ID</label>
        <input type="text" id="fUser" value="${esc(s.xmlriver_user)}" placeholder="например, 12345">
      </div>
      <div class="field">
        <label>XMLRiver API key</label>
        <input type="password" id="fKey" value="${esc(s.xmlriver_key)}" placeholder="ключ из кабинета xmlriver.com">
        <div class="hint">Кабинет → «Подключение». Оба значения есть в готовом URL вида …xml?user=NNN&amp;key=XXX</div>
      </div>
      <div class="row2">
        <div class="field">
          <label>Потоки (параллельные запросы)</label>
          <select id="fConc">${[1,2,3,4,5,6,8,10].map((n) => `<option value="${n}" ${String(n) === s.concurrency ? 'selected' : ''}>${n}</option>`).join('')}</select>
        </div>
        <div class="field">
          <label>Автопроверка (пока открыто приложение)</label>
          <div style="display:flex;gap:9px;align-items:center">
            <input type="checkbox" id="fAutoOn" ${s.autocheck_enabled === '1' ? 'checked' : ''}>
            <input type="time" id="fAutoTime" value="${esc(s.autocheck_time)}">
          </div>
        </div>
      </div>
      <label class="check"><input type="checkbox" id="fVicOn" ${s.victory_enabled === '1' ? 'checked' : ''}> «УРА, ПОБЕДА!» — видео со звуком после завершения проверки</label>
      <div class="engine-block">
        <label class="check"><input type="checkbox" id="fAlertsOn" ${s.alerts_enabled !== '0' ? 'checked' : ''}> Системные уведомления о важных изменениях</label>
        <label class="check"><input type="checkbox" id="fAlertsImportant" ${s.alerts_only_important !== '0' ? 'checked' : ''}> Уведомлять только об ухудшениях</label>
        <div class="hint">Важными считаются выходы из ТОП-10, выпадения, падения на 10+ позиций, смены URL, ошибки и снижение видимости более чем на 5 п.п.</div>
      </div>
      <div class="field">
        <label>База данных (перенос между Mac и Windows)</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn" id="fDbExport">Экспорт базы…</button>
          <button class="btn" id="fDbImport">Импорт базы…</button>
          <button class="btn" id="fDbBackups">Автокопии…</button>
          <button class="btn" id="fDiagnostics">Собрать диагностику…</button>
        </div>
        <div class="hint">SerpDesk автоматически хранит 14 ежедневных копий. Диагностика сохраняет версии, состояния запусков и последние ошибки, но не включает API-ключи, токены и пароли.</div>
      </div>
      <div class="sect-title">Реальная статистика поисковиков <span class="hint" style="display:inline">— необязательно, мануал: docs/GSC-YAVM-manual.md</span></div>
      <div class="field">
        <label>Токен Яндекс.Вебмастера (OAuth)</label>
        <input type="password" id="fYavm" value="${esc(s.yavm_token)}" placeholder="OAuth-токен с правами webmaster:hostinfo">
      </div>
      <div class="field">
        <label>Токен Яндекс Метрики (OAuth, необязательно)</label>
        <input type="password" id="fMetrika" value="${esc(s.metrika_token || '')}" placeholder="OAuth-токен с правами metrika:read">
        <div class="hint">Добавляет визиты, пользователей, отказы и цели по самим поисковым фразам. Данные по URL не распределяются. Метрика может скрывать часть низкочастотных запросов.</div>
      </div>
      <div class="field">
        <label>Google Search Console — способ 1: вход через Google (видит все сайты, к которым у тебя есть доступ, включая чужие)</label>
        <div class="row2" style="margin-bottom:8px">
          <input type="text" id="fGscCid" value="${esc(s.gsc_client_id)}" placeholder="Client ID (…apps.googleusercontent.com)">
          <input type="password" id="fGscCsec" value="${esc(s.gsc_client_secret)}" placeholder="Client secret (GOCSPX-…)">
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn" id="fGscLogin">Войти через Google</button>
          <span class="hint" style="display:inline" id="gscOauthStatus">${s.gsc_refresh_token ? '✓ вход выполнен' : 'вход не выполнен'}</span>
          ${s.gsc_refresh_token ? '<button class="btn" id="fGscLogout">Выйти</button>' : ''}
        </div>
        <div class="hint">Client ID и secret — из Google Cloud → Auth Platform → Clients (тип Desktop). Чтобы вход не протухал каждые 7 дней, опубликуй приложение: Auth Platform → Audience → Publish app.</div>
      </div>
      <div class="field">
        <label>Способ 2: JSON сервисного аккаунта (только свои сайты; используется, если не выполнен вход)</label>
        <div style="display:flex;gap:8px">
          <input type="text" id="fGscPath" readonly value="${esc(s.gsc_key_path)}" placeholder="файл не выбран" style="flex:1">
          <button class="btn" id="fGscPick">Выбрать…</button>
          <button class="btn" id="fGscClear" title="Убрать ключ">✕</button>
        </div>
        <div class="hint">Email сервисного аккаунта добавляется в «Пользователи и разрешения» ресурса Search Console (нужны права владельца/полные).</div>
      </div>
      <div class="conn-result" id="connResult"></div>
    </div>
    <div class="modal-foot">
      <button class="btn spacer" id="mTest">Проверить подключение</button>
      <button class="btn" id="mCancel">Отмена</button>
      <button class="btn btn-primary" id="mSave">Сохранить</button>
    </div>
  `);
  $('#mClose', m.parentElement).onclick = closeModal;
  $('#mCancel', m).onclick = closeModal;
  $('#fGscPick', m).onclick = async () => {
    const r = await window.api.pickJsonFile();
    if (r.path) $('#fGscPath', m).value = r.path;
  };
  $('#fGscClear', m).onclick = () => { $('#fGscPath', m).value = ''; };
  const collect = () => ({
    xmlriver_user: $('#fUser', m).value.trim(),
    xmlriver_key: $('#fKey', m).value.trim(),
    yavm_token: $('#fYavm', m).value.trim(),
    metrika_token: $('#fMetrika', m).value.trim(),
    gsc_key_path: $('#fGscPath', m).value.trim(),
    gsc_client_id: $('#fGscCid', m).value.trim(),
    gsc_client_secret: $('#fGscCsec', m).value.trim(),
  });
  $('#fGscLogin', m).onclick = async () => {
    const st = $('#gscOauthStatus', m);
    const cid = $('#fGscCid', m).value.trim();
    const csec = $('#fGscCsec', m).value.trim();
    if (!cid || !csec) { toast('Заполни Client ID и Client secret', 'err'); return; }
    st.textContent = 'открыл браузер — заверши вход там…';
    try {
      await window.api.gscLogin({ clientId: cid, clientSecret: csec });
      S.settings = await window.api.getSettings();
      st.textContent = '✓ вход выполнен';
      toast('Google подключён — нажми «Проверить подключение»', 'ok');
    } catch (e) {
      st.textContent = 'вход не выполнен';
      toast(e.message.replace(/^.*Error: /, ''), 'err');
    }
  };
  $('#fDbExport', m).onclick = async () => {
    try { const r = await window.api.exportDb(); if (r.saved) toast('База сохранена: ' + r.filePath, 'ok'); }
    catch (e) { toast(e.message.replace(/^.*Error: /, ''), 'err'); }
  };
  $('#fDbImport', m).onclick = async () => {
    if (!confirm('Импорт заменит текущую базу (проекты, фразы, история) и перезапустит приложение. Продолжить?')) return;
    try { await window.api.importDb(); }
    catch (e) { toast(e.message.replace(/^.*Error: /, ''), 'err'); }
  };
  $('#fDbBackups', m).onclick = openBackupsModal;
  $('#fDiagnostics', m).onclick = async () => {
    try {
      const r = await window.api.exportDiagnostics();
      if (r.saved) toast('Диагностика сохранена: ' + r.filePath, 'ok');
    } catch (e) {
      toast(e.message.replace(/^.*Error: /, ''), 'err');
    }
  };
  const lg = $('#fGscLogout', m);
  if (lg) lg.onclick = async () => {
    S.settings = await window.api.setSettings({ gsc_refresh_token: '' });
    $('#gscOauthStatus', m).textContent = 'вход не выполнен';
    lg.remove();
    toast('Вышел из Google', 'ok');
  };
  $('#mTest', m).onclick = async () => {
    const el = $('#connResult', m);
    el.className = 'conn-result';
    el.textContent = 'Проверяю…';
    S.settings = await window.api.setSettings(collect());
    const parts = [];
    let bad = false;
    const r = await window.api.getBalance();
    if (r.ok) {
      parts.push(`XMLRiver: баланс ${r.balance.toFixed(2)} ₽`);
      refreshBalance();
    } else {
      parts.push('XMLRiver: ' + r.error);
      bad = true;
    }
    if (S.settings.yavm_token || S.settings.gsc_key_path || S.settings.gsc_refresh_token || S.settings.metrika_token) {
      const t = await window.api.testPsAccess();
      if (t.yavm) {
        parts.push(t.yavm.ok ? `ЯВМ: доступно сайтов — ${t.yavm.hosts}` : 'ЯВМ: ' + t.yavm.error);
        bad = bad || !t.yavm.ok;
      }
      if (t.gsc) {
        const mode = t.gsc.mode === 'oauth' ? ', через вход Google' : (t.gsc.mode === 'key' ? ', через JSON-ключ' : '');
        parts.push(t.gsc.ok ? `GSC: доступно ресурсов — ${t.gsc.sites}${mode}` : 'GSC: ' + t.gsc.error);
        bad = bad || !t.gsc.ok;
      }
      if (t.metrika) {
        parts.push(t.metrika.ok ? `Метрика: доступно счётчиков — ${t.metrika.counters}` : 'Метрика: ' + t.metrika.error);
        bad = bad || !t.metrika.ok;
      }
    }
    el.className = 'conn-result ' + (bad ? 'err' : 'ok');
    el.textContent = parts.join(' · ');
  };
  $('#mSave', m).onclick = async () => {
    S.settings = await window.api.setSettings({
      ...collect(),
      concurrency: $('#fConc', m).value,
      autocheck_enabled: $('#fAutoOn', m).checked ? '1' : '0',
      autocheck_time: $('#fAutoTime', m).value || '07:00',
      victory_enabled: $('#fVicOn', m).checked ? '1' : '0',
      alerts_enabled: $('#fAlertsOn', m).checked ? '1' : '0',
      alerts_only_important: $('#fAlertsImportant', m).checked ? '1' : '0',
    });
    closeModal();
    toast('Настройки сохранены', 'ok');
    refreshBalance();
  };
}

async function openBackupsModal() {
  const items = await window.api.listBackups();
  const rows = items.length
    ? items.map((item) => `<div class="backup-row">
        <div><b>${esc(item.date.split('-').reverse().join('.'))}</b><span>${(item.size / 1024 / 1024).toFixed(1)} МБ</span></div>
        <button class="btn btn-warn backup-restore" data-name="${esc(item.name)}">Восстановить</button>
      </div>`).join('')
    : '<div class="hint">Автокопий пока нет. Первая появится после следующего запуска приложения.</div>';
  const m = openModal(`
    <div class="modal-head"><h2>Автоматические резервные копии</h2><button class="icon-btn" id="mClose">✕</button></div>
    <div class="modal-body">
      <div class="beta-warning">Хранятся последние 14 ежедневных копий всей базы: проекты, запросы, позиции и настройки.</div>
      <div class="backup-list">${rows}</div>
    </div>
    <div class="modal-foot"><button class="btn" id="mCancel">Закрыть</button></div>
  `);
  $('#mClose', m.parentElement).onclick = closeModal;
  $('#mCancel', m).onclick = closeModal;
  m.querySelectorAll('.backup-restore').forEach((button) => {
    button.onclick = async () => {
      if (!confirm(`Восстановить базу из копии за ${button.closest('.backup-row').querySelector('b').textContent}? Приложение перезапустится.`)) return;
      button.disabled = true;
      button.textContent = 'Восстанавливаю…';
      try { await window.api.restoreBackup({ name: button.dataset.name }); }
      catch (e) { button.disabled = false; button.textContent = 'Восстановить'; toast(e.message.replace(/^.*Error: /, ''), 'err'); }
    };
  });
}

/* ---- проект ---- */

function openProjectModal(p, options = {}) {
  const isDuplicate = Boolean(options.duplicate && p);
  const isNew = !p || isDuplicate;
  const cfg = p ? p.cfg : { depth: 30, device: 'desktop', yandex: { enabled: true, lr: '213', domain: 'ru', source: 'api', serpFeaturesBeta: false }, google: { enabled: false, loc: '', country: '' } };
  const selectedCount = isDuplicate ? S.selectedKeywordIds.size : 0;
  const title = isDuplicate ? 'Дублировать проект' : isNew ? 'Новый проект' : 'Настройки проекта';
  const initialName = isDuplicate ? `${p.name} — копия` : p ? p.name : '';
  const m = openModal(`
    <div class="modal-head"><h2>${title}</h2><button class="icon-btn" id="mClose">✕</button></div>
    <div class="modal-body">
      <div class="row2">
        <div class="field">
          <label>Название</label>
          <input type="text" id="fName" value="${esc(initialName)}" placeholder="Мой сайт">
        </div>
        <div class="field">
          <label>Домен</label>
          <input type="text" id="fDomain" value="${esc(p ? p.domain : '')}" placeholder="site.ru">
        </div>
      </div>
      <label class="check"><input type="checkbox" id="fSub" ${!p || p.subdomains ? 'checked' : ''}> Учитывать поддомены</label>
      <div class="row3">
        <div class="field">
          <label>Глубина проверки</label>
          <select id="fDepth">${[10,20,30,50,100].map((n) => `<option value="${n}" ${cfg.depth === n ? 'selected' : ''}>ТОП-${n}</option>`).join('')}</select>
        </div>
        <div class="field">
          <label>Устройство</label>
          <select id="fDeviceMode">
            <option value="desktop" ${(cfg.deviceMode || 'desktop') === 'desktop' ? 'selected' : ''}>Десктоп</option>
            <option value="mobile" ${cfg.deviceMode === 'mobile' ? 'selected' : ''}>Мобайл</option>
            <option value="both" ${cfg.deviceMode === 'both' ? 'selected' : ''}>Десктоп + мобайл</option>
          </select>
        </div>
        <div class="field">
          <label>Период статистики ПС</label>
          <select id="fPsDays">${[7,14,28,90].map((n) => `<option value="${n}" ${(cfg.psDays || 28) === n ? 'selected' : ''}>${n} дней</option>`).join('')}</select>
        </div>
      </div>
      <div class="hint">Каждые 10 позиций = 1 запрос XMLRiver на фразу (Яндекс через Search API — вся глубина одним запросом). Найдено раньше — глубже не листаем. Период данных применяется к Вебмастеру, GSC и Метрике.</div>
      <div class="field">
        <label>ID счётчика Яндекс Метрики (необязательно)</label>
        <input type="text" inputmode="numeric" id="fMetrikaCounter" value="${esc(cfg.metrikaCounterId || '')}" placeholder="пусто = подобрать по домену автоматически">
        <div class="hint">Нужен только если к токену подключено несколько счётчиков или домен не совпадает с адресом сайта в Метрике.</div>
      </div>
      <div class="engine-block">
        <label class="check"><input type="checkbox" id="fYaOn" ${cfg.yandex.enabled ? 'checked' : ''}> Яндекс</label>
        <div class="field">
          <label>Источник данных</label>
          <select id="fYaSrc">
            <option value="api" ${(cfg.yandex.source || 'api') === 'api' ? 'selected' : ''}>Yandex Search API — топ-100 одним запросом (дешевле)</option>
            <option value="live" ${cfg.yandex.source === 'live' ? 'selected' : ''}>Лайв-выдача — как в браузере, 10 позиций на запрос</option>
          </select>
        </div>
        <label class="check beta-check"><input type="checkbox" id="fSerpBeta" ${cfg.yandex.serpFeaturesBeta ? 'checked' : ''}> β Бета: учитывать рекламу, колдунщики и товарные блоки</label>
        <div class="hint">Работает только с «Лайв-выдачей». XMLRiver вернёт доступные спецблоки без отдельного запроса. Визуальное место приблизительное: состав выдачи меняется, а некоторые динамические элементы могут отсутствовать в XML.</div>
        <div class="row2">
          <div class="field">
            <label>Регион (lr)</label>
            <input type="text" id="fYaLr" list="lrList" value="${esc(cfg.yandex.lr)}" placeholder="213">
            <div class="hint">Код региона Яндекса: 213 — Москва, 2 — СПб…</div>
          </div>
          <div class="field">
            <label>Домен Яндекса</label>
            <select id="fYaDomain">${['ru','com','kz','by','ua','com.tr'].map((d) => `<option ${cfg.yandex.domain === d ? 'selected' : ''}>${d}</option>`).join('')}</select>
          </div>
        </div>
      </div>
      <div class="engine-block">
        <label class="check"><input type="checkbox" id="fGoOn" ${cfg.google.enabled ? 'checked' : ''}> Google</label>
        <div class="row2">
          <div class="field">
            <label>Локация (loc)</label>
            <input type="text" id="fGoLoc" value="${esc(cfg.google.loc)}" placeholder="пусто = настройки кабинета">
          </div>
          <div class="field">
            <label>Страна (country)</label>
            <input type="text" id="fGoCountry" value="${esc(cfg.google.country)}" placeholder="пусто = настройки кабинета">
          </div>
        </div>
        <div class="hint">ID из geo-файлов XMLRiver (кабинет → «Настройки сбора»). Пустые поля — берутся настройки аккаунта.</div>
      </div>
      <div class="field">
        <label>Конкуренты (по желанию, по одному домену на строку)</label>
        <textarea id="fCompetitors" style="min-height:70px" placeholder="competitor1.ru&#10;competitor2.ru">${esc((cfg.competitors || []).join('\n'))}</textarea>
        <div class="hint">Их позиции снимаются из той же выдачи. Внимание: с конкурентами проверка листает выдачу до полной глубины (ранняя остановка отключается) — это дороже по запросам XMLRiver.</div>
      </div>
      ${isDuplicate ? `<div class="engine-block">
        <div class="sect-title no-border">Какие запросы перенести</div>
        <label class="check"><input type="radio" name="copyKeywords" value="all" checked> Все запросы исходного проекта (${p.keywordCount})</label>
        <label class="check"><input type="radio" name="copyKeywords" value="selected" ${selectedCount ? '' : 'disabled'}> Только выделенные в таблице (${selectedCount})</label>
        <label class="check"><input type="radio" name="copyKeywords" value="empty"> Создать без запросов, добавлю новые</label>
        <div class="hint">История позиций не копируется. Частотность будет пустой, потому что она зависит от региона нового проекта.</div>
      </div>` : ''}
    </div>
    <div class="modal-foot">
      ${!isNew ? '<button class="btn btn-danger spacer" id="mDelete">Удалить проект</button>' : ''}
      <button class="btn" id="mCancel">Отмена</button>
      <button class="btn btn-primary" id="mSave">${isDuplicate ? 'Создать копию' : isNew ? 'Создать' : 'Сохранить'}</button>
    </div>
  `);
  $('#mClose', m.parentElement).onclick = closeModal;
  $('#mCancel', m).onclick = closeModal;
  const betaToggle = $('#fSerpBeta', m);
  const yaSource = $('#fYaSrc', m);
  const syncBetaAvailability = () => {
    const available = yaSource.value === 'live';
    betaToggle.disabled = !available;
    if (!available) betaToggle.checked = false;
  };
  yaSource.onchange = syncBetaAvailability;
  syncBetaAvailability();
  if (!isNew) {
    $('#mDelete', m).onclick = async () => {
      if (!confirm(`Удалить проект «${p.name}» со всей историей позиций?`)) return;
      await window.api.deleteProject({ id: p.id });
      closeModal();
      await loadProjects(false);
      await loadGrid();
      render();
      toast('Проект удалён', 'ok');
    };
  }
  $('#mSave', m).onclick = async () => {
    const data = {
      id: !isNew && p ? p.id : undefined,
      name: $('#fName', m).value.trim(),
      domain: $('#fDomain', m).value.trim(),
      subdomains: $('#fSub', m).checked,
      cfg: {
        depth: Number($('#fDepth', m).value),
        deviceMode: $('#fDeviceMode', m).value,
        device: $('#fDeviceMode', m).value === 'mobile' ? 'mobile' : 'desktop',
        psDays: Number($('#fPsDays', m).value) || 28,
        metrikaCounterId: $('#fMetrikaCounter', m).value.trim(),
        competitors: $('#fCompetitors', m).value.split('\n').map((x) => x.trim()).filter(Boolean),
        yandex: {
          enabled: $('#fYaOn', m).checked,
          lr: $('#fYaLr', m).value.trim(),
          domain: $('#fYaDomain', m).value,
          source: $('#fYaSrc', m).value,
          serpFeaturesBeta: $('#fSerpBeta', m).checked,
        },
        google: { enabled: $('#fGoOn', m).checked, loc: $('#fGoLoc', m).value.trim(), country: $('#fGoCountry', m).value.trim() },
      },
    };
    if (!data.domain) { toast('Укажите домен', 'err'); return; }
    if (!data.cfg.yandex.enabled && !data.cfg.google.enabled) { toast('Включите хотя бы один поисковик', 'err'); return; }
    try {
      const keywordMode = isDuplicate ? m.querySelector('input[name="copyKeywords"]:checked').value : null;
      const r = isDuplicate
        ? await window.api.duplicateProject({
            ...data,
            sourceId: p.id,
            keywordMode,
            keywordIds: [...S.selectedKeywordIds],
          })
        : await window.api.saveProject(data);
      closeModal();
      await loadProjects(false);
      S.activeId = r.id;
      S.selectedKeywordIds.clear();
      localStorage.setItem('activeId', S.activeId);
      syncEngineToProject();
      await loadGrid();
      render();
      if (isDuplicate) {
        toast(`Проект создан${r.keywordCount ? `, перенесено запросов: ${r.keywordCount}` : ''}`, 'ok');
        if (keywordMode === 'empty') openKeywordsModal();
      } else if (isNew) openKeywordsModal();
    } catch (e) {
      toast(e.message.replace(/^.*Error: /, ''), 'err');
    }
  };
}

/* ---- запросы ---- */

function openKeywordsModal() {
  const p = activeProject();
  if (!p) return;
  const m = openModal(`
    <div class="modal-head"><h2>Добавить запросы — ${esc(p.name)}</h2><button class="icon-btn" id="mClose">✕</button></div>
    <div class="modal-body">
      <div class="field">
        <label>По одной фразе на строку <span id="kwCount" style="color:var(--muted2)"></span></label>
        <textarea id="fPhrases" placeholder="банкротство физических лиц&#10;списание долгов москва; https://site.ru/spisanie/&#10;…"></textarea>
        <div class="hint">Формат «фраза» или «фраза; целевой URL» — тогда SerpDesk будет подсвечивать, если ранжируется не та страница. Дубликаты отсеются автоматически.</div>
      </div>
      <div class="row2">
        <div class="field">
          <label>Группа (необязательно)</label>
          <input type="text" id="fTag" placeholder="например: услуги">
        </div>
        <div class="field" style="display:flex;align-items:flex-end;padding-bottom:6px">
          <label class="check"><input type="checkbox" id="fFreq"> Собрать частотность Вордстат</label>
        </div>
      </div>
      <div class="hint">Частотность берётся по региону Яндекса из настроек проекта (lr=${esc(p.cfg.yandex.lr || 'все регионы')}), стоимость — как обычный запрос XMLRiver.</div>
    </div>
    <div class="modal-foot">
      <button class="btn" id="mCancel">Отмена</button>
      <button class="btn btn-primary" id="mSave">Добавить</button>
    </div>
  `);
  const ta = $('#fPhrases', m);
  ta.oninput = () => {
    const n = ta.value.split('\n').map((s) => s.trim()).filter(Boolean).length;
    $('#kwCount', m).textContent = n ? `— ${n} шт.` : '';
  };
  ta.focus();
  $('#mClose', m.parentElement).onclick = closeModal;
  $('#mCancel', m).onclick = closeModal;
  $('#mSave', m).onclick = async () => {
    const phrases = ta.value.split('\n').map((s) => s.trim()).filter(Boolean);
    const tag = $('#fTag', m).value.trim();
    const collectFreq = $('#fFreq', m).checked;
    if (!phrases.length) {
      closeModal();
      // Галочка без новых фраз — дособрать частотность по всем фразам без неё.
      if (collectFreq) {
        const cf = await window.api.collectFreq({ projectId: p.id });
        toast(cf.started ? 'Собираю частотность Вордстат…' : 'Частотность уже собрана по всем фразам', cf.started ? '' : 'ok');
      }
      return;
    }
    const r = await window.api.addKeywords({ projectId: p.id, phrases, tag, collectFreq });
    closeModal();
    await Promise.all([loadProjects(), loadGrid()]);
    render();
    toast(`Добавлено фраз: ${r.added}`, 'ok');
    if (r.freqStarted) toast('Собираю частотность Вордстат…');
  };
}

/* ---- импорт истории ---- */

async function openHistoryImport() {
  const project = activeProject();
  if (!project) return;
  let preview;
  try {
    preview = await window.api.pickImportFile({ engine: S.engine, device: S.device });
  } catch (e) {
    toast(e.message.replace(/^.*Error: /, ''), 'err');
    return;
  }
  if (!preview || preview.canceled) return;

  const dates = preview.dates
    .slice()
    .sort((a, b) => a.iso.localeCompare(b.iso))
    .map((date) => `<span class="import-date">${esc(date.label)}</span>`)
    .join('');
  const mapping = [
    ['Фраза', preview.mapping.phrase],
    ['Теги', preview.mapping.tag],
    ['Частотность', preview.mapping.freq],
    ['Целевой URL', preview.mapping.targetUrl],
    ['Релевантный URL', preview.mapping.relevantUrl],
  ];
  const m = openModal(`
    <div class="modal-head"><h2>Импорт истории — ${esc(project.name)}</h2><button class="icon-btn" id="mClose">✕</button></div>
    <div class="modal-body">
      <div class="import-summary">
        <div class="import-file">${esc(preview.fileName)}</div>
        <div class="hint">${preview.sheetName ? `Лист «${esc(preview.sheetName)}» · ` : ''}${preview.phrasesCount} фраз · ${preview.dates.length} дат · ${preview.valuesCount} значений</div>
      </div>
      <div class="field">
        <label>Найденные даты</label>
        <div class="import-dates">${dates}</div>
      </div>
      <div class="row2">
        <div class="field">
          <label>Поисковик</label>
          <select id="fImportEngine">
            <option value="yandex" ${preview.engine === 'yandex' ? 'selected' : ''}>Яндекс</option>
            <option value="google" ${preview.engine === 'google' ? 'selected' : ''}>Google</option>
          </select>
        </div>
        <div class="field">
          <label>Устройство</label>
          <select id="fImportDevice">
            <option value="desktop" ${preview.device === 'desktop' ? 'selected' : ''}>Десктоп</option>
            <option value="mobile" ${preview.device === 'mobile' ? 'selected' : ''}>Мобайл</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label>Сопоставление полей</label>
        <div class="import-mapping">
          ${mapping.map(([label, value]) => `<div><span>${esc(label)}</span><b class="${value === 'не найдено' ? 'missing' : ''}">${esc(value)}</b></div>`).join('')}
          <div><span>Позиции</span><b>${preview.dates.length} столбца с датами</b></div>
        </div>
        <div class="hint">Необязательные поля можно не заполнять. Импорт дополняет проект и перезаписывает только совпавшие фразу, дату, поисковик и устройство.</div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn" id="mCancel">Отмена</button>
      <button class="btn btn-primary" id="mImport">Импортировать</button>
    </div>
  `);
  $('#mClose', m.parentElement).onclick = closeModal;
  $('#mCancel', m).onclick = closeModal;
  $('#mImport', m).onclick = async () => {
    const button = $('#mImport', m);
    const engine = $('#fImportEngine', m).value;
    const device = $('#fImportDevice', m).value;
    button.disabled = true;
    button.textContent = 'Импортирую…';
    try {
      const result = await window.api.importHistory({
        projectId: project.id,
        importId: preview.importId,
        engine,
        device,
      });
      closeModal();
      S.engine = engine;
      S.device = device;
      await loadProjects();
      await loadGrid();
      render();
      toast(`Импортировано: ${result.phrases} фраз, ${result.dates} дат, ${result.values} значений`, 'ok');
    } catch (e) {
      button.disabled = false;
      button.textContent = 'Импортировать';
      toast(e.message.replace(/^.*Error: /, ''), 'err');
    }
  };
}

/* ---- целевой URL ---- */

function openTargetModal(kw) {
  const m = openModal(`
    <div class="modal-head"><h2>Целевой URL</h2><button class="icon-btn" id="mClose">✕</button></div>
    <div class="modal-body">
      <div class="field">
        <label>${esc(kw.phrase)}</label>
        <input type="text" id="fTarget" value="${esc(kw.target_url || '')}" placeholder="https://site.ru/nuzhnaya-stranica/">
        <div class="hint">Если по фразе будет ранжироваться другая страница — позиция подсветится оранжевым пунктиром. Смена URL между проверками помечается знаком ◆.</div>
      </div>
    </div>
    <div class="modal-foot">
      ${kw.target_url ? '<button class="btn spacer" id="mClear">Убрать цель</button>' : ''}
      <button class="btn" id="mCancel">Отмена</button>
      <button class="btn btn-primary" id="mSave">Сохранить</button>
    </div>
  `);
  const save = async (url) => {
    await window.api.setKeywordTarget({ id: kw.id, url });
    closeModal();
    await loadGrid();
    refreshGrid();
  };
  $('#mClose', m.parentElement).onclick = closeModal;
  $('#mCancel', m).onclick = closeModal;
  const clr = $('#mClear', m);
  if (clr) clr.onclick = () => save('');
  $('#mSave', m).onclick = () => save($('#fTarget', m).value.trim());
  $('#fTarget', m).focus();
}

/* ---- график динамики ---- */

function openChartModal(kw) {
  const g = S.grid;
  const runs = g.runs;
  const depth = activeProject().cfg.depth;
  const engName = S.engine === 'yandex' ? 'Яндекс' : 'Google';
  const m = openModal(`
    <div class="modal-head"><h2>${esc(kw.phrase)}</h2><button class="icon-btn" id="mClose">✕</button></div>
    <div class="modal-body">
      <div class="chart-meta">${engName} · глубина ТОП-${depth}${kw.freq ? ` · частота ${fmtFreq(kw.freq)}` : ''}${kw.target_url ? ` · цель: ${esc(kw.target_url)}` : ''}</div>
      <canvas id="chartCanvas" class="chart-canvas"></canvas>
      <div class="chart-legend">
        <span><i class="lg lg-found"></i> позиция</span>
        <span><i class="lg lg-nf"></i> не в топе</span>
        <span><i class="lg lg-gap"></i> ошибка/нет данных — разрыв</span>
      </div>
      <div id="psHist"></div>
      <div id="metrikaHist"></div>
    </div>
  `);
  $('#mClose', m.parentElement).onclick = closeModal;

  const points = runs.map((r) => {
    const c = (g.cells[kw.id] || {})[r.id];
    if (!c || c.e) return { date: r.started_at, p: null };
    return { date: r.started_at, p: c.p };
  });
  drawChart($('#chartCanvas', m), points, depth);

  // История снимков статистики ПС по этой фразе (копится с каждым «⟳ Данные»).
  window.api.psStatsHistory({ keywordId: kw.id, engine: S.engine }).then((rows) => {
    const box = $('#psHist', m);
    if (!box || !rows || !rows.length) return;
    box.innerHTML = `
      <div class="ps-hist-title">Статистика ${engName === 'Яндекс' ? 'Вебмастера' : 'Search Console'} по снимкам</div>
      <table class="ps-hist">
        <tr><th>Обновлено</th><th>Период</th><th>Показы</th><th>Клики</th><th>CTR</th><th>Ср.поз</th></tr>
        ${rows.map((r) => `<tr>
          <td>${fmtDate(r.fetched_at)}</td>
          <td>${r.date_from && r.date_to ? esc(r.date_from.slice(5) + ' — ' + r.date_to.slice(5)) : (r.days + 'д')}</td>
          <td>${fmtFreq(r.shows)}</td>
          <td>${fmtFreq(r.clicks)}</td>
          <td>${r.shows ? (r.ctr * 100).toFixed(1) + '%' : ''}</td>
          <td>${r.position != null && r.shows > 0 ? Number(r.position).toFixed(1) : '—'}</td>
        </tr>`).join('')}
      </table>`;
  }).catch(() => {});

  window.api.metrikaHistory({ keywordId: kw.id, engine: S.engine }).then((rows) => {
    const box = $('#metrikaHist', m);
    if (!box || !rows || !rows.length) return;
    const nearestPosition = (date) => {
      const target = new Date(date).getTime();
      let best = null;
      for (const run of runs) {
        const cell = (g.cells[kw.id] || {})[run.id];
        if (!cell || cell.e || cell.p == null) continue;
        const distance = Math.abs(new Date(run.started_at).getTime() - target);
        if (!best || distance < best.distance) best = { position: cell.p, distance };
      }
      return best && best.distance <= 14 * 864e5 ? best.position : null;
    };
    const enriched = rows.map((row) => ({ ...row, nearPosition: nearestPosition(row.fetched_at) }));
    let summary = '';
    if (enriched.length >= 2) {
      const current = enriched[0];
      const previous = enriched[1];
      const pos = current.nearPosition != null && previous.nearPosition != null
        ? `Позиция ${previous.nearPosition || 'не в ТОП'} → ${current.nearPosition || 'не в ТОП'}. `
        : '';
      summary = `<div class="metrika-summary">${pos}Визиты ${fmtFreq(previous.visits)} → ${fmtFreq(current.visits)}.</div>`;
    }
    box.innerHTML = `
      <div class="ps-hist-title">Трафик Яндекс Метрики по этой фразе</div>
      ${summary}
      <table class="ps-hist">
        <tr><th>Обновлено</th><th>Позиция рядом</th><th>Визиты</th><th>Люди</th><th>Отказы</th><th>Глубина</th><th>Время</th><th>Цели</th></tr>
        ${enriched.map((r) => `<tr>
          <td>${fmtDate(r.fetched_at)}</td>
          <td>${r.nearPosition == null ? '—' : (r.nearPosition || 'не в ТОП')}</td>
          <td>${fmtFreq(r.visits)}</td>
          <td>${fmtFreq(r.users)}</td>
          <td>${Number(r.bounce_rate || 0).toFixed(1)}%</td>
          <td>${Number(r.page_depth || 0).toFixed(1)}</td>
          <td>${Math.round(Number(r.duration) || 0)} с</td>
          <td>${r.goal_reaches == null ? '—' : Number(r.goal_reaches).toLocaleString('ru-RU')}</td>
        </tr>`).join('')}
      </table>
      <div class="hint">Метрика показывает только раскрытые поисковые фразы. Пустые запросы не считаются нулевыми и трафик по страницам сюда не подмешивается.</div>`;
  }).catch(() => {});
}

function drawChart(canvas, points, depth) {
  const cssW = 640, cssH = 280;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const padL = 34, padR = 12, padT = 12, padB = 30, bandH = 22;
  const plotW = cssW - padL - padR;
  const plotH = cssH - padT - padB - bandH;
  const n = points.length;
  const x = (i) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (p) => padT + ((Math.min(p, depth) - 1) / Math.max(depth - 1, 1)) * plotH;
  const yNF = padT + plotH + bandH; // полка «не найдено»

  const css = getComputedStyle(document.documentElement);
  const col = (v) => css.getPropertyValue(v).trim();

  // сетка
  ctx.font = '10px -apple-system, Segoe UI, sans-serif';
  ctx.fillStyle = col('--muted2');
  ctx.strokeStyle = col('--border-soft');
  ctx.lineWidth = 1;
  const gridLines = [1, 3, 10, 30, 50, 100].filter((v) => v <= depth);
  if (!gridLines.includes(depth)) gridLines.push(depth);
  for (const gv of gridLines) {
    const gy = y(gv);
    ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(cssW - padR, gy); ctx.stroke();
    ctx.fillText(String(gv), 8, gy + 3);
  }
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(padL, yNF); ctx.lineTo(cssW - padR, yNF); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillText('—', 10, yNF + 3);

  // подписи дат
  const step = Math.max(1, Math.ceil(n / 8));
  ctx.fillStyle = col('--muted');
  for (let i = 0; i < n; i += step) {
    const d = new Date(points[i].date);
    const lbl = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
    ctx.fillText(lbl, x(i) - 12, cssH - 10);
  }

  // линия
  const py = (pt) => (pt.p === 0 ? yNF : y(pt.p));
  ctx.strokeStyle = col('--accent');
  ctx.lineWidth = 2;
  ctx.beginPath();
  let started = false;
  points.forEach((pt, i) => {
    if (pt.p === null) { started = false; return; }
    if (!started) { ctx.moveTo(x(i), py(pt)); started = true; }
    else ctx.lineTo(x(i), py(pt));
  });
  ctx.stroke();

  // точки
  points.forEach((pt, i) => {
    if (pt.p === null) return;
    ctx.beginPath();
    ctx.arc(x(i), py(pt), 4, 0, Math.PI * 2);
    if (pt.p === 0) {
      ctx.fillStyle = col('--bg');
      ctx.fill();
      ctx.strokeStyle = col('--muted2');
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.fillStyle = pt.p <= 3 ? col('--green') : pt.p <= 10 ? col('--green-soft') : pt.p <= 30 ? col('--yellow') : col('--orange');
      ctx.fill();
    }
    if (pt.p > 0) {
      ctx.fillStyle = col('--text');
      ctx.font = 'bold 10px -apple-system, Segoe UI, sans-serif';
      ctx.fillText(String(pt.p), x(i) - 6, py(pt) - 8);
      ctx.font = '10px -apple-system, Segoe UI, sans-serif';
    }
  });
}

/* ============ события из main ============ */

window.api.on('run:progress', (e) => {
  if (e.projectId !== S.activeId) return;
  S.progress = e;
  const wrap = $('.progress-wrap');
  if (wrap) wrap.outerHTML = renderProgress();
  else renderMain();
});

window.api.on('run:engine-done', async (e) => {
  if (e.projectId !== S.activeId) return;
  if (e.engine === S.engine && (!e.device || e.device === S.device)) { await loadGrid(); renderMain(); }
});

window.api.on('run:state', async (e) => {
  const p = S.projects.find((x) => x.id === e.projectId);
  if (p) p.running = e.running;
  if (!e.running && e.projectId === S.activeId) S.progress = null;
  renderSidebar();
  if (e.projectId === S.activeId) renderMain();
});

window.api.on('run:done', async (e) => {
  if (e.error) toast('Проверка прервана: ' + e.error, 'err');
  else if (e.retried) toast(`Ошибки перепроверены. Запросов: ${e.requests}`, 'ok');
  else toast(`Проверка завершена. Запросов к XMLRiver: ${e.requests}${e.cost != null ? ` · ${Number(e.cost).toFixed(2)} ₽` : ''}`, 'ok');
  refreshBalance();
  if (e.projectId === S.activeId) { await loadGrid(); await loadProjects(); render(); }
});

window.api.on('focus:project', async (e) => {
  if (!e || !S.projects.some((project) => project.id === e.projectId)) return;
  if (S.activeId !== e.projectId) S.selectedKeywordIds.clear();
  S.activeId = e.projectId;
  if (e.engine) S.engine = e.engine;
  if (e.device) S.device = e.device;
  localStorage.setItem('activeId', S.activeId);
  await loadGrid();
  render();
});

window.api.on('update:status', (e) => {
  if (e.state === 'available') toast(e.manualDownload
    ? `Доступно обновление ${e.version} — откройте страницу скачивания`
    : `Доступно обновление ${e.version} — скачиваю…`);
  else if (e.state === 'downloaded') toast(`Обновление ${e.version} загружено`, 'ok');
  else if (e.state === 'none') toast('У вас последняя версия', 'ok');
  else if (e.state === 'error') toast('Проверка обновлений: ' + e.message, 'err');
});

window.api.on('freq:progress', (e) => {
  if (e.projectId !== S.activeId) return;
  S.freqProg = e;
  const chip = $('#freqChip');
  if (chip) chip.textContent = `Вордстат: ${e.done}/${e.total}`;
  else renderMain();
});

window.api.on('freq:done', async (e) => {
  if (e.projectId === S.activeId) S.freqProg = null;
  toast(`Частотность собрана: ${e.total - e.failed} из ${e.total}`, e.failed ? 'err' : 'ok');
  refreshBalance();
  if (e.projectId === S.activeId) { await loadGrid(); renderMain(); }
});

/* ============ старт ============ */

(async function boot() {
  S.settings = await window.api.getSettings();
  await loadProjects(false);
  await loadGrid();
  render();
  $('#btnNewProject').onclick = () => openProjectModal(null);
  $('#btnSettings').onclick = openSettingsModal;
  $('#balanceBox').onclick = openRequestLogModal;
  $('#btnTelegram').onclick = () => window.api.openTelegram();
  refreshBalance();
})();
