'use strict';

const assert = require('assert');
const { matches } = require('../renderer/keyword-search');

assert.ok(matches('Актуальные бизнес идеи 2026', 'бизнес идеи'));
assert.ok(matches('  Бизнес   Идеи  ', 'бизнес идеи', 'exact'));
assert.ok(!matches('Бизнес идеи 2026', 'бизнес идеи', 'exact'));
assert.ok(matches('Бизнес в частном доме идеи', 'дом'));
assert.ok(matches('Любая фраза', ''));

console.log('OK: поиск поддерживает вхождение и точное совпадение фразы');
