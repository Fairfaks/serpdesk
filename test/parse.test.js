'use strict';
// Смоук-тесты парсера и матчера доменов: node test/parse.test.js

const assert = require('assert');
const { parseSerpXml, makeDomainMatcher, buildSearchUrl, normalizeHost, XmlRiverError } = require('../lib/xmlriver');
const { estimateVisualPosition } = require('../lib/checker');

const okXml = `<?xml version="1.0" encoding="UTF-8"?>
<yandexsearch version="1.0">
<response date="20260723T000000">
<advcount>2</advcount>
<searchsters><item><name>images</name><position>1</position></item></searchsters>
<results>
<grouping>
<group id="1"><doccount>1</doccount>
  <doc><url>https://www.wikipedia.org/wiki/tea</url><title>Tea</title><contenttype>organic</contenttype></doc>
</group>
<group id="2"><doccount>1</doccount>
  <doc><url>https://video.example.com/x</url><title>Video block</title><contenttype>video</contenttype></doc>
</group>
<group id="3"><doccount>1</doccount>
  <doc><url>https://favorit-consult.ru/uslugi/bankrotstvo/</url><title>Банкротство</title><contenttype>organic</contenttype></doc>
</group>
<group id="4"><doccount>1</doccount>
  <doc><url>https://xn--d1acpjx3f.xn--p1ai/page</url><title>Кириллический домен</title></doc>
</group>
</grouping>
</results>
</response>
</yandexsearch>`;

const errXml = `<?xml version="1.0" encoding="UTF-8"?>
<yandexsearch version="1.0"><response><error code="42">Неверный ключ</error></response></yandexsearch>`;

const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<yandexsearch version="1.0"><response><error code="15">Нет результатов</error></response></yandexsearch>`;

// --- парсер ---
const r1 = parseSerpXml(okXml);
assert.strictEqual(r1.docs.length, 3, 'видео-блок должен быть отброшен, органика без contenttype — учтена');
assert.strictEqual(r1.docs[1].url, 'https://favorit-consult.ru/uslugi/bankrotstvo/');
assert.ok(r1.features.some((feature) => feature.type === 'ads_top' && feature.count === 2));
assert.ok(r1.features.some((feature) => feature.type === 'searchster' && feature.name === 'images'));
assert.ok(r1.features.some((feature) => feature.type === 'content' && feature.name === 'video'));
assert.strictEqual(estimateVisualPosition(3, r1.features), 7, 'визуальное место учитывает две рекламы и два центральных спецблока');
assert.strictEqual(r1.end, false);

const r2 = parseSerpXml(emptyXml);
assert.deepStrictEqual(r2, { docs: [], features: [], end: true }, 'код 15 = пустая выдача, не ошибка');

let threw = null;
try { parseSerpXml(errXml); } catch (e) { threw = e; }
assert.ok(threw instanceof XmlRiverError && threw.code === 42 && threw.fatal, 'код 42 = фатальная ошибка');

// --- матчер доменов ---
const m1 = makeDomainMatcher('favorit-consult.ru', false);
assert.ok(m1('https://favorit-consult.ru/uslugi/'), 'точное совпадение');
assert.ok(m1('https://www.favorit-consult.ru/'), 'www отбрасывается');
assert.ok(!m1('https://blog.favorit-consult.ru/'), 'поддомен без флага не матчится');
assert.ok(!m1('https://notfavorit-consult.ru/'), 'похожий домен не матчится');

const m2 = makeDomainMatcher('favorit-consult.ru', true);
assert.ok(m2('https://blog.favorit-consult.ru/x'), 'поддомен с флагом матчится');

const m3 = makeDomainMatcher('тндм.рф', true);
assert.ok(m3('https://xn--d1acpjx3f.xn--p1ai/page') === (normalizeHost('тндм.рф') === 'xn--d1acpjx3f.xn--p1ai'), 'кириллица сверяется через punycode');

// --- URL запросов ---
const creds = { user: '1', key: 'k' };
const uYa = buildSearchUrl('yandex', creds, { lr: '213', yandexDomain: 'ru' }, 'тест', null);
assert.ok(uYa.includes('/search_yandex/xml'), 'яндекс-эндпоинт');
assert.ok(uYa.includes('lr=213'), 'регион яндекса');
assert.ok(!uYa.includes('page='), 'первая страница без параметра page');

const uApi = buildSearchUrl('yandex', creds, { lr: '213', yandexSource: 'api', apiDepth: 30 }, 'тест', null);
assert.ok(uApi.includes('/yandex/xml'), 'search api эндпоинт');
assert.ok(decodeURIComponent(uApi).includes('groups-on-page=30'), 'глубина одним запросом через groupby');

const uBeta = buildSearchUrl('yandex', creds, { lr: '213', yandexDomain: 'ru', serpFeaturesBeta: true }, 'тест', null);
assert.ok(decodeURIComponent(uBeta).includes('additional=y_topads,y_bottomads'), 'бета включает дополнительные блоки XMLRiver');

const uGo = buildSearchUrl('google', creds, { loc: '1000028', device: 'mobile' }, 'тест', 3);
assert.ok(uGo.includes('/search/xml'), 'google-эндпоинт');
assert.ok(uGo.includes('page=3'), 'пагинация google');
assert.ok(uGo.includes('device=mobile'), 'устройство');
assert.ok(uGo.includes('loc=1000028'), 'локация');

console.log('OK: все проверки парсера и матчера прошли');
