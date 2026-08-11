'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { analyzeChanges, summarizeImportant } = require('../lib/analytics');
const { applyPrices, estimateProjectRequests } = require('../lib/costs');
const DB = require('../lib/db');

const keywords = [
  { id: 1, phrase: 'важная фраза', freq: 1000, tag: 'услуги', target_url: 'https://site.ru/a' },
  { id: 2, phrase: 'рост', freq: 100, tag: 'инфо', target_url: null },
  { id: 3, phrase: 'смена url', freq: 50, tag: 'услуги', target_url: null },
];
const runs = [
  { id: 10, started_at: '2026-07-20T12:00:00', status: 'done' },
  { id: 11, started_at: '2026-07-21T12:00:00', status: 'done' },
];
const cells = {
  1: {
    10: { p: 3, u: 'https://site.ru/a', e: null },
    11: { p: 18, u: 'https://site.ru/b', e: null },
  },
  2: {
    10: { p: 20, u: 'https://site.ru/info', e: null },
    11: { p: 7, u: 'https://site.ru/info', e: null },
  },
  3: {
    10: { p: 5, u: 'https://site.ru/one', e: null },
    11: { p: 6, u: 'https://site.ru/two', e: null },
  },
};

const analysis = analyzeChanges(keywords, cells, runs, 100);
assert.strictEqual(analysis.changes.leftTop10.length, 1);
assert.strictEqual(analysis.changes.enteredTop10.length, 1);
assert.strictEqual(analysis.changes.bigDrops.length, 1);
assert.strictEqual(analysis.changes.urlChanged.length, 2);
assert.ok(analysis.visibilityDelta < 0, 'частотная фраза должна заметно снизить видимость');
assert.ok(summarizeImportant(analysis).includes('вышли из ТОП-10'));

const project = {
  cfg: {
    depth: 30,
    deviceMode: 'both',
    yandex: { enabled: true, source: 'api' },
    google: { enabled: true },
  },
};
const estimate = applyPrices(estimateProjectRequests(project, 100), { yandex: 20, google: 30 });
assert.strictEqual(estimate.requests, 800, 'Яндекс: 2×100, Google: 2×100×3 страницы');
assert.strictEqual(estimate.cost, 22);
assert.strictEqual(estimate.details.length, 4);
const yandexOnly = applyPrices(estimateProjectRequests(project, 100, ['yandex']), { yandex: 20 });
assert.strictEqual(yandexOnly.requests, 200, 'выбор Яндекса не должен включать запросы Google');
assert.strictEqual(yandexOnly.cost, 4);
assert.ok(yandexOnly.details.every((item) => item.engine === 'yandex'));

(async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'serpdesk-business-test-'));
  try {
    const db = await DB.open(path.join(tempDir, 'test.sqlite'));
    assert.ok(db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='request_log'"));
    db.run(
      `INSERT INTO request_log(project_id, kind, requests, started_at, status)
       VALUES(1, 'positions', 10, '2026-07-24T00:00:00', 'done')`
    );
    assert.strictEqual(db.get('SELECT requests FROM request_log').requests, 10);
    db.flush();
    console.log('OK: аналитика, алерты и оценка стоимости работают');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
