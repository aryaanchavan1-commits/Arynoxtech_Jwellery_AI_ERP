const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let logStream = null;

function getLogPath() {
  return path.join(app.getPath('userData'), 'logs', `app-${new Date().toISOString().split('T')[0]}.log`);
}

function ensureLogDir() {
  const dir = path.join(app.getPath('userData'), 'logs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeLog(level, source, message, data) {
  try {
    ensureLogDir();
    const timestamp = new Date().toISOString();
    const dataStr = data ? ' | ' + JSON.stringify(data).slice(0, 500) : '';
    const line = `[${timestamp}] [${level}] [${source}] ${message}${dataStr}\n`;
    fs.appendFileSync(getLogPath(), line);
    if (level !== 'DEBUG') console.log(`[${level}] ${source}: ${message}`);
  } catch(e) { /* logging should never throw */ }
}

const logger = {
  info: (source, msg, data) => writeLog('INFO', source, msg, data),
  warn: (source, msg, data) => writeLog('WARN', source, msg, data),
  error: (source, msg, data) => writeLog('ERROR', source, msg, data),
  debug: (source, msg, data) => writeLog('DEBUG', source, msg, data),
};

function logError(source, err, context) {
  logger.error(source, err.message, { ...context, stack: err.stack?.slice(0, 500) });
}

function getLogs(date) {
  const logPath = path.join(app.getPath('userData'), 'logs', `app-${date || new Date().toISOString().split('T')[0]}.log`);
  try {
    if (fs.existsSync(logPath)) return fs.readFileSync(logPath, 'utf8');
    return 'No logs for this date';
  } catch(e) { return 'Error reading logs: ' + e.message; }
}

function getLogFiles() {
  const dir = path.join(app.getPath('userData'), 'logs');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.log')).sort().reverse();
}

module.exports = { logger, logError, getLogs, getLogFiles };
