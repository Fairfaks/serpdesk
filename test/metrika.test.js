'use strict';

const assert = require('assert');
const metrika = require('../lib/metrika');

assert.strictEqual(metrika.normQuery('  Ёлка   ДЛЯ дома '), 'елка для дома');
assert.strictEqual(metrika.normHost('https://www.Example.ru/path'), 'example.ru');

const counters = [
  { id: 111, name: 'Другой', site: 'other.ru' },
  { id: 222, name: 'Основной', site: 'www.example.ru', mirrors: ['shop.example.ru'] },
];
assert.strictEqual(metrika.matchCounter(counters, 'example.ru').id, 222);
assert.strictEqual(metrika.matchCounter(counters, 'other.ru', '222').id, 222);
assert.strictEqual(metrika.matchCounter(counters, 'example.ru', '999'), null);

const parsed = metrika.parseReport({
  sampled: true,
  sample_share: 0.75,
  data: [
    {
      dimensions: [{ name: ' Купить Ёлку ' }, { name: 'Яндекс' }],
      metrics: [17, 14, 8.5, 2.3, 91, 3],
    },
    {
      dimensions: [{ name: 'buy tree' }, { name: 'Google' }],
      metrics: [9, 8, 12, 1.8, 60, 1],
    },
  ],
});
assert.strictEqual(parsed.rows, 2);
assert.strictEqual(parsed.sampled, true);
assert.strictEqual(parsed.sampleShare, 0.75);
assert.deepStrictEqual(parsed.byEngine.yandex.get('купить елку'), {
  phrase: ' Купить Ёлку ', visits: 17, users: 14, bounceRate: 8.5,
  pageDepth: 2.3, duration: 91, goalReaches: 3,
});
assert.strictEqual(parsed.byEngine.google.get('buy tree').visits, 9);
assert.strictEqual(metrika.isFavoriteGoalsError(new Error("favorite_goals is not enabled for 53717134")), true);

(async () => {
  const originalFetch = global.fetch;
  const urls = [];
  try {
    global.fetch = async (url) => {
      urls.push(String(url));
      if (urls.length === 1) {
        return {
          ok: false,
          status: 400,
          json: async () => ({
            message: "Wrong parameter: 'metric', value: 'ym:s:favoriteGoalsReaches', message: favorite_goals is not enabled",
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: [{
            dimensions: [{ name: 'купить ёлку' }, { name: 'Яндекс' }],
            metrics: [12, 10, 7.5, 2.1, 83],
          }],
        }),
      };
    };
    const fallback = await metrika.queryStats('token', 53717134, '2026-07-01', '2026-07-28');
    assert.strictEqual(urls.length, 2, 'отчёт должен повториться без избранных целей');
    assert(urls[0].includes('favoriteGoalsReaches'));
    assert(!urls[1].includes('favoriteGoalsReaches'));
    assert.strictEqual(fallback.goalsAvailable, false);
    assert.strictEqual(fallback.byEngine.yandex.get('купить елку').visits, 12);
    assert.strictEqual(fallback.byEngine.yandex.get('купить елку').goalReaches, null);
    console.log('metrika.test.js: OK');
  } finally {
    global.fetch = originalFetch;
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
