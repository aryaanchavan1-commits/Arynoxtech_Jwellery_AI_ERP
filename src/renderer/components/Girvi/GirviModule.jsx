import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { AuthContext } from '../../contexts/AuthContext';
import Autocomplete, { PURITY_OPTIONS } from '../Common/Autocomplete';

const HINDI_MONTHS = ['Chaitra', 'Vaishakh', 'Jyeshtha', 'Ashadh', 'Shravan', 'Bhadrapada', 'Ashwin', 'Kartik', 'Margashirsha', 'Pausha', 'Magha', 'Phalguna'];
const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'new-pledge', label: 'New Pledge' },
  { id: 'interest', label: 'Interest Calculator' },
  { id: 'receipts', label: 'Receipts & History' },
  { id: 'huid', label: 'HUID History' },
];

export default function GirviModule() {
  const { setPageTitle, dbRun } = useContext(AppContext);
  const [tab, setTab] = useState('dashboard');

  useEffect(() => {
    setPageTitle('Girvi Module');
    dbRun(`CREATE TABLE IF NOT EXISTS huid_history (
      id TEXT PRIMARY KEY, huid TEXT NOT NULL, pledge_id TEXT NOT NULL,
      action TEXT NOT NULL, date DATE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  }, []);

  return (
    <div>
      <div className="tabs">{TABS.map(t => <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>
      {tab === 'dashboard' && <DashboardSection />}
      {tab === 'new-pledge' && <NewPledgeSection />}
      {tab === 'interest' && <InterestCalculatorSection />}
      {tab === 'receipts' && <ReceiptsSection />}
      {tab === 'huid' && <HUIDHistorySection />}
    </div>
  );
}

function DashboardSection() {
  const { dbQuery, dbRun, formatCurrency, addNotification } = useContext(AppContext);
  const [pledges, setPledges] = useState([]);
  const [stats, setStats] = useState({ totalActive: 0, totalLoanAmount: 0, totalInterestReceived: 0, overdueCount: 0 });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const active = await dbQuery(`SELECT gp.*, p.name as customer_name, p.phone as customer_phone FROM girvi_pledges gp LEFT JOIN parties p ON gp.customer_id=p.id WHERE gp.status='active' ORDER BY gp.created_at DESC`);
    setPledges(active);
    setStats({
      totalActive: active.length,
      totalLoanAmount: active.reduce((s, r) => s + (r.loan_amount || 0), 0),
      totalInterestReceived: active.reduce((s, r) => s + (r.interest_received || 0), 0),
      overdueCount: active.filter(r => r.maturity_date && r.maturity_date < new Date().toISOString().split('T')[0]).length,
    });
    setLoading(false);
  }, [dbQuery]);

  useEffect(() => { loadData(); }, [loadData]);

  const today = new Date().toISOString().split('T')[0];

  const getRowStyle = (pledge) => {
    if (!pledge.maturity_date) return {};
    const daysLeft = Math.ceil((new Date(pledge.maturity_date) - new Date(today)) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { background: 'rgba(239,68,68,0.08)' };
    if (daysLeft <= 30) return { background: 'rgba(245,158,11,0.08)' };
    return {};
  };

  if (loading) return <div className="loading-spinner" />;

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon gold">📋</div><div className="stat-content"><div className="stat-value">{stats.totalActive}</div><div className="stat-label">Active Pledges</div></div></div>
        <div className="stat-card"><div className="stat-icon blue">💰</div><div className="stat-content"><div className="stat-value">{formatCurrency(stats.totalLoanAmount)}</div><div className="stat-label">Total Loan Amount</div></div></div>
        <div className="stat-card"><div className="stat-icon green">📈</div><div className="stat-content"><div className="stat-value">{formatCurrency(stats.totalInterestReceived)}</div><div className="stat-label">Interest Received</div></div></div>
        <div className="stat-card"><div className="stat-icon red">⚠️</div><div className="stat-content"><div className="stat-value" style={{ color: stats.overdueCount > 0 ? '#ef4444' : 'inherit' }}>{stats.overdueCount}</div><div className="stat-label">Overdue Pledges</div></div></div>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Pledge No</th><th>Customer</th><th>Date</th><th>Loan Amount</th><th>Rate</th><th>Weight</th><th>Purity</th><th>Maturity Date</th><th>Status</th><th>Days Left</th></tr></thead>
          <tbody>{pledges.length === 0 ? <tr><td colSpan={10} style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>No active pledges found</td></tr> : pledges.map(p => {
            const daysLeft = p.maturity_date ? Math.ceil((new Date(p.maturity_date) - new Date(today)) / (1000 * 60 * 60 * 24)) : null;
            const statusBadge = daysLeft !== null && daysLeft < 0 ? 'badge-danger' : daysLeft !== null && daysLeft <= 30 ? 'badge-warning' : 'badge-success';
            const statusText = daysLeft !== null && daysLeft < 0 ? 'Overdue' : 'Active';
            return <tr key={p.id} style={getRowStyle(p)}>
              <td><strong>{p.pledge_no}</strong></td>
              <td><strong>{p.customer_name}</strong><br /><span className="text-xs text-muted">{p.customer_phone || ''}</span></td>
              <td>{p.date}</td>
              <td className="text-gold">{formatCurrency(p.loan_amount)}</td>
              <td>{p.interest_rate}%</td>
              <td>{(p.weight || 0).toFixed(2)}g</td>
              <td><span className="badge badge-info">{p.purity || '-'}</span></td>
              <td>{p.maturity_date || '-'}</td>
              <td><span className={`badge ${statusBadge}`}>{statusText}</span></td>
              <td>{daysLeft !== null ? (daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d`) : '-'}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

function NewPledgeSection() {
  const { dbQuery, dbRun, addNotification } = useContext(AppContext);
  const { user } = useContext(AuthContext);
  const [customers, setCustomers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_id: '', date: new Date().toISOString().split('T')[0],
    item_description: '', weight: '', purity: '22K', huids: '',
    valuation_per_gram: '', total_valuation: 0, loan_amount: '',
    interest_rate: '', interest_type: 'Simple', calendar_type: 'English',
    maturity_date: '',
  });

  useEffect(() => {
    dbQuery("SELECT * FROM parties WHERE type IN ('Customer','Both') ORDER BY name").then(setCustomers);
    generatePledgeNo().then(no => setForm(f => ({ ...f, pledge_no: no, maturity_date: calcMaturityDate(f.date, 'English') })));
  }, []);

  const generatePledgeNo = async () => {
    const year = new Date().getFullYear().toString().slice(-2);
    const result = await dbQuery("SELECT pledge_no FROM girvi_pledges WHERE pledge_no LIKE ? ORDER BY pledge_no DESC LIMIT 1", [`GIRVI-${year}%`]);
    let next = 1;
    if (result.length > 0) {
      const parts = result[0].pledge_no.split('-');
      const num = parseInt(parts[1]?.slice(2) || '0', 10);
      next = num + 1;
    }
    return `GIRVI-${year}${String(next).padStart(4, '0')}`;
  };

  const calcMaturityDate = (startDate, calendarType) => {
    if (!startDate) return '';
    const d = new Date(startDate);
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  };

  const handleNumber = (field) => (e) => {
    const v = e.target.value;
    setForm(f => ({ ...f, [field]: v === '' ? '' : parseFloat(v) || 0 }));
  };

  useEffect(() => {
    const w = parseFloat(form.weight) || 0;
    const v = parseFloat(form.valuation_per_gram) || 0;
    const total = w * v;
    setForm(f => ({ ...f, total_valuation: total }));
  }, [form.weight, form.valuation_per_gram]);

  useEffect(() => {
    if (form.date && !form._manualMaturity) {
      setForm(f => ({ ...f, maturity_date: calcMaturityDate(form.date, form.calendar_type) }));
    }
  }, [form.date, form.calendar_type, form._manualMaturity]);

  const handleSave = async () => {
    if (!form.customer_id) { addNotification('Please select a customer', 'error'); return; }
    if (!form.weight || parseFloat(form.weight) <= 0) { addNotification('Please enter a valid weight', 'error'); return; }
    if (!form.valuation_per_gram || parseFloat(form.valuation_per_gram) <= 0) { addNotification('Please enter valuation per gram', 'error'); return; }
    if (!form.loan_amount || parseFloat(form.loan_amount) <= 0) { addNotification('Please enter a loan amount', 'error'); return; }
    if (parseFloat(form.loan_amount) > form.total_valuation) { addNotification('Loan amount cannot exceed total valuation', 'error'); return; }
    if (!form.interest_rate || parseFloat(form.interest_rate) <= 0) { addNotification('Please enter interest rate', 'error'); return; }
    if (!form.interest_type) { addNotification('Please select interest type', 'error'); return; }

    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const huids = form.huids ? form.huids.split(',').map(h => h.trim()).filter(Boolean).join(',') : '';
      await dbRun(`INSERT INTO girvi_pledges (id,pledge_no,customer_id,date,item_description,weight,purity,huids,valuation_per_gram,valuation,loan_amount,interest_rate,interest_type,calendar_type,maturity_date,status,last_interest_date,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [id, form.pledge_no, form.customer_id, form.date, form.item_description, parseFloat(form.weight) || 0, form.purity, huids, parseFloat(form.valuation_per_gram) || 0, form.total_valuation, parseFloat(form.loan_amount) || 0, parseFloat(form.interest_rate) || 0, form.interest_type, form.calendar_type, form.maturity_date, 'active', form.date, user?.username || 'admin']);

      if (huids) {
        const huidArr = huids.split(',');
        for (const huid of huidArr) {
          await dbRun('INSERT INTO huid_history (id,huid,pledge_id,action,date) VALUES (?,?,?,?,?)', [crypto.randomUUID(), huid.trim(), id, 'pledged', form.date]);
        }
      }

      addNotification(`Pledge ${form.pledge_no} created successfully`, 'success');
      const newNo = await generatePledgeNo();
      setForm({
        customer_id: '', date: new Date().toISOString().split('T')[0],
        item_description: '', weight: '', purity: '22K', huids: '',
        valuation_per_gram: '', total_valuation: 0, loan_amount: '',
        interest_rate: '', interest_type: 'Simple', calendar_type: 'English',
        maturity_date: '', _manualMaturity: false, pledge_no: newNo,
      });
    } catch (err) {
      addNotification(err.message, 'error');
    }
    setSaving(false);
  };

  return (
    <div className="card">
      <div className="section-title">New Pledge</div>
      <div className="form-row-4">
        <div className="form-group"><label className="form-label">Pledge No</label><input type="text" className="form-input" value={form.pledge_no || ''} disabled style={{ opacity: 0.7 }} /></div>
        <div className="form-group"><label className="form-label">Customer <span className="text-red">*</span></label>
          <select className="form-input" value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
            <option value="">Select Customer</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone || '-'})</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Maturity Date</label><input type="date" className="form-input" value={form.maturity_date} onChange={e => setForm(f => ({ ...f, maturity_date: e.target.value, _manualMaturity: true }))} /></div>
      </div>

      <div className="form-row-4">
        <div className="form-group"><label className="form-label">Item Description</label><textarea className="form-input" rows={2} value={form.item_description} onChange={e => setForm(f => ({ ...f, item_description: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Weight (g) <span className="text-red">*</span></label><input type="number" step="0.01" className="form-input" value={form.weight || ''} onChange={handleNumber('weight')} /></div>
        <div className="form-group"><label className="form-label">Purity</label><Autocomplete options={PURITY_OPTIONS} value={form.purity} onChange={v => setForm(f => ({ ...f, purity: v }))} style={{ width: '100%' }} placeholder="Purity" creatable /></div>
        <div className="form-group"><label className="form-label">HUIDs (comma separated)</label><input type="text" className="form-input" value={form.huids} onChange={e => setForm(f => ({ ...f, huids: e.target.value }))} placeholder="e.g. HUID001, HUID002" /></div>
      </div>

      <div className="form-row-4">
        <div className="form-group"><label className="form-label">Valuation per Gram (₹) <span className="text-red">*</span></label><input type="number" step="0.01" className="form-input" value={form.valuation_per_gram || ''} onChange={handleNumber('valuation_per_gram')} /></div>
        <div className="form-group"><label className="form-label">Total Valuation</label><input type="text" className="form-input" value={form.total_valuation ? `₹ ${form.total_valuation.toFixed(2)}` : '₹ 0.00'} disabled style={{ opacity: 0.7 }} /></div>
        <div className="form-group"><label className="form-label">Loan Amount (₹) <span className="text-red">*</span></label>
          <input type="number" step="0.01" className="form-input" value={form.loan_amount || ''} onChange={handleNumber('loan_amount')} />
          {parseFloat(form.loan_amount) > form.total_valuation && form.total_valuation > 0 && <div className="error-msg">Loan exceeds valuation</div>}
        </div>
        <div className="form-group"><label className="form-label">Interest Rate (% p.a.) <span className="text-red">*</span></label><input type="number" step="0.1" className="form-input" value={form.interest_rate || ''} onChange={handleNumber('interest_rate')} /></div>
      </div>

      <div className="form-row-3">
        <div className="form-group"><label className="form-label">Interest Type</label><select className="form-input" value={form.interest_type} onChange={e => setForm(f => ({ ...f, interest_type: e.target.value }))}><option value="Simple">Simple</option><option value="Compound">Compound</option></select></div>
        <div className="form-group"><label className="form-label">Calendar Type</label><select className="form-input" value={form.calendar_type} onChange={e => setForm(f => ({ ...f, calendar_type: e.target.value }))}><option value="English">English</option><option value="Hindi">Hindi</option></select></div>
      </div>

      <button className="btn btn-primary mt-2" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Pledge'}</button>
    </div>
  );
}

function InterestCalculatorSection() {
  const { dbQuery, dbRun, formatCurrency, addNotification } = useContext(AppContext);
  const [pledges, setPledges] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [pledge, setPledge] = useState(null);
  const [calcResult, setCalcResult] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    dbQuery(`SELECT gp.*, p.name as customer_name FROM girvi_pledges gp LEFT JOIN parties p ON gp.customer_id=p.id WHERE gp.status='active' ORDER BY gp.pledge_no`).then(setPledges);
  }, []);

  const loadPledge = async (id) => {
    if (!id) { setPledge(null); setCalcResult(null); return; }
    const result = await dbQuery(`SELECT gp.*, p.name as customer_name FROM girvi_pledges gp LEFT JOIN parties p ON gp.customer_id=p.id WHERE gp.id=?`, [id]);
    if (result.length > 0) {
      setPledge(result[0]);
      calculateInterest(result[0]);
    } else {
      setPledge(null);
      setCalcResult(null);
    }
  };

  const calculateInterest = (p) => {
    if (!p) return;
    const principal = p.loan_amount || 0;
    const rate = p.interest_rate || 0;
    const fromDate = p.last_interest_date || p.date;
    const toDate = new Date().toISOString().split('T')[0];

    let T, TLabel;
    if (p.calendar_type === 'Hindi') {
      const fromParts = fromDate.split('-');
      const toParts = toDate.split('-');
      const months = (parseInt(toParts[0]) - parseInt(fromParts[0])) * 12 + (parseInt(toParts[1]) - parseInt(fromParts[1]));
      T = months / 12;
      TLabel = `${months} month(s)`;
    } else {
      const diffMs = new Date(toDate) - new Date(fromDate);
      const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      T = days / 365;
      TLabel = `${days} day(s)`;
    }

    let accrued, totalInterest, amountReceivable;
    if (p.interest_type === 'Compound') {
      accrued = principal * (Math.pow(1 + rate / 100, T) - 1);
    } else {
      accrued = principal * rate * T / 100;
    }

    totalInterest = (p.interest_received || 0) + accrued;
    amountReceivable = principal + accrued;

    setCalcResult({ accrued, totalInterest, amountReceivable, TLabel, fromDate, toDate, principal, rate });
  };

  const markInterestPaid = async () => {
    if (!pledge || !calcResult || calcResult.accrued <= 0) { addNotification('No interest accrued to mark as paid', 'error'); return; }
    setProcessing(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const receiptNo = `GRV-${pledge.pledge_no}-${Date.now().toString(36).toUpperCase()}`;
      await dbRun('INSERT INTO girvi_receipts (id,pledge_id,receipt_no,date,amount,type,notes) VALUES (?,?,?,?,?,?,?)',
        [crypto.randomUUID(), pledge.id, receiptNo, today, calcResult.accrued, 'loan_interest', `Interest from ${calcResult.fromDate} to ${today}`]);
      await dbRun('INSERT INTO girvi_interest_history (id,pledge_id,date,amount,type,notes) VALUES (?,?,?,?,?,?)',
        [crypto.randomUUID(), pledge.id, today, calcResult.accrued, 'paid', `Interest paid via ${receiptNo}`]);
      await dbRun('UPDATE girvi_pledges SET interest_received = COALESCE(interest_received,0) + ?, last_interest_date = ? WHERE id=?',
        [calcResult.accrued, today, pledge.id]);
      addNotification(`Interest of ${formatCurrency(calcResult.accrued)} marked as paid`, 'success');
      loadPledge(pledge.id);
    } catch (err) {
      addNotification(err.message, 'error');
    }
    setProcessing(false);
  };

  const handlePledgeChange = (e) => {
    setSelectedId(e.target.value);
    loadPledge(e.target.value);
  };

  return (
    <div>
      <div className="card mb-4">
        <div className="section-title">Interest Calculator</div>
        <div className="form-row-3">
          <div className="form-group"><label className="form-label">Select Pledge</label>
            <select className="form-input" value={selectedId} onChange={handlePledgeChange}>
              <option value="">Select an active pledge</option>{pledges.map(p => <option key={p.id} value={p.id}>{p.pledge_no} - {p.customer_name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {pledge && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><div className="card-title">Pledge Details</div></div>
            <div className="flex-between mb-2"><span className="text-muted">Pledge No:</span><strong>{pledge.pledge_no}</strong></div>
            <div className="flex-between mb-2"><span className="text-muted">Customer:</span><strong>{pledge.customer_name}</strong></div>
            <div className="flex-between mb-2"><span className="text-muted">Date:</span><span>{pledge.date}</span></div>
            <div className="flex-between mb-2"><span className="text-muted">Loan Amount:</span><span className="text-gold">{formatCurrency(pledge.loan_amount)}</span></div>
            <div className="flex-between mb-2"><span className="text-muted">Interest Rate:</span><span>{pledge.interest_rate}% p.a. ({pledge.interest_type})</span></div>
            <div className="flex-between mb-2"><span className="text-muted">Calendar:</span><span>{pledge.calendar_type}</span></div>
            <div className="flex-between mb-2"><span className="text-muted">Weight:</span><span>{(pledge.weight || 0).toFixed(2)}g</span></div>
            <div className="flex-between mb-2"><span className="text-muted">Purity:</span><span className="badge badge-info">{pledge.purity || '-'}</span></div>
            <div className="flex-between mb-2"><span className="text-muted">Last Interest Date:</span><span>{pledge.last_interest_date || pledge.date}</span></div>
            <div className="flex-between"><span className="text-muted">Interest Received:</span><span className="text-green">{formatCurrency(pledge.interest_received || 0)}</span></div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Calculation</div></div>
            <div className="flex-between mb-2"><span className="text-muted">Period:</span><span>{calcResult?.fromDate} to {calcResult?.toDate} ({calcResult?.TLabel})</span></div>
            <div className="flex-between mb-2"><span className="text-muted">Principal (P):</span><span className="text-gold">{formatCurrency(pledge.loan_amount)}</span></div>
            <div className="flex-between mb-2"><span className="text-muted">Rate (R):</span><span>{pledge.interest_rate}%</span></div>
            <div className="flex-between mb-2"><span className="text-muted">Time (T):</span><span>{calcResult?.TLabel}</span></div>
            <div style={{ borderTop: '1px solid #1e3a5f', margin: '12px 0' }} />
            <div className="flex-between mb-2"><span className="text-muted">Accrued Interest:</span><span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 18 }}>{formatCurrency(calcResult?.accrued || 0)}</span></div>
            <div className="flex-between mb-2"><span className="text-muted">Total Interest (including received):</span><span className="text-green">{formatCurrency(calcResult?.totalInterest || 0)}</span></div>
            <div className="flex-between"><span className="text-muted">Amount Receivable:</span><span style={{ color: '#22c55e', fontWeight: 700, fontSize: 20 }}>{formatCurrency(calcResult?.amountReceivable || 0)}</span></div>
            <button className="btn btn-success btn-block mt-2" onClick={markInterestPaid} disabled={processing || !calcResult || calcResult.accrued <= 0}>{processing ? 'Processing...' : 'Mark Interest as Paid'}</button>
          </div>
        </div>
      )}

      {!pledge && selectedId && <div className="loading-spinner" />}
    </div>
  );
}

function ReceiptsSection() {
  const { dbQuery, dbRun, formatCurrency, addNotification } = useContext(AppContext);
  const [pledges, setPledges] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [pledge, setPledge] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [interestHistory, setInterestHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: '', type: 'loan_interest', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dbQuery(`SELECT gp.*, p.name as customer_name FROM girvi_pledges gp LEFT JOIN parties p ON gp.customer_id=p.id ORDER BY gp.pledge_no`).then(setPledges);
  }, []);

  const loadPledgeData = async (id) => {
    if (!id) { setPledge(null); setReceipts([]); setInterestHistory([]); return; }
    setLoading(true);
    const p = await dbQuery(`SELECT gp.*, p.name as customer_name FROM girvi_pledges gp LEFT JOIN parties p ON gp.customer_id=p.id WHERE gp.id=?`, [id]);
    if (p.length > 0) {
      setPledge(p[0]);
      setReceipts(await dbQuery('SELECT * FROM girvi_receipts WHERE pledge_id=? ORDER BY created_at DESC', [id]));
      setInterestHistory(await dbQuery('SELECT * FROM girvi_interest_history WHERE pledge_id=? ORDER BY created_at DESC', [id]));
    }
    setLoading(false);
  };

  const handleSelect = (e) => {
    setSelectedId(e.target.value);
    loadPledgeData(e.target.value);
  };

  const handleCreateReceipt = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) { addNotification('Enter a valid amount', 'error'); return; }
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const receiptNo = `GRV-${pledge.pledge_no}-${Date.now().toString(36).toUpperCase()}`;

      if (form.type === 'full_redeem') {
        const days = pledge.calendar_type === 'Hindi'
          ? 0
          : Math.max(0, Math.floor((new Date(today) - new Date(pledge.last_interest_date || pledge.date)) / (1000 * 60 * 60 * 24)));
        const T = pledge.calendar_type === 'Hindi'
          ? Math.max(0, (new Date().getFullYear() - new Date(pledge.last_interest_date || pledge.date).getFullYear()) * 12 + (new Date().getMonth() - new Date(pledge.last_interest_date || pledge.date).getMonth())) / 12
          : days / 365;
        const finalInterest = pledge.interest_type === 'Compound'
          ? (pledge.loan_amount || 0) * (Math.pow(1 + (pledge.interest_rate || 0) / 100, T) - 1)
          : (pledge.loan_amount || 0) * (pledge.interest_rate || 0) * T / 100;
        const balanceInterest = Math.max(0, finalInterest - (pledge.interest_received || 0));
        const totalDue = (pledge.loan_amount || 0) + finalInterest;
        const profit = finalInterest;

        await dbRun('INSERT INTO girvi_receipts (id,pledge_id,receipt_no,date,amount,type,notes) VALUES (?,?,?,?,?,?,?)',
          [crypto.randomUUID(), pledge.id, receiptNo, today, totalDue, 'full_redeem', form.notes || `Full redeem - Total due: ${formatCurrency(totalDue)}`]);
        await dbRun('INSERT INTO girvi_interest_history (id,pledge_id,date,amount,type,notes) VALUES (?,?,?,?,?,?)',
          [crypto.randomUUID(), pledge.id, today, finalInterest, 'paid', `Final interest at redeem`]);
        await dbRun('UPDATE girvi_pledges SET status="redeemed", redeemed_date=?, interest_received = COALESCE(interest_received,0) + ?, last_interest_date=? WHERE id=?',
          [today, Math.max(0, finalInterest - (pledge.interest_received || 0)), today, pledge.id]);

        addNotification(`Pledge ${pledge.pledge_no} fully redeemed. Net profit: ${formatCurrency(profit)}`, 'success');
      } else {
        await dbRun('INSERT INTO girvi_receipts (id,pledge_id,receipt_no,date,amount,type,notes) VALUES (?,?,?,?,?,?,?)',
          [crypto.randomUUID(), pledge.id, receiptNo, today, parseFloat(form.amount), form.type, form.notes]);
        if (form.type === 'loan_interest') {
          await dbRun('INSERT INTO girvi_interest_history (id,pledge_id,date,amount,type,notes) VALUES (?,?,?,?,?,?)',
            [crypto.randomUUID(), pledge.id, today, parseFloat(form.amount), 'paid', form.notes || '']);
          await dbRun('UPDATE girvi_pledges SET interest_received = COALESCE(interest_received,0) + ?, last_interest_date = ? WHERE id=?',
            [parseFloat(form.amount), today, pledge.id]);
        }
        addNotification('Receipt created', 'success');
      }

      setShowForm(false);
      setForm({ amount: '', type: 'loan_interest', notes: '' });
      loadPledgeData(pledge.id);
    } catch (err) {
      addNotification(err.message, 'error');
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="card mb-4">
        <div className="section-title">Receipts & History</div>
        <div className="form-row-3">
          <div className="form-group"><label className="form-label">Select Pledge</label>
            <select className="form-input" value={selectedId} onChange={handleSelect}>
              <option value="">Select a pledge</option>{pledges.map(p => <option key={p.id} value={p.id}>{p.pledge_no} - {p.customer_name} ({p.status})</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="loading-spinner" />}

      {pledge && !loading && (
        <>
          <div className="card mb-4">
            <div className="card-header">
              <div className="card-title">{pledge.pledge_no} - {pledge.customer_name}</div>
              <span className={`badge ${pledge.status === 'active' ? 'badge-success' : pledge.status === 'redeemed' ? 'badge-info' : 'badge-danger'}`}>{pledge.status}</span>
            </div>
            <div className="flex-between mb-2"><span className="text-muted">Loan Amount:</span><span className="text-gold">{formatCurrency(pledge.loan_amount)}</span></div>
            <div className="flex-between mb-2"><span className="text-muted">Interest Received:</span><span className="text-green">{formatCurrency(pledge.interest_received || 0)}</span></div>
            {pledge.status === 'active' && <button className="btn btn-primary btn-sm mt-2" onClick={() => setShowForm(true)}>+ New Receipt</button>}
          </div>

          {pledge.status === 'redeemed' && pledge.redeemed_date && (
            <div className="card mb-4" style={{ background: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>✅</span>
                <div><strong>Redeemed on {pledge.redeemed_date}</strong><br /><span className="text-muted text-sm">Total interest earned: {formatCurrency(pledge.interest_received || 0)}</span></div>
              </div>
            </div>
          )}

          {showForm && (
            <div className="card mb-4">
              <div className="section-title">New Receipt</div>
              <div className="form-row-3">
                <div className="form-group"><label className="form-label">Amount (₹)</label><input type="number" step="0.01" className="form-input" value={form.amount || ''} onChange={e => { const v = e.target.value; setForm(f => ({ ...f, amount: v === '' ? '' : parseFloat(v) || 0 })); }} /></div>
                <div className="form-group"><label className="form-label">Type</label>
                  <select className="form-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="loan_interest">Loan Interest</option>
                    <option value="partial_redeem">Partial Redeem</option>
                    <option value="full_redeem">Full Redeem</option>
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Notes</label><input type="text" className="form-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <div className="flex" style={{ gap: 8, marginTop: 8 }}>
                <button className="btn btn-success btn-sm" onClick={handleCreateReceipt} disabled={saving}>{saving ? 'Saving...' : 'Create Receipt'}</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div className="grid-2">
            <div className="card">
              <div className="card-header"><div className="card-title">Receipts</div></div>
              {receipts.length === 0 ? <div className="empty-state-text">No receipts yet</div> : (
                <table>
                  <thead><tr><th>Receipt No</th><th>Date</th><th>Amount</th><th>Type</th><th>Notes</th></tr></thead>
                  <tbody>{receipts.map(r => <tr key={r.id}>
                    <td className="text-xs">{r.receipt_no}</td>
                    <td>{r.date}</td>
                    <td className="text-gold">{formatCurrency(r.amount)}</td>
                    <td><span className={`badge ${r.type === 'loan_interest' ? 'badge-success' : r.type === 'full_redeem' ? 'badge-info' : 'badge-warning'}`}>{r.type.replace('_', ' ')}</span></td>
                    <td className="text-muted text-sm">{r.notes || '-'}</td>
                  </tr>)}</tbody>
                </table>
              )}
            </div>

            <div className="card">
              <div className="card-header"><div className="card-title">Interest History</div></div>
              {interestHistory.length === 0 ? <div className="empty-state-text">No interest history yet</div> : (
                <table>
                  <thead><tr><th>Date</th><th>Amount</th><th>Type</th><th>Notes</th></tr></thead>
                  <tbody>{interestHistory.map(h => <tr key={h.id}>
                    <td>{h.date}</td>
                    <td className="text-gold">{formatCurrency(h.amount)}</td>
                    <td><span className={`badge ${h.type === 'paid' ? 'badge-success' : 'badge-warning'}`}>{h.type}</span></td>
                    <td className="text-muted text-sm">{h.notes || '-'}</td>
                  </tr>)}</tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {!pledge && !loading && selectedId && <div className="loading-spinner" />}
    </div>
  );
}

function HUIDHistorySection() {
  const { dbQuery, dbRun, formatCurrency, addNotification } = useContext(AppContext);
  const [searchHUID, setSearchHUID] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allHistory, setAllHistory] = useState([]);
  const [pledgeMap, setPledgeMap] = useState({});

  useEffect(() => {
    (async () => {
      await dbRun(`CREATE TABLE IF NOT EXISTS huid_history (
        id TEXT PRIMARY KEY, huid TEXT NOT NULL, pledge_id TEXT NOT NULL,
        action TEXT NOT NULL, date DATE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      const data = await dbQuery(`SELECT hh.*, gp.pledge_no, gp.customer_id, p.name as customer_name, gp.date as pledge_date, gp.status as pledge_status
        FROM huid_history hh
        LEFT JOIN girvi_pledges gp ON hh.pledge_id=gp.id
        LEFT JOIN parties p ON gp.customer_id=p.id
        ORDER BY hh.created_at DESC`);
      const map = {};
      data.forEach(d => { if (d.pledge_id) map[d.pledge_id] = d; });
      setPledgeMap(map);
      setAllHistory(data);
    })();
  }, []);

  const handleSearch = () => {
    if (!searchHUID.trim()) { addNotification('Enter an HUID to search', 'error'); return; }
    setLoading(true);
    const filtered = allHistory.filter(h => h.huid?.toLowerCase().includes(searchHUID.trim().toLowerCase()));
    setResults(filtered);
    setLoading(false);
  };

  return (
    <div>
      <div className="card mb-4">
        <div className="section-title">HUID History Search</div>
        <div className="form-row-3">
          <div className="form-group"><label className="form-label">Search HUID</label>
            <input type="text" className="form-input" value={searchHUID} onChange={e => setSearchHUID(e.target.value)} placeholder="Enter HUID to search..." onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }} />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>Search</button>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? <div className="loading-spinner" /> : results.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-text">{searchHUID ? 'No results found for this HUID' : 'Search for an HUID to see its history'}</div>
          </div>
        ) : (
          <>
            <div className="card-header"><div className="card-title">History for: <span className="text-gold">{searchHUID}</span></div><span className="badge badge-info">{results.length} record(s)</span></div>
            <table>
              <thead><tr><th>HUID</th><th>Pledge No</th><th>Customer</th><th>Action</th><th>Date</th><th>Pledge Status</th></tr></thead>
              <tbody>{results.map(r => <tr key={r.id}>
                <td><strong className="text-gold">{r.huid}</strong></td>
                <td><span className="badge badge-info">{r.pledge_no || '-'}</span></td>
                <td>{r.customer_name || '-'}</td>
                <td><span className={`badge ${r.action === 'pledged' ? 'badge-success' : 'badge-info'}`}>{r.action}</span></td>
                <td>{r.date || r.created_at?.slice(0, 10) || '-'}</td>
                <td><span className={`badge ${r.pledge_status === 'active' ? 'badge-success' : r.pledge_status === 'redeemed' ? 'badge-info' : r.pledge_status === 'auctioned' ? 'badge-danger' : 'badge-warning'}`}>{r.pledge_status || '-'}</span></td>
              </tr>)}</tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
