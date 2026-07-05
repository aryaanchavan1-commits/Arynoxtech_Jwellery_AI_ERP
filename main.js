const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const { initOfflineDB, getOfflineDB, setDB, closeDB } = require('./src/database/offline');
const { logger } = require('./src/database/logger');
const { startAutoSync, stopAutoSync, getSyncStatus, pushChanges, pullChanges, fullSync, getQueueEntries, resetAfterRestore } = require('./src/database/sync');
const { initOnlineDB } = require('./src/database/online');
const { initSchema } = require('./src/database/schema');
const GroqAI = require('./src/ai/groq');
const bcrypt = require('bcryptjs');

let mainWindow;
let groqAI;
let printPreviewWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: 'Arynoxtech Jwellery ERP',
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    frame: false,
    backgroundColor: '#0f172a'
  });

  mainWindow.loadFile(path.join(__dirname, 'dist/renderer/index.html'));
}

async function initDatabases() {
  try {
    const db = await initOfflineDB();
    setDB(db);
    initSchema();
    logger.info('DB', 'Offline database initialized successfully');
  } catch (err) {
    logger.error('DB', 'Offline DB init error', { error: err.message });
  }
  try {
    await initOnlineDB();
    logger.info('DB', 'Online database initialized');
  } catch (err) {
    logger.warn('DB', 'Online DB not available, using offline mode');
  }
}

app.whenReady().then(async () => {
  await initDatabases();
  groqAI = new GroqAI();
  // Start auto-sync if Turso is configured
  const config = require('electron-store')();
  const cfg = config.get('config', {});
  if (cfg.tursoUrl && cfg.tursoToken) {
    startAutoSync(60000);
  }
  createWindow();
  // Auto-updater setup
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  setupAutoUpdater();
  autoUpdater.checkForUpdates();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    closeDB();
    app.quit();
  }
});

