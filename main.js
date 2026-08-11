'use strict';

const { app, BrowserWindow, ipcMain, dialog, Menu, Notification, shell, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');
const DB = require('./lib/db');
const xmlriver = require('./lib/xmlriver');
const gsc = require('./lib/gsc');
const yavm = require('./lib/yavm');
const metrika = require('./lib/metrika');
const historyImport = require('./lib/import-history');
const analytics = require('./lib/analytics');
const costs = require('./lib/costs');
const backups = require('./lib/backups');
const diagnostics = require('./lib/diagnostics');
const runResume = require('./lib/run-resume');
const { copyProjectKeywords, normalizeIds } = require('./lib/project-copy');
const { CheckRunner } = require('./lib/checker');

// ---------- автообновления (electron-updater + GitHub Releases) ----------
// Работает только в собранном приложении при заданном build.publish в package.json.
// В dev и без релизов молча ничего не делает.
let updaterClient = null;
let updaterBound = false;
let updaterManualCheck = false;

function canInstallMacUpdate() {
  if (process.platform !== 'darwin' || !app.isPackaged) return true;
  const bundlePath = path.resolve(app.getPath('exe'), '../../..');
  const result = spawnSync('/usr/bin/codesign', ['-dv', '--verbose=4', bundlePath], { encoding: 'utf8' });
  const details = `${result.stdout || ''}\n${result.stderr || ''}`;
  return result.status === 0 && /TeamIdentifier=(?!not set(?:\s|$))\S+/.test(details);
}

function initUpdater(manual) {
  if (!app.isPackaged && !manual) return;
  if (!updaterClient) {
    try { ({ autoUpdater: updaterClient } = require('electron-updater')); } catch { return; }
  }
  const autoUpdater = updaterClient;
  const automaticInstall = canInstallMacUpdate();
  autoUpdater.autoDownload = automaticInstall;
  updaterManualCheck = Boolean(manual);

  if (!updaterBound) {
    autoUpdater.on('update-available', async (info) => {
      const canInstall = canInstallMacUpdate();
      send('update:status', { state: 'available', version: info.version, manualDownload: !canInstall });
      updaterManualCheck = false;
      if (canInstall) return;
      const { response } = await dialog.showMessageBox(win, {
        type: 'info',
        buttons: ['Открыть страницу скачивания', 'Позже'],
        defaultId: 0,
        title: 'Доступно обновление SerpDesk',
        message: `Версия ${info.version} доступна на GitHub.`,
        detail: 'Эта сборка для macOS не подписана сертификатом Apple, поэтому система не разрешает установить обновление автоматически.',
      });
      if (response === 0) shell.openExternal('https://github.com/Fairfaks/serpdesk/releases/latest');
    });
    autoUpdater.on('update-not-available', () => {
      if (updaterManualCheck) send('update:status', { state: 'none' });
      updaterManualCheck = false;
    });
    autoUpdater.on('error', (err) => {
      diagnosticLog('error', 'Update check failed', { message: String(err && err.message || err) });
      if (updaterManualCheck) send('update:status', { state: 'error', message: String(err && err.message || err) });
      updaterManualCheck = false;
    });
    autoUpdater.on('update-downloaded', async (info) => {
      send('update:status', { state: 'downloaded', version: info.version });
      const { response } = await dialog.showMessageBox(win, {
        type: 'info',
        buttons: ['Перезапустить сейчас', 'Позже'],
        defaultId: 0,
        title: 'Обновление SerpDesk',
        message: `Версия ${info.version} загружена. Перезапустить, чтобы установить?`,
      });
      if (response === 0) autoUpdater.quitAndInstall();
    });
    updaterBound = true;
  }
  autoUpdater.checkForUpdates().catch((e) => { if (manual) send('update:status', { state: 'error', message: String(e && e.message || e) }); });
}

// Разрешаем видео-финалу играть со звуком без клика пользователя.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let win = null;
let db = null;
let diagnosticLogPath = null;
const runners = new Map(); // projectId → CheckRunner

const nowIso = () => new Date().toISOString();

function diagnosticLog(level, message, meta) {
  diagnostics.appendLog(diagnosticLogPath, level, message, meta);
}

process.on('unhandledRejection', (reason) => {
  diagnosticLog('error', 'Unhandled promise rejection', {
    message: String(reason && reason.message || reason),
    stack: reason && reason.stack,
  });
});
process.on('uncaughtExceptionMonitor', (error) => {
  diagnosticLog('error', 'Uncaught exception', { message: error.message, stack: error.stack });
});

// ---------- настройки ----------

const DEFAULT_SETTINGS = {
  xmlriver_user: '',
  xmlriver_key: '',
  concurrency: '3',
  autocheck_enabled: '0',
  autocheck_time: '07:00',
  autocheck_last_date: '',
  yavm_token: '',
  metrika_token: '',
  gsc_key_path: '',
  gsc_client_id: '',
  gsc_client_secret: '',
  gsc_refresh_token: '',
  victory_enabled: '1',
  alerts_enabled: '1',
  alerts_only_important: '1',
};

function getSettings() {
  const out = { ...DEFAULT_SETTINGS };
  for (const row of db.all('SELECT k, v FROM settings')) out[row.k] = row.v;
  return out;
}

function setSettings(patch) {
  for (const [k, v] of Object.entries(patch)) {
    db.run('INSERT INTO settings(k, v) VALUES(?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v', [k, String(v)]);
  }
}

function creds() {
  const s = getSettings();
  return { user: s.xmlriver_user, key: s.xmlriver_key };
}

// ---------- проекты ----------

const DEFAULT_CFG = {
  depth: 30,
  device: 'desktop',
  deviceMode: 'desktop', // desktop | mobile | both
  psDays: 28,
  metrikaCounterId: '',
  competitors: [],
  yandex: { enabled: true, lr: '213', domain: 'ru', source: 'api', serpFeaturesBeta: false },
  google: { enabled: false, loc: '', country: '' },
};

function projectRow(p) {
  let cfg;
  try { cfg = JSON.parse(p.cfg); } catch { cfg = {}; }
  return {
    id: p.id,
    name: p.name,
    domain: p.domain,
    subdomains: !!p.subdomains,
    cfg: { ...DEFAULT_CFG, ...cfg, yandex: { ...DEFAULT_CFG.yandex, ...(cfg.yandex || {}) }, google: { ...DEFAULT_CFG.google, ...(cfg.google || {}) } },
  };
}

function listProjects() {
  return db.all('SELECT * FROM projects ORDER BY id').map((p) => {
    const r = projectRow(p);
    const kc = db.get('SELECT COUNT(*) AS c FROM keywords WHERE project_id = ?', [p.id]);
    r.keywordCount = kc ? kc.c : 0;
    r.running = runners.has(p.id);
    return r;
  });
}

function engineCfg(project, engine, device) {
  const c = project.cfg;
  const dev = device || c.device || 'desktop';
  if (engine === 'yandex') {
    return {
      lr: c.yandex.lr,
      yandexDomain: c.yandex.domain,
      yandexSource: c.yandex.source || 'api',
      apiDepth: c.depth,
      serpFeaturesBeta: Boolean(c.yandex.serpFeaturesBeta),
      device: dev,
    };
  }
  return { loc: c.google.loc, country: c.google.country, device: dev };
}

// Список устройств проекта: 'both' → оба, иначе одно.
function projectDevices(project) {
  const mode = project.cfg.deviceMode || project.cfg.device || 'desktop';
  return mode === 'both' ? ['desktop', 'mobile'] : [mode === 'mobile' ? 'mobile' : 'desktop'];
}

function projectEngines(project, requested = null) {
  const enabled = [];
  if (project.cfg.yandex.enabled) enabled.push('yandex');
  if (project.cfg.google.enabled) enabled.push('google');
  if (!Array.isArray(requested)) return enabled;
  const wanted = new Set(requested.filter((engine) => engine === 'yandex' || engine === 'google'));
  return enabled.filter((engine) => wanted.has(engine));
}

// ---------- видео-финал ----------

// Ролик зашит локально (assets/victory.mp4) — YouTube не нужен, работает офлайн.
let victoryWin = null;

function showVictory() {
  const s = getSettings();
  if (s.victory_enabled !== '1') return;
  if (victoryWin && !victoryWin.isDestroyed()) { victoryWin.focus(); return; }
  victoryWin = new BrowserWindow({
    width: 560,
    height: 560,
    title: 'Все задачи выполнены 🎉',
    alwaysOnTop: true,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    webPreferences: { sandbox: true },
  });
  victoryWin.setMenuBarVisibility(false);
  victoryWin.loadFile(path.join(__dirname, 'assets', 'victory.html'));
  victoryWin.on('closed', () => { victoryWin = null; });
}

// ---------- прогон проверки ----------

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

async function getXmlPrices(cr, engines) {
  const prices = {};
  await Promise.all(engines.map(async (engine) => {
    try { prices[engine] = await xmlriver.getCost(cr, engine); } catch { prices[engine] = null; }
  }));
  return prices;
}

async function estimateCheck(projectId, requestedEngines = null) {
  const row = db.get('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (!row) throw new Error('Проект не найден');
  const project = projectRow(row);
  const cr = creds();
  if (!cr.user || !cr.key) throw new Error('Укажите user и key XMLRiver в настройках');
  const keywordCount = db.get('SELECT COUNT(*) AS c FROM keywords WHERE project_id = ?', [projectId])?.c || 0;
  if (!keywordCount) throw new Error('В проекте нет фраз');
  const engines = projectEngines(project, requestedEngines);
  if (!engines.length) throw new Error('Выберите хотя бы один включённый поисковик');
  const estimate = costs.estimateProjectRequests(project, keywordCount, engines);
  const prices = await getXmlPrices(cr, engines);
  const priced = costs.applyPrices(estimate, prices);
  let balance = null;
  try { balance = await xmlriver.getBalance(cr); } catch {}
  return { ...priced, balance };
}

function showProjectNotification(project, engine, device, body, isError = false) {
  const settings = getSettings();
  if (settings.alerts_enabled !== '1' || !Notification.isSupported()) return;
  const notification = new Notification({
    title: `SerpDesk — ${project.name}${isError ? ' · ошибка' : ''}`,
    body,
    silent: !isError,
  });
  notification.on('click', () => {
    if (win && !win.isDestroyed()) {
      win.show();
      win.focus();
      send('focus:project', { projectId: project.id, engine, device });
    }
  });
  notification.show();
}

function notifyProjectChanges(project, engine, device) {
  const grid = getGrid(project.id, engine, device, 20);
  const analysis = grid.analysis;
  const settings = getSettings();
  if (!analysis || !analysis.previousRun) return;
  if (settings.alerts_only_important === '1' && !analysis.importantCount) return;
  showProjectNotification(project, engine, device, analytics.summarizeImportant(analysis));
}

async function startCheck(projectId, requestedEngines = null) {
  if (runners.has(projectId)) throw new Error('Проверка по этому проекту уже идёт');
  const p = db.get('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (!p) throw new Error('Проект не найден');
  const project = projectRow(p);
  const cr = creds();
  if (!cr.user || !cr.key) throw new Error('Укажите user и key XMLRiver в настройках');
  const keywords = db.all('SELECT id, phrase FROM keywords WHERE project_id = ? ORDER BY id', [projectId]);
  if (!keywords.length) throw new Error('В проекте нет фраз');
  const engines = projectEngines(project, requestedEngines);
  if (!engines.length) throw new Error('Выберите хотя бы один включённый поисковик');
  const prices = await getXmlPrices(cr, engines);
  const estimate = costs.applyPrices(costs.estimateProjectRequests(project, keywords.length, engines), prices);

  const s = getSettings();
  const competitors = (project.cfg.competitors || []).filter(Boolean);
  const runner = new CheckRunner({
    creds: cr,
    cfg: {},
    depth: project.cfg.depth,
    concurrency: Number(s.concurrency) || 3,
    domain: project.domain,
    subdomains: project.subdomains,
    competitors,
    keywords,
    onProgress: () => {},
    onResult: () => {},
  });
  runners.set(projectId, runner);
  diagnosticLog('info', 'Position check started', {
    projectId, engines, devices: projectDevices(project), keywords: keywords.length,
  });
  send('run:state', { projectId, running: true });

  const devices = projectDevices(project);
  // Асинхронный прогон: движки × устройства последовательно, внутри — пул по фразам.
  (async () => {
    let failMessage = null;
    let actualCost = 0;
    let hasKnownCost = true;
    outer:
    for (const engine of engines) {
      for (const device of devices) {
        if (runner.cancelled) break outer;
        runner.o.cfg = engineCfg(project, engine, device);
        const estimatePart = estimate.details.find((item) => item.engine === engine && item.device === device);
        const run = db.run(
          'INSERT INTO runs(project_id, engine, device, started_at, status) VALUES(?, ?, ?, ?, ?)',
          [projectId, engine, device, nowIso(), 'running']
        );
        const runId = run.lastID;
        const log = db.run(
          `INSERT INTO request_log(
             project_id, run_id, kind, engine, device, estimated_requests,
             price_per_1000, estimated_cost, started_at, status, details
           ) VALUES(?, ?, 'positions', ?, ?, ?, ?, ?, ?, 'running', ?)`,
          [
            projectId, runId, engine, device, estimatePart?.requests || 0,
            estimatePart?.pricePer1000, estimatePart?.cost, nowIso(),
            JSON.stringify({ depth: project.cfg.depth, keywords: keywords.length }),
          ]
        );
        const requestsBefore = runner.requestsMade;
        runner.o.onResult = (eng, kwId, res) => {
          db.run('INSERT INTO results(run_id, keyword_id, position, url, error, visual_position, serp_features) VALUES(?, ?, ?, ?, ?, ?, ?)', [
            runId, kwId, res.position, res.url, res.error, res.visualPosition ?? null,
            res.serpFeatures ? JSON.stringify(res.serpFeatures) : null,
          ]);
          if (res.competitors) {
            for (const [domain, pos] of Object.entries(res.competitors)) {
              db.run('INSERT OR REPLACE INTO competitor_results(run_id, keyword_id, domain, position) VALUES(?, ?, ?, ?)', [
                runId, kwId, domain, pos,
              ]);
            }
          }
        };
        runner.o.onProgress = (eng, info) => {
          send('run:progress', { projectId, engine: eng, device, ...info });
        };
        let status = 'done';
        try {
          await runner.runEngine(engine);
        } catch (e) {
          if (e && e.name === 'Cancelled') status = 'cancelled';
          else { status = 'failed'; failMessage = e.message; }
        }
        diagnosticLog(status === 'failed' ? 'error' : 'info', 'Search engine run finished', {
          projectId, runId, engine, device, status, error: status === 'failed' ? failMessage : undefined,
        });
        db.run('UPDATE runs SET finished_at = ?, status = ? WHERE id = ?', [nowIso(), status, runId]);
        const requests = runner.requestsMade - requestsBefore;
        const partCost = estimatePart?.pricePer1000 == null
          ? null
          : requests * estimatePart.pricePer1000 / 1000;
        db.run(
          `UPDATE request_log SET requests = ?, actual_cost = ?, finished_at = ?, status = ?
           WHERE id = ?`,
          [requests, partCost, nowIso(), status, log.lastID]
        );
        if (partCost == null) hasKnownCost = false;
        else actualCost += partCost;
        send('run:engine-done', { projectId, engine, device, status });
        if (status === 'done') notifyProjectChanges(project, engine, device);
        if (status === 'failed') break outer;
      }
    }
    runners.delete(projectId);
    db.flush();
    diagnosticLog(failMessage ? 'error' : 'info', 'Position check finished', {
      projectId, requests: runner.requestsMade, cancelled: runner.cancelled, error: failMessage,
    });
    send('run:state', { projectId, running: false });
    send('run:done', {
      projectId,
      requests: runner.requestsMade,
      cost: hasKnownCost ? actualCost : null,
      error: failMessage,
      cancelled: runner.cancelled,
    });
    if (failMessage) showProjectNotification(project, null, null, failMessage, true);
    if (!failMessage && !runner.cancelled) showVictory();
  })();
}

// ---------- частотность Wordstat ----------

const freqJobs = new Set(); // projectId с идущим сбором

function startFreqJob(projectId, { refreshAll = false } = {}) {
  if (freqJobs.has(projectId)) return { started: false, reason: 'running', total: 0 };
  const cr = creds();
  if (!cr.user || !cr.key) throw new Error('Укажите user и key XMLRiver в настройках');
  const p = db.get('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (!p) throw new Error('Проект не найден');
  const project = projectRow(p);
  const regions = project.cfg.yandex.lr || '';
  const kws = db.all(
    `SELECT id, phrase FROM keywords WHERE project_id = ?${refreshAll ? '' : ' AND freq IS NULL'} ORDER BY id`,
    [projectId]
  );
  if (!kws.length) return { started: false, reason: 'nothing-to-update', total: 0 };
  freqJobs.add(projectId);

  (async () => {
    let done = 0;
    let failed = 0;
    let pricePer1000 = null;
    try { pricePer1000 = await xmlriver.getCost(cr, 'yandex'); } catch {}
    const log = db.run(
      `INSERT INTO request_log(
         project_id, kind, engine, requests, estimated_requests, price_per_1000,
         estimated_cost, started_at, status, details
       ) VALUES(?, 'wordstat', 'yandex', 0, ?, ?, ?, ?, 'running', ?)`,
      [
        projectId, kws.length, pricePer1000,
        pricePer1000 == null ? null : kws.length * pricePer1000 / 1000,
        nowIso(), JSON.stringify({ keywords: kws.length, regions, refreshAll }),
      ]
    );
    const queue = kws.slice();
    const worker = async () => {
      for (;;) {
        const kw = queue.shift();
        if (!kw) return;
        try {
          const freq = await xmlriver.getWordstatFreq(cr, kw.phrase, regions);
          db.run('UPDATE keywords SET freq = ? WHERE id = ?', [freq === null ? 0 : freq, kw.id]);
        } catch {
          failed++;
        }
        done++;
        send('freq:progress', { projectId, done, total: kws.length });
      }
    };
    await Promise.all([worker(), worker()]);
    freqJobs.delete(projectId);
    db.run(
      `UPDATE request_log SET requests = ?, actual_cost = ?, finished_at = ?, status = ?
       WHERE id = ?`,
      [
        done,
        pricePer1000 == null ? null : done * pricePer1000 / 1000,
        nowIso(), failed ? 'partial' : 'done', log.lastID,
      ]
    );
    db.flush();
    send('freq:done', { projectId, total: kws.length, failed });
  })();
  return { started: true, total: kws.length, refreshAll };
}

// ---------- досбор незавершённого прогона ----------

async function retryErrors(projectId, engine, device = 'desktop') {
  if (runners.has(projectId)) throw new Error('Проверка по этому проекту уже идёт');
  const p = db.get('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (!p) throw new Error('Проект не найден');
  const project = projectRow(p);
  const cr = creds();
  if (!cr.user || !cr.key) throw new Error('Укажите user и key XMLRiver в настройках');
  const run = db.get(
    "SELECT id FROM runs WHERE project_id = ? AND engine = ? AND device = ? AND status != 'running' ORDER BY started_at DESC LIMIT 1",
    [projectId, engine, device]
  );
  if (!run) throw new Error('По этому поисковику ещё не было проверок');
  const pending = runResume.pendingKeywords(db, run.id, projectId);
  if (!pending.length) throw new Error('В последней проверке нечего дособирать');

  const s = getSettings();
  const runner = new CheckRunner({
    creds: cr,
    cfg: engineCfg(project, engine, device),
    depth: project.cfg.depth,
    concurrency: Number(s.concurrency) || 3,
    domain: project.domain,
    subdomains: project.subdomains,
    keywords: pending.map((item) => ({ id: item.id, phrase: item.phrase })),
    onProgress: (eng, info) => send('run:progress', { projectId, engine: eng, device, ...info }),
    onResult: (eng, kwId, res) => {
      const row = pending.find((item) => item.id === kwId);
      if (!row) return;
      if (row.result_id) {
        db.run('UPDATE results SET position = ?, url = ?, error = ?, visual_position = ?, serp_features = ? WHERE id = ?', [
          res.position, res.url, res.error, res.visualPosition ?? null,
          res.serpFeatures ? JSON.stringify(res.serpFeatures) : null, row.result_id,
        ]);
      } else {
        db.run(
          'INSERT INTO results(run_id, keyword_id, position, url, error, visual_position, serp_features) VALUES(?, ?, ?, ?, ?, ?, ?)',
          [run.id, kwId, res.position, res.url, res.error, res.visualPosition ?? null,
            res.serpFeatures ? JSON.stringify(res.serpFeatures) : null]
        );
      }
      db.run('DELETE FROM competitor_results WHERE run_id = ? AND keyword_id = ?', [run.id, kwId]);
      if (res.competitors) {
        for (const [domain, position] of Object.entries(res.competitors)) {
          db.run(
            'INSERT OR REPLACE INTO competitor_results(run_id, keyword_id, domain, position) VALUES(?, ?, ?, ?)',
            [run.id, kwId, domain, position]
          );
        }
      }
    },
  });
  runners.set(projectId, runner);
  db.run("UPDATE runs SET status = 'running', finished_at = NULL WHERE id = ?", [run.id]);
  send('run:state', { projectId, running: true });

  (async () => {
    let failMessage = null;
    let pricePer1000 = null;
    try { pricePer1000 = await xmlriver.getCost(cr, engine); } catch {}
    const maxRequests = pending.length * costs.maxRequestsPerKeyword(engine, project.cfg);
    const log = db.run(
      `INSERT INTO request_log(
         project_id, run_id, kind, engine, device, estimated_requests, price_per_1000,
         estimated_cost, started_at, status, details
       ) VALUES(?, ?, 'positions-retry', ?, ?, ?, ?, ?, ?, 'running', ?)`,
      [
        projectId, run.id, engine, device, maxRequests, pricePer1000,
        pricePer1000 == null ? null : maxRequests * pricePer1000 / 1000,
        nowIso(), JSON.stringify({ keywords: pending.length, depth: project.cfg.depth, resume: true }),
      ]
    );
    let cancelled = false;
    try {
      await runner.runEngine(engine);
    } catch (e) {
      if (e && e.name === 'Cancelled') cancelled = true;
      else failMessage = e?.message || String(e || 'Неизвестная ошибка');
    }
    const remaining = runResume.pendingKeywords(db, run.id, projectId).length;
    const status = remaining === 0 ? 'done' : cancelled ? 'cancelled' : failMessage ? 'failed' : 'partial';
    db.run('UPDATE runs SET status = ?, finished_at = ? WHERE id = ?', [status, nowIso(), run.id]);
    db.run(
      `UPDATE request_log SET requests = ?, actual_cost = ?, finished_at = ?, status = ?
       WHERE id = ?`,
      [
        runner.requestsMade,
        pricePer1000 == null ? null : runner.requestsMade * pricePer1000 / 1000,
        nowIso(), status, log.lastID,
      ]
    );
    runners.delete(projectId);
    db.flush();
    send('run:state', { projectId, running: false });
    send('run:engine-done', { projectId, engine, device, status });
    send('run:done', {
      projectId, requests: runner.requestsMade, error: failMessage,
      retried: true, remaining, cancelled,
    });
  })();
}

// ---------- реальная статистика поисковиков (GSC + ЯВМ + Метрика) ----------

const psJobs = new Set(); // projectId с идущим обновлением статистики

function dateRange(days) {
  const to = new Date();
  const from = new Date(Date.now() - days * 864e5);
  const f = (d) => d.toISOString().slice(0, 10);
  return { from: f(from), to: f(to) };
}

async function refreshPsStats(projectId) {
  if (psJobs.has(projectId)) throw new Error('Статистика по проекту уже обновляется');
  const p = db.get('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (!p) throw new Error('Проект не найден');
  const s = getSettings();
  const gauth = gsc.makeAuth(s);
  if (!s.yavm_token && !gauth && !s.metrika_token) {
    throw new Error('Подключите Яндекс.Вебмастер, Google Search Console и/или Яндекс Метрику в настройках');
  }
  const keywords = db.all('SELECT id, phrase FROM keywords WHERE project_id = ?', [projectId]);
  if (!keywords.length) throw new Error('В проекте нет фраз');
  psJobs.add(projectId);
  try {
    const project = projectRow(p);
    const days = Number(project.cfg.psDays) || 28;
    const { from, to } = dateRange(days);
    const out = { yandex: null, google: null, metrika: null, days };
    // Каждая загрузка — снимок истории; повторная за тот же день заменяет сегодняшний.
    const record = (kwId, engine, st) => {
      db.run(
        "DELETE FROM ps_stats WHERE keyword_id = ? AND engine = ? AND days = ? AND date(fetched_at) = date('now')",
        [kwId, engine, days]
      );
      db.run(
        `INSERT INTO ps_stats(keyword_id, engine, days, date_from, date_to, shows, clicks, ctr, position, fetched_at)
         VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [kwId, engine, days, from, to, st.shows, st.clicks, st.ctr, st.position, nowIso()]
      );
    };
    const EMPTY = { shows: 0, clicks: 0, ctr: 0, position: null };

    if (s.yavm_token) {
      try {
        const uid = await yavm.getUserId(s.yavm_token);
        const hosts = await yavm.listHosts(s.yavm_token, uid);
        const hostId = yavm.matchHost(hosts, p.domain);
        if (!hostId) {
          out.yandex = { error: `Сайт ${p.domain} не найден среди подтверждённых в Вебмастере` };
        } else {
          const map = await yavm.popularQueries(s.yavm_token, uid, hostId, from, to);
          let matched = 0;
          for (const kw of keywords) {
            const hit = map.get(yavm.normQuery(kw.phrase));
            if (hit) matched++;
            record(kw.id, 'yandex', hit || EMPTY);
          }
          out.yandex = { matched, total: keywords.length, host: hostId };
        }
      } catch (e) {
        out.yandex = { error: e.message };
      }
    }

    if (gauth) {
      try {
        const sites = await gsc.listSites(gauth);
        const siteUrl = gsc.matchSite(sites, p.domain);
        if (!siteUrl) {
          out.google = { error: `Ресурс ${p.domain} не найден среди доступных в GSC` };
        } else {
          const map = await gsc.queryStats(gauth, siteUrl, from, to);
          let matched = 0;
          for (const kw of keywords) {
            const hit = map.get(kw.phrase.toLowerCase().replace(/\s+/g, ' ').trim());
            if (hit) matched++;
            record(kw.id, 'google', hit || EMPTY);
          }
          out.google = { matched, total: keywords.length, site: siteUrl };
        }
      } catch (e) {
        out.google = { error: e.message };
      }
    }

    if (s.metrika_token) {
      try {
        const counters = await metrika.listCounters(s.metrika_token);
        const counter = metrika.matchCounter(counters, p.domain, project.cfg.metrikaCounterId);
        if (!counter) {
          out.metrika = {
            error: project.cfg.metrikaCounterId
              ? `Счётчик ${project.cfg.metrikaCounterId} недоступен. Проверьте ID и права токена`
              : `Счётчик для ${p.domain} не найден. Укажите его ID в настройках проекта`,
          };
        } else {
          const report = await metrika.queryStats(s.metrika_token, counter.id, from, to);
          const matched = { yandex: 0, google: 0 };
          for (const engine of ['yandex', 'google']) {
            const map = report.byEngine[engine];
            for (const kw of keywords) {
              const hit = map.get(metrika.normQuery(kw.phrase));
              // Отсутствие строки означает в том числе скрытую фразу, а не нулевой трафик.
              if (!hit) continue;
              matched[engine]++;
              db.run(
                "DELETE FROM metrika_stats WHERE keyword_id = ? AND engine = ? AND days = ? AND date(fetched_at) = date('now')",
                [kw.id, engine, days]
              );
              db.run(
                `INSERT INTO metrika_stats(
                   keyword_id, counter_id, engine, days, date_from, date_to, visits, users,
                   bounce_rate, page_depth, duration, goal_reaches, sampled, sample_share, fetched_at
                 ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  kw.id, Number(counter.id), engine, days, from, to, hit.visits, hit.users,
                  hit.bounceRate, hit.pageDepth, hit.duration, hit.goalReaches,
                  report.sampled ? 1 : 0, report.sampleShare, nowIso(),
                ]
              );
            }
          }
          out.metrika = {
            matchedYandex: matched.yandex,
            matchedGoogle: matched.google,
            total: keywords.length,
            rows: report.rows,
            counterId: Number(counter.id),
            counterName: counter.name || counter.site || String(counter.id),
            sampled: report.sampled,
            sampleShare: report.sampleShare,
            goalsAvailable: report.goalsAvailable,
          };
        }
      } catch (e) {
        out.metrika = { error: e.message };
      }
    }

    db.flush();
    return out;
  } finally {
    psJobs.delete(projectId);
  }
}

async function testPsAccess() {
  const s = getSettings();
  const out = { yavm: null, gsc: null, metrika: null };
  if (s.yavm_token) {
    try {
      const uid = await yavm.getUserId(s.yavm_token);
      const hosts = await yavm.listHosts(s.yavm_token, uid);
      out.yavm = { ok: true, hosts: hosts.length };
    } catch (e) {
      out.yavm = { ok: false, error: e.message };
    }
  }
  const gauth = gsc.makeAuth(s);
  if (gauth) {
    try {
      const sites = await gsc.listSites(gauth);
      out.gsc = { ok: true, sites: sites.length, mode: s.gsc_refresh_token ? 'oauth' : 'key' };
    } catch (e) {
      out.gsc = { ok: false, error: e.message };
    }
  }
  if (s.metrika_token) {
    try {
      const counters = await metrika.listCounters(s.metrika_token);
      out.metrika = { ok: true, counters: counters.length };
    } catch (e) {
      out.metrika = { ok: false, error: e.message };
    }
  }
  return out;
}

// ---------- сетка результатов ----------

function getGrid(projectId, engine, device = 'desktop', limit = 20, cursor = null) {
  const pageSize = Math.max(1, Math.min(Number(limit) || 20, 1000));
  const params = [projectId, engine, device];
  let cursorSql = '';
  if (cursor && cursor.startedAt && cursor.id) {
    cursorSql = 'AND (started_at < ? OR (started_at = ? AND id < ?))';
    params.push(cursor.startedAt, cursor.startedAt, Number(cursor.id));
  }
  params.push(pageSize + 1);
  const pageDesc = db.all(
    `SELECT id, started_at, status FROM runs
     WHERE project_id = ? AND engine = ? AND device = ? AND status != 'running'
     ${cursorSql}
     ORDER BY started_at DESC, id DESC LIMIT ?`,
    params
  );
  const hasMore = pageDesc.length > pageSize;
  const selectedDesc = pageDesc.slice(0, pageSize);
  const oldest = selectedDesc[selectedDesc.length - 1] || null;
  const runs = selectedDesc.reverse();
  const keywords = db.all(
    'SELECT id, phrase, freq, target_url, tag FROM keywords WHERE project_id = ? ORDER BY phrase COLLATE NOCASE',
    [projectId]
  );
  const cells = {};
  if (runs.length) {
    const ids = runs.map((r) => r.id);
    const rows = db.all(
      `SELECT run_id, keyword_id, position, url, error, visual_position, serp_features FROM results WHERE run_id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    for (const r of rows) {
      let features = null;
      try { features = r.serp_features ? JSON.parse(r.serp_features) : null; } catch {}
      (cells[r.keyword_id] ||= {})[r.run_id] = { p: r.position, vp: r.visual_position, f: features, u: r.url, e: r.error };
    }
  }
  const stats = {};
  for (const r of db.all(
    `SELECT keyword_id, engine, days, date_from, date_to, shows, clicks, ctr, position, fetched_at
     FROM ps_stats WHERE keyword_id IN (SELECT id FROM keywords WHERE project_id = ?) ORDER BY fetched_at ASC`,
    [projectId]
  )) {
    (stats[r.keyword_id] ||= {})[r.engine] = {
      s: r.shows, c: r.clicks, r: r.ctr, p: r.position,
      at: r.fetched_at, d: r.days, df: r.date_from, dt: r.date_to,
    };
  }
  const metrikaStats = {};
  for (const r of db.all(
    `SELECT keyword_id, counter_id, engine, days, date_from, date_to, visits, users,
            bounce_rate, page_depth, duration, goal_reaches, sampled, sample_share, fetched_at
     FROM metrika_stats
     WHERE keyword_id IN (SELECT id FROM keywords WHERE project_id = ?)
     ORDER BY fetched_at ASC`,
    [projectId]
  )) {
    (metrikaStats[r.keyword_id] ||= {})[r.engine] = {
      v: r.visits, u: r.users, b: r.bounce_rate, p: r.page_depth,
      t: r.duration, g: r.goal_reaches, at: r.fetched_at,
      d: r.days, df: r.date_from, dt: r.date_to,
      sampled: Boolean(r.sampled), share: r.sample_share, counter: r.counter_id,
    };
  }
  // Конкуренты: список из настроек проекта + их позиции по последнему прогону.
  const proj = db.get('SELECT cfg FROM projects WHERE id = ?', [projectId]);
  let competitors = [];
  let projectDepth = 30;
  try {
    const cfg = JSON.parse(proj.cfg);
    competitors = (cfg.competitors || []).filter(Boolean);
    projectDepth = Number(cfg.depth) || 30;
  } catch {}
  const compPos = {}; // keyword_id → { domain: position }
  if (competitors.length && runs.length) {
    const lastId = runs[runs.length - 1].id;
    for (const r of db.all('SELECT keyword_id, domain, position FROM competitor_results WHERE run_id = ?', [lastId])) {
      (compPos[r.keyword_id] ||= {})[r.domain] = r.position;
    }
  }
  const analysis = cursor ? null : analytics.analyzeChanges(
    keywords,
    cells,
    runs,
    Math.max(projectDepth, 100)
  );
  let resume = null;
  if (!cursor && runs.length) {
    const latestRun = runs[runs.length - 1];
    const pending = runResume.summary(db, latestRun.id, projectId);
    if (pending.pending) {
      resume = {
        runId: latestRun.id,
        status: latestRun.status,
        startedAt: latestRun.started_at,
        ...pending,
      };
    }
  }
  return {
    runs,
    keywords,
    cells,
    stats,
    metrika: metrikaStats,
    notes: db.all(
      `SELECT id, note_date, title, body, category, created_at
       FROM project_notes WHERE project_id = ? ORDER BY note_date ASC, id ASC`,
      [projectId]
    ),
    competitors,
    compPos,
    analysis,
    resume,
    pagination: {
      hasMore,
      nextCursor: hasMore && oldest ? { startedAt: oldest.started_at, id: oldest.id } : null,
      pageSize,
    },
  };
}

// ---------- CSV ----------

function fmtDate(iso, withTime = true) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  const date = `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
  return withTime ? `${date} ${p(d.getHours())}:${p(d.getMinutes())}` : date;
}

async function exportCsv(projectId, engine, device = 'desktop') {
  const p = db.get('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (!p) throw new Error('Проект не найден');
  const { runs, keywords, cells, stats, metrika: metrikaRows } = getGrid(projectId, engine, device, 1000);
  const engName = engine === 'yandex' ? 'yandex' : 'google';
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    defaultPath: `${p.domain}-${engName}-${new Date().toISOString().slice(0, 10)}.csv`,
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });
  if (canceled || !filePath) return { saved: false };
  const sep = ';';
  const esc = (v) => {
    const s = String(v ?? '');
    return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const hasFreq = keywords.some((k) => k.freq !== null && k.freq !== undefined);
  const hasStats = keywords.some((k) => stats[k.id]?.[engine]);
  const hasMetrika = keywords.some((k) => metrikaRows[k.id]?.[engine]);
  const statHead = hasStats ? ['Показы 28д', 'Клики 28д', 'CTR', 'Ср.поз ПС'] : [];
  const metrikaHead = hasMetrika ? ['Визиты Метрика', 'Пользователи Метрика', 'Отказы Метрика', 'Цели Метрика'] : [];
  const lines = [];
  lines.push(['Фраза', ...(hasFreq ? ['Частота'] : []), ...statHead, ...metrikaHead, ...runs.map((r) => fmtDate(r.started_at))].map(esc).join(sep));
  for (const kw of keywords) {
    const row = [kw.phrase];
    if (hasFreq) row.push(kw.freq ?? '');
    if (hasStats) {
      const st = stats[kw.id]?.[engine];
      row.push(st ? st.s : '', st ? st.c : '', st ? (st.r * 100).toFixed(1) + '%' : '', st && st.p != null ? st.p.toFixed(1) : '');
    }
    if (hasMetrika) {
      const st = metrikaRows[kw.id]?.[engine];
      row.push(st ? st.v : '', st ? st.u : '', st ? Number(st.b).toFixed(1) + '%' : '', st && st.g != null ? st.g : '');
    }
    for (const r of runs) {
      const c = (cells[kw.id] || {})[r.id];
      if (!c) row.push('');
      else if (c.e) row.push('!');
      else row.push(c.p === 0 ? '-' : c.p);
    }
    lines.push(row.map(esc).join(sep));
  }
  fs.writeFileSync(filePath, '\uFEFF' + lines.join('\r\n'), 'utf8');
  return { saved: true, filePath };
}

// ---------- импорт истории позиций ----------

let pendingHistoryImport = null;

async function pickHistoryFile(defaultEngine, defaultDevice) {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Импорт истории позиций',
    filters: [{ name: 'История позиций', extensions: ['xlsx', 'csv'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths.length) return { canceled: true };

  const parsed = historyImport.readHistoryFile(filePaths[0]);
  const target = historyImport.guessTarget(filePaths[0], defaultEngine, defaultDevice);
  const importId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  pendingHistoryImport = { importId, parsed };
  return {
    canceled: false,
    importId,
    fileName: parsed.source.fileName,
    sheetName: parsed.source.sheetName,
    ...parsed.preview,
    ...target,
  };
}

function importHistory(projectId, importId, engine, device) {
  const project = db.get('SELECT id FROM projects WHERE id = ?', [projectId]);
  if (!project) throw new Error('Проект не найден');
  if (!pendingHistoryImport || pendingHistoryImport.importId !== importId) {
    throw new Error('Файл импорта больше не доступен — выберите его заново');
  }
  if (!['yandex', 'google'].includes(engine)) throw new Error('Выберите поисковик');
  if (!['desktop', 'mobile'].includes(device)) throw new Error('Выберите устройство');

  const parsed = pendingHistoryImport.parsed;
  const result = historyImport.importIntoProject(db, parsed, { projectId, engine, device });
  pendingHistoryImport = null;
  return result;
}

// ---------- автопроверка ----------

function schedulerTick() {
  try {
    const s = getSettings();
    if (s.autocheck_enabled !== '1') return;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (s.autocheck_last_date === today) return;
    const p = (n) => String(n).padStart(2, '0');
    const hhmm = `${p(now.getHours())}:${p(now.getMinutes())}`;
    if (hhmm < (s.autocheck_time || '07:00')) return;
    setSettings({ autocheck_last_date: today });
    for (const pr of db.all('SELECT id FROM projects ORDER BY id')) {
      startCheck(pr.id).catch(() => {});
    }
  } catch (error) {
    diagnosticLog('error', 'Automatic check scheduler failed', { message: error.message, stack: error.stack });
    // не роняем таймер
  }
}

// ---------- диагностический отчёт ----------

function diagnosticSections() {
  const userData = app.getPath('userData');
  const dbPath = path.join(userData, 'serpdesk.sqlite');
  const settings = getSettings();
  const count = (table) => db.get(`SELECT COUNT(*) AS c FROM ${table}`)?.c || 0;
  const database = {
    file_size_bytes: fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0,
    projects: count('projects'),
    keywords: count('keywords'),
    runs: count('runs'),
    results: count('results'),
    request_log_entries: count('request_log'),
    metrika_snapshots: count('metrika_stats'),
    running_checks: runners.size,
  };
  const connections = {
    xmlriver_configured: Boolean(settings.xmlriver_user && settings.xmlriver_key),
    yandex_webmaster_configured: Boolean(settings.yavm_token),
    yandex_metrika_configured: Boolean(settings.metrika_token),
    gsc_oauth_configured: Boolean(settings.gsc_client_id && settings.gsc_refresh_token),
    gsc_service_account_configured: Boolean(settings.gsc_key_path),
    concurrency: Number(settings.concurrency) || 3,
    automatic_checks_enabled: settings.autocheck_enabled === '1',
  };
  const runSummary = db.all(
    `SELECT engine, device, status, COUNT(*) AS count
     FROM runs GROUP BY engine, device, status ORDER BY engine, device, status`
  );
  const recentRequests = db.all(
    `SELECT project_id, run_id, kind, engine, device, requests, estimated_requests,
            price_per_1000, estimated_cost, actual_cost, started_at, finished_at, status
     FROM request_log ORDER BY started_at DESC, id DESC LIMIT 50`
  );
  const recentErrors = db.all(
    `SELECT u.engine, u.device, u.status AS run_status, r.error,
            COUNT(*) AS occurrences, MAX(u.started_at) AS last_at
     FROM results r JOIN runs u ON u.id = r.run_id
     WHERE r.error IS NOT NULL AND TRIM(r.error) <> ''
     GROUP BY u.engine, u.device, u.status, r.error
     ORDER BY last_at DESC LIMIT 50`
  );
  const backupList = backups.listBackups(dbPath).map(({ name, date, size }) => ({ name, date, size }));
  return {
    'Приложение и система': {
      version: app.getVersion(),
      packaged: app.isPackaged,
      platform: process.platform,
      architecture: process.arch,
      os_release: os.release(),
      os_version: typeof os.version === 'function' ? os.version() : null,
      electron: process.versions.electron,
      node: process.versions.node,
      locale: app.getLocale(),
    },
    'Состояние базы': database,
    'Подключения (только наличие, без реквизитов)': connections,
    'Запуски по статусам': runSummary,
    'Последние расходы XMLRiver': recentRequests,
    'Последние ошибки результатов': recentErrors,
    'Автоматические копии': backupList,
    'Технический журнал': diagnostics.readLogTail(diagnosticLogPath) || 'Журнал пока пуст.',
  };
}

async function exportDiagnostics() {
  db.flush();
  const stamp = new Date().toISOString().slice(0, 10);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Сохранить диагностику SerpDesk',
    defaultPath: `serpdesk-diagnostics-${stamp}.txt`,
    filters: [{ name: 'Текстовый файл', extensions: ['txt'] }],
  });
  if (canceled || !filePath) return { saved: false };
  const report = diagnostics.buildReport(diagnosticSections());
  fs.writeFileSync(filePath, report, 'utf8');
  diagnosticLog('info', 'Diagnostic report exported');
  return { saved: true, filePath };
}

// ---------- IPC ----------

function registerIpc() {
  const h = (name, fn) => ipcMain.handle(name, async (_e, args) => {
    try {
      return await fn(args || {});
    } catch (error) {
      diagnosticLog('error', `IPC operation failed: ${name}`, { message: error.message, stack: error.stack });
      throw error;
    }
  });

  h('settings:get', () => getSettings());
  h('settings:set', (patch) => { setSettings(patch); return getSettings(); });

  h('balance:get', async () => {
    const c = creds();
    if (!c.user || !c.key) return { ok: false, error: 'Не заданы user/key' };
    try {
      const balance = await xmlriver.getBalance(c);
      let costYandex = null;
      let costGoogle = null;
      try { costYandex = await xmlriver.getCost(c, 'yandex'); } catch {}
      try { costGoogle = await xmlriver.getCost(c, 'google'); } catch {}
      return { ok: true, balance, costYandex, costGoogle };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  h('projects:list', () => listProjects());

  h('projects:save', ({ id, name, domain, subdomains, cfg }) => {
    const host = xmlriver.normalizeHost(domain);
    if (!host || !host.includes('.')) throw new Error('Укажите корректный домен');
    const cleanName = String(name || '').trim() || host;
    if (id) {
      db.run('UPDATE projects SET name = ?, domain = ?, subdomains = ?, cfg = ? WHERE id = ?', [
        cleanName, host, subdomains ? 1 : 0, JSON.stringify(cfg), id,
      ]);
      return { id };
    }
    const r = db.run('INSERT INTO projects(name, domain, subdomains, cfg, created_at) VALUES(?, ?, ?, ?, ?)', [
      cleanName, host, subdomains ? 1 : 0, JSON.stringify(cfg), nowIso(),
    ]);
    return { id: r.lastID };
  });

  h('projects:duplicate', ({ sourceId, name, domain, subdomains, cfg, keywordMode, keywordIds }) => {
    const source = db.get('SELECT id FROM projects WHERE id = ?', [sourceId]);
    if (!source) throw new Error('Исходный проект не найден');
    const host = xmlriver.normalizeHost(domain);
    if (!host || !host.includes('.')) throw new Error('Укажите корректный домен');
    if (!cfg?.yandex?.enabled && !cfg?.google?.enabled) throw new Error('Включите хотя бы один поисковик');
    const mode = ['all', 'selected', 'empty'].includes(keywordMode) ? keywordMode : 'all';
    if (mode === 'selected') {
      const selected = normalizeIds(keywordIds);
      const sourceIds = new Set(db.all('SELECT id FROM keywords WHERE project_id = ?', [sourceId]).map((row) => Number(row.id)));
      if (![...selected].some((id) => sourceIds.has(id))) throw new Error('Сначала выделите запросы, которые нужно перенести');
    }
    const cleanName = String(name || '').trim() || `${host} — копия`;
    const project = db.run(
      'INSERT INTO projects(name, domain, subdomains, cfg, created_at) VALUES(?, ?, ?, ?, ?)',
      [cleanName, host, subdomains ? 1 : 0, JSON.stringify(cfg), nowIso()]
    );
    const keywordCount = copyProjectKeywords(db, {
      sourceId, targetId: project.lastID, mode, keywordIds, createdAt: nowIso(),
    });
    diagnosticLog('info', 'Project duplicated', {
      sourceProjectId: sourceId, projectId: project.lastID, keywordMode: mode, keywords: keywordCount,
    });
    return { id: project.lastID, keywordCount };
  });

  h('projects:delete', ({ id }) => {
    const runner = runners.get(id);
    if (runner) runner.cancel();
    db.run('DELETE FROM results WHERE run_id IN (SELECT id FROM runs WHERE project_id = ?)', [id]);
    db.run('DELETE FROM runs WHERE project_id = ?', [id]);
    db.run('DELETE FROM request_log WHERE project_id = ?', [id]);
    db.run('DELETE FROM project_notes WHERE project_id = ?', [id]);
    db.run('DELETE FROM ps_stats WHERE keyword_id IN (SELECT id FROM keywords WHERE project_id = ?)', [id]);
    db.run('DELETE FROM metrika_stats WHERE keyword_id IN (SELECT id FROM keywords WHERE project_id = ?)', [id]);
    db.run('DELETE FROM keywords WHERE project_id = ?', [id]);
    db.run('DELETE FROM projects WHERE id = ?', [id]);
    return { ok: true };
  });

  // Строка может быть «фраза», «фраза;целевой URL» или «фраза<TAB>целевой URL».
  h('keywords:add', ({ projectId, phrases, tag, collectFreq }) => {
    let added = 0;
    const cleanTag = String(tag || '').trim() || null;
    for (const raw of phrases) {
      const line = String(raw || '').trim();
      if (!line) continue;
      let phrase = line;
      let target = null;
      const m = line.split(/\t|;/);
      if (m.length > 1 && m[1].trim()) {
        phrase = m[0].trim();
        target = m.slice(1).join(';').trim() || null;
      }
      phrase = phrase.replace(/\s+/g, ' ').trim();
      if (!phrase) continue;
      const r = db.run('INSERT OR IGNORE INTO keywords(project_id, phrase, created_at, target_url, tag) VALUES(?, ?, ?, ?, ?)', [
        projectId, phrase, nowIso(), target, cleanTag,
      ]);
      if (r.changes > 0) added++;
      else if (target || cleanTag) {
        db.run('UPDATE keywords SET target_url = COALESCE(?, target_url), tag = COALESCE(?, tag) WHERE project_id = ? AND phrase = ?', [
          target, cleanTag, projectId, phrase,
        ]);
      }
    }
    const freqJob = collectFreq ? startFreqJob(projectId) : { started: false };
    return { added, freqStarted: freqJob.started };
  });

  h('keywords:set-target', ({ id, url }) => {
    db.run('UPDATE keywords SET target_url = ? WHERE id = ?', [String(url || '').trim() || null, id]);
    return { ok: true };
  });

  h('keywords:collect-freq', ({ projectId, refreshAll }) => startFreqJob(projectId, { refreshAll: Boolean(refreshAll) }));

  h('notes:add', ({ projectId, date, title, body, category }) => {
    const noteDate = String(date || '').trim();
    const cleanTitle = String(title || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(noteDate)) throw new Error('Укажите дату заметки');
    if (!cleanTitle) throw new Error('Напишите короткий заголовок');
    if (cleanTitle.length > 160) throw new Error('Заголовок слишком длинный');
    const cleanCategory = ['change', 'release', 'search', 'other'].includes(category) ? category : 'change';
    const result = db.run(
      `INSERT INTO project_notes(project_id, note_date, title, body, category, created_at)
       VALUES(?, ?, ?, ?, ?, ?)`,
      [projectId, noteDate, cleanTitle, String(body || '').trim() || null, cleanCategory, nowIso()]
    );
    return { id: result.lastID };
  });

  h('notes:delete', ({ projectId, id }) => {
    const result = db.run('DELETE FROM project_notes WHERE id = ? AND project_id = ?', [Number(id), Number(projectId)]);
    return { ok: true, deleted: result.changes };
  });

  h('check:retry', async ({ projectId, engine, device }) => {
    await retryErrors(projectId, engine, device || 'desktop');
    return { ok: true };
  });

  h('keywords:delete', ({ ids }) => {
    const cleanIds = [...new Set((Array.isArray(ids) ? ids : [])
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0))];
    for (const id of cleanIds) {
      db.run('DELETE FROM results WHERE keyword_id = ?', [id]);
      db.run('DELETE FROM competitor_results WHERE keyword_id = ?', [id]);
      db.run('DELETE FROM ps_stats WHERE keyword_id = ?', [id]);
      db.run('DELETE FROM metrika_stats WHERE keyword_id = ?', [id]);
      db.run('DELETE FROM keywords WHERE id = ?', [id]);
    }
    return { ok: true, deleted: cleanIds.length };
  });

  h('clipboard:write', ({ text }) => {
    const value = String(text || '');
    if (!value) throw new Error('Нет текста для копирования');
    if (value.length > 10_000_000) throw new Error('Слишком большой объём текста');
    clipboard.writeText(value);
    return { ok: true, length: value.length };
  });

  h('psstats:refresh', async ({ projectId }) => refreshPsStats(projectId));
  h('psstats:test', async () => testPsAccess());

  h('psstats:history', ({ keywordId, engine }) => db.all(
    `SELECT days, date_from, date_to, shows, clicks, ctr, position, fetched_at
     FROM ps_stats WHERE keyword_id = ? AND engine = ? ORDER BY fetched_at DESC LIMIT 60`,
    [keywordId, engine]
  ));

  h('metrika:history', ({ keywordId, engine }) => db.all(
    `SELECT counter_id, days, date_from, date_to, visits, users, bounce_rate, page_depth,
            duration, goal_reaches, sampled, sample_share, fetched_at
     FROM metrika_stats WHERE keyword_id = ? AND engine = ? ORDER BY fetched_at DESC LIMIT 60`,
    [keywordId, engine]
  ));

  h('gsc:login', async ({ clientId, clientSecret }) => {
    if (!clientId || !clientSecret) throw new Error('Укажите Client ID и Client secret');
    setSettings({ gsc_client_id: clientId, gsc_client_secret: clientSecret });
    const tokens = await gsc.oauthLogin(clientId, clientSecret);
    setSettings({ gsc_refresh_token: tokens.refresh_token });
    return { ok: true };
  });

  h('dialog:pick-json', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    return { path: canceled || !filePaths.length ? null : filePaths[0] };
  });

  h('history:pick-file', ({ engine, device }) => pickHistoryFile(engine, device));
  h('history:import', ({ projectId, importId, engine, device }) => (
    importHistory(projectId, importId, engine, device)
  ));

  h('grid:get', ({ projectId, engine, device, limit, cursor }) => (
    getGrid(projectId, engine, device || 'desktop', limit || 20, cursor || null)
  ));

  h('check:start', async ({ projectId, engines }) => { await startCheck(projectId, engines); return { ok: true }; });
  h('check:estimate', ({ projectId, engines }) => estimateCheck(projectId, engines));

  h('check:cancel', ({ projectId }) => {
    const r = runners.get(projectId);
    if (r) r.cancel();
    return { ok: true };
  });

  h('export:csv', ({ projectId, engine, device }) => exportCsv(projectId, engine, device || 'desktop'));

  h('report:open', ({ projectId, engine, device }) => openReport(projectId, engine, device || 'desktop'));

  h('requests:list', ({ projectId, limit }) => db.all(
    `SELECT l.*, p.name AS project_name
     FROM request_log l JOIN projects p ON p.id = l.project_id
     WHERE (? IS NULL OR l.project_id = ?)
     ORDER BY l.started_at DESC, l.id DESC LIMIT ?`,
    [projectId || null, projectId || null, Math.max(1, Math.min(Number(limit) || 100, 500))]
  ));

  h('app:open-telegram', () => {
    shell.openExternal('https://t.me/kakao_seo');
    return { ok: true };
  });

  h('app:open-url', async ({ url }) => {
    let parsed;
    try { parsed = new URL(String(url || '')); }
    catch { throw new Error('Некорректная ссылка'); }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Разрешены только HTTP/HTTPS-ссылки');
    await shell.openExternal(parsed.toString());
    return { ok: true };
  });

  h('db:export', async () => {
    db.flush();
    const stamp = new Date().toISOString().slice(0, 10);
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Экспорт базы SerpDesk',
      defaultPath: `serpdesk-backup-${stamp}.sqlite`,
      filters: [{ name: 'SQLite', extensions: ['sqlite'] }],
    });
    if (canceled || !filePath) return { saved: false };
    fs.copyFileSync(path.join(app.getPath('userData'), 'serpdesk.sqlite'), filePath);
    return { saved: true, filePath };
  });

  h('db:import', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Импорт базы SerpDesk',
      filters: [{ name: 'SQLite', extensions: ['sqlite', 'db'] }],
      properties: ['openFile'],
    });
    if (canceled || !filePaths.length) return { imported: false };
    const src = filePaths[0];
    // Проверяем, что это валидная база SerpDesk (есть таблица projects).
    const probe = await DB.open(src).catch(() => null);
    if (!probe || !probe.get("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'")) {
      throw new Error('Это не похоже на базу SerpDesk');
    }
    const dbPath = path.join(app.getPath('userData'), 'serpdesk.sqlite');
    db.flush();
    fs.copyFileSync(dbPath, dbPath + '.before-import');
    fs.copyFileSync(src, dbPath);
    app.relaunch();
    app.exit(0);
    return { imported: true };
  });

  h('db:list-backups', () => backups.listBackups(path.join(app.getPath('userData'), 'serpdesk.sqlite')));

  h('db:restore-backup', ({ name }) => {
    const dbPath = path.join(app.getPath('userData'), 'serpdesk.sqlite');
    db.flush();
    const result = backups.restoreBackup(dbPath, name);
    app.relaunch();
    app.exit(0);
    return result;
  });

  h('diagnostics:export', () => exportDiagnostics());

  h('app:version', () => app.getVersion());
}

