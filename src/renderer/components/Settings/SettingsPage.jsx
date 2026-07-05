import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { AuthContext } from '../../contexts/AuthContext';
import LicenseManager from './LicenseManager';

export default function SettingsPage() {
  const { setPageTitle, addNotification } = useContext(AppContext);
  const { user, changePassword } = useContext(AuthContext);
  const [tab, setTab] = useState('general');
  const [config, setConfig] = useState({
    groqApiKey: '', tursoUrl: '', tursoToken: '', aiModel: 'llama-4-scout-17b-16e-instruct',
    companyName: '', gstin: '', phone: '', email: '', address: '',
    goldRate: 0, currency: 'INR'
  });
  const [passwords, setPasswords] = useState({
    whiteOld: '', whiteNew: '', whiteConfirm: '',
    blackOld: '', blackNew: '', blackConfirm: '',
    superOld: '', superNew: '', superConfirm: ''
  });
  const [saved, setSaved] = useState(false);
  const [dbInfo, setDbInfo] = useState(null);
  const [backupResult, setBackupResult] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null);
  const [updateStatus, setUpdateStatus] = useState({ status: 'idle' });

  useEffect(() => {
    const cleanup = window.electronAPI?.app?.onUpdateStatus?.(data => setUpdateStatus(data));
    return () => { if (cleanup) cleanup(); };
  }, []);

  const checkForUpdates = async () => {
    setUpdateStatus({ status: 'checking' });
    try {
      await window.electronAPI.app.checkUpdate();
    } catch(e) {
      setUpdateStatus({ status: 'error', error: e.message });
    }
  };

  useEffect(() => {
    loadDbInfo();
  }, []);

  const loadDbInfo = async () => {
    try { setDbInfo(await window.electronAPI.backup.info()); } catch(e) {}
  };

  useEffect(() => {
    setPageTitle('Settings');
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await window.electronAPI.config.get();
      if (cfg) setConfig(prev => ({ ...prev, ...cfg }));
    } catch (e) {}
  };

  const saveConfig = async () => {
    try {
      await window.electronAPI.config.set(config);
      setSaved(true);
      addNotification('Settings saved successfully', 'success');
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      addNotification('Error saving settings: ' + e.message, 'error');
    }
  };

  const handleChangePassword = async (acctType) => {
    const p = passwords;
    if (acctType === 'white') {
      if (p.whiteNew !== p.whiteConfirm) { addNotification('Passwords do not match', 'error'); return; }
      const result = await changePassword(p.whiteOld, p.whiteNew);
      if (!result.success) addNotification(result.error || 'Password change failed', 'error');
      else addNotification('White account password changed', 'success');
    } else if (acctType === 'black') {
      if (p.blackNew !== p.blackConfirm) { addNotification('Passwords do not match', 'error'); return; }
      const result = await changePassword(p.blackOld, p.blackNew);
      if (!result.success) addNotification(result.error || 'Password change failed', 'error');
      else addNotification('Black account password changed', 'success');
    }
  };

  const handleBackup = async () => {
    try {
      setBackupResult(null);
      const result = await window.electronAPI.backup.create();
      if (result.success) {
        const sizeKB = (result.size / 1024).toFixed(1);
        const pendingInfo = result.info?.pendingSync > 0 ? ` (${result.info.pendingSync} unsynced changes included)` : '';
        setBackupResult({ type: 'success', msg: `✅ Backup saved (${sizeKB} KB, ${result.info?.tableCount || 0} tables${pendingInfo})` });
        addNotification('Backup created successfully', 'success');
        loadDbInfo();
      }
    } catch (e) {
      setBackupResult({ type: 'error', msg: 'Backup failed: ' + e.message });
      addNotification('Backup failed: ' + e.message, 'error');
    }
  };

  const handleSeedDemo = async () => {
    if (!confirm('This will load demo data (items, parties, categories, ledgers, employees, metal rates) into the database. Only do this on a fresh installation. Continue?')) return;
    setSeeding(true);
    setSeedResult(null);
    try {
      const result = await window.electronAPI.seed.demo();
      if (result.success) {
        setSeedResult({ type: 'success', msg: `✅ Demo data loaded: ${result.counts.items} items, ${result.counts.parties} parties, ${result.counts.categories} categories, ${result.counts.ledgers} ledgers, ${result.counts.employees} employees` });
        addNotification('Demo data loaded successfully', 'success');
        loadDbInfo();
      } else {
        setSeedResult({ type: 'error', msg: '❌ ' + result.error });
        addNotification('Failed to load demo data: ' + result.error, 'error');
      }
    } catch (e) {
      setSeedResult({ type: 'error', msg: '❌ Seed failed: ' + e.message });
      addNotification('Seed failed: ' + e.message, 'error');
    }
    setSeeding(false);
  };

  const handleRestore = async () => {
    if (confirm('⚠️ Restore will overwrite ALL current data and reload the app. Make sure you have a current backup first. Continue?')) {
      try {
        setBackupResult(null);
        const result = await window.electronAPI.backup.restore();
        if (result.success) {
          const sizeKB = (result.size / 1024).toFixed(1);
          setBackupResult({ type: 'success', msg: `✅ Backup restored (${sizeKB} KB). App data reloaded. Sync queue reset - run a full sync to reconcile with server.` });
          addNotification('Backup restored successfully. Data reloaded.', 'success');
          loadDbInfo();
        } else {
          setBackupResult({ type: 'error', msg: 'Restore failed: ' + (result.error || 'Unknown error') });
        }
      } catch (e) {
        setBackupResult({ type: 'error', msg: 'Restore failed: ' + e.message });
        addNotification('Restore failed: ' + e.message, 'error');
      }
    }
  };

  const menuItems = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'ai', label: 'AI Configuration', icon: '🤖' },
    { id: 'database', label: 'Database', icon: '🗄️' },
    { id: 'passwords', label: 'Passwords', icon: '🔒' },
    { id: 'backup', label: 'Backup & Restore', icon: '💾' },
    { id: 'email', label: 'Email', icon: '📧' },
    { id: 'demodata', label: 'Demo Data', icon: '🧪' },
    { id: 'license', label: 'License', icon: '🔐' },
    { id: 'theme', label: 'Appearance', icon: '🎨' },
    { id: 'about', label: 'About', icon: 'ℹ️' },
  ];

  return (
    <div className="settings-grid">
      <div className="settings-nav">
        {menuItems.map(item => (
          <div
            key={item.id}
            className={`settings-nav-item ${tab === item.id ? 'active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {item.icon} {item.label}
          </div>
        ))}
      </div>

      <div className="settings-content">
        {tab === 'general' && (
          <div>
            <h3 style={{ marginBottom: 20 }}>General Settings</h3>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input className="form-input" value={config.companyName} onChange={e => setConfig({...config, companyName: e.target.value})} placeholder="Your Jewellery Shop Name" />
              </div>
              <div className="form-group">
                <label className="form-label">GSTIN</label>
                <input className="form-input" value={config.gstin} onChange={e => setConfig({...config, gstin: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={config.phone} onChange={e => setConfig({...config, phone: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-input" value={config.email} onChange={e => setConfig({...config, email: e.target.value})} />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Address</label>
                <textarea className="form-input" rows={3} value={config.address} onChange={e => setConfig({...config, address: e.target.value})} />
              </div>
            </div>
            <button className="btn btn-primary" onClick={saveConfig}>Save Settings</button>
          </div>
        )}

        {tab === 'ai' && (
          <div>
            <h3 style={{ marginBottom: 20 }}>AI Configuration</h3>
            <p style={{ color: '#94a3b8', marginBottom: 16, fontSize: 13 }}>
              Configure your Groq API key to enable the AI Assistant with 2026 models.
              Get your free API key from <a href="https://console.groq.com" style={{ color: '#f59e0b' }} target="_blank">console.groq.com</a>
            </p>
            <div className="form-group">
              <label className="form-label">Groq API Key</label>
              <input
                type="password"
                className="form-input"
                value={config.groqApiKey}
                onChange={e => setConfig({...config, groqApiKey: e.target.value})}
                placeholder="gsk_..."
                style={{ fontFamily: 'monospace' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Default AI Model (2026)</label>
              <select className="form-input" value={config.aiModel} onChange={e => setConfig({...config, aiModel: e.target.value})}>
                <option value="llama-4-scout-17b-16e-instruct">Llama 4 Scout 17B (Latest 2026)</option>
                <option value="llama-4-maverick-17b-128e-instruct">Llama 4 Maverick 17B (Latest 2026)</option>
                <option value="llama-3.3-70b-versatile">Llama 3.3 70B</option>
                <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                <option value="deepseek-r1-distill-llama-70b">DeepSeek R1 70B</option>
                <option value="qwen-2.5-32b">Qwen 2.5 32B</option>
              </select>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                Llama 4 Scout/Maverick are the latest 2026 models with enhanced capabilities
              </div>
            </div>
            <button className="btn btn-primary" onClick={saveConfig}>Save AI Settings</button>
          </div>
        )}

        {tab === 'database' && (
          <div>
            <h3 style={{ marginBottom: 20 }}>Database Configuration</h3>
            <h4 style={{ color: '#94a3b8', marginBottom: 12, fontSize: 13 }}>Online Database (Turso.tech)</h4>
            <div className="form-group">
              <label className="form-label">Turso Database URL</label>
              <input className="form-input" value={config.tursoUrl} onChange={e => setConfig({...config, tursoUrl: e.target.value})} placeholder="libsql://your-db.turso.io" />
            </div>
            <div className="form-group">
              <label className="form-label">Turso Auth Token</label>
              <input type="password" className="form-input" value={config.tursoToken} onChange={e => setConfig({...config, tursoToken: e.target.value})} placeholder="Your Turso token" />
            </div>
            <div style={{ padding: 12, background: '#0f172a', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>Offline Database (Local SQLite)</div>
              <div style={{ fontSize: 12, color: '#22c55e' }}>✅ SQLite is active and running locally</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Data is stored locally on your machine. Online sync via Turso is optional.</div>
            </div>
            <button className="btn btn-primary" onClick={saveConfig}>Save Database Settings</button>
          </div>
        )}

        {tab === 'passwords' && (
          <div>
            <h3 style={{ marginBottom: 20 }}>Change Passwords</h3>
            <p style={{ color: '#94a3b8', marginBottom: 16, fontSize: 13 }}>
              Change passwords for White and Black accounts. Default passwords are changeable from here.
            </p>

            <div className="card" style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 12 }}>🤍 White Account</h4>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input type="password" className="form-input" value={passwords.whiteOld} onChange={e => setPasswords({...passwords, whiteOld: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input type="password" className="form-input" value={passwords.whiteNew} onChange={e => setPasswords({...passwords, whiteNew: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New</label>
                  <input type="password" className="form-input" value={passwords.whiteConfirm} onChange={e => setPasswords({...passwords, whiteConfirm: e.target.value})} />
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => handleChangePassword('white')}>Change White Password</button>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 12 }}>🖤 Black Account</h4>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input type="password" className="form-input" value={passwords.blackOld} onChange={e => setPasswords({...passwords, blackOld: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input type="password" className="form-input" value={passwords.blackNew} onChange={e => setPasswords({...passwords, blackNew: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New</label>
                  <input type="password" className="form-input" value={passwords.blackConfirm} onChange={e => setPasswords({...passwords, blackConfirm: e.target.value})} />
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => handleChangePassword('black')}>Change Black Password</button>
            </div>
          </div>
        )}

        {tab === 'backup' && (
          <div>
            <h3 style={{ marginBottom: 20 }}>Backup & Restore</h3>
            <p style={{ color: '#94a3b8', marginBottom: 16, fontSize: 13 }}>
              Create backups of your entire database or restore from a previous backup.
              Backups include all data including sync state.
            </p>

            <div className="card" style={{ marginBottom: 16, padding: 16 }}>
              <h4 style={{ marginBottom: 8 }}>📊 Current Database Info</h4>
              {dbInfo ? (
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  <div className="stat-card">
                    <div className="stat-value">{(dbInfo.size / 1024).toFixed(1)} KB</div>
                    <div className="stat-label">Size</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{dbInfo.tableCount}</div>
                    <div className="stat-label">Tables</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{dbInfo.recordCount}</div>
                    <div className="stat-label">Total Records</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value" style={{ color: dbInfo.pendingSync > 0 ? '#f59e0b' : '#22c55e' }}>
                      {dbInfo.pendingSync}
                    </div>
                    <div className="stat-label">Unsynced Changes</div>
                  </div>
                </div>
              ) : <div className="loading-spinner" />}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div className="card" style={{ flex: 1, cursor: 'pointer' }} onClick={handleBackup}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>💾</div>
                <h4>Create Backup</h4>
                <p style={{ color: '#94a3b8', fontSize: 12 }}>Choose location and save a backup file of your entire database</p>
              </div>
              <div className="card" style={{ flex: 1, cursor: 'pointer' }} onClick={handleRestore}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
                <h4>Restore Backup</h4>
                <p style={{ color: '#94a3b8', fontSize: 12 }}>Select a backup file to restore. App will reload automatically.</p>
              </div>
            </div>

            {backupResult && (
              <div className={`notification-item ${backupResult.type}`} style={{ marginTop: 12 }}>
                {backupResult.msg}
              </div>
            )}
          </div>
        )}

        {tab === 'email' && (
          <div>
            <h3 style={{ marginBottom: 20 }}>Email Configuration</h3>
            <p style={{ color: '#94a3b8', marginBottom: 16, fontSize: 13 }}>
              Configure SMTP to send invoices and reports via email.
            </p>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">SMTP Host</label>
                <input className="form-input" value={config.smtpHost || ''} onChange={e => setConfig({...config, smtpHost: e.target.value})} placeholder="smtp.gmail.com" />
              </div>
              <div className="form-group">
                <label className="form-label">SMTP Port</label>
                <input className="form-input" value={config.smtpPort || '587'} onChange={e => setConfig({...config, smtpPort: e.target.value})} placeholder="587" />
              </div>
              <div className="form-group">
                <label className="form-label">SMTP Username</label>
                <input className="form-input" value={config.smtpUser || ''} onChange={e => setConfig({...config, smtpUser: e.target.value})} placeholder="your@email.com" />
              </div>
              <div className="form-group">
                <label className="form-label">SMTP Password</label>
                <input type="password" className="form-input" value={config.smtpPass || ''} onChange={e => setConfig({...config, smtpPass: e.target.value})} />
              </div>
            </div>
            <button className="btn btn-primary" onClick={saveConfig}>Save Email Settings</button>
          </div>
        )}

        {tab === 'demodata' && (
          <div>
            <h3 style={{ marginBottom: 20 }}>Demo Data</h3>
            <p style={{ color: '#94a3b8', marginBottom: 16, fontSize: 13 }}>
              Load sample data into the database for evaluation and testing purposes.
              This will populate items, parties, categories, ledgers, employees, and metal rates.
            </p>

            <div className="card" style={{ marginBottom: 16, padding: 16 }}>
              <h4 style={{ marginBottom: 8 }}>📊 Database Status</h4>
              {dbInfo ? (
                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                  <div>Records: <strong>{dbInfo.recordCount}</strong></div>
                  <div>Tables: <strong>{dbInfo.tableCount}</strong></div>
                </div>
              ) : <div className="loading-spinner" />}
            </div>

            {(!dbInfo || dbInfo.recordCount === 0) ? (
              <div>
                <button className="btn btn-warning" onClick={handleSeedDemo} disabled={seeding}>
                  {seeding ? '⏳ Loading Demo Data...' : '🧪 Load Demo Data'}
                </button>
                <p style={{ color: '#64748b', fontSize: 11, marginTop: 8 }}>
                  This will insert sample data for demonstration purposes.
                </p>
              </div>
            ) : (
              <div className="card" style={{ background: '#1e293b' }}>
                <p style={{ color: '#f59e0b', fontSize: 13 }}>
                  ⚠️ Database already has data ({dbInfo.recordCount} records). 
                  Clear the database or use a fresh installation before loading demo data.
                </p>
              </div>
            )}

            {seedResult && (
              <div className={`notification-item ${seedResult.type}`} style={{ marginTop: 12 }}>
                {seedResult.msg}
              </div>
            )}
          </div>
        )}

        {tab === 'theme' && (
          <div>
            <h3 style={{ marginBottom: 20 }}>Appearance</h3>
            <div className="form-group">
              <label className="form-label">Theme</label>
              <select className="form-input" value="dark" style={{ maxWidth: 300 }}>
                <option value="dark">Dark Mode (Default)</option>
                <option value="light">Light Mode</option>
                <option value="gold">Gold Premium</option>
              </select>
            </div>
            <div className="card" style={{ marginTop: 16 }}>
              <h4 style={{ marginBottom: 8 }}>Preview</h4>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ width: 40, height: 40, background: '#0f172a', borderRadius: 8, border: '2px solid #334155' }}></div>
                <div style={{ width: 40, height: 40, background: '#f8fafc', borderRadius: 8, border: '2px solid #e2e8f0' }}></div>
                <div style={{ width: 40, height: 40, background: '#1a1a2e', borderRadius: 8, border: '2px solid #f59e0b' }}></div>
              </div>
            </div>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={saveConfig}>Save Theme</button>
          </div>
        )}

        {tab === 'license' && <LicenseManager />}

        {tab === 'about' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 80, height: 80, background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                borderRadius: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 36, fontWeight: 'bold', color: '#0f172a', marginBottom: 16
              }}>A</div>
              <h2 style={{ color: '#f59e0b', marginBottom: 4 }}>Arynoxtech Jwellery ERP</h2>
              <p style={{ color: '#94a3b8' }}>Version 2.0.0</p>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 8 }}>🔄 Updates</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={checkForUpdates} disabled={updateStatus.status === 'checking' || updateStatus.status === 'downloading'}>
                  {updateStatus.status === 'checking' ? '⏳ Checking...' : '🔍 Check for Updates'}
                </button>
                {updateStatus.status === 'downloading' && (
                  <span style={{ color: '#f59e0b', fontSize: 13 }}>
                    Downloading... {updateStatus.percent || 0}%
                  </span>
                )}
                {updateStatus.status === 'downloaded' && (
                  <button className="btn btn-success btn-sm" onClick={async () => { await window.electronAPI.app.installUpdate(); }}>
                    🔄 Restart & Install
                  </button>
                )}
                {updateStatus.status === 'up-to-date' && (
                  <span style={{ color: '#22c55e', fontSize: 13 }}>✅ You have the latest version</span>
                )}
                {updateStatus.status === 'error' && (
                  <span style={{ color: '#ef4444', fontSize: 13 }}>⚠️ {updateStatus.error || 'Update check failed'}</span>
                )}
              </div>
              <p style={{ color: '#64748b', fontSize: 11 }}>
                Updates are delivered via GitHub Releases. Auto-update is enabled — the app will check for updates on startup.
              </p>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 8 }}>📋 About</h4>
              <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
                The best ever Software Product developed for Jewellery stores. This software covers everything
                from Stock Management to all transactions like Sales Retail, Wholesale, Karagir Nave & Jama,
                Purchase & Returns, and complete Accounting.
              </p>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 8 }}>✨ Key Features</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, color: '#94a3b8' }}>
                <div>• Stock & Inventory Management</div>
                <div>• Sales (Retail/Wholesale)</div>
                <div>• Karagir Nave/Jama</div>
                <div>• Purchase & Returns</div>
                <div>• Full Accounting</div>
                <div>• AI Assistant (Groq 2026)</div>
                <div>• Dual Account System</div>
                <div>• Turso Online Sync</div>
                <div>• Offline SQLite DB</div>
                <div>• Barcode Management</div>
                <div>• Tray/Shelf Tracking</div>
                <div>• Gold Saving Scheme</div>
                <div>• MIS Reports</div>
                <div>• Backup & Restore</div>
              </div>
            </div>

            <div className="card">
              <h4 style={{ marginBottom: 8 }}>🔧 Tech Stack</h4>
              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.8 }}>
                • Electron + React (Desktop Application)
                • SQLite (Offline Database)
                • Turso.tech (Online Database)
                • Groq API (AI - 2026 Models)
                • Chart.js (Graphs & Reports)
              </div>
            </div>
          </div>
        )}

        {saved && (
          <div style={{
            position: 'fixed', bottom: 20, right: 20,
            background: '#22c55e', color: '#0f172a',
            padding: '12px 20px', borderRadius: 8,
            fontWeight: 600, fontSize: 14
          }}>
            ✅ Settings saved successfully
          </div>
        )}
      </div>
    </div>
  );
}
