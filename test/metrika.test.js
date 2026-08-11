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

console.log('metrika.test.js: OK');