// ---------- отчёт (PDF / HTML) ----------

let reportWin = null;

function posBucket(p) {
  if (p == null) return ['#8b98a5', 'rgba(139,148,158,.12)'];
  if (p === 0) return ['#5c6873', 'rgba(139,148,158,.08)'];
  if (p <= 3) return ['#ffffff', 'rgba(46,160,67,.55)'];
  if (p <= 10) return ['#56d364', 'rgba(63,185,80,.16)'];
  if (p <= 30) return ['#e3b341', 'rgba(210,153,34,.15)'];
  return ['#f0883e', 'rgba(219,109,40,.15)'];
}

function buildReportHtml(projectId, engine, device = 'desktop') {
  const p = db.get('SELECT * FROM projects WHERE id = ?', [projectId]);
  const project = projectRow(p);
  const { runs, keywords, cells, stats } = getGrid(projectId, engine, device, 12);
  const engName = engine === 'yandex' ? 'Яндекс' : 'Google';
  const last = runs[runs.length - 1];
  const fmtD = (iso) => { const d = new Date(iso); const z = (n) => String(n).padStart(2, '0'); return `${z(d.getDate())}.${z(d.getMonth() + 1)}.${d.getFullYear()}`; };

  let top3 = 0, top10 = 0, top30 = 0, found = 0, sum = 0;
  if (last) for (const kw of keywords) {
    const c = (cells[kw.id] || {})[last.id];
    if (!c || c.e || !(c.p >= 1)) continue;
    found++; sum += c.p;
    if (c.p <= 3) top3++; if (c.p <= 10) top10++; if (c.p <= 30) top30++;
  }
  const avg = found ? (sum / found).toFixed(1) : '—';

  const rowsHtml = keywords.map((kw) => {
    const tds = runs.map((r) => {
      const c = (cells[kw.id] || {})[r.id];
      if (!c || c.e) return `<td class="p"></td>`;
      const [fg, bg] = posBucket(c.p);
      return `<td class="p"><span style="color:${fg};background:${bg}">${c.p === 0 ? '—' : c.p}</span></td>`;
    }).join('');
    const st = stats[kw.id] && stats[kw.id][engine];
    return `<tr><td class="ph">${escapeHtml(kw.phrase)}</td>${kw.freq != null ? `<td class="n">${kw.freq}</td>` : ''}${st ? `<td class="n">${st.s || ''}</td><td class="n">${st.c || ''}</td>` : ''}${tds}</tr>`;
  }).join('');

  const hasFreq = keywords.some((k) => k.freq != null);
  const hasStats = keywords.some((k) => stats[k.id] && stats[k.id][engine]);

  return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Отчёт — ${escapeHtml(project.name)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; color: #1a222c; background: #fff; }
  .toolbar { position: sticky; top: 0; background: #151b23; padding: 10px 20px; display: flex; gap: 8px; align-items: center; }
  .toolbar b { color: #e6edf3; margin-right: auto; font-size: 14px; }
  .toolbar button { font: inherit; font-weight: 600; border: 0; border-radius: 7px; padding: 8px 16px; cursor: pointer; background: #4f8cff; color: #fff; }
  .toolbar button.sec { background: #26303c; color: #e6edf3; }
  .page { padding: 28px 32px; max-width: 1100px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #5c6873; font-size: 13px; margin-bottom: 20px; }
  .kpis { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
  .kpi { border: 1px solid #e3e8ee; border-radius: 10px; padding: 12px 18px; min-width: 120px; }
  .kpi .l { font-size: 11px; color: #5c6873; text-transform: uppercase; letter-spacing: .4px; }
  .kpi .v { font-size: 24px; font-weight: 700; margin-top: 3px; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; }
  th, td { border: 1px solid #e3e8ee; padding: 5px 7px; }
  th { background: #f5f7fa; font-size: 10px; color: #5c6873; text-align: center; font-weight: 600; }
  th.ph, td.ph { text-align: left; max-width: 320px; }
  td.p { text-align: center; padding: 3px; }
  td.p span { display: inline-block; min-width: 26px; padding: 2px 6px; border-radius: 5px; font-weight: 700; }
  td.n { text-align: right; color: #5c6873; }
  @media print { .toolbar { display: none; } .page { padding: 0; } }
</style></head><body>
<div class="toolbar">
  <b>SerpDesk — отчёт по позициям</b>
  <button onclick="print()">Сохранить PDF / Печать</button>
</div>
<div class="page">
  <h1>${escapeHtml(project.name)}</h1>
  <div class="sub">${escapeHtml(project.domain)} · ${engName} · глубина ТОП-${project.cfg.depth}${last ? ' · данные на ' + fmtD(last.started_at) : ''}</div>
  <div class="kpis">
    <div class="kpi"><div class="l">Фраз</div><div class="v">${keywords.length}</div></div>
    <div class="kpi"><div class="l">ТОП-3</div><div class="v">${top3}</div></div>
    <div class="kpi"><div class="l">ТОП-10</div><div class="v">${top10}</div></div>
    <div class="kpi"><div class="l">ТОП-30</div><div class="v">${top30}</div></div>
    <div class="kpi"><div class="l">Ср. позиция</div><div class="v">${avg}</div></div>
  </div>
  <table>
    <thead><tr><th class="ph">Фраза</th>${hasFreq ? '<th>Частота</th>' : ''}${hasStats ? '<th>Показы</th><th>Клики</th>' : ''}${runs.map((r) => `<th>${fmtD(r.started_at)}</th>`).join('')}</tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="sub" style="margin-top:16px">Сформировано в SerpDesk ${new Date().toLocaleDateString('ru-RU')}</div>
</div>
</body></html>`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function openReport(projectId, engine, device = 'desktop') {
  const html = buildReportHtml(projectId, engine, device);
  if (reportWin && !reportWin.isDestroyed()) reportWin.destroy();
  reportWin = new BrowserWindow({
    width: 1000, height: 800, title: 'Отчёт SerpDesk', backgroundColor: '#ffffff',
    webPreferences: { sandbox: true },
  });
  reportWin.setMenuBarVisibility(false);
  reportWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  reportWin.on('closed', () => { reportWin = null; });
  return { ok: true };
}

// ---------- окно ----------

function createWindow() {
  win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1020,
    minHeight: 640,
    title: 'SerpDesk',
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('render-process-gone', (_event, details) => {
    diagnosticLog('error', 'Renderer process stopped', details);
  });
}

function buildMenu() {
  const checkItem = { label: 'Проверить обновления…', click: () => initUpdater(true) };
  const template = [
    ...(process.platform === 'darwin'
      ? [{ label: app.name, submenu: [{ role: 'about' }, checkItem, { type: 'separator' }, { role: 'quit' }] }]
      : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    ...(process.platform !== 'darwin' ? [{ label: 'Справка', submenu: [checkItem] }] : []),
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });

  app.whenReady().then(async () => {
    const dbPath = path.join(app.getPath('userData'), 'serpdesk.sqlite');
    diagnosticLogPath = path.join(app.getPath('userData'), 'logs', 'serpdesk.log');
    diagnosticLog('info', 'SerpDesk starting', {
      version: app.getVersion(), platform: process.platform, architecture: process.arch, packaged: app.isPackaged,
    });
    try { backups.createDailyBackup(dbPath); }
    catch (error) { diagnosticLog('error', 'Daily backup failed', { message: error.message, stack: error.stack }); }
    db = await DB.open(dbPath);
    // После аварийного закрытия в базе могли остаться «running»-прогоны.
    // Они уже не выполняются, поэтому показываем их как прерванные и разрешаем досбор.
    const interruptedAt = nowIso();
    const orphanedRuns = runResume.recoverInterrupted(db, interruptedAt);
    if (orphanedRuns) {
      db.flush();
      diagnosticLog('info', 'Interrupted runs recovered', { count: orphanedRuns });
    }
    registerIpc();
    buildMenu();
    createWindow();
    setInterval(schedulerTick, 30000);
    setInterval(() => {
      try { db.flush(); backups.createDailyBackup(dbPath); }
      catch (error) { diagnosticLog('error', 'Hourly database maintenance failed', { message: error.message, stack: error.stack }); }
    }, 60 * 60 * 1000);
    setTimeout(() => initUpdater(false), 4000); // тихая проверка обновлений при старте

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', () => {
    diagnosticLog('info', 'SerpDesk stopping');
    for (const r of runners.values()) r.cancel();
    if (db) db.flush();
  });
}
