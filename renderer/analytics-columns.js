'use strict';

(function initAnalyticsColumns(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SerpDeskAnalyticsColumns = api;
})(typeof window !== 'undefined' ? window : globalThis, function analyticsColumnsFactory() {
  function describe(engine, hasStats, hasMetrika) {
    const sources = [];
    const columns = [];
    if (hasStats) {
      sources.push(engine === 'yandex' ? 'ЯВМ' : 'GSC');
      columns.push('показы', 'клики', 'средняя позиция');
    }
    if (hasMetrika) {
      sources.push('Метрика');
      columns.push('визиты', 'люди', 'отказы', 'цели');
    }
    return {
      available: sources.length > 0,
      label: sources.join(' + '),
      columns: columns.join(', '),
    };
  }

  return { describe };
});
