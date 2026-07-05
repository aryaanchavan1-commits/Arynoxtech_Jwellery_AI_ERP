const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  db: {
    all: (sql, params) => ipcRenderer.invoke('db:all', sql, params),
    get: (sql, params) => ipcRenderer.invoke('db:get', sql, params),
    run: (sql, params) => ipcRenderer.invoke('db:run', sql, params),
  },
  sync: {
    status: () => ipcRenderer.invoke('sync:status'),
    push: () => ipcRenderer.invoke('sync:push'),
    pull: () => ipcRenderer.invoke('sync:pull'),
    full: () => ipcRenderer.invoke('sync:full'),
    queue: () => ipcRenderer.invoke('sync:queue'),
    startAuto: (interval) => ipcRenderer.invoke('sync:startAuto', interval),
    stopAuto: () => ipcRenderer.invoke('sync:stopAuto'),
    toTurso: (table, data) => ipcRenderer.invoke('sync:turso', { table, data }),
    onStatusChange: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('sync:event', handler);
      return () => ipcRenderer.removeListener('sync:event', handler);
    }
  },
  ai: {
    chat: (message, history, model) => ipcRenderer.invoke('ai:chat', { message, history, model }),
    models: () => ipcRenderer.invoke('ai:models'),
  },
  dialog: {
    save: (options) => ipcRenderer.invoke('dialog:save', options),
    open: (options) => ipcRenderer.invoke('dialog:open', options),
  },
  backup: {
    create: () => ipcRenderer.invoke('backup:create'),
    restore: (filePath) => ipcRenderer.invoke('backup:restore', filePath),
    info: () => ipcRenderer.invoke('backup:info'),
  },
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    set: (config) => ipcRenderer.invoke('config:set', config),
  },
  app: {
    close: () => ipcRenderer.invoke('app:close'),
    minimize: () => ipcRenderer.invoke('app:minimize'),
    maximize: () => ipcRenderer.invoke('app:maximize'),
    checkUpdate: () => ipcRenderer.invoke('app:checkUpdate'),
    installUpdate: () => ipcRenderer.invoke('app:installUpdate'),
    downloadUpdate: () => ipcRenderer.invoke('app:downloadUpdate'),
    onUpdateStatus: (callback) => {
      const handlers = {
        status: (event, data) => callback(data),
        available: (event, data) => callback({ status: 'available', ...data }),
        progress: (event, data) => callback({ status: 'downloading', ...data }),
      };
      ipcRenderer.on('update:status', handlers.status);
      ipcRenderer.on('update:available', handlers.available);
      ipcRenderer.on('update:progress', handlers.progress);
      return () => {
        ipcRenderer.removeListener('update:status', handlers.status);
        ipcRenderer.removeListener('update:available', handlers.available);
        ipcRenderer.removeListener('update:progress', handlers.progress);
      };
    },
  },
  printer: {
    list: () => ipcRenderer.invoke('printer:list'),
    print: (htmlContent, options) => ipcRenderer.invoke('print:html', htmlContent, options),
    printSilent: (htmlContent, deviceName, options) => ipcRenderer.invoke('print:silent', htmlContent, deviceName, options),
  },
  barcode: {
    preview: (htmlContent) => ipcRenderer.invoke('barcode:preview', htmlContent),
  },
  auth: {
    hash: (password) => ipcRenderer.invoke('auth:hash', { password }),
    compare: (password, hash) => ipcRenderer.invoke('auth:compare', { password, hash }),
  },
  seed: {
    demo: () => ipcRenderer.invoke('seed:demo'),
  },
  email: {
    send: (opts) => ipcRenderer.invoke('email:send', opts),
    config: () => ipcRenderer.invoke('email:config'),
  },
  logs: {
    get: (date) => ipcRenderer.invoke('logs:get', date),
  },
});
