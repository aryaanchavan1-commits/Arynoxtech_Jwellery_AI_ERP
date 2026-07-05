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
    userSelect: 'none',
  },
  td: {
    padding: '10px 8px',
    borderBottom: '1px solid #2a2a42',
    color: '#ccc',
    verticalAlign: 'middle',
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
  btnSecondary: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #2d2d44',
    backgroundColor: 'transparent',
    color: '#ccc',
    fontSize: '13px',
    cursor: 'pointer',
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
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#4a6cf7',
  },
};

const MODULES = [
  'Dashboard', 'Masters', 'Sales', 'Purchase', 'Karagir', 'Stock',
  'Accounting', 'Gold Rates', 'Gold Scheme', 'HR', 'Reports',
  'AI Assistant', 'Settings', 'GST', 'Girvi', 'Jobs', 'Quotations',
  'CRM', 'Alerts', 'Permissions',
];

const ROLE_TEMPLATES = {
  Admin: {
    label: 'Admin (Superadmin)',
    description: 'Full access to all modules with all permissions',
    getPermissions: () => {
      const perms = {};
      MODULES.forEach(m => { perms[m] = { view: true, create: true, edit: true, delete: true }; });
      return perms;
    },
  },
  WhiteAccount: {
    label: 'White Account',
    description: 'View/Create access on business-facing modules',
    getPermissions: () => {
      const perms = {};
      MODULES.forEach(m => { perms[m] = { view: false, create: false, edit: false, delete: false }; });
      const allowed = ['Dashboard', 'Masters', 'Sales', 'Purchase', 'Stock', 'Reports', 'Quotations', 'CRM'];
      allowed.forEach(m => { perms[m] = { view: true, create: true, edit: false, delete: false }; });
      return perms;
    },
  },
  BlackAccount: {
    label: 'Black Account',
    description: 'View/Create on operational and customer-facing modules',
    getPermissions: () => {
      const perms = {};
      MODULES.forEach(m => { perms[m] = { view: false, create: false, edit: false, delete: false }; });
      const allowed = ['Dashboard', 'Masters', 'Karagir', 'Stock', 'Girvi', 'Jobs', 'Alerts'];
      allowed.forEach(m => { perms[m] = { view: true, create: true, edit: false, delete: false }; });
      return perms;
    },
  },
};

