'use strict';

(function exposeKeywordSearch(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SerpDeskKeywordSearch = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const normalize = (value) => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();

  function matches(phrase, query, mode = 'contains') {
    const needle = normalize(query);
    if (!needle) return true;
    const normalizedPhrase = normalize(phrase);
    return mode === 'exact' ? normalizedPhrase === needle : normalizedPhrase.includes(needle);
  }

  return { matches, normalize };
}));
