'use strict';

(function expose(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SerpDeskInsights = api;
})(typeof window !== 'undefined' ? window : globalThis, function createInsights() {
  const CTR = [0, 0.30, 0.15, 0.10, 0.07, 0.05, 0.04, 0.032, 0.026, 0.021, 0.018];

  function ctrAt(position) {
    const value = Number(position) || 0;
    if (value < 1) return 0;
    if (value <= 10) return CTR[value];
    if (value <= 20) return 0.010;
    if (value <= 30) return 0.006;
    if (value <= 50) return 0.003;
    if (value <= 100) return 0.001;
    return 0;
  }

  function normalizeUrl(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    try {
      const parsed = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
      parsed.hash = '';
      parsed.search = '';
      return `${parsed.hostname.toLowerCase().replace(/^www\./, '')}${parsed.pathname}`.replace(/\/+$/, '');
    } catch {
      return text.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[?#]/)[0].replace(/\/+$/, '');
    }
  }

  function urlDynamics(keywords, cells, currentRunId, previousRunId) {
    if (!currentRunId || !previousRunId) return [];
    const pages = new Map();
    const ensure = (key, display) => {
      if (!pages.has(key)) pages.set(key, {
        url: display,
        currentScore: 0,
        previousScore: 0,
        weight: 0,
        keywordIds: new Set(),
      });
      return pages.get(key);
    };

    for (const keyword of keywords || []) {
      const current = (cells[keyword.id] || {})[currentRunId];
      const previous = (cells[keyword.id] || {})[previousRunId];
      const currentUrl = current && !current.e && current.p > 0 ? normalizeUrl(current.u) : '';
      const previousUrl = previous && !previous.e && previous.p > 0 ? normalizeUrl(previous.u) : '';
      const weight = Number(keyword.freq) > 0 ? Number(keyword.freq) : 1;
      const keys = new Set([currentUrl, previousUrl].filter(Boolean));
      for (const key of keys) {
        const display = key === currentUrl ? current.u : previous.u;
        const row = ensure(key, display);
        row.keywordIds.add(keyword.id);
        row.weight += weight;
        if (key === currentUrl) row.currentScore += weight * ctrAt(current.p);
        if (key === previousUrl) row.previousScore += weight * ctrAt(previous.p);
      }
    }

    return [...pages.values()].map((row) => {
      const max = row.weight * CTR[1];
      const previous = max ? (row.previousScore / max) * 100 : 0;
      const current = max ? (row.currentScore / max) * 100 : 0;
      return {
        url: row.url,
        keywords: row.keywordIds.size,
        previous,
        current,
        delta: current - previous,
      };
    }).filter((row) => Math.abs(row.delta) >= 0.01)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }

  function sameDomainProjects(projects, activeProject) {
    if (!activeProject) return [];
    const domain = String(activeProject.domain || '').toLowerCase().replace(/^www\./, '');
    return (projects || []).filter((project) =>
      String(project.domain || '').toLowerCase().replace(/^www\./, '') === domain
    );
  }

  return { ctrAt, normalizeUrl, urlDynamics, sameDomainProjects };
});
