'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const DB = require('../lib/db');
const { copyProjectKeywords } = require('../lib/project-copy');

(async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'serpdesk-project-copy-'));
  try {
    const db = await DB.open(path.join(tempDir, 'test.sqlite'));
    const source = db.run("INSERT INTO projects(name, domain, cfg, created_at) VALUES('Москва', 'site.ru', '{}', 'now')").lastID;
    const target = db.run("INSERT INTO projects(name, domain, cfg, created_at) VALUES('СПб', 'site.ru', '{}', 'now')").lastID;
    const first = db.run(
      "INSERT INTO keywords(project_id, phrase, created_at, freq, target_url, tag) VALUES(?, 'первая', 'now', 100, '/one', 'группа')",
      [source]
    ).lastID;
    db.run("INSERT INTO keywords(project_id, phrase, created_at, freq) VALUES(?, 'вторая', 'now', 200)", [source]);
    const copied = copyProjectKeywords(db, {
      sourceId: source, targetId: target, mode: 'selected', keywordIds: [first], createdAt: 'later',
    });
    assert.strictEqual(copied, 1);
    const row = db.get('SELECT phrase, freq, target_url, tag FROM keywords WHERE project_id = ?', [target]);
    assert.deepStrictEqual(row, { phrase: 'первая', freq: null, target_url: '/one', tag: 'группа' });
    assert.strictEqual(copyProjectKeywords(db, { sourceId: source, targetId: target, mode: 'empty', createdAt: 'later' }), 0);
    db.flush();
    console.log('OK: дублирование переносит выбранные запросы без региональной частотности');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
