import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';

export default function HRModule() {
  const { setPageTitle, formatCurrency, dbQuery, dbRun, addNotification } = useContext(AppContext);
  const [tab, setTab] = useState('employees');
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', type: 'Staff', phone: '', email: '', commission_percent: 0, salary: 0 });

  useEffect(() => { setPageTitle('HR & Payroll'); loadData(); }, []);

  const loadData = () => { dbQuery('SELECT * FROM employees ORDER BY name').then(setEmployees); };

  const handleSubmit = async () => {
    if (!form.code || !form.name) return;
    const id = crypto.randomUUID();
    await dbRun('INSERT INTO employees (id,code,name,type,phone,email,commission_percent,salary) VALUES (?,?,?,?,?,?,?,?)', [id, form.code, form.name, form.type, form.phone, form.email, form.commission_percent, form.salary]);
    addNotification('Employee added', 'success');
    setShowForm(false);
    setForm({ code: '', name: '', type: 'Staff', phone: '', email: '', commission_percent: 0, salary: 0 });
    loadData();
  };

  const tabs = [
    { id: 'employees', label: '👤 Employees' },
    { id: 'attendance', label: '📅 Attendance' },
    { id: 'salary', label: '💰 Payroll' },
    { id: 'commission', label: '📊 Commission' },
  ];

  const ActiveTab = tab === 'employees' ? (
    <div>
      <div className="toolbar"><div className="toolbar-right"><button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Employee</button></div></div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">➕ New Employee</div><button className="title-btn close" onClick={() => setShowForm(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label className="form-label">Employee Code</label><input className="form-input" value={form.code} onChange={e => setForm({...form, code: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Type</label><select className="form-input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option>Staff</option><option>Salesman</option><option>Karagir</option><option>Admin</option><option>Manager</option></select></div>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Commission %</label><input type="number" step="0.1" className="form-input" value={form.commission_percent} onChange={e => setForm({...form, commission_percent: parseFloat(e.target.value) || 0})} /></div>
                <div className="form-group"><label className="form-label">Monthly Salary</label><input type="number" className="form-input" value={form.salary} onChange={e => setForm({...form, salary: parseFloat(e.target.value) || 0})} /></div>
              </div>
              <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit}>Save Employee</button></div>
          </div>
        </div>
      )}

      <div className="card">
        <table><thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Phone</th><th>Commission</th><th>Salary</th><th>Status</th></tr></thead>
        <tbody>{employees.map(e => <tr key={e.id}><td><strong>{e.code}</strong></td><td>{e.name}</td><td><span className="badge badge-purple">{e.type}</span></td><td>{e.phone || '-'}</td><td>{e.commission_percent || 0}%</td><td>{formatCurrency(e.salary)}</td><td><span className={`badge ${e.is_active ? 'badge-success' : 'badge-danger'}`}>{e.is_active ? 'Active' : 'Inactive'}</span></td></tr>)}</tbody></table>
      </div>
    </div>
  ) : (
    <div className="card">
      <div className="empty-state"><div className="empty-state-icon">📅</div><div className="empty-state-text">{tab === 'attendance' ? 'Attendance Module' : tab === 'salary' ? 'Payroll Module' : 'Commission Tracking'} coming soon</div></div>
    </div>
  );

  return (
    <div>
      <div className="tabs">{tabs.map(t => <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>
      {ActiveTab}
    </div>
  );
}
