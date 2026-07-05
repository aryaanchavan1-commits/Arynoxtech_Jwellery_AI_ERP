import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(username, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo">
          <div className="login-logo-icon">A</div>
          <div className="login-title">Arynoxtech Jwellery ERP</div>
          <div className="login-subtitle">The Best Jewellery Store Management Software</div>
        </div>

        <div className="form-group">
          <label className="form-label">Username</label>
          <input type="text" className="form-input" value={username}
            onChange={e => setUsername(e.target.value)} placeholder="Enter username" required />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input type="password" className="form-input" value={password}
            onChange={e => setPassword(e.target.value)} placeholder="Enter password" required />
        </div>

        {error && <div className="error-msg" style={{ marginBottom: 12 }}>{error}</div>}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <div style={{ marginTop: 16, fontSize: 10, color: '#64748b', lineHeight: 1.8, textAlign: 'left', padding: '8px 12px', background: '#1e293b', borderRadius: 8 }}>
          <div style={{ color: '#f59e0b', fontSize: 11, marginBottom: 4 }}>Account Types (Jewellery Shop):</div>
          <div>👑 <strong>superadmin</strong> / super@123 — <span style={{ color: '#10b981' }}>Full access, sees both White + Black books</span></div>
          <div>📘 <strong>admin</strong> / admin@123 — <span style={{ color: '#3b82f6' }}>White Account — Legal/GST books, taxable sales only</span></div>
          <div>📕 <strong>black</strong> / black@123 — <span style={{ color: '#ef4444' }}>Black Account — Actual business, cash/gold-on-loan</span></div>
        </div>
      </form>
    </div>
  );
}
