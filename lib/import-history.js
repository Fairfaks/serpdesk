'use strict';

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const FIELD_SYNONYMS = {
  phrase: ['ключевое слово', 'фраза', 'запрос', 'keyword', 'query'],
  tag: ['теги', 'тег', 'tag', 'tags'],
  freq: ['частотность', 'частота', 'frequency', 'volume', 'ws'],
  targetUrl: ['целевой url', 'target url'],
  relevantUrl: ['релевантный url', 'url', 'страница'],
};

function cleanCell(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').trim();
}

function normalizeHeader(value) {
  return cleanCell(value).toLowerCase().replace(/\s+/g, ' ');
}

function parseDateHeader(value) {
  const text = cleanCell(value);
  let day;
  let month;
  let year;
  let match = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/);
  if (match) {
    day = Number(match[1]);
    month = Number(match[2]);
    year = Number(match[3]);
    if (year < 100) year += 2000;
  } else {
    match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) return null;
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  }
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) return null;
  const pad = (number) => String(number).padStart(2, '0');
  return {
    iso: `${year}-${pad(month)}-${pad(day)}`,
    label: `${pad(day)}.${pad(month)}.${year}`,
  };
}

function parsePosition(value) {
  if (value === null || value === undefined || cleanCell(value) === '') return null;
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 0) return null;
    return value > 100 ? 0 : value;
  }
  const text = cleanCell(value).toLowerCase();
  if (/^(?:—|-|>?\s*100\+?|101|не\s*найден[оа]?|нет)$/i.test(text)) return 0;
  if (!/^\d+$/.test(text)) return null;
  const number = Number(text);
  return number > 100 ? 0 : number;
}

function parseFrequency(value) {
  const text = cleanCell(value).replace(/\s+/g, '');
  if (!text || !/^\d+$/.test(text)) return null;
  const number = Number(text);
  return Number.isSafeInteger(number) ? number : null;
}

function countDelimiter(line, delimiter) {
  let count = 0;
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (quoted && line[i + 1] === '"') i++;
      else quoted = !quoted;
    } else if (!quoted && line[i] === delimiter) {
      count++;
    }
  }
  return count;
}

function parseCsv(text) {
  const source = String(text || '').replace(/^\uFEFF/, '');
  const firstLine = source.split(/\r?\n/).find((line) => line.trim()) || '';
  const delimiter = countDelimiter(firstLine, ';') > countDelimiter(firstLine, ',') ? ';' : ',';
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((value) => cleanCell(value))) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => cleanCell(value))) rows.push(row);
  return rows;
}

function findColumn(headers, field) {
  const aliases = FIELD_SYNONYMS[field];
  return headers.findIndex((header) => aliases.includes(normalizeHeader(header)));
}

function detectColumns(headers) {
  const phraseFound = findColumn(headers, 'phrase');
  const dates = [];
  headers.forEach((header, index) => {
    const parsed = parseDateHeader(header);
    if (parsed) dates.push({ index, ...parsed });
  });
  return {
    phrase: phraseFound >= 0 ? phraseFound : 0,
    phraseFallback: phraseFound < 0,
    tag: findColumn(headers, 'tag'),
    freq: findColumn(headers, 'freq'),
    targetUrl: findColumn(headers, 'targetUrl'),
    relevantUrl: findColumn(headers, 'relevantUrl'),
    dates,
  };
}

function parseRows(rows, source) {
  const headerIndex = rows.findIndex((row) => Array.isArray(row) && row.some((value) => cleanCell(value)));
  if (headerIndex < 0) throw new Error('Файл пустой: не найдена строка заголовков');
  const headers = rows[headerIndex].map(cleanCell);
  const columns = detectColumns(headers);
  if (!columns.dates.length) {
    throw new Error('Не распознан ни один столбец с датой позиций');
  }

  const byPhrase = new Map();
  for (const row of rows.slice(headerIndex + 1)) {
    const phrase = cleanCell(row[columns.phrase]).replace(/\s+/g, ' ');
    if (!phrase) continue;
    let item = byPhrase.get(phrase);
    if (!item) {
      item = { phrase, freq: null, tag: null, targetUrl: null, relevantUrl: null, positions: {} };
      byPhrase.set(phrase, item);
    }
    const freq = columns.freq >= 0 ? parseFrequency(row[columns.freq]) : null;
    const tag = columns.tag >= 0 ? cleanCell(row[columns.tag]) || null : null;
    const targetUrl = columns.targetUrl >= 0 ? cleanCell(row[columns.targetUrl]) || null : null;
    const relevantUrl = columns.relevantUrl >= 0 ? cleanCell(row[columns.relevantUrl]) || null : null;
    if (freq !== null) item.freq = freq;
    if (tag) item.tag = tag;
    if (targetUrl) item.targetUrl = targetUrl;
    if (relevantUrl) item.relevantUrl = relevantUrl;
    for (const date of columns.dates) {
      const position = parsePosition(row[date.index]);
      if (position !== null) item.positions[date.iso] = position;
    }
  }

  const data = [...byPhrase.values()];
  if (!data.length) throw new Error('Не найдены строки с ключевыми словами');
  const valuesCount = data.reduce((total, item) => total + Object.keys(item.positions).length, 0);
  const fieldLabel = (index, fallback = 'не найдено') => index >= 0 ? headers[index] : fallback;
  return {
    source,
    headers,
    columns,
    rows: data,
    preview: {
      phrasesCount: data.length,
      valuesCount,
      dates: columns.dates.map(({ iso, label }) => ({ iso, label })),
      mapping: {
        phrase: fieldLabel(columns.phrase) + (columns.phraseFallback ? ' (первый столбец)' : ''),
        tag: fieldLabel(columns.tag),
        freq: fieldLabel(columns.freq),
        targetUrl: fieldLabel(columns.targetUrl),
        relevantUrl: fieldLabel(columns.relevantUrl),
      },
    },
  };
}

