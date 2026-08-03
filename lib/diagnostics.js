'use strict';

const fs = require('fs');
const path = require('path');

const MAX_LOG_BYTES = 2 * 1024 * 1024;
const MAX_TAIL_BYTES = 250 * 1024;

function redact(value) {
  let text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  if (text == null) text = '';
  return text
    .replace(/([?&](?:key|user|token|access_token|refresh_token|client_secret|client_id|password)=)[^&\s"']+/gi, '$1[скрыто]')
    .replace(/((?:authorization|api[-_ ]?key|password)\s*[:=]\s*(?:bearer\s+)?)[^\s,"'}]+/gi, '$1[скрыто]')
    .replace(/("(?:key|user|token|access_token|refresh_token|client_id|client_secret|password|api_key|authorization|xmlriver_key|xmlriver_user|yavm_token|gsc_client_id|gsc_client_secret|gsc_refresh_token|private_key)"\s*:\s*")[^"]*(")/gi, '$1[скрыто]$2')
    .replace(/\bGOCSPX-[A-Za-z0-9_-]+\b/g, '[скрыто]')
    .replace(/\bya29\.[A-Za-z0-9._-]+\b/g, '[скрыто]');
}

function rotateIfNeeded(logPath) {
  if (!fs.existsSync(logPath) || fs.statSync(logPath).size < MAX_LOG_BYTES) return;
  const previous = `${logPath}.1`;
  if (fs.existsSync(previous)) fs.unlinkSync(previous);
  fs.renameSync(logPath, previous);
}

function appendLog(logPath, level, message, meta) {
  if (!logPath) return;
  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    rotateIfNeeded(logPath);
    const entry = {
      at: new Date().toISOString(),
      level: String(level || 'info'),
      message: String(message || ''),
    };
    if (meta !== undefined) entry.meta = meta;
    fs.appendFileSync(logPath, `${redact(entry)}\n`);
  } catch {
    // Диагностика никогда не должна мешать основной работе приложения.
  }
}

function readLogTail(logPath, maxBytes = MAX_TAIL_BYTES) {
  if (!logPath || !fs.existsSync(logPath)) return '';
  const size = fs.statSync(logPath).size;
  const length = Math.min(size, Math.max(1, maxBytes));
  const fd = fs.openSync(logPath, 'r');
  try {
    const buffer = Buffer.alloc(length);
    fs.readSync(fd, buffer, 0, length, size - length);
    return redact(buffer.toString('utf8').replace(/^[^\n]*\n/, size > length ? '' : '$&'));
  } finally {
    fs.closeSync(fd);
  }
}

function buildReport(sections) {
  const lines = [
    'SerpDesk: диагностический отчёт',
    `Создан: ${new Date().toISOString()}`,
    'Файл не содержит API-ключи, OAuth-токены и пароли.',
  ];
  for (const [title, value] of Object.entries(sections || {})) {
    lines.push('', `===== ${title} =====`, typeof value === 'string' ? value : JSON.stringify(value, null, 2));
  }
  return `${redact(lines.join('\n'))}\n`;
}

module.exports = { redact, appendLog, readLogTail, buildReport };