app.on('before-quit', () => {
  closeDB();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('db:all', (event, sql, params = []) => {
  const db = getOfflineDB();
  if (!db) throw new Error('Database not initialized');
  const { sanitizeSql, sanitizeParams } = require('./src/database/validate');
  return db.all(sanitizeSql(sql), sanitizeParams(params));
});

ipcMain.handle('db:get', (event, sql, params = []) => {
  const db = getOfflineDB();
  if (!db) throw new Error('Database not initialized');
  const { sanitizeSql, sanitizeParams } = require('./src/database/validate');
  return db.get(sanitizeSql(sql), sanitizeParams(params));
});

ipcMain.handle('db:run', (event, sql, params = []) => {
  const db = getOfflineDB();
  if (!db) throw new Error('Database not initialized');
  const { sanitizeSql, sanitizeParams } = require('./src/database/validate');
  return db.run(sanitizeSql(sql), sanitizeParams(params));
});

ipcMain.handle('auth:hash', (event, { password }) => {
  return bcrypt.hashSync(password, 10);
});

ipcMain.handle('auth:compare', (event, { password, hash }) => {
  return { matched: bcrypt.compareSync(password, hash) };
});

ipcMain.handle('sync:turso', async (event, { table, data }) => {
  try {
    await syncToTurso(table, data);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('sync:status', async () => {
  return getSyncStatus();
});

ipcMain.handle('sync:push', async () => {
  return await pushChanges();
});

ipcMain.handle('sync:pull', async () => {
  return await pullChanges();
});

ipcMain.handle('sync:full', async () => {
  return await fullSync();
});

ipcMain.handle('sync:queue', async () => {
  return getQueueEntries(500);
});

ipcMain.handle('sync:startAuto', async (event, interval) => {
  startAutoSync(interval || 60000);
  return { success: true };
});

ipcMain.handle('sync:stopAuto', async () => {
  stopAutoSync();
  return { success: true };
});

ipcMain.handle('ai:chat', async (event, { message, history, model }) => {
  try {
    const response = await groqAI.chat(message, history, model);
    return { success: true, data: response };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ai:models', async () => {
  const config = getConfig();
  return groqAI.getAvailableModels(config.groqApiKey);
});

ipcMain.handle('dialog:save', async (event, options) => {
  return dialog.showSaveDialog(mainWindow, options);
});

ipcMain.handle('dialog:open', async (event, options) => {
  return dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle('backup:create', async () => {
  const fs = require('fs');
  const srcPath = path.join(app.getPath('userData'), 'jwellery.db');
  const stats = fs.statSync(srcPath);
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `arynoxtech-backup-${new Date().toISOString().split('T')[0]}.db`,
    filters: [{ name: 'Database Backup', extensions: ['db'] }]
  });
  if (!result.canceled) {
    fs.copyFileSync(srcPath, result.filePath);
    const db = getOfflineDB();
    let info = { tableCount: 0, pendingSync: 0 };
    try {
      const tables = db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
      info.tableCount = tables.length;
      info.pendingSync = (db.get("SELECT COUNT(*) as cnt FROM sync_queue WHERE synced_at IS NULL") || {}).cnt || 0;
    } catch(e) {}
    return { success: true, path: result.filePath, size: stats.size, modified: stats.mtime, info };
  }
  return { success: false };
});

ipcMain.handle('backup:restore', async (event, filePath) => {
  const fs = require('fs');
  let fileToRestore = filePath;
  
  // If no file path provided, show open dialog
  if (!fileToRestore) {
    const result = await dialog.showOpenDialog(mainWindow, {
      filters: [{ name: 'Database Backup', extensions: ['db'] }]
    });
    if (result.canceled) return { success: false };
    fileToRestore = result.filePaths[0];
  }
  
  if (!fs.existsSync(fileToRestore)) return { success: false, error: 'Backup file not found' };
  
  try {
    // Auto-create pre-restore backup
    const preBackupPath = path.join(app.getPath('userData'), `pre-restore-backup-${new Date().toISOString().split('T')[0]}.db`);
    const currentDbPath = path.join(app.getPath('userData'), 'jwellery.db');
    if (fs.existsSync(currentDbPath)) {
      fs.copyFileSync(currentDbPath, preBackupPath);
      logger.info('BACKUP', 'Pre-restore backup created', { path: preBackupPath });
    }
    
    // Copy the restore file over current DB
    fs.copyFileSync(fileToRestore, currentDbPath);
    
    // Reinitialize database
    closeDB();
    const newDb = await initOfflineDB();
    setDB(newDb);
    initSchema();
    
    // Reset sync state
    resetAfterRestore();
    
    const stats = fs.statSync(currentDbPath);
    const preBackupInfo = fs.existsSync(preBackupPath) ? { preBackupPath, preBackupSize: fs.statSync(preBackupPath).size } : {};
    
    logger.info('BACKUP', 'Database restored successfully', { from: fileToRestore, ...preBackupInfo });
    return { success: true, path: fileToRestore, size: stats.size, ...preBackupInfo };
  } catch (err) {
    logger.error('BACKUP', 'Restore failed', { error: err.message });
    return { success: false, error: err.message };
  }
});

ipcMain.handle('backup:info', async () => {
  const fs = require('fs');
  const dbPath = path.join(app.getPath('userData'), 'jwellery.db');
  try {
    if (!fs.existsSync(dbPath)) return { exists: false };
    const stats = fs.statSync(dbPath);
    const db = getOfflineDB();
    let tableCount = 0, recordCount = 0, pendingSync = 0;
    try {
      const tables = db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
      tableCount = tables.length;
      for (const t of tables) {
        const cnt = db.get(`SELECT COUNT(*) as cnt FROM "${t.name}"`);
        recordCount += cnt?.cnt || 0;
      }
      pendingSync = (db.get("SELECT COUNT(*) as cnt FROM sync_queue WHERE synced_at IS NULL") || {}).cnt || 0;
    } catch(e) {}
    return { exists: true, size: stats.size, modified: stats.mtime, tableCount, recordCount, pendingSync };
  } catch(e) {
    return { exists: false, error: e.message };
  }
});

const Store = require('electron-store');
const store = new Store();

function getConfig() {
  return store.get('config', {});
}

ipcMain.handle('config:get', () => getConfig());

ipcMain.handle('config:set', (event, config) => {
  store.set('config', { ...getConfig(), ...config });
  if (config.groqApiKey) groqAI.setApiKey(config.groqApiKey);
  if (config.tursoUrl || config.tursoToken) initOnlineDB(config.tursoUrl, config.tursoToken);
  return { success: true };
});

ipcMain.handle('logs:get', async (event, date) => {
  const { getLogs, getLogFiles } = require('./src/database/logger');
  return { logs: getLogs(date), files: getLogFiles() };
});

// Auto-updater event handlers
function setupAutoUpdater() {
  autoUpdater.on('checking-for-update', () => {
    logger.info('UPDATER', 'Checking for updates...');
    if (mainWindow) mainWindow.webContents.send('update:status', { status: 'checking' });
  });
  autoUpdater.on('update-available', (info) => {
    logger.info('UPDATER', 'Update available', { version: info.version });
    if (mainWindow) {
      mainWindow.webContents.send('update:available', { version: info.version, releaseDate: info.releaseDate });
      mainWindow.webContents.send('update:status', { status: 'available', version: info.version });
    }
    // Auto-download
    autoUpdater.downloadUpdate();
  });
  autoUpdater.on('update-not-available', (info) => {
    logger.info('UPDATER', 'No update available');
    if (mainWindow) mainWindow.webContents.send('update:status', { status: 'up-to-date' });
  });
  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow) {
      mainWindow.webContents.send('update:progress', {
        percent: Math.round(progress.percent),
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total,
      });
      mainWindow.webContents.send('update:status', { status: 'downloading', percent: Math.round(progress.percent) });
    }
  });
  autoUpdater.on('update-downloaded', (info) => {
    logger.info('UPDATER', 'Update downloaded', { version: info.version });
    if (mainWindow) mainWindow.webContents.send('update:status', { status: 'downloaded', version: info.version });
  });
  autoUpdater.on('error', (err) => {
    logger.error('UPDATER', 'Update error', { error: err.message });
    if (mainWindow) mainWindow.webContents.send('update:status', { status: 'error', error: err.message });
  });
}

ipcMain.handle('app:close', () => app.quit());
ipcMain.handle('app:checkUpdate', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { updateAvailable: result?.updateInfo ? true : false, version: result?.updateInfo?.version };
  } catch (e) {
    return { updateAvailable: false, error: e.message };
  }
});
ipcMain.handle('app:installUpdate', async () => {
  autoUpdater.quitAndInstall();
  return { success: true };
});
ipcMain.handle('app:downloadUpdate', async () => {
  autoUpdater.downloadUpdate();
  return { success: true };
});
ipcMain.handle('app:minimize', () => mainWindow.minimize());
ipcMain.handle('app:maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});

ipcMain.handle('printer:list', () => {
  return mainWindow.webContents.getPrinters();
});

ipcMain.handle('print:html', async (event, htmlContent, options = {}) => {
  return new Promise((resolve) => {
    const printWin = new BrowserWindow({
      width: 800, height: 600, show: false, webPreferences: { nodeIntegration: false, contextIsolation: true }
    });
    printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
    printWin.webContents.on('did-finish-load', () => {
      printWin.webContents.print({
        ...options,
        printBackground: true,
      }, (success, errorType) => {
        printWin.close();
        resolve({ success, errorType });
      });
    });
  });
});

ipcMain.handle('print:silent', async (event, htmlContent, deviceName, options = {}) => {
  return new Promise((resolve) => {
    const printWin = new BrowserWindow({
      width: 800, height: 600, show: false, webPreferences: { nodeIntegration: false, contextIsolation: true }
    });
    printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
    printWin.webContents.on('did-finish-load', () => {
      printWin.webContents.print({
        ...options,
        deviceName,
        silent: true,
        printBackground: true,
      }, (success, errorType) => {
        printWin.close();
        resolve({ success, errorType });
      });
    });
  });
});

ipcMain.handle('seed:demo', async () => {
  const { seedDemoData } = require('./src/database/seed');
  return seedDemoData();
});

ipcMain.handle('email:send', async (event, { to, subject, html, text }) => {
  try {
    let nodemailer;
    try {
      nodemailer = require('nodemailer');
    } catch(e) {
      return { success: false, error: 'Email module not installed. Run: npm install nodemailer' };
    }
    const config = getConfig();
    if (!config.smtpHost || !config.smtpPort || !config.smtpUser || !config.smtpPass) {
      return { success: false, error: 'SMTP not configured in Settings > Email' };
    }
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: parseInt(config.smtpPort) || 587,
      secure: parseInt(config.smtpPort) === 465,
      auth: { user: config.smtpUser, pass: config.smtpPass },
    });
    await transporter.sendMail({
      from: `"${config.companyName || 'Arynoxtech Jwellery'}" <${config.smtpUser}>`,
      to, subject, html, text,
    });
    logger.info('EMAIL', 'Invoice sent', { to, subject });
    return { success: true };
  } catch (err) {
    logger.error('EMAIL', 'Send failed', { error: err.message });
    return { success: false, error: err.message };
  }
});

ipcMain.handle('email:config', async () => {
  const config = getConfig();
  return {
    smtpHost: config.smtpHost || '',
    smtpPort: config.smtpPort || '587',
    smtpUser: config.smtpUser || '',
    smtpPass: config.smtpPass ? '********' : '',
  };
});

ipcMain.handle('barcode:preview', async (event, htmlContent) => {
  return new Promise((resolve) => {
    if (printPreviewWindow && !printPreviewWindow.isDestroyed()) printPreviewWindow.close();
    printPreviewWindow = new BrowserWindow({
      width: 500, height: 700, show: true,
      title: 'Barcode Preview',
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    });
    printPreviewWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
    printPreviewWindow.on('closed', () => { printPreviewWindow = null; resolve({ success: true }); });
    resolve({ success: true });
  });
});
