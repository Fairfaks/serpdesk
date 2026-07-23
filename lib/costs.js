'use strict';

function maxRequestsPerKeyword(engine, cfg) {
  if (engine === 'yandex' && (cfg.yandex.source || 'api') === 'api') return 1;
  return Math.max(1, Math.ceil((Number(cfg.depth) || 30) / 10));
}

function estimateProjectRequests(project, keywordCount) {
  const engines = [];
  if (project.cfg.yandex.enabled) engines.push('yandex');
  if (project.cfg.google.enabled) engines.push('google');
  const mode = project.cfg.deviceMode || project.cfg.device || 'desktop';
  const devices = mode === 'both' ? ['desktop', 'mobile'] : [mode === 'mobile' ? 'mobile' : 'desktop'];
  const details = [];
  for (const engine of engines) {
    for (const device of devices) {
      const perKeyword = maxRequestsPerKeyword(engine, project.cfg);
      details.push({
        engine,
        device,
        perKeyword,
        requests: keywordCount * perKeyword,
      });
    }
  }
  return {
    keywordCount,
    details,
    requests: details.reduce((sum, item) => sum + item.requests, 0),
  };
}

function applyPrices(estimate, prices) {
  const details = estimate.details.map((item) => {
    const pricePer1000 = prices[item.engine];
    return {
      ...item,
      pricePer1000: pricePer1000 == null ? null : Number(pricePer1000),
      cost: pricePer1000 == null ? null : (item.requests * Number(pricePer1000)) / 1000,
    };
  });
  const known = details.every((item) => item.cost != null);
  return {
    ...estimate,
    details,
    cost: known ? details.reduce((sum, item) => sum + item.cost, 0) : null,
  };
}

module.exports = { applyPrices, estimateProjectRequests, maxRequestsPerKeyword };
