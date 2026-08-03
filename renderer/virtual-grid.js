'use strict';

(function exposeVirtualGrid(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SerpDeskVirtualGrid = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
  }

  function nextWindowStart({
    scrollOffset,
    itemSize,
    viewportSize,
    totalItems,
    windowStart,
    windowSize,
    overscan,
  }) {
    if (!Number.isFinite(totalItems) || totalItems <= 0 || windowSize <= 0) return 0;

    const maxStart = Math.max(0, totalItems - windowSize);
    const currentStart = clamp(Math.floor(windowStart || 0), 0, maxStart);
    if (totalItems <= windowSize) return 0;

    const safeItemSize = Math.max(1, Number(itemSize) || 1);
    const viewStart = clamp(Math.floor(Math.max(0, scrollOffset || 0) / safeItemSize), 0, totalItems - 1);
    const visibleItems = Math.max(1, Math.ceil(Math.max(0, viewportSize || 0) / safeItemSize));
    const viewEnd = Math.min(totalItems, viewStart + visibleItems);
    const safeOverscan = clamp(Math.floor(overscan || 0), 0, Math.max(0, Math.floor((windowSize - visibleItems) / 2)));
    const safeStart = currentStart + safeOverscan;
    const safeEnd = currentStart + windowSize - safeOverscan;

    if (viewStart >= safeStart && viewEnd <= safeEnd) return currentStart;
    return clamp(viewStart - safeOverscan, 0, maxStart);
  }

  return { nextWindowStart };
}));