function guessTarget(fileName, defaultEngine = 'yandex', defaultDevice = 'desktop') {
  const name = path.basename(fileName || '').toLowerCase();
  let engine = defaultEngine === 'google' ? 'google' : 'yandex';
  let device = defaultDevice === 'mobile' ? 'mobile' : 'desktop';
  if (/(?:yandex|yandeks|яндекс)/i.test(name)) engine = 'yandex';
  else if (/(?:google|гугл)/i.test(name)) engine = 'google';
  if (/(?:mobile|phone|smartphone|mobail|mobil|мобайл|мобиль|телефон)/i.test(name)) device = 'mobile';
  else if (/(?:desktop|computer|komp|компьютер|десктоп)/i.test(name)) device = 'desktop';
  return { engine, device };
}

function readHistoryFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.csv') {
    return parseRows(parseCsv(fs.readFileSync(filePath, 'utf8')), { filePath, fileName: path.basename(filePath), sheetName: null });
  }
  if (extension !== '.xlsx') throw new Error('Поддерживаются только файлы .xlsx и .csv');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames.find((name) => normalizeHeader(name) === 'история позиций');
  if (!sheetName) throw new Error('В книге не найден лист «История позиций»');
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    raw: false,
    defval: '',
    dateNF: 'dd.mm.yyyy',
  });
  return parseRows(rows, { filePath, fileName: path.basename(filePath), sheetName });
}

function importIntoProject(db, parsed, { projectId, engine, device }) {
  const runIds = new Map();
  let valuesCount = 0;
  let inTransaction = false;
  try {
    db.run('BEGIN TRANSACTION');
    inTransaction = true;

    for (const date of parsed.preview.dates) {
      let run = db.get(
        `SELECT id FROM runs
         WHERE project_id = ? AND engine = ? AND device = ? AND date(started_at) = ?
         ORDER BY started_at DESC, id DESC LIMIT 1`,
        [projectId, engine, device, date.iso]
      );
      if (!run) {
        const at = `${date.iso}T12:00:00`;
        const inserted = db.run(
          'INSERT INTO runs(project_id, engine, device, started_at, finished_at, status) VALUES(?, ?, ?, ?, ?, ?)',
          [projectId, engine, device, at, at, 'done']
        );
        run = { id: inserted.lastID };
      }
      runIds.set(date.iso, run.id);
    }

    for (const row of parsed.rows) {
      db.run(
        `INSERT OR IGNORE INTO keywords(project_id, phrase, freq, tag, target_url, created_at)
         VALUES(?, ?, ?, ?, ?, ?)`,
        [projectId, row.phrase, row.freq, row.tag, row.targetUrl, new Date().toISOString()]
      );
      const keyword = db.get(
        'SELECT id FROM keywords WHERE project_id = ? AND phrase = ?',
        [projectId, row.phrase]
      );
      db.run(
        `UPDATE keywords SET
           freq = CASE WHEN freq IS NULL THEN ? ELSE freq END,
           tag = CASE WHEN tag IS NULL OR TRIM(tag) = '' THEN ? ELSE tag END,
           target_url = CASE WHEN target_url IS NULL OR TRIM(target_url) = '' THEN ? ELSE target_url END
         WHERE id = ?`,
        [row.freq, row.tag, row.targetUrl, keyword.id]
      );
      for (const [date, position] of Object.entries(row.positions)) {
        const runId = runIds.get(date);
        if (!runId) continue;
        db.run(
          `INSERT OR REPLACE INTO results(run_id, keyword_id, position, url, error)
           VALUES(?, ?, ?, ?, NULL)`,
          [runId, keyword.id, position, row.relevantUrl]
        );
        valuesCount++;
      }
    }

    db.run('COMMIT');
    inTransaction = false;
    db.flush();
    return {
      phrases: parsed.rows.length,
      dates: parsed.preview.dates.length,
      values: valuesCount,
    };
  } catch (error) {
    if (inTransaction) {
      try { db.run('ROLLBACK'); } catch {}
    }
    throw error;
  }
}

module.exports = {
  detectColumns,
  guessTarget,
  importIntoProject,
  parseCsv,
  parseDateHeader,
  parseFrequency,
  parsePosition,
  parseRows,
  readHistoryFile,
};
