'use strict';

const assert = require('assert');
const insights = require('../renderer/analytics-insights');
const { runMetrics } = require('../lib/analytics');

const keywords = [
  { id: 1, phrase: 'one', freq: 100 },
  { id: 2, phrase: 'two', freq: 10 },
];
const cells = {
  1: { 10: { p: 12, u: 'https://site.ru/a' }, 11: { p: 4, u: 'https://site.ru/a' } },
  2: { 10: { p: 3, u: 'https://site.ru/b' }, 11: { p: 15, u: 'https://site.ru/b' } },
};

const rows = insights.urlDynamics(keywords, cells, 11, 10);
assert.strictEqual(rows.length, 2);
assert.ok(rows.find((row) => row.url.includes('/a')).delta > 0);
assert.ok(rows.find((row) => row.url.includes('/b')).delta < 0);
assert.strictEqual(runMetrics(keywords, cells, 11).top5, 1);
assert.strictEqual(insights.sameDomainProjects([
  { domain: 'www.site.ru' }, { domain: 'site.ru' }, { domain: 'other.ru' },
], { domain: 'site.ru' }).length, 2);

console.log('OK: ТОП-5 и динамика URL считаются корректно');
