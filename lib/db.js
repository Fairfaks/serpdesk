'use strict';
// Хранилище на sql.js (SQLite в WASM): без нативных модулей, одинаково работает
// на macOS и Windows. База живёт в памяти, на диск пишется атомарно с дебаунсом.

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  k TEXT PRIMARY KEY,
  v TEXT
);
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  subdomains INTEGER NOT NULL DEFAULT 1,
  cfg TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  phrase TEXT NOT NULL,
  created_at TEXT NOT NULL,
  freq INTEGER,
  target_url TEXT,
  tag TEXT,
  UNIQUE(project_id, phrase)
);
CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  engine TEXT NOT NULL,
  device TEXT NOT NULL DEFAULT 'desktop',
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL DEFAULT 'running'
);
CREATE TABLE IF NOT EXISTS results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  keyword_id INTEGER NOT NULL,
  position INTEGER,
  url TEXT,
  error TEXT,
  visual_position INTEGER,
  serp_features TEXT
);
CREATE TABLE IF NOT EXISTS request_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  run_id INTEGER,
  kind TEXT NOT NULL DEFAULT 'positions',
  engine TEXT,
  device TEXT,
  requests INTEGER NOT NULL DEFAULT 0,
  estimated_requests INTEGER,
  price_per_1000 REAL,
  estimated_cost REAL,
  actual_cost REAL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  details TEXT
);
CREATE TABLE IF NOT EXISTS ps_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword_id INTEGER NOT NULL,
  engine TEXT NOT NULL,
  days INTEGER NOT NULL DEFAULT 28,
  date_from TEXT,
  date_to TEXT,
  shows INTEGER,
  clicks INTEGER,
  ctr REAL,
  position REAL,
  fetched_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_ps_stats_kw ON ps_stats(keyword_id, engine, fetched_at);
CREATE TABLE IF NOT EXISTS competitor_results (
  run_id INTEGER NOT NULL,
  keyword_id INTEGER NOT NULL,
  domain TEXT NOT NULL,
  position INTEGER,
  PRIMARY KEY (run_id, keyword_id, domain)
);
CREATE TABLE IF NOT EXISTS project_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  note_date TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  category TEXT NOT NULL DEFAULT 'change',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comp_run ON competitor_results(run_id);
CREATE INDEX IF NOT EXISTS idx_project_notes_project ON project_notes(project_id, note_date);
CREATE INDEX IF NOT EXISTS idx_keywords_project ON keywords(project_id);
CREATE INDEX IF NOT EXISTS idx_runs_project ON runs(project_id, engine, started_at);
CREATE INDEX IF NOT EXISTS idx_results_run ON results(run_id);
CREATE INDEX IF NOT EXISTS idx_results_kw ON results(keyword_id);
CREATE INDEX IF NOT EXISTS idx_request_log_project ON request_log(project_id, started_at);
`;

class Store {
  constructor(sqlDb, filePath) {
    this.db = sqlDb;
    this.filePath = filePath;
    this._saveTimer = null;
    this._dirty = false;
  }

  all(sql, params = []) {
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      return rows;
    } finally {
      stmt.free();
    }
  }

  get(sql, params = []) {
    return this.all(sql, params)[0] || null;
  }

  run(sql, params = []) {
    this.db.run(sql, params);
    const row = this.get('SELECT last_insert_rowid() AS id');
    this._dirty = true;
    this.saveSoon();
    return { lastID: row ? row.id : null, changes: this.db.getRowsModified() };
  }

  saveSoon() {
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this.flush();
    }, 800);
  }

  flush() {
    if (!this._dirty) return;
    const data = Buffer.from(this.db.export());
    const tmp = this.filePath + '.tmp';
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, this.filePath);
    this._dirty = false;
  }
}

async function open(filePath) {
  // В собранном приложении sql.js распакован из asar (asarUnpack).
  const distDir = path.dirname(require.resolve('sql.js/dist/sql-wasm.js'));
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(distDir, file).replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep),
  });
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  let sqlDb;
  if (fs.existsSync(filePath)) {
    try {
      sqlDb = new SQL.Database(fs.readFileSync(filePath));
    } catch {
      // Повреждённый файл не затираем — откладываем в сторону.
      fs.renameSync(filePath, filePath + '.corrupt-' + Date.now());
      sqlDb = new SQL.Database();
    }
  } else {
    sqlDb = new SQL.Database();
  }
  sqlDb.run(SCHEMA);
  const store = new Store(sqlDb, filePath);
  // Миграция старых баз: недостающие колонки keywords.
  const kwCols = store.all('PRAGMA table_info(keywords)').map((r) => r.name);
  for (const [col, type] of [['freq', 'INTEGER'], ['target_url', 'TEXT'], ['tag', 'TEXT']]) {
    if (!kwCols.includes(col)) sqlDb.run(`ALTER TABLE keywords ADD COLUMN ${col} ${type}`);
  }
  const runCols = store.all('PRAGMA table_info(runs)').map((r) => r.name);
  if (!runCols.includes('device')) sqlDb.run("ALTER TABLE runs ADD COLUMN device TEXT NOT NULL DEFAULT 'desktop'");
  const resultCols = store.all('PRAGMA table_info(results)').map((r) => r.name);
  if (!resultCols.includes('visual_position')) sqlDb.run('ALTER TABLE results ADD COLUMN visual_position INTEGER');
  if (!resultCols.includes('serp_features')) sqlDb.run('ALTER TABLE results ADD COLUMN serp_features TEXT');
  // Старые версии не фиксировали уникальность ячейки сетки на уровне БД.
  // Оставляем последнее значение и включаем настоящий upsert для импорта истории.
  sqlDb.run(`DELETE FROM results
    WHERE id NOT IN (SELECT MAX(id) FROM results GROUP BY run_id, keyword_id)`);
  sqlDb.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_results_run_kw ON results(run_id, keyword_id)');
  // Миграция ps_stats: из «последнего значения» (PK keyword+engine) в историю снимков.
  const psCols = store.all('PRAGMA table_info(ps_stats)').map((r) => r.name);
  if (psCols.length && !psCols.includes('days')) {
    sqlDb.run('ALTER TABLE ps_stats RENAME TO ps_stats_old');
    sqlDb.run(`CREATE TABLE ps_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword_id INTEGER NOT NULL,
      engine TEXT NOT NULL,
      days INTEGER NOT NULL DEFAULT 28,
      date_from TEXT,
      date_to TEXT,
      shows INTEGER, clicks INTEGER, ctr REAL, position REAL,
      fetched_at TEXT
    )`);
    sqlDb.run(`INSERT INTO ps_stats(keyword_id, engine, days, shows, clicks, ctr, position, fetched_at)
      SELECT keyword_id, engine, 28, shows, clicks, ctr, position, fetched_at FROM ps_stats_old`);
    sqlDb.run('DROP TABLE ps_stats_old');
    sqlDb.run('CREATE INDEX IF NOT EXISTS idx_ps_stats_kw ON ps_stats(keyword_id, engine, fetched_at)');
  }
  store._dirty = true;
  store.flush();
  return store;
}

module.exports = { open };
