'use strict';

const CTR_CURVE = [0, 0.30, 0.15, 0.10, 0.07, 0.05, 0.04, 0.032, 0.026, 0.021, 0.018];

function ctrAt(position) {
  if (!position || position < 1) return 0;
  if (position <= 10) return CTR_CURVE[position];
  if (position <= 20) return 0.010;
  if (position <= 30) return 0.006;
  if (position <= 50) return 0.003;
  if (position <= 100) return 0.001;
  return 0;
}

function normalizeUrl(value) {
  let text = String(value || '').trim().toLowerCase();
  if (!text) return '';
  text = text.replace(/^https?:\/\//, '').replace(/^www\./, '').split('#')[0];
  return text.replace(/\/+$/, '');
}

function runMetrics(keywords, cells, runId) {
  let top3 = 0;
  let top10 = 0;
  let top30 = 0;
  let top100 = 0;
  let weighted = 0;
  let maxWeighted = 0;
  let traffic = 0;
  let errors = 0;
  for (const keyword of keywords) {
    const cell = (cells[keyword.id] || {})[runId];
    if (!cell) continue;
    if (cell.e) { errors++; continue; }
    const position = Number(cell.p) || 0;
    if (position > 0 && position <= 3) top3++;
    if (position > 0 && position <= 10) top10++;
    if (position > 0 && position <= 30) top30++;
    if (position > 0 && position <= 100) top100++;
    const weight = keyword.freq > 0 ? Number(keyword.freq) : 1;
    weighted += weight * ctrAt(position);
    maxWeighted += weight * CTR_CURVE[1];
    if (keyword.freq != null) traffic += (Number(keyword.freq) || 0) * ctrAt(position);
  }
  return {
    top3,
    top10,
    top30,
    top100,
    errors,
    visibility: maxWeighted ? (weighted / maxWeighted) * 100 : 0,
    traffic: Math.round(traffic),
  };
}

function analyzeChanges(keywords, cells, runs, depth = 100) {
  if (!runs || !runs.length) return null;
  const currentRun = runs[runs.length - 1];
  const previousRun = runs.length > 1 ? runs[runs.length - 2] : null;
  const current = runMetrics(keywords, cells, currentRun.id);
  const previous = previousRun ? runMetrics(keywords, cells, previousRun.id) : null;
  const changes = {
    up: [],
    down: [],
    entered: [],
    dropped: [],
    enteredTop3: [],
    enteredTop10: [],
    leftTop10: [],
    urlChanged: [],
    wrongTarget: [],
    bigDrops: [],
    errors: [],
  };
  const groups = new Map();
  const urlHistory = new Map();

  for (const keyword of keywords) {
    const currentCell = (cells[keyword.id] || {})[currentRun.id];
    const previousCell = previousRun ? (cells[keyword.id] || {})[previousRun.id] : null;
    const phrase = keyword.phrase;

    if (currentCell && currentCell.e) changes.errors.push({ phrase, error: currentCell.e });
    if (currentCell && !currentCell.e && currentCell.p > 0 && currentCell.u && keyword.target_url &&
      normalizeUrl(currentCell.u) !== normalizeUrl(keyword.target_url)) {
      changes.wrongTarget.push({ phrase, position: currentCell.p, url: currentCell.u, target: keyword.target_url });
    }

    const urls = new Map();
    for (const run of runs) {
      const cell = (cells[keyword.id] || {})[run.id];
      const normalized = cell && !cell.e && cell.p > 0 ? normalizeUrl(cell.u) : '';
      if (normalized) urls.set(normalized, cell.u);
    }
    if (urls.size > 1) urlHistory.set(keyword.id, {
      phrase,
      urls: [...urls.values()],
      changes: urls.size - 1,
    });

    if (!previousCell || !currentCell || previousCell.e || currentCell.e) continue;
    const from = Number(previousCell.p) || 0;
    const to = Number(currentCell.p) || 0;
    const wasFound = from > 0 && from <= depth;
    const isFound = to > 0 && to <= depth;
    const item = { phrase, from, to, diff: Math.abs(from - to), tag: keyword.tag || 'Без группы' };

    if (wasFound && isFound) {
      if (to < from) changes.up.push(item);
      if (to > from) {
        changes.down.push(item);
        if (to - from >= 10) changes.bigDrops.push(item);
      }
    } else if (!wasFound && isFound) {
      changes.entered.push(item);
    } else if (wasFound && !isFound) {
      changes.dropped.push(item);
    }
    if (from > 3 && to > 0 && to <= 3) changes.enteredTop3.push(item);
    if ((from === 0 || from > 10) && to > 0 && to <= 10) changes.enteredTop10.push(item);
    if (from > 0 && from <= 10 && (to === 0 || to > 10)) changes.leftTop10.push(item);
    if (
      previousCell.u && currentCell.u && from > 0 && to > 0 &&
      normalizeUrl(previousCell.u) !== normalizeUrl(currentCell.u)
    ) {
      changes.urlChanged.push({ ...item, fromUrl: previousCell.u, toUrl: currentCell.u });
    }

    const groupName = keyword.tag || 'Без группы';
    if (!groups.has(groupName)) groups.set(groupName, {
      name: groupName,
      keywords: 0,
      top10Before: 0,
      top10Now: 0,
      weightedBefore: 0,
      weightedNow: 0,
      maxWeighted: 0,
    });
    const group = groups.get(groupName);
    const weight = keyword.freq > 0 ? Number(keyword.freq) : 1;
    group.keywords++;
    group.top10Before += from > 0 && from <= 10 ? 1 : 0;
    group.top10Now += to > 0 && to <= 10 ? 1 : 0;
    group.weightedBefore += weight * ctrAt(from);
    group.weightedNow += weight * ctrAt(to);
    group.maxWeighted += weight * CTR_CURVE[1];
  }

  for (const key of ['up', 'down', 'bigDrops']) changes[key].sort((a, b) => b.diff - a.diff);
  changes.entered.sort((a, b) => a.to - b.to);
  changes.dropped.sort((a, b) => a.from - b.from);
  changes.leftTop10.sort((a, b) => a.from - b.from);

  const groupRows = [...groups.values()].map((group) => ({
    name: group.name,
    keywords: group.keywords,
    top10Before: group.top10Before,
    top10Now: group.top10Now,
    top10Delta: group.top10Now - group.top10Before,
    visibilityBefore: group.maxWeighted ? (group.weightedBefore / group.maxWeighted) * 100 : 0,
    visibilityNow: group.maxWeighted ? (group.weightedNow / group.maxWeighted) * 100 : 0,
    visibilityDelta: group.maxWeighted
      ? ((group.weightedNow - group.weightedBefore) / group.maxWeighted) * 100
      : 0,
  })).sort((a, b) => a.visibilityDelta - b.visibilityDelta);

  const visibilityDelta = previous ? current.visibility - previous.visibility : 0;
  const importantCount =
    changes.leftTop10.length +
    changes.dropped.length +
    changes.bigDrops.length +
    changes.urlChanged.length +
    changes.errors.length +
    (visibilityDelta <= -5 ? 1 : 0);

  return {
    currentRun,
    previousRun,
    current,
    previous,
    visibilityDelta,
    changes,
    groups: groupRows,
    cannibalization: [...urlHistory.values()].sort((a, b) => b.changes - a.changes),
    importantCount,
  };
}

function summarizeImportant(analysis) {
  if (!analysis || !analysis.previousRun) return 'Недостаточно данных для сравнения';
  const parts = [];
  const changes = analysis.changes;
  if (changes.leftTop10.length) parts.push(`вышли из ТОП-10: ${changes.leftTop10.length}`);
  if (changes.dropped.length) parts.push(`выпали: ${changes.dropped.length}`);
  if (changes.bigDrops.length) parts.push(`резко упали: ${changes.bigDrops.length}`);
  if (changes.urlChanged.length) parts.push(`сменили URL: ${changes.urlChanged.length}`);
  if (changes.errors.length) parts.push(`ошибки: ${changes.errors.length}`);
  if (analysis.visibilityDelta <= -5) parts.push(`видимость ${analysis.visibilityDelta.toFixed(1)} п.п.`);
  return parts.length ? parts.join(' · ') : 'Значимых ухудшений нет';
}

module.exports = { analyzeChanges, ctrAt, normalizeUrl, runMetrics, summarizeImportant };
