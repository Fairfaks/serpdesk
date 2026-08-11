'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel) => (args) => ipcRenderer.invoke(channel, args);

contextBridge.exposeInMainWorld('api', {
  getSettings: invoke('settings:get'),
  setSettings: invoke('settings:set'),
  getBalance: invoke('balance:get'),
  listProjects: invoke('projects:list'),
  saveProject: invoke('projects:save'),
  duplicateProject: invoke('projects:duplicate'),
  deleteProject: invoke('projects:delete'),
  addKeywords: invoke('keywords:add'),
  deleteKeywords: invoke('keywords:delete'),
  copyText: invoke('clipboard:write'),
  setKeywordTarget: invoke('keywords:set-target'),
  collectFreq: invoke('keywords:collect-freq'),
  addNote: invoke('notes:add'),
  deleteNote: invoke('notes:delete'),
  pickImportFile: invoke('history:pick-file'),
  importHistory: invoke('history:import'),
  getGrid: invoke('grid:get'),
  estimateCheck: invoke('check:estimate'),
  startCheck: invoke('check:start'),
  cancelCheck: invoke('check:cancel'),
  retryErrors: invoke('check:retry'),
  exportCsv: invoke('export:csv'),
  openReport: invoke('report:open'),
  listRequestLogs: invoke('requests:list'),
  openTelegram: invoke('app:open-telegram'),
  openExternalUrl: invoke('app:open-url'),
  exportDb: invoke('db:export'),
  importDb: invoke('db:import'),
  listBackups: invoke('db:list-backups'),
  restoreBackup: invoke('db:restore-backup'),
  exportDiagnostics: invoke('diagnostics:export'),
  refreshPsStats: invoke('psstats:refresh'),
  testPsAccess: invoke('psstats:test'),
  psStatsHistory: invoke('psstats:history'),
  metrikaHistory: invoke('metrika:history'),
  gscLogin: invoke('gsc:login'),
  pickJsonFile: invoke('dialog:pick-json'),
  getVersion: invoke('app:version'),
  on: (channel, cb) => {
    const allowed = ['run:progress', 'run:engine-done', 'run:done', 'run:state', 'freq:progress', 'freq:done', 'update:status', 'focus:project'];
    if (!allowed.includes(channel)) return;
    ipcRenderer.on(channel, (_e, payload) => cb(payload));
  },
});
