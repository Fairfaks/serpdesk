'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const DB = require('../lib/db');
const {
  guessTarget,
  importIntoProject,
  parseCsv,
  parseDateHeader,
  parsePosition,
  parseRows,
} = require('../lib/import-history');

assert.deepStrictEqual(parseDateHeader('23.07.26'), { iso: '2026-07-23', label: '23.07.2026' });
assert.deepStrictEqual(parseDateHeader('2026-06-24'), { iso: '2026-06-24', label: '24.06.2026' });
assert.strictEqual(parseDateHeader('31.02.2026'), null);
assert.strictEqual(parsePosition('—'), 0);
assert.strictEqual(parsePosition('100+'), 0);
assert.strictEqual(parsePosition(101), 0);
assert.strictEqual(parsePosition('12.5'), null);
assert.strictEqual(parsePosition(''), null);

const csvRows = parseCsv('\uFEFF"Запрос";"Теги";23.07.2026\r\n"фраза; с точкой";"группа";"7"\r\n');
assert.strictEqual(csvRows[1][0], 'фраза; с точкой');
assert.strictEqual(csvRows[1][2], '7');

const guessed = guessTarget('project_Yandeks_Moskva_Kompyyuter.xlsx', 'google', 'mobile');
assert.deepStrictEqual(guessed, { engine: 'yandex', device: 'desktop' });

const parsed = parseRows([
  ['', '', '', '', '', ''],
  ['Теги', '2026-06-24', 'Релевантный URL', 'Запрос', 'Частота', '14.07.2026'],
  ['новая группа', '12', 'https://example.ru/relevant', '  франшиза   магнит  ', '46', '26'],
], { fileName: 'test.csv', sheetName: null });
assert.strictEqual(parsed.preview.phrasesCount, 1);
assert.strictEqual(parsed.preview.valuesCount, 2);
assert.strictEqual(parsed.rows[0].phrase, 'франшиза магнит');

(async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'serpdesk-history-test-'));
  try {
    const db = await DB.open(path.join(tempDir, 'test.sqlite'));
    const projectId = db.run(
      'INSERT INTO projects(name, domain, subdomains, cfg, created_at) VALUES(?, ?, ?, ?, ?)',
      ['Тест', 'example.ru', 1, '{}', new Date().toISOString()]
    ).lastID;
    db.run(
      'INSERT INTO keywords(project_id, phrase, freq, tag, target_url, created_at) VALUES(?, ?, ?, ?, ?, ?)',
      [projectId, 'франшиза магнит', 999, 'старая группа', null, new Date().toISOString()]
    );

    const first = importIntoProject(db, parsed, { projectId, engine: 'yandex', device: 'desktop' });
    assert.deepStrictEqual(first, { phrases: 1, dates: 2, values: 2 });
    const keyword = db.get('SELECT * FROM keywords WHERE project_id = ? AND phrase = ?', [projectId, 'франшиза магнит']);
    assert.strictEqual(keyword.freq, 999, 'имеющаяся частотность не должна затираться');
    assert.strictEqual(keyword.tag, 'старая группа', 'имеющийся тег не должен затираться');
    assert.strictEqual(keyword.target_url, null);
    assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM runs WHERE project_id = ?', [projectId]).c, 2);
    assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM results').c, 2);

    importIntoProject(db, parsed, { projectId, engine: 'yandex', device: 'desktop' });
    assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM runs WHERE project_id = ?', [projectId]).c, 2, 'повтор не создаёт прогоны');
    assert.strictEqual(db.get('SELECT COUNT(*) AS c FROM results').c, 2, 'повтор не создаёт результаты');

    parsed.rows[0].positions['2026-07-14'] = 32;
    importIntoProject(db, parsed, { projectId, engine: 'yandex', device: 'desktop' });
    const updated = db.get(
      `SELECT r.position FROM results r
       JOIN runs u ON u.id = r.run_id
       WHERE r.keyword_id = ? AND date(u.started_at) = '2026-07-14'`,
      [keyword.id]
    );
    assert.strictEqual(updated.position, 32, 'последний импорт перезаписывает совпавшую ячейку');
    console.log('OK: импорт истории разбирается и записывается идемпотентно');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
