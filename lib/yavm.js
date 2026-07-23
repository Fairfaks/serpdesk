'use strict';
// Яндекс.Вебмастер API v4: OAuth-токен пользователя, автоподбор host_id по домену,
// выгрузка ТОП-3000 запросов с показами/кликами/позициями (страницами по 500).

const API = 'https://api.webmaster.yandex.net/v4';

async function apiGet(token, path) {
  const res = await fetch(API + path, { headers: { Authorization: `OAuth ${String(token).trim()}` } });
  const j = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error('ЯВМ: токен не принят (401) — перевыпустите токен');
  if (res.status === 403) throw new Error('ЯВМ: нет прав (403) — в OAuth-приложении нужны права Яндекс.Вебмастера');
  if (!res.ok) throw new Error('ЯВМ: ' + (j.error_message || j.error_code || `HTTP ${res.status}`));
  return j;
}

async function getUserId(token) {
  const j = await apiGet(token, '/user/');
  if (!j.user_id) throw new Error('ЯВМ: не удалось получить user_id');
  return j.user_id;
}

async function listHosts(token, userId) {
  const j = await apiGet(token, `/user/${userId}/hosts/`);
  return (j.hosts || []).filter((h) => h.verified);
}

// host_id вида "https:site.ru:443". Приоритет: https без www → http без www → www-варианты.
function matchHost(hosts, domain) {
  const norm = (h) => String(h || '').toLowerCase().replace(/^www\./, '');
  const target = norm(domain);
  const scored = [];
  for (const h of hosts) {
    const id = h.host_id || '';
    const m = id.match(/^(https?):(.+):(\d+)$/);
    if (!m) continue;
    const host = m[2].toLowerCase();
    if (norm(host) !== target) continue;
    let score = 0;
    if (m[1] === 'https') score += 2;
    if (!host.startsWith('www.')) score += 1;
    scored.push({ id, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.length ? scored[0].id : null;
}

const normQuery = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();

// Map(нормализованная фраза → {shows, clicks, ctr, position}) по ТОП-3000 запросов хоста.
async function popularQueries(token, userId, hostId, dateFrom, dateTo) {
  const map = new Map();
  const base = `/user/${userId}/hosts/${hostId}/search-queries/popular/`
    + `?order_by=TOTAL_SHOWS&query_indicator=TOTAL_SHOWS&query_indicator=TOTAL_CLICKS`
    + `&query_indicator=AVG_SHOW_POSITION&query_indicator=AVG_CLICK_POSITION`
    + `&date_from=${dateFrom}&date_to=${dateTo}&limit=500`;
  for (let offset = 0; offset < 3000; offset += 500) {
    const j = await apiGet(token, base + `&offset=${offset}`);
    const queries = j.queries || [];
    for (const q of queries) {
      const ind = q.indicators || {};
      const shows = Number(ind.TOTAL_SHOWS) || 0;
      const clicks = Number(ind.TOTAL_CLICKS) || 0;
      map.set(normQuery(q.query_text), {
        shows,
        clicks,
        ctr: shows ? clicks / shows : 0,
        position: ind.AVG_SHOW_POSITION != null ? Number(ind.AVG_SHOW_POSITION) : null,
      });
    }
    const total = Number(j.count) || 0;
    if (queries.length < 500 || offset + 500 >= total) break;
  }
  return map;
}

module.exports = { getUserId, listHosts, matchHost, popularQueries, normQuery };
