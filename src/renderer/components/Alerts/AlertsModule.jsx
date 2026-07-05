import React, { useState, useEffect, useCallback, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { AuthContext } from '../../contexts/AuthContext';

const STYLES = {
  container: {
    padding: '24px',
    color: '#e0e0e0',
    minHeight: '100vh',
    backgroundColor: '#1a1a2e',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    marginBottom: '24px',
    borderBottom: '2px solid #2d2d44',
    flexWrap: 'wrap',
  },
  tab: (active) => ({
    padding: '10px 20px',
    cursor: 'pointer',
    borderRadius: '8px 8px 0 0',
    fontWeight: 500,
    fontSize: '14px',
    border: 'none',
    backgroundColor: active ? '#2d2d44' : 'transparent',
    color: active ? '#fff' : '#888',
    transition: 'all 0.2s',
  }),
  card: {
    backgroundColor: '#22223a',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    border: '1px solid #2d2d44',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  th: {
    textAlign: 'left',
    padding: '12px 8px',
    borderBottom: '2px solid #2d2d44',
    color: '#888',
    fontWeight: 600,
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  td: {
    padding: '10px 8px',
    borderBottom: '1px solid #2a2a42',
    color: '#ccc',
  },
  input: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #2d2d44',
    backgroundColor: '#1e1e36',
    color: '#e0e0e0',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #2d2d44',
    backgroundColor: '#1e1e36',
    color: '#e0e0e0',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  textarea: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #2d2d44',
    backgroundColor: '#1e1e36',
    color: '#e0e0e0',
    fontSize: '14px',
    width: '100%',
    minHeight: '80px',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  btn: {
    padding: '10px 24px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#4a6cf7',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnDanger: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #5a2a2a',
    backgroundColor: 'transparent',
    color: '#ef5350',
    fontSize: '12px',
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #2d2d44',
    backgroundColor: 'transparent',
    color: '#ccc',
    fontSize: '12px',
    cursor: 'pointer',
  },
  filterRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    color: '#aaa',
    fontWeight: 500,
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#666',
  },
  loading: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#888',
  },
  error: {
    padding: '12px 16px',
    backgroundColor: '#3a1a1a',
    border: '1px solid #5a2a2a',
    borderRadius: '8px',
    color: '#ef5350',
    marginBottom: '16px',
    fontSize: '13px',
  },
  success: {
    padding: '12px 16px',
    backgroundColor: '#1a3a2a',
    border: '1px solid #2a5a3a',
    borderRadius: '8px',
    color: '#4caf50',
    marginBottom: '16px',
    fontSize: '13px',
  },
  filterBtn: (active) => ({
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid',
    borderColor: active ? '#4a6cf7' : '#2d2d44',
    backgroundColor: active ? '#1a2a4a' : 'transparent',
    color: active ? '#4a6cf7' : '#888',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  }),
  severityIcon: {
    info: { color: '#42a5f5' },
    warning: { color: '#ffa726' },
    critical: { color: '#ef5350' },
  },
};

const ALERT_TYPES = ['price_change', 'stock_adjustment', 'user_edit', 'low_stock', 'maturity', 'custom'];
const SEVERITIES = ['info', 'warning', 'critical'];

function formatDateTime(d) {
  if (!d) return '—';
  try {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDateTime(dateStr);
}

function getSeverityIcon(severity) {
  switch (severity) {
    case 'critical': return '⚠';
    case 'warning': return '⚡';
    case 'info':
    default: return 'ℹ';
  }
}

// ============ TAB 1: Alert Feed ============
function AlertFeed({ dbQuery, dbRun, addNotification }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let sql = 'SELECT * FROM alerts ORDER BY created_at DESC';
      if (filter === 'unread') sql = 'SELECT * FROM alerts WHERE is_read = 0 ORDER BY created_at DESC';
      else if (filter === 'critical') sql = "SELECT * FROM alerts WHERE severity = 'critical' ORDER BY created_at DESC";
      else if (filter === 'warning') sql = "SELECT * FROM alerts WHERE severity = 'warning' ORDER BY created_at DESC";
      const data = await dbQuery(sql);
      setAlerts(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dbQuery, filter]);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  const handleMarkRead = async (id) => {
    try {
      await dbRun('UPDATE alerts SET is_read = 1 WHERE id = ?', [id]);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: 1 } : a));
    } catch (err) {
      if (addNotification) addNotification('Failed to mark alert as read', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await dbRun('DELETE FROM alerts WHERE id = ?', [id]);
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      if (addNotification) addNotification('Failed to delete alert', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await dbRun('UPDATE alerts SET is_read = 1 WHERE is_read = 0');
      setAlerts(prev => prev.map(a => ({ ...a, is_read: 1 })));
      if (addNotification) addNotification('All alerts marked as read', 'success');
    } catch (err) {
      if (addNotification) addNotification('Failed to mark all as read', 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={STYLES.filterRow}>
          {['all', 'unread', 'critical', 'warning'].map(f => (
            <button key={f} style={STYLES.filterBtn(filter === f)} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button style={STYLES.btnSecondary} onClick={handleMarkAllRead}>
          Mark All Read
        </button>
      </div>

      {error && <div style={STYLES.error}>{error}</div>}

      {loading ? (
        <div style={STYLES.loading}>Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div style={STYLES.emptyState}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔔</div>
          <div>No alerts found</div>
          <div style={{ fontSize: '13px', marginTop: '8px', color: '#555' }}>
            {filter !== 'all' ? 'Try changing your filter' : 'You\'re all caught up!'}
          </div>
        </div>
      ) : (
        <div>
          {alerts.map(alert => (
            <div key={alert.id} style={{
              ...STYLES.card,
              padding: '16px',
              opacity: alert.is_read ? 0.7 : 1,
              border: `1px solid ${alert.is_read ? '#2d2d44' : '#3d3d5c'}`,
              display: 'flex',
              gap: '14px',
              alignItems: 'flex-start',
            }}>
              <div style={{
                fontSize: '24px', flexShrink: 0, lineHeight: 1,
                ...(STYLES.severityIcon[alert.severity] || STYLES.severityIcon.info),
              }}>
                {getSeverityIcon(alert.severity)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: '10px',
                      fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
                      backgroundColor: alert.severity === 'critical' ? '#3a1a1a' : alert.severity === 'warning' ? '#3a2a1a' : '#1a1a3a',
                      color: alert.severity === 'critical' ? '#ef5350' : alert.severity === 'warning' ? '#ffa726' : '#42a5f5',
                      border: `1px solid ${alert.severity === 'critical' ? '#5a2a2a' : alert.severity === 'warning' ? '#5a4a2a' : '#2a2a5a'}`,
                      marginBottom: '4px',
                    }}>{alert.severity}</span>
                    {alert.alert_type && (
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: '10px',
                        fontSize: '11px', fontWeight: 500,
                        backgroundColor: '#2a2a42', color: '#aaa',
                        border: '1px solid #3a3a5a', marginLeft: '6px',
                      }}>{alert.alert_type.replace(/_/g, ' ')}</span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }}>
                    {getTimeAgo(alert.created_at)}
                  </div>
                </div>
                <div style={{ color: '#fff', fontSize: '14px', marginTop: '6px', fontWeight: 500 }}>
                  {alert.message}
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '12px', color: '#888' }}>
                  {alert.entity_type && <span>Entity: {alert.entity_type}</span>}
                  {alert.entity_id && <span>ID: {alert.entity_id}</span>}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  {!alert.is_read && (
                    <button style={STYLES.btnSecondary} onClick={() => handleMarkRead(alert.id)}>
                      Mark Read
                    </button>
                  )}
                  <button style={STYLES.btnDanger} onClick={() => handleDelete(alert.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ TAB 2: Create Alert ============
function CreateAlert({ dbRun, addNotification }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [form, setForm] = useState({
    alert_type: 'custom',
    entity_type: '',
    entity_id: '',
    message: '',
    severity: 'info',
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) { setError('Message is required'); return; }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await dbRun(
        `INSERT INTO alerts (alert_type, entity_type, entity_id, message, severity, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, 0, datetime('now', 'localtime'))`,
        [form.alert_type, form.entity_type || null, form.entity_id || null, form.message.trim(), form.severity]
      );
      setSuccess('Alert created successfully!');
      setForm({ alert_type: 'custom', entity_type: '', entity_id: '', message: '', severity: 'info' });
      if (addNotification) addNotification('Alert created', 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={STYLES.card}>
        <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600 }}>Create Test Alert</h3>
        <p style={{ margin: '-12px 0 20px', fontSize: '13px', color: '#666' }}>
          Use this form to manually create alerts for testing purposes
        </p>

        {error && <div style={STYLES.error}>{error}</div>}
        {success && <div style={STYLES.success}>{success}</div>}

        <form onSubmit={handleSubmit}>
          <div style={STYLES.formGroup}>
            <label style={STYLES.label}>Alert Type</label>
            <select style={STYLES.select} value={form.alert_type}
              onChange={e => handleChange('alert_type', e.target.value)}>
              {ALERT_TYPES.map(t => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={STYLES.formGroup}>
              <label style={STYLES.label}>Entity Type</label>
              <input style={STYLES.input} type="text" placeholder="e.g. item, transaction"
                value={form.entity_type} onChange={e => handleChange('entity_type', e.target.value)} />
            </div>
            <div style={STYLES.formGroup}>
              <label style={STYLES.label}>Entity ID</label>
              <input style={STYLES.input} type="text" placeholder="e.g. item ID"
                value={form.entity_id} onChange={e => handleChange('entity_id', e.target.value)} />
            </div>
          </div>

          <div style={STYLES.formGroup}>
            <label style={STYLES.label}>Severity</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {SEVERITIES.map(s => (
                <label key={s} style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  border: `2px solid ${form.severity === s ? '#4a6cf7' : '#2d2d44'}`,
                  backgroundColor: form.severity === s ? '#1a2a4a' : '#1e1e36',
                  cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                }}>
                  <input type="radio" name="severity" value={s} checked={form.severity === s}
                    onChange={e => handleChange('severity', e.target.value)}
                    style={{ display: 'none' }} />
                  <div style={{
                    fontSize: '20px',
                    color: s === 'critical' ? '#ef5350' : s === 'warning' ? '#ffa726' : '#42a5f5',
                  }}>{s.charAt(0).toUpperCase() + s.slice(1)}</div>
                </label>
              ))}
            </div>
          </div>

          <div style={STYLES.formGroup}>
            <label style={STYLES.label}>Message *</label>
            <textarea style={STYLES.textarea} placeholder="Alert message..."
              value={form.message} onChange={e => handleChange('message', e.target.value)} />
          </div>

          <button type="submit" style={{ ...STYLES.btn, opacity: loading ? 0.6 : 1 }} disabled={loading}>
            {loading ? 'Creating...' : 'Create Alert'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============ TAB 3: Alert Settings ============
function AlertSettings({ dbQuery, dbRun, addNotification }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [settings, setSettings] = useState({
    price_change: true,
    stock_adjustment: true,
    user_edit: false,
    low_stock: true,
    maturity: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const result = await dbQuery("SELECT value FROM settings WHERE key = 'alert_settings'");
        if (result && result[0] && result[0].value) {
          const parsed = JSON.parse(result[0].value);
          setSettings(prev => ({ ...prev, ...parsed }));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [dbQuery]);

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const existing = await dbQuery("SELECT value FROM settings WHERE key = 'alert_settings'");
      if (existing && existing[0]) {
        await dbRun("UPDATE settings SET value = ? WHERE key = 'alert_settings'", [JSON.stringify(settings)]);
      } else {
        await dbRun("INSERT INTO settings (key, value) VALUES ('alert_settings', ?)", [JSON.stringify(settings)]);
      }
      setSuccess('Alert settings saved successfully');
      if (addNotification) addNotification('Alert settings saved', 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const settingsConfig = [
    { key: 'price_change', label: 'Item price changes', desc: 'Trigger alert when item prices are modified' },
    { key: 'stock_adjustment', label: 'Stock adjustments', desc: 'Trigger alert when inventory stock is adjusted' },
    { key: 'user_edit', label: 'User edits transactions', desc: 'Trigger alert when a user edits any transaction' },
    { key: 'low_stock', label: 'Low stock (< min quantity)', desc: 'Auto-create alerts for items below minimum stock level' },
    { key: 'maturity', label: 'Pledge maturity (30 days before)', desc: 'Auto-create alerts for pledges maturing within 30 days' },
  ];

  if (loading) return <div style={STYLES.loading}>Loading settings...</div>;

  return (
    <div style={{ maxWidth: 650, margin: '0 auto' }}>
      <div style={STYLES.card}>
        <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600 }}>Alert Trigger Settings</h3>
        <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#666' }}>
          Configure which events automatically create alerts in the system
        </p>

        {error && <div style={STYLES.error}>{error}</div>}
        {success && <div style={STYLES.success}>{success}</div>}

        <div>
          {settingsConfig.map(item => (
            <div key={item.key} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '14px 0', borderBottom: '1px solid #2a2a42',
            }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                cursor: 'pointer', flex: 1,
              }}>
                <input type="checkbox" checked={settings[item.key]}
                  onChange={() => handleToggle(item.key)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#4a6cf7' }} />
                <div>
                  <div style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>{item.label}</div>
                  <div style={{ color: '#666', fontSize: '12px', marginTop: '2px' }}>{item.desc}</div>
                </div>
              </label>
              <span style={{
                fontSize: '12px', padding: '3px 10px', borderRadius: '10px',
                backgroundColor: settings[item.key] ? '#1a3a2a' : '#2a2a2a',
                color: settings[item.key] ? '#4caf50' : '#666',
                border: `1px solid ${settings[item.key] ? '#2e7d32' : '#3a3a3a'}`,
              }}>
                {settings[item.key] ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '24px' }}>
          <button style={{ ...STYLES.btn, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ Auto-Check Helper ============
async function autoCheckAlerts(dbQuery, dbRun, settings) {
  try {
    if (!settings) {
      const result = await dbQuery("SELECT value FROM settings WHERE key = 'alert_settings'");
      if (result && result[0] && result[0].value) {
        settings = JSON.parse(result[0].value);
      } else {
        settings = { price_change: true, stock_adjustment: true, user_edit: false, low_stock: true, maturity: true };
      }
    }

    const existing = await dbQuery("SELECT DISTINCT message FROM alerts WHERE date(created_at) = date('now', 'localtime')");
    const existingMsgs = new Set((existing || []).map(r => r.message));

    const createIfNew = async (msg, severity, type, entityType, entityId) => {
      if (existingMsgs.has(msg)) return;
      await dbRun(
        `INSERT INTO alerts (alert_type, entity_type, entity_id, message, severity, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, 0, datetime('now', 'localtime'))`,
        [type, entityType, entityId, msg, severity]
      );
    };

    if (settings.low_stock) {
      const lowStockItems = await dbQuery(
        `SELECT i.name, i.id, i.current_qty, i.min_qty FROM items i
         WHERE i.min_qty IS NOT NULL AND i.current_qty < i.min_qty`
      );
      for (const item of (lowStockItems || [])) {
        await createIfNew(
          `Low stock: ${item.name} (Qty: ${item.current_qty}, Min: ${item.min_qty})`,
          'warning', 'low_stock', 'item', String(item.id)
        );
      }
    }

    if (settings.maturity) {
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      const dateStr = thirtyDaysLater.toISOString().split('T')[0];

      const maturingPledges = await dbQuery(
        `SELECT p.id, p.pledge_no, p.maturity_date, c.name
         FROM girvi_pledges p JOIN parties c ON p.customer_id = c.id
         WHERE p.maturity_date <= ? AND p.status = 'active'`, [dateStr]
      );
      for (const pledge of (maturingPledges || [])) {
        await createIfNew(
          `Pledge #${pledge.pledge_no} for ${pledge.name} maturing on ${pledge.maturity_date}`,
          'info', 'maturity', 'pledge', String(pledge.id)
        );
      }
    }
  } catch (err) {
    console.error('Auto-check alerts error:', err);
  }
}

// ============ MAIN COMPONENT ============
export default function AlertsModule() {
  const [activeTab, setActiveTab] = useState(0);
  const appCtx = useContext(AppContext);
  const authCtx = useContext(AuthContext);

  const dbQuery = appCtx?.dbQuery || window.electronAPI?.db?.all || (async () => []);
  const dbRun = appCtx?.dbRun || window.electronAPI?.db?.run || (async () => {});
  const addNotification = appCtx?.addNotification || (() => {});

  useEffect(() => {
    autoCheckAlerts(dbQuery, dbRun);
  }, [dbQuery, dbRun]);

  const tabs = ['Alert Feed', 'Create Alert', 'Alert Settings'];

  return (
    <div style={STYLES.container}>
      <div style={{ marginBottom: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#fff' }}>Alerts & Notifications</h2>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#888' }}>Monitor system events and critical notifications</p>
      </div>

      <div style={STYLES.tabs}>
        {tabs.map((tab, i) => (
          <button key={tab} style={STYLES.tab(activeTab === i)} onClick={() => setActiveTab(i)}>
            {tab}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 0 && <AlertFeed dbQuery={dbQuery} dbRun={dbRun} addNotification={addNotification} />}
        {activeTab === 1 && <CreateAlert dbRun={dbRun} addNotification={addNotification} />}
        {activeTab === 2 && <AlertSettings dbQuery={dbQuery} dbRun={dbRun} addNotification={addNotification} />}
      </div>
    </div>
  );
}

export { autoCheckAlerts };
