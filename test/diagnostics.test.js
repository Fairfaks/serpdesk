'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const diagnostics = require('../lib/diagnostics');

const secret = 'super-secret-xmlriver-key';
const raw = `https://xmlriver.com/yandex/search?user=123&key=${secret}&query=test Authorization: Bearer oauth-secret`;
const clean = diagnostics.redact(raw);
assert(!clean.includes(secret));
assert(!clean.includes('oauth-secret'));
assert(clean.includes('key=[скрыто]'));

const report = diagnostics.buildReport({
  Настройки: { xmlriver_key: secret, password: 'another-secret', gsc_client_secret: 'GOCSPX-abcdef123' },
  Состояние: { projects: 3 },
});
assert(!report.includes(secret));
assert(!report.includes('GOCSPX-abcdef123'));
assert(!report.includes('another-secret'));
assert(report.includes('"projects": 3'));

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'serpdesk-diag-'));
const logPath = path.join(dir, 'serpdesk.log');
diagnostics.appendLog(logPath, 'error', 'request failed', { url: raw });
const tail = diagnostics.readLogTail(logPath);
assert(tail.includes('request failed'));
assert(!tail.includes(secret));

console.log('diagnostics.test.js: OK');
