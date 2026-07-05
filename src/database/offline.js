const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const Database = require('better-sqlite3');

let db = null;
let dbPath = null;

async function initOfflineDB() {
  dbPath = path.join(app.getPath('userData'), 'jwellery.db');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const wrappedDb = wrapDatabase(db);
  return wrappedDb;
}

function wrapDatabase(rawDb) {
  return {
    _raw: rawDb,

    run(sql, params = []) {
      try {
        const stmt = rawDb.prepare(sql);
        const info = params.length > 0 ? stmt.run(...params) : stmt.run();
        const result = { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
        try {
          const action = sql.trim().split(/\s+/)[0].toUpperCase();
          if (['INSERT', 'UPDATE', 'DELETE'].includes(action)) {
            const { logAudit } = require('./audit');
            const tableMatch = sql.match(/\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+["']?(\w+)["']?\s/i);
            if (tableMatch) {
              const tableName = tableMatch[1];
              const recordId = params && params.length > 0 ? String(params[0]) : null;
              logAudit(tableName, action, recordId, sql, params);
            }
          }
        } catch(e) { /* audit errors non-fatal */ }
        return result;
      } catch (err) {
        console.error('[DB] run error:', sql.slice(0, 100), err.message);
        const { logError } = require('./logger');
        logError('DB_RUN', err, { sql: sql.slice(0, 200), params });
        return { changes: 0, lastInsertRowid: null };
      }
    },

    get(sql, params = []) {
      try {
        return rawDb.prepare(sql).get(...params) || null;
      } catch (err) {
        console.error('[DB] get error:', err.message);
        logError('DB_GET', err, { sql: sql.slice(0, 200) });
        return null;
      }
    },

    all(sql, params = []) {
      try {
        return rawDb.prepare(sql).all(...params);
      } catch (err) {
        console.error('[DB] all error:', err.message);
        logError('DB_ALL', err, { sql: sql.slice(0, 200) });
        return [];
      }
    },

    exec(sql) {
      try {
        const count = rawDb.exec(sql);
        return { changes: count };
      } catch (err) {
        console.error('[DB] exec error:', err.message);
        logError('DB_EXEC', err, { sql: sql.slice(0, 200) });
        return { changes: 0 };
      }
    },

    export() {
      return fs.readFileSync(dbPath);
    },

    close() {
      if (rawDb) rawDb.close();
    }
  };
}

function getOfflineDB() { return db; }
function setDB(newDb) { db = newDb; }
function closeDB() {
  if (db) {
    try { db._raw.close(); } catch(e) {}
    db = null;
  }
}

module.exports = { initOfflineDB, getOfflineDB, closeDB, setDB };
