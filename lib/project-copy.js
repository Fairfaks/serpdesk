'use strict';

function normalizeIds(ids) {
  return new Set((Array.isArray(ids) ? ids : [])
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0));
}

function copyProjectKeywords(db, { sourceId, targetId, mode = 'all', keywordIds = [], createdAt }) {
  if (mode === 'empty') return 0;
  const selected = normalizeIds(keywordIds);
  if (mode === 'selected' && !selected.size) throw new Error('Сначала выделите запросы, которые нужно перенести');
  let rows = db.all(
    'SELECT id, phrase, target_url, tag FROM keywords WHERE project_id = ? ORDER BY id',
    [sourceId]
  );
  if (mode === 'selected') rows = rows.filter((row) => selected.has(Number(row.id)));
  if (mode === 'selected' && !rows.length) throw new Error('Выделенные запросы не найдены в исходном проекте');
  for (const row of rows) {
    db.run(
      'INSERT INTO keywords(project_id, phrase, created_at, freq, target_url, tag) VALUES(?, ?, ?, NULL, ?, ?)',
      [targetId, row.phrase, createdAt, row.target_url || null, row.tag || null]
    );
  }
  return rows.length;
}

module.exports = { copyProjectKeywords, normalizeIds };
