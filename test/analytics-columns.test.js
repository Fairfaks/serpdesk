'use strict';

const assert = require('assert');
const { describe } = require('../renderer/analytics-columns');

assert.deepStrictEqual(describe('yandex', true, true), {
  available: true,
  label: 'ЯВМ + Метрика',
  columns: 'показы, клики, средняя позиция, визиты, люди, отказы, цели',
});

assert.deepStrictEqual(describe('google', true, false), {
  available: true,
  label: 'GSC',
  columns: 'показы, клики, средняя позиция',
});

assert.strictEqual(describe('google', true, true).label, 'GSC + Метрика');
assert.strictEqual(describe('yandex', false, false).available, false);

console.log('OK: группы аналитики подписываются по поисковой системе');
