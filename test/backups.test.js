'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const DB = require('../lib/db');
const backups = require('../lib/backups');

(async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'serpdesk-backups-test-'));
  try {
    const dbPath = path.join(tempDir, 'serpdesk.sqlite');
    const db = await DB.open(dbPath);
    db.run("INSERT INTO settings(k, v) VALUES('marker', 'first')");
    db.flush();

    const first = backups.createDailyBackup(dbPath, { now: new Date(2026, 6, 24), keep: 2 });
    assert.strictEqual(first.name, 'serpdesk-2026-07-24.sqlite');
    assert.strictEqual(backups.listBackups(dbPath).length, 1);
    backups.createDailyBackup(dbPath, { now: new Date(2026, 6, 24), keep: 2 });
    assert.strictEqual(backups.listBackups(dbPath).length, 1, 'за день создаётся только одна копия');

    db.run("UPDATE settings SET v = 'second' WHERE k = 'marker'");
    db.flush();
    backups.createDailyBackup(dbPath, { now: new Date(2026, 6, 25), keep: 2 });
    backups.createDailyBackup(dbPath, { now: new Date(2026, 6, 26), keep: 2 });
    assert.deepStrictEqual(backups.listBackups(dbPath).map((item) => item.date), ['2026-07-26', '2026-07-25']);

    backups.restoreBackup(dbPath, 'serpdesk-2026-07-25.sqlite', { now: new Date(2026, 6, 27) });
    assert.ok(backups.isSqlite(dbPath));
    assert.throws(() => backups.restoreBackup(dbPath, '../serpdesk.sqlite'), /Некорректное имя/);
    console.log('OK: автоматические резервные копии создаются, очищаются и восстанавливаются безопасно');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
