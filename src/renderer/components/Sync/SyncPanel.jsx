import React, { useState, useEffect, useCallback } from 'react';

const SYNC_TABLES = {
  items: 'Items', parties: 'Parties', transactions: 'Transactions',
  sale_invoice_items: 'Sale Items', metal_rates: 'Metal Rates',
  categories: 'Categories', ledgers: 'Ledgers', employees: 'Employees',
  girvi_pledges: 'Pledges', work_orders: 'Work Orders', quotations: 'Quotations'
};

export default function SyncPanel() {
  const [status, setStatus] = useState({ connected: false, pendingCount: 0, lastSync: null, isSyncing: false });
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const loadStatus = useCallback(async () => {
    try {
      const s = await window.electronAPI.sync.status();
      setStatus(s);
      const q = await window.electronAPI.sync.queue();
      setQueue(q || []);
    } catch(e) {}
  }, []);

  useEffect(() => { loadStatus(); const t = setInterval(loadStatus, 5000); return () => clearInterval(t); }, [loadStatus]);

  const doFullSync = async () => {
    setLoading(true);
    setResult(null);
    try {
      const r = await window.electronAPI.sync.full();
      setResult({ type: 'success', message: `Push: ${r.push?.pushed || 0} pushed, ${r.push?.failed || 0} failed | Pull: ${r.pull?.pulled || 0} pulled, ${r.pull?.failed || 0} failed` });
      await loadStatus();
    } catch(e) {
      setResult({ type: 'error', message: e.message });
    }
    setLoading(false);
  };

  const doPush = async () => {
    setLoading(true);
    setResult(null);
    try {
      const r = await window.electronAPI.sync.push();
      setResult({ type: 'success', message: `Pushed ${r.pushed}, failed ${r.failed}` });
      await loadStatus();
    } catch(e) { setResult({ type: 'error', message: e.message }); }
    setLoading(false);
  };

  const doPull = async () => {
    setLoading(true);
    setResult(null);
    try {
      const r = await window.electronAPI.sync.pull();
      setResult({ type: 'success', message: `Pulled ${r.pulled}, failed ${r.failed}` });
      await loadStatus();
    } catch(e) { setResult({ type: 'error', message: e.message }); }
    setLoading(false);
  };

  const formatTime = (t) => {
    if (!t) return 'Never';
    try { return new Date(t).toLocaleString('en-IN'); } catch(e) { return t; }
  };

  const getTableLabel = (t) => SYNC_TABLES[t] || t;

  return (
    <div>
      <div className="card mb-4">
        <div className="card-header"><span>🔄 Sync Status</span></div>
        <div className="card-body">
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 16 }}>
            <div className="stat-card">
              <div className="stat-value" style={{ color: status.connected ? '#22c55e' : '#ef4444' }}>
                {status.connected ? 'Connected' : 'Offline'}
              </div>
              <div className="stat-label">Turso Status</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{status.pendingCount || 0}</div>
              <div className="stat-label">Pending Changes</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ fontSize: 13 }}>{formatTime(status.lastSync)}</div>
              <div className="stat-label">Last Sync</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{status.isSyncing ? '⏳ Syncing...' : '✓ Idle'}</div>
              <div className="stat-label">Status</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button className="btn btn-primary" onClick={doFullSync} disabled={loading || !status.connected}>
              {loading ? '⏳ Syncing...' : '🔄 Full Sync'}
            </button>
            <button className="btn btn-secondary" onClick={doPush} disabled={loading || !status.connected || status.pendingCount === 0}>
              ⬆ Push Changes
            </button>
            <button className="btn btn-secondary" onClick={doPull} disabled={loading || !status.connected}>
              ⬇ Pull Changes
            </button>
            <button className="btn btn-secondary" onClick={loadStatus} disabled={loading}>
              🔄 Refresh
            </button>
          </div>

          {result && (
            <div className={`notification-item ${result.type}`} style={{ marginBottom: 12 }}>
              {result.message}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span>📋 Sync Queue ({queue.length} entries)</span>
          {status.pendingCount > 0 && <span className="nav-badge">{status.pendingCount} pending</span>}
        </div>
        <div className="card-body" style={{ maxHeight: 400, overflow: 'auto' }}>
          {queue.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <div className="empty-state-text">All changes synced</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Table</th><th>Action</th><th>Record ID</th><th>Time</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {queue.map(entry => (
                  <tr key={entry.id}>
                    <td><span className="badge badge-info">{getTableLabel(entry.table_name)}</span></td>
                    <td><span className={`badge ${entry.action === 'insert' ? 'badge-success' : entry.action === 'delete' ? 'badge-danger' : 'badge-warning'}`}>{entry.action}</span></td>
                    <td style={{ fontSize: 11 }}>{entry.record_id}</td>
                    <td style={{ fontSize: 11 }}>{formatTime(entry.created_at)}</td>
                    <td>{entry.synced_at ? <span className="badge badge-success">Synced</span> : entry.error ? <span className="badge badge-danger" title={entry.error}>Error</span> : <span className="badge badge-warning">Pending</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
