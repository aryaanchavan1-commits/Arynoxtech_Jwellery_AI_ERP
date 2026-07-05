const { getOfflineDB } = require('./offline');
const { syncToTurso, syncFromTurso, getTursoClient } = require('./online');

const SYNCABLE_TABLES = [
  'items', 'parties', 'transactions', 'sale_invoice_items', 'metal_rates',
  'categories', 'ledgers', 'transaction_entries', 'karagir_transactions',
  'employees', 'gold_saving_schemes', 'scheme_installments', 'girvi_pledges',
  'girvi_interest_history', 'girvi_receipts', 'work_orders', 'work_order_jobs',
  'quotations', 'customer_visits', 'alerts', 'user_permissions', 'barcodes',
  'trays', 'payment_schedule', 'huid_history', 'users', 'companies'
];

let syncInterval = null;
let isSyncing = false;
let syncListeners = [];

function onSyncEvent(callback) {
  syncListeners.push(callback);
  return () => { syncListeners = syncListeners.filter(cb => cb !== callback); };
}

function notifyListeners(event) {
  syncListeners.forEach(cb => { try { cb(event); } catch(e) {} });
}

function db() { return getOfflineDB(); }

function getSyncStatus() {
  const d = db();
  if (!d) return { connected: false, pendingCount: 0, lastSync: null };
  try {
    const info = d.get("SELECT value FROM settings WHERE key='last_sync_time'");
    const pending = d.get("SELECT COUNT(*) as cnt FROM sync_queue WHERE synced_at IS NULL");
    const turso = getTursoClient();
    return {
      connected: !!turso,
      pendingCount: pending?.cnt || 0,
      lastSync: info?.value || null,
      isSyncing: isSyncing
    };
  } catch(e) {
    return { connected: false, pendingCount: 0, lastSync: null, isSyncing: false };
  }
}

function getQueueEntries(limit = 100) {
  const d = db();
  if (!d) return [];
  try {
    return d.all("SELECT * FROM sync_queue ORDER BY created_at ASC LIMIT ?", [limit]);
  } catch(e) {
    return [];
  }
}

async function pushChanges() {
  const d = db();
  const turso = getTursoClient();
  if (!d || !turso) { notifyListeners({ type: 'error', message: 'Turso not connected' }); return { pushed: 0, failed: 0 }; }

  isSyncing = true;
  notifyListeners({ type: 'sync_start', message: 'Pushing local changes...' });

  let pushed = 0, failed = 0;
  try {
    const entries = d.all("SELECT * FROM sync_queue WHERE synced_at IS NULL ORDER BY created_at ASC LIMIT 200");
    for (const entry of entries) {
      try {
        const data = JSON.parse(entry.data || '{}');
        const record = d.all(`SELECT * FROM "${entry.table_name}" WHERE id=?`, [entry.record_id]);
        if (record && record.length > 0) {
          await syncToTurso(entry.table_name, record[0]);
        } else if (entry.action === 'delete') {
          try {
            await turso.execute({
              sql: `DELETE FROM "${entry.table_name}" WHERE id=?`,
              args: [entry.record_id]
            });
          } catch(e) { /* ignore remote delete errors */ }
        }
        d.run("UPDATE sync_queue SET synced_at=CURRENT_TIMESTAMP WHERE id=?", [entry.id]);
        pushed++;
      } catch (err) {
        console.error('Sync push error for entry', entry.id, err.message);
        d.run("UPDATE sync_queue SET synced_at=CURRENT_TIMESTAMP, error=? WHERE id=?", [err.message, entry.id]);
        failed++;
      }
    }
    const existing = d.get("SELECT value FROM settings WHERE key='last_sync_time'");
    const now = new Date().toISOString();
    if (existing) {
      d.run("UPDATE settings SET value=?, updated_at=CURRENT_TIMESTAMP WHERE key='last_sync_time'", [now]);
    } else {
      d.run("INSERT INTO settings (key, value) VALUES ('last_sync_time', ?)", [now]);
    }
    notifyListeners({ type: 'sync_complete', message: `Pushed ${pushed}, failed ${failed}`, pushed, failed });
  } catch(err) {
    notifyListeners({ type: 'error', message: 'Push failed: ' + err.message });
  }
  isSyncing = false;
  return { pushed, failed };
}