function formatDateTime(d) {
  if (!d) return '—';
  try {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

// ============ TAB 1: Users List ============
function UsersList({ dbQuery }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await dbQuery('SELECT id, username, display_name, role FROM users ORDER BY username ASC');
        setUsers(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [dbQuery]);

  if (loading) return <div style={STYLES.loading}>Loading users...</div>;
  if (error) return <div style={STYLES.error}>{error}</div>;

  return (
    <div>
      <div style={STYLES.card}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>System Users</h3>
        {users.length === 0 ? (
          <div style={STYLES.emptyState}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
            <div>No users found</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={STYLES.table}>
              <thead>
                <tr>
                  <th style={STYLES.th}>Username</th>
                  <th style={STYLES.th}>Display Name</th>
                  <th style={STYLES.th}>Role</th>
                  <th style={STYLES.th}>Last Login</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ ...STYLES.td, color: '#fff', fontWeight: 500 }}>{u.username}</td>
                    <td style={STYLES.td}>{u.display_name || '—'}</td>
                    <td style={STYLES.td}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                        backgroundColor: u.role === 'admin' || u.role === 'superadmin' ? '#1a2a4a' : '#2a2a2a',
                        color: u.role === 'admin' || u.role === 'superadmin' ? '#4a6cf7' : '#aaa',
                        border: `1px solid ${u.role === 'admin' || u.role === 'superadmin' ? '#2a3a6a' : '#3a3a3a'}`,
                        textTransform: 'capitalize',
                      }}>{u.role || 'user'}</span>
                    </td>
                    <td style={STYLES.td}>{u.last_login ? formatDateTime(u.last_login) : 'Never'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ TAB 2: Module Permissions ============
function ModulePermissions({ dbQuery, dbRun, addNotification }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [permissions, setPermissions] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const data = await dbQuery('SELECT id, username, display_name FROM users ORDER BY username ASC');
        setUsers(data || []);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [dbQuery]);

  const loadPermissions = useCallback(async (userId) => {
    if (!userId) { setPermissions({}); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await dbQuery('SELECT * FROM user_permissions WHERE user_id = ?', [userId]);
      const perms = {};
      MODULES.forEach(m => { perms[m] = { view: false, create: false, edit: false, delete: false }; });
      (data || []).forEach(row => {
        if (row.module && perms[row.module]) {
          perms[row.module] = {
            view: Boolean(row.can_view),
            create: Boolean(row.can_create),
            edit: Boolean(row.can_edit),
            delete: Boolean(row.can_delete),
          };
        }
      });
      setPermissions(perms);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dbQuery]);

  useEffect(() => {
    if (selectedUser) loadPermissions(selectedUser);
    else setPermissions({});
  }, [selectedUser, loadPermissions]);

  const handleToggle = (module, action) => {
    setPermissions(prev => ({
      ...prev,
      [module]: { ...prev[module], [action]: !prev[module][action] },
    }));
  };

  const handleSave = async () => {
    if (!selectedUser) { setError('Please select a user'); return; }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await dbRun('DELETE FROM user_permissions WHERE user_id = ?', [selectedUser]);
      for (const module of MODULES) {
        const p = permissions[module];
        if (!p) continue;
        if (p.view || p.create || p.edit || p.delete) {
          await dbRun(
            `INSERT INTO user_permissions (user_id, module, can_view, can_create, can_edit, can_delete)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [selectedUser, module, p.view ? 1 : 0, p.create ? 1 : 0, p.edit ? 1 : 0, p.delete ? 1 : 0]
          );
        }
      }
      setSuccess('Permissions saved successfully');
      if (addNotification) addNotification('Permissions updated', 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const allView = MODULES.every(m => permissions[m]?.view);
  const allCreate = MODULES.every(m => permissions[m]?.create);
  const allEdit = MODULES.every(m => permissions[m]?.edit);
  const allDelete = MODULES.every(m => permissions[m]?.delete);

  const toggleAll = (action, value) => {
    setPermissions(prev => {
      const next = { ...prev };
      MODULES.forEach(m => { next[m] = { ...next[m], [action]: value }; });
      return next;
    });
  };

  return (
    <div>
      <div style={STYLES.card}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div style={{ flex: 1, minWidth: 250 }}>
            <label style={STYLES.label}>Select User</label>
            <select style={STYLES.select} value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
              <option value="">Choose a user...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.username} {u.display_name ? `(${u.display_name})` : ''}</option>
              ))}
            </select>
          </div>
          {selectedUser && !loading && (
            <button style={{ ...STYLES.btn, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Permissions'}
            </button>
          )}
        </div>

        {error && <div style={STYLES.error}>{error}</div>}
        {success && <div style={STYLES.success}>{success}</div>}

        {!selectedUser && !loading && (
          <div style={STYLES.emptyState}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔐</div>
            <div>Select a user to manage permissions</div>
          </div>
        )}

        {loading && <div style={STYLES.loading}>Loading permissions...</div>}

        {selectedUser && !loading && (
          <div style={{ overflowX: 'auto' }}>
            <table style={STYLES.table}>
              <thead>
                <tr>
                  <th style={STYLES.th}>Module</th>
                  <th style={STYLES.th} onClick={() => toggleAll('view', !allView)}>
                    View
                    <span style={{ marginLeft: 6, fontSize: 11, color: '#555', cursor: 'pointer' }}>(toggle all)</span>
                  </th>
                  <th style={STYLES.th} onClick={() => toggleAll('create', !allCreate)}>
                    Create
                    <span style={{ marginLeft: 6, fontSize: 11, color: '#555', cursor: 'pointer' }}>(toggle all)</span>
                  </th>
                  <th style={STYLES.th} onClick={() => toggleAll('edit', !allEdit)}>
                    Edit
                    <span style={{ marginLeft: 6, fontSize: 11, color: '#555', cursor: 'pointer' }}>(toggle all)</span>
                  </th>
                  <th style={STYLES.th} onClick={() => toggleAll('delete', !allDelete)}>
                    Delete
                    <span style={{ marginLeft: 6, fontSize: 11, color: '#555', cursor: 'pointer' }}>(toggle all)</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {MODULES.map(module => (
                  <tr key={module}>
                    <td style={{ ...STYLES.td, color: '#fff', fontWeight: 500, whiteSpace: 'nowrap' }}>{module}</td>
                    {['view', 'create', 'edit', 'delete'].map(action => (
                      <td key={action} style={STYLES.td}>
                        <input type="checkbox" style={STYLES.checkbox}
                          checked={permissions[module]?.[action] || false}
                          onChange={() => handleToggle(module, action)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ TAB 3: Role Templates ============
function RoleTemplates({ dbRun, addNotification }) {
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await window.electronAPI?.db?.all('SELECT id, username, display_name FROM users ORDER BY username ASC') || [];
        setUsers(data || []);
      } catch {}
    })();
  }, []);

  const applyTemplate = async (templateKey) => {
    if (!selectedUser) { setError('Please select a user first'); return; }

    setSaving(templateKey);
    setError(null);
    setSuccess(null);

    try {
      const template = ROLE_TEMPLATES[templateKey];
      if (!template) { setError('Invalid template'); setSaving(null); return; }

      const perms = template.getPermissions();
      const dbRunFn = window.electronAPI?.db?.run || (async () => {});

      await dbRunFn('DELETE FROM user_permissions WHERE user_id = ?', [selectedUser]);
      for (const module of MODULES) {
        const p = perms[module];
        if (p.view || p.create || p.edit || p.delete) {
          await dbRunFn(
            `INSERT INTO user_permissions (user_id, module, can_view, can_create, can_edit, can_delete)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [selectedUser, module, p.view ? 1 : 0, p.create ? 1 : 0, p.edit ? 1 : 0, p.delete ? 1 : 0]
          );
        }
      }

      setSuccess(`"${template.label}" template applied successfully!`);
      if (addNotification) addNotification(`Applied ${template.label} template`, 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div>
      <div style={STYLES.card}>
        <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600 }}>Role Permission Templates</h3>
        <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#666' }}>
          Apply pre-defined permission templates to quickly set up user access
        </p>

        <div style={{ marginBottom: '20px' }}>
          <label style={STYLES.label}>Apply Template To</label>
          <select style={STYLES.select} value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
            <option value="">Choose a user...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.username} {u.display_name ? `(${u.display_name})` : ''}</option>
            ))}
          </select>
        </div>

        {error && <div style={STYLES.error}>{error}</div>}
        {success && <div style={STYLES.success}>{success}</div>}

        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {Object.entries(ROLE_TEMPLATES).map(([key, template]) => (
            <div key={key} style={{
              ...STYLES.card, marginBottom: 0, cursor: 'pointer',
              padding: '24px', transition: 'all 0.2s',
              border: `1px solid ${saving === key ? '#4a6cf7' : '#2d2d44'}`,
            }} onClick={() => applyTemplate(key)}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                {template.label}
              </div>
              <div style={{ fontSize: '13px', color: '#888', marginBottom: '16px' }}>
                {template.description}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                {Object.entries(template.getPermissions()).filter(([, p]) => p.view || p.create).map(([module]) => (
                  <span key={module} style={{
                    padding: '2px 8px', borderRadius: '8px', fontSize: '11px',
                    backgroundColor: '#1a2a4a', color: '#4a6cf7', border: '1px solid #2a3a6a',
                  }}>{module}</span>
                ))}
              </div>
              <button style={{
                ...STYLES.btn, width: '100%', textAlign: 'center',
                opacity: saving === key ? 0.6 : 1,
              }} disabled={saving === key || !selectedUser}>
                {saving === key ? 'Applying...' : 'Apply Template'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ checkPermissions Utility ============
export async function checkPermissions(dbQuery, userId, moduleName, action) {
  if (!userId || !moduleName || !action) return false;
  try {
    const result = await dbQuery(
      `SELECT can_${action} FROM user_permissions WHERE user_id = ? AND module = ?`,
      [userId, moduleName]
    );
    if (result && result[0] && result[0][`can_${action}`]) return true;

    // Fallback: check if user is admin/superadmin
    const user = await dbQuery('SELECT role FROM users WHERE id = ?', [userId]);
    if (user && user[0] && (user[0].role === 'admin' || user[0].role === 'superadmin')) return true;

    return false;
  } catch {
    return false;
  }
}

// ============ MAIN COMPONENT ============
export default function PermissionsModule() {
  const [activeTab, setActiveTab] = useState(0);
  const appCtx = useContext(AppContext);
  const authCtx = useContext(AuthContext);

  const dbQuery = appCtx?.dbQuery || window.electronAPI?.db?.all || (async () => []);
  const dbRun = appCtx?.dbRun || window.electronAPI?.db?.run || (async () => {});
  const addNotification = appCtx?.addNotification || (() => {});

  const tabs = ['Users List', 'Module Permissions', 'Role Templates'];

  return (
    <div style={STYLES.container}>
      <div style={{ marginBottom: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#fff' }}>Permissions Management</h2>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#888' }}>Manage user roles and module-level access control</p>
      </div>

      <div style={STYLES.tabs}>
        {tabs.map((tab, i) => (
          <button key={tab} style={STYLES.tab(activeTab === i)} onClick={() => setActiveTab(i)}>
            {tab}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 0 && <UsersList dbQuery={dbQuery} />}
        {activeTab === 1 && <ModulePermissions dbQuery={dbQuery} dbRun={dbRun} addNotification={addNotification} />}
        {activeTab === 2 && <RoleTemplates dbRun={dbRun} addNotification={addNotification} />}
      </div>
    </div>
  );
}

export { MODULES, ROLE_TEMPLATES };
