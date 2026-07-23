'use strict';
// Google Search Console: два режима авторизации.
// 1) OAuth-вход пользователя (для сайтов, где юзер не владелец, но имеет доступ):
//    Desktop-клиент + loopback-редирект, refresh_token хранится в настройках.
// 2) Сервисный аккаунт (JSON-ключ): JWT RS256 штатным node:crypto, без зависимостей.

const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const { shell } = require('electron');

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const API = 'https://www.googleapis.com/webmasters/v3';

const tokenCache = new Map(); // cacheKey → {token, exp}

const b64u = (s) => Buffer.from(s).toString('base64url');

/* ---------- сервисный аккаунт ---------- */

function readKey(keyPath) {
  let raw;
  try {
    raw = fs.readFileSync(keyPath, 'utf8');
  } catch {
    throw new Error('Не удалось прочитать JSON-ключ Google: ' + keyPath);
  }
  let key;
  try { key = JSON.parse(raw); } catch { throw new Error('Файл ключа Google — не JSON'); }
  if (!key.client_email || !key.private_key) {
    throw new Error('В JSON-ключе нет client_email/private_key — нужен ключ сервисного аккаунта');
  }
  return key;
}

async function serviceAccountToken(keyPath) {
  const now = Math.floor(Date.now() / 1000);
  const cached = tokenCache.get('sa:' + keyPath);
  if (cached && cached.exp > now + 60) return cached.token;

  const key = readKey(keyPath);
  const header = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64u(JSON.stringify({
    iss: key.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600,
  }));
  const unsigned = `${header}.${claims}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  const jwt = `${unsigned}.${signer.sign(key.private_key).toString('base64url')}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.access_token) {
    throw new Error('Google не выдал токен: ' + (j.error_description || j.error || `HTTP ${res.status}`));
  }
  tokenCache.set('sa:' + keyPath, { token: j.access_token, exp: now + (j.expires_in || 3600) });
  return j.access_token;
}

/* ---------- OAuth (вход пользователя) ---------- */

async function oauthToken(clientId, clientSecret, refreshToken) {
  const now = Math.floor(Date.now() / 1000);
  const cached = tokenCache.get('oa:' + refreshToken);
  if (cached && cached.exp > now + 60) return cached.token;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.access_token) {
    if (j.error === 'invalid_grant') {
      throw new Error('Вход Google протух — нажмите «Войти через Google» заново (в тестовом режиме OAuth-приложения токен живёт 7 дней; опубликуйте приложение в Google Auth Platform → Audience, чтобы жил постоянно)');
    }
    throw new Error('Google не обновил токен: ' + (j.error_description || j.error || `HTTP ${res.status}`));
  }
  tokenCache.set('oa:' + refreshToken, { token: j.access_token, exp: now + (j.expires_in || 3600) });
  return j.access_token;
}

// Полный цикл входа: локальный loopback-сервер + системный браузер.
function oauthLogin(clientId, clientSecret) {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    let done = false;
    const finish = (fn, arg) => {
      if (done) return;
      done = true;
      try { server.close(); } catch {}
      fn(arg);
    };
    const timer = setTimeout(() => finish(reject, new Error('Время входа истекло (5 минут) — попробуйте ещё раз')), 300000);

    server.on('request', async (req, res) => {
      const q = new URL(req.url, 'http://127.0.0.1').searchParams;
      const code = q.get('code');
      const err = q.get('error');
      // Браузер шлёт и мусорные запросы (favicon.ico и т.п.) — они не должны
      // прерывать обмен кода на токен.
      if (!code && !err) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<body style="font-family:sans-serif;background:#0d1117;color:#e6edf3;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><h2>${code ? 'Готово — вернитесь в SerpDesk' : 'Ошибка входа: ' + err}</h2></body>`);
      if (!code) { clearTimeout(timer); return finish(reject, new Error('Google: ' + err)); }
      try {
        const port = server.address().port;
        const r = await fetch(TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: `http://127.0.0.1:${port}`,
            grant_type: 'authorization_code',
          }),
        });
        const j = await r.json().catch(() => ({}));
        clearTimeout(timer);
        if (!j.refresh_token) return finish(reject, new Error('Не получен refresh_token: ' + (j.error_description || j.error || 'проверьте Client ID/secret')));
        finish(resolve, j);
      } catch (e) {
        clearTimeout(timer);
        finish(reject, e);
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const u = new URL(AUTH_URL);
      u.searchParams.set('client_id', clientId);
      u.searchParams.set('redirect_uri', `http://127.0.0.1:${port}`);
      u.searchParams.set('response_type', 'code');
      u.searchParams.set('scope', SCOPE);
      u.searchParams.set('access_type', 'offline');
      u.searchParams.set('prompt', 'consent');
      shell.openExternal(u.toString());
    });
  });
}

/* ---------- выбор режима ---------- */

// settings → функция получения access-токена; OAuth-вход приоритетнее JSON-ключа.
function makeAuth(settings) {
  if (settings.gsc_refresh_token && settings.gsc_client_id && settings.gsc_client_secret) {
    return () => oauthToken(settings.gsc_client_id, settings.gsc_client_secret, settings.gsc_refresh_token);
  }
  if (settings.gsc_key_path) {
    return () => serviceAccountToken(settings.gsc_key_path);
  }
  return null;
}

/* ---------- API ---------- */

async function apiGet(auth, path) {
  const token = await auth();
  const res = await fetch(API + path, { headers: { Authorization: `Bearer ${token}` } });
  const j = await res.json().catch(() => ({}));
  if (res.status === 403) throw new Error('GSC: нет доступа (403) — у аккаунта нет прав на этот ресурс');
  if (!res.ok) throw new Error('GSC: ' + (j.error?.message || `HTTP ${res.status}`));
  return j;
}

async function listSites(auth) {
  const j = await apiGet(auth, '/sites');
  return (j.siteEntry || []).filter((s) => s.permissionLevel !== 'siteUnverifiedUser');
}

// Подбор ресурса GSC под домен проекта: sc-domain приоритетнее url-prefix.
function matchSite(sites, domain) {
  const norm = (h) => String(h || '').toLowerCase().replace(/^www\./, '');
  const target = norm(domain);
  let urlPrefix = null;
  for (const s of sites) {
    const u = s.siteUrl || '';
    if (u.startsWith('sc-domain:')) {
      if (norm(u.slice('sc-domain:'.length)) === target) return u;
    } else {
      try {
        if (norm(new URL(u).hostname) === target && !urlPrefix) urlPrefix = u;
      } catch { /* пропускаем мусорные записи */ }
    }
  }
  return urlPrefix;
}

// Вся статистика запросов сайта одним вызовом; фразы матчим на нашей стороне.
async function queryStats(auth, siteUrl, startDate, endDate) {
  const token = await auth();
  const res = await fetch(`${API}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ startDate, endDate, dimensions: ['query'], rowLimit: 25000 }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error('GSC: ' + (j.error?.message || `HTTP ${res.status}`));
  const map = new Map();
  for (const row of j.rows || []) {
    const q = String(row.keys?.[0] || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (q) map.set(q, { shows: row.impressions || 0, clicks: row.clicks || 0, ctr: row.ctr || 0, position: row.position || null });
  }
  return map;
}

module.exports = { makeAuth, oauthLogin, listSites, matchSite, queryStats };
