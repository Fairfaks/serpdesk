'use strict';

const assert = require('assert');
const { nextWindowStart } = require('../renderer/virtual-grid');

const base = {
  itemSize: 38,
  viewportSize: 760,
  totalItems: 10000,
  windowStart: 0,
  windowSize: 64,
  overscan: 12,
};

assert.strictEqual(nextWindowStart({ ...base, scrollOffset: 0 }), 0, 'начало списка не сдвигает окно');
assert.strictEqual(nextWindowStart({ ...base, scrollOffset: 20 * 38 }), 0, 'прокрутка внутри буфера не вызывает перерисовку');
assert.strictEqual(nextWindowStart({ ...base, scrollOffset: 40 * 38 }), 28, 'за границей буфера окно сдвигается с запасом');
assert.strictEqual(nextWindowStart({ ...base, scrollOffset: 9999 * 38 }), 9936, 'конец окна ограничивается размером списка');
assert.strictEqual(nextWindowStart({ ...base, totalItems: 20, scrollOffset: 500 }), 0, 'маленький список не виртуализируется');
assert.strictEqual(nextWindowStart({ ...base, totalItems: 0, scrollOffset: 500 }), 0, 'пустой список обрабатывается безопасно');

console.log('virtual-grid tests: ok');
