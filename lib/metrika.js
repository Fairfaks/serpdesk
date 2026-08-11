'use strict';

// Яндекс Метрика: список доступных счётчиков и отчёт по поисковым фразам.
// Метрика скрывает часть низкочастотных фраз. Их нельзя считать нулевыми,
// поэтому в результате остаются только строки, которые реально вернул API.

const MANAGEMENT_API = 'https://api-metrika.yandex.net/management/v1';
const REPORT_API = 'https://api-metrika.yandex.net/stat/v1/data';

const normQuery = (value) => String(value || '')
  .toLowerCase()
  .replace(/ё/g, 'е')
  .replace(/\s+/g, ' ')
  .trim();

function normHost(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return raw.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split(':')[0];
  }
}

async function getJson(url, token, prefix = 'Метрика') {
  const res = await fetch(url, {
    headers: { Authorization: `OAuth ${String(token || '').trim()}` },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error(`${prefix}: токен не принят (401)`);
  if (res.status === 403) throw new Error(`${prefix}: нет доступа (403), токену нужны права metrika:read`);
  if (!res.ok) {
    const message = data.message || data.error?.message || data.errors?.[0]?.message || `HTTP ${res.status}`;
    throw new Error(`${prefix}: ${message}`);
  }
  return data;
}

async function listCounters(token) {
  const data = await getJson(`${MANAGEMENT_API}/counters?per_page=1000`, token);
  return Array.isArray(data.counters) ? data.counters : [];
}

function matchCounter(counters, domain, preferredId = '') {
  const wantedId = String(preferredId || '').trim();
  if (wantedId) {
    const exact = counters.find((counter) => String(counter.id) === wantedId);
    return exact || null;
  }
  const target = normHost(domain);
  if (!target) return null;
  return counters.find((counter) => {
    const sites = [counter.site, ...(Array.isArray(counter.mirrors) ? counter.mirrors : [])];
    return sites.some((site) => normHost(typeof site === 'string' ? site : site?.site) === target);
  }) || null;
}

function engineName(value) {
  const text = String(value || '').toLowerCase();
  if (text.includes('яндекс') || text.includes('yandex')) return 'yandex';
  if (text.includes('google')) return 'google';
  return 'other';
}

function dimName(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return String(value.name ?? value.id ?? '');
}

function parseReport(report) {
  const byEngine = { yandex: new Map(), google: new Map(), other: new Map() };
  for (const row of Array.isArray(report?.data) ? report.data : []) {
    const phrase = dimName(row.dimensions?.[0]);
    const engine = engineName(dimName(row.dimensions?.[1]));
    const key = normQuery(phrase);
    if (!key) continue;
    const metrics = row.metrics || [];
    byEngine[engine].set(key, {
      phrase,
      visits: Number(metrics[0]) || 0,
      users: Number(metrics[1]) || 0,
      bounceRate: Number(metrics[2]) || 0,
      pageDepth: Number(metrics[3]) || 0,
      duration: Number(metrics[4]) || 0,
      goalReaches: Number(metrics[5]) || 0,
    });
  }
  return {
    byEngine,
    rows: Array.isArray(report?.data) ? report.data.length : 0,
    sampled: Boolean(report?.sampled),
    sampleShare: report?.sample_share != null ? Number(report.sample_share) : null,
  };
}

async function queryStats(token, counterId, dateFrom, dateTo) {
  const params = new URLSearchParams({
    ids: String(counterId),
    dimensions: 'ym:s:lastsignSearchPhrase,ym:s:lastsignSearchEngineRoot',
    metrics: [
      'ym:s:visits',
      'ym:s:users',
      'ym:s:bounceRate',
      'ym:s:pageDepth',
      'ym:s:avgVisitDurationSeconds',
      'ym:s:favoriteGoalsReaches',
    ].join(','),
    date1: dateFrom,
    date2: dateTo,
    accuracy: 'full',
    include_undefined: 'false',
    limit: '100000',
  });
  return parseReport(await getJson(`${REPORT_API}?${params.toString()}`, token));
}

module.exports = {
  listCounters,
  matchCounter,
  queryStats,
  parseReport,
  normQuery,
  normHost,
  engineName,
};
