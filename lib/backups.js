'use strict';

const fs = require('fs');
const path = require('path');

const SQLITE_HEADER = Buffer.from('SQLite format 3\0');

function localDateStamp(date = new Date()) {
  const p = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function backupDir(dbPath) {
  return path.join(path.dirname(dbPath), 'backups');
}

function isSqlite(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const header = Buffer.alloc(SQLITE_HEADER.length);
    try { fs.readSync(fd, header, 0, header.length, 0); } finally { fs.closeSync(fd); }
    return header.equals(SQLITE_HEADER);
  } catch {
    return false;
  }
}

function listBackups(dbPath) {
  const dir = backupDir(dbPath);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => /^serpdesk-\d{4}-\d{2}-\d{2}\.sqlite$/.test(name))
    .map((name) => {
      const filePath = path.join(dir, name);
      const stat = fs.statSync(filePath);
      return { name, date: name.slice(9, 19), size: stat.size, createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.name.localeCompare(a.name));
}

function createDailyBackup(dbPath, options = {}) {
  const keep = Math.max(1, Number(options.keep) || 14);
  if (!fs.existsSync(dbPath) || !isSqlite(dbPath)) return { created: false, reason: 'missing' };
  const dir = backupDir(dbPath);
  fs.mkdirSync(dir, { recursive: true });
  const name = `serpdesk-${localDateStamp(options.now || new Date())}.sqlite`;
  const target = path.join(dir, name);
  if (!fs.existsSync(target)) fs.copyFileSync(dbPath, target, fs.constants.COPYFILE_EXCL);

  const backups = listBackups(dbPath);
  for (const old of backups.slice(keep)) fs.unlinkSync(path.join(dir, old.name));
  return { created: fs.existsSync(target), name, backups: listBackups(dbPath) };
}

function restoreBackup(dbPath, name, options = {}) {
  if (!/^serpdesk-\d{4}-\d{2}-\d{2}\.sqlite$/.test(String(name || ''))) {
    throw new Error('Некорректное имя резервной копии');
  }
  const source = path.join(backupDir(dbPath), name);
  if (!fs.existsSync(source) || !isSqlite(source)) throw new Error('Резервная копия не найдена или повреждена');
  const safetyName = `${dbPath}.before-restore-${localDateStamp(options.now || new Date())}-${Date.now()}`;
  if (fs.existsSync(dbPath)) fs.copyFileSync(dbPath, safetyName);
  fs.copyFileSync(source, dbPath);
  return { restored: true, safetyName };
}

module.exports = { createDailyBackup, isSqlite, listBackups, localDateStamp, restoreBackup };