async function pullChanges() {
  const d = db();
  const turso = getTursoClient();
  if (!d || !turso) { notifyListeners({ type: 'error', message: 'Turso not connected' }); return { pulled: 0, failed: 0 }; }

  isSyncing = true;
  notifyListeners({ type: 'sync_start', message: 'Pulling remote changes...' });

  let pulled = 0, failed = 0;
  try {
    const info = d.get("SELECT value FROM settings WHERE key='last_sync_time'");
    const lastSync = info?.value || '2020-01-01T00:00:00.000Z';

    for (const table of SYNCABLE_TABLES) {
      try {
        const rows = await syncFromTurso(table, lastSync);
        for (const row of rows) {
          try {
            const rowObj = typeof row.toJSON === 'function' ? row.toJSON() : row;
            const localRecord = d.get(`SELECT * FROM "${table}" WHERE id=?`, [rowObj.id]);

            if (localRecord) {
              const localTime = localRecord.updated_at || '2000-01-01';
              const remoteTime = rowObj.updated_at || '2000-01-01';
              if (remoteTime > localTime) {
                const keys = Object.keys(rowObj);
                const setClause = keys.filter(k => k !== 'id').map(k => `"${k}"=?`).join(',');
                const values = keys.filter(k => k !== 'id').map(k => rowObj[k]);
                d.run(`UPDATE "${table}" SET ${setClause} WHERE id=?`, [...values, rowObj.id]);
                pulled++;
              }
            } else {
              const keys = Object.keys(rowObj);
              const placeholders = keys.map(() => '?').join(',');
              const values = keys.map(k => rowObj[k]);
              d.run(`INSERT OR IGNORE INTO "${table}" (${keys.map(k => `"${k}"`).join(',')}) VALUES (${placeholders})`, values);
              pulled++;
            }
          } catch (err) {
            console.error('Sync pull record error:', err.message);
            failed++;
          }
        }
      } catch (err) {
        console.error('Sync pull table error:', table, err.message);
      }
    }
    const now = new Date().toISOString();
    const existing = d.get("SELECT value FROM settings WHERE key='last_sync_time'");
    if (existing) {
      d.run("UPDATE settings SET value=?, updated_at=CURRENT_TIMESTAMP WHERE key='last_sync_time'", [now]);
    } else {
      d.run("INSERT INTO settings (key, value) VALUES ('last_sync_time', ?)", [now]);
    }
    notifyListeners({ type: 'sync_complete', message: `Pulled ${pulled}, failed ${failed}`, pulled, failed });
  } catch(err) {
    notifyListeners({ type: 'error', message: 'Pull failed: ' + err.message });
  }
  isSyncing = false;
  return { pulled, failed };
}

async function fullSync() {
  const pushResult = await pushChanges();
  await new Promise(r => setTimeout(r, 1000));
  const pullResult = await pullChanges();
  return { push: pushResult, pull: pullResult };
}

function startAutoSync(intervalMs = 60000) {
  stopAutoSync();
  setTimeout(() => { fullSync().catch(() => {}); }, 5000);
  syncInterval = setInterval(() => { fullSync().catch(() => {}); }, intervalMs);
  notifyListeners({ type: 'auto_sync_started', interval: intervalMs });
}

function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    notifyListeners({ type: 'auto_sync_stopped' });
  }
}

function trackChange(tableName, recordId, action, recordData = null) {
  const d = db();
  if (!d || !SYNCABLE_TABLES.includes(tableName)) return;
  try {
    d.run(
      "INSERT INTO sync_queue (id, table_name, record_id, action, data) VALUES (?, ?, ?, ?, ?)",
      [require('crypto').randomUUID(), tableName, recordId, action, recordData ? JSON.stringify(recordData) : '{}']
    );
  } catch(e) { /* silently fail for sync tracking */ }
}

function resetAfterRestore() {
  const d = db();
  if (!d) return;
  try {
    // Clear stale sync queue entries after restore
    d.run("DELETE FROM sync_queue WHERE synced_at IS NOT NULL");
    // Mark all queue entries for re-sync
    d.run("UPDATE sync_queue SET synced_at = NULL, error = NULL");
    // Reset last sync time so next full sync re-evaluates everything
    d.run("UPDATE settings SET value='2000-01-01T00:00:00.000Z' WHERE key='last_sync_time'");
    notifyListeners({ type: 'restore_complete', message: 'Database restored. All changes queued for re-sync.' });
  } catch(e) {
    console.error('Reset after restore error:', e.message);
  }
}

module.exports = {
  pushChanges, pullChanges, fullSync,
  startAutoSync, stopAutoSync,
  getSyncStatus, getQueueEntries,
  trackChange, onSyncEvent, resetAfterRestore,
  SYNCABLE_TABLES
};
