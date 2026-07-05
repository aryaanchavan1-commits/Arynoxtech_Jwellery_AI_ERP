import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';

const LICENSE_REGEX = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/;
const TRIAL_DAYS = 30;

function generateHardwareId() {
  try {
    return btoa(navigator.userAgent + screen.width + screen.height).slice(0, 20);
  } catch {
    return 'unknown';
  }
}

export default function LicenseManager() {
  const { addNotification } = useContext(AppContext);
  const [licenseKey, setLicenseKey] = useState('');
  const [status, setStatus] = useState('loading');
  const [daysLeft, setDaysLeft] = useState(TRIAL_DAYS);
  const [hardwareId, setHardwareId] = useState('');
  const [activatedKey, setActivatedKey] = useState('');
  const [firstRun, setFirstRun] = useState(null);

  useEffect(() => {
    setHardwareId(generateHardwareId());
    loadLicenseStatus();
  }, []);

  const loadLicenseStatus = async () => {
    try {
      const config = await window.electronAPI.config.get();
      const lic = config.license || {};
      const now = Date.now();

      if (lic.activated && lic.key && lic.expiry) {
        setActivatedKey(lic.key);
        if (now < lic.expiry) {
          const days = Math.max(0, Math.floor((lic.expiry - now) / 86400000));
          setDaysLeft(days);
          setStatus('active');
          return;
        } else {
          setStatus('expired');
          return;
        }
      }

      const fr = lic.firstRun || now;
      if (!lic.firstRun) {
        await window.electronAPI.config.set({ license: { ...lic, firstRun: now } });
      }
      setFirstRun(fr);
      const elapsed = Math.floor((now - fr) / 86400000);
      const remaining = Math.max(0, TRIAL_DAYS - elapsed);
      setDaysLeft(remaining);
      setStatus(remaining > 0 ? 'trial' : 'expired');
    } catch {
      setStatus('trial');
      setDaysLeft(TRIAL_DAYS);
    }
  };

  const handleActivate = async () => {
    const key = licenseKey.trim().toUpperCase();
    if (!LICENSE_REGEX.test(key)) {
      addNotification('Invalid license key format. Use XXXXX-XXXXX-XXXXX-XXXXX-XXXXX', 'error');
      return;
    }
    try {
      const config = await window.electronAPI.config.get();
      const lic = config.license || {};
      const expiry = Date.now() + 365 * 86400000;

      await window.electronAPI.config.set({
        license: {
          ...lic,
          key,
          activated: true,
          expiry,
          hardwareId,
          activatedAt: Date.now()
        }
      });

      setActivatedKey(key);
      setStatus('active');
      setDaysLeft(365);
      addNotification('License activated successfully!', 'success');
    } catch (e) {
      addNotification('Activation failed: ' + e.message, 'error');
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'active': return <span className="badge badge-success">✅ Active</span>;
      case 'trial': return <span className="badge badge-warning">🔸 Trial ({daysLeft}d left)</span>;
      case 'expired': return <span className="badge badge-danger">❌ Expired</span>;
      default: return <span className="badge badge-info">⏳ Loading...</span>;
    }
  };

  return (
    <div>
      <h3 style={{ marginBottom: 20 }}>🔐 License Management</h3>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <h4>License Status</h4>
          {getStatusBadge()}
        </div>

        {status === 'active' && (
          <div style={{ padding: 16, background: 'rgba(34,197,94,0.1)', borderRadius: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--accent-green)', marginBottom: 4 }}>
              ✅ Licensed — {daysLeft} days remaining
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Key: {activatedKey.slice(0, 14)}...-{activatedKey.slice(-4)}
            </div>
          </div>
        )}

        {status === 'trial' && (
          <div style={{ padding: 16, background: 'rgba(245,158,11,0.1)', borderRadius: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--accent-orange)', marginBottom: 4 }}>
              🔸 Trial Mode — {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Enter a valid license key to activate the full version.
            </div>
          </div>
        )}

        {status === 'expired' && (
          <div style={{ padding: 16, background: 'rgba(239,68,68,0.1)', borderRadius: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--accent-red)', marginBottom: 4 }}>
              ❌ License Expired
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Please activate with a valid license key to continue using the software.
            </div>
          </div>
        )}

        <div style={{ padding: 12, background: 'var(--bg-primary)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Hardware ID</div>
          <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)', userSelect: 'all' }}>{hardwareId}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h4 style={{ marginBottom: 12 }}>
          {status === 'active' ? 'Change License Key' : 'Activate License'}
        </h4>
        <div className="form-group">
          <label className="form-label">License Key</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="form-input"
              style={{ fontFamily: 'monospace', textTransform: 'uppercase', flex: 1 }}
              value={licenseKey}
              onChange={e => setLicenseKey(e.target.value.toUpperCase())}
              placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
              maxLength={29}
            />
            <button className="btn btn-primary" onClick={handleActivate} disabled={!licenseKey.trim()}>
              Activate
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Format: 5 groups of 5 uppercase alphanumeric characters separated by dashes
          </div>
        </div>
      </div>

      <div className="card">
        <h4 style={{ marginBottom: 8 }}>📋 License Terms</h4>
        <ul style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 2, paddingLeft: 16 }}>
          <li>Each license is valid for one installation only</li>
          <li>License is tied to the generated Hardware ID</li>
          <li>Annual license — renew after 365 days</li>
          <li>30-day free trial available for new users</li>
        </ul>
      </div>
    </div>
  );
}
