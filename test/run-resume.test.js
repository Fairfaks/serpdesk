'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const DB = require('../lib/db');
const runResume = require('../lib/run-resume');

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'serpdesk-resume-test-'));
  let db = null;
  try {
    db = await DB.open(path.join(dir, 'test.sqlite'));
    db.run("INSERT INTO projects(id, name, domain, cfg, created_at) VALUES(1, 'Тест', 'site.ru', '{}', '2026-08-11T10:00:00Z')");
    for (const [id, phrase] of [[1, 'готовая'], [2, 'ошибка'], [3, 'не собрана']]) {
      db.run('INSERT INTO keywords(id, project_id, phrase, created_at) VALUES(?, 1, ?, ?)', [id, phrase, '2026-08-11T10:00:00Z']);
    }
    db.run("INSERT INTO runs(id, project_id, engine, device, started_at, status) VALUES(10, 1, 'yandex', 'desktop', '2026-08-11T10:00:00Z', 'running')");
    db.run("INSERT INTO request_log(id, project_id, run_id, kind, started_at, status) VALUES(20, 1, 10, 'positions', '2026-08-11T10:00:00Z', 'running')");
    db.run('INSERT INTO results(run_id, keyword_id, position, error) VALUES(10, 1, 3, NULL)');
    db.run("INSERT INTO results(run_id, keyword_id, position, error) VALUES(10, 2, NULL, 'нет интернета')");

    assert.deepStrictEqual(runResume.summary(db, 10, 1), { pending: 2, missing: 1, errors: 1 });
    assert.deepStrictEqual(runResume.pendingKeywords(db, 10, 1).map((item) => item.phrase), ['ошибка', 'не собрана']);

    assert.strictEqual(runResume.recoverInterrupted(db, '2026-08-11T12:00:00Z'), 1);
    assert.strictEqual(db.get('SELECT status FROM runs WHERE id = 10').status, 'interrupted');
    assert.strictEqual(db.get('SELECT status FROM request_log WHERE id = 20').status, 'interrupted');

    db.run('UPDATE results SET position = 8, error = NULL WHERE run_id = 10 AND keyword_id = 2');
    db.run('INSERT INTO results(run_id, keyword_id, position, error) VALUES(10, 3, 12, NULL)');
    assert.deepStrictEqual(runResume.summary(db, 10, 1), { pending: 0, missing: 0, errors: 0 });
    console.log('run-resume.test.js: OK');
  } finally {
    if (db) db.flush();
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
