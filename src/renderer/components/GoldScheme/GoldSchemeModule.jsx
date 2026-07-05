import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import Autocomplete from '../Common/Autocomplete';
import NumberInput from '../../utils/NumberInput';

export default function GoldSchemeModule() {
  const { setPageTitle, formatCurrency, dbQuery, dbRun, addNotification } = useContext(AppContext);
  const [schemes, setSchemes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState('active');
  const [form, setForm] = useState({ customer_id: '', scheme_name: 'Gold Savings', monthly_amount: 1000, total_months: 12, start_date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    setPageTitle('Gold Saving Scheme');
    loadData();
  }, []);

  const loadData = async () => {
    setSchemes(await dbQuery('SELECT gss.*, p.name as customer_name FROM gold_saving_schemes gss LEFT JOIN parties p ON gss.customer_id=p.id ORDER BY gss.start_date DESC'));
    setCustomers(await dbQuery("SELECT * FROM parties WHERE type IN ('Customer','Both') ORDER BY name"));
  };

  const createScheme = async () => {
    if (!form.customer_id) { addNotification('Select customer', 'error'); return; }
    const id = crypto.randomUUID();
    const endDate = new Date(form.start_date);
    endDate.setMonth(endDate.getMonth() + form.total_months);
    const maturityAmount = form.monthly_amount * form.total_months * 1.1;
    await dbRun('INSERT INTO gold_saving_schemes (id,customer_id,scheme_name,monthly_amount,total_months,start_date,end_date,maturity_amount) VALUES (?,?,?,?,?,?,?,?)',
      [id, form.customer_id, form.scheme_name, form.monthly_amount, form.total_months, form.start_date, endDate.toISOString().split('T')[0], maturityAmount]);
    for (let i = 1; i <= form.total_months; i++) {
      const dueDate = new Date(form.start_date);
      dueDate.setMonth(dueDate.getMonth() + i - 1);
      await dbRun('INSERT INTO scheme_installments (id,scheme_id,installment_no,due_date,amount) VALUES (?,?,?,?,?)',
        [crypto.randomUUID(), id, i, dueDate.toISOString().split('T')[0], form.monthly_amount]);
    }
    addNotification('Gold Saving Scheme created', 'success');
    setShowForm(false);
    loadData();
  };

  const payInstallment = async (schemeId) => {
    const pending = await dbQuery("SELECT * FROM scheme_installments WHERE scheme_id=? AND status='pending' ORDER BY installment_no LIMIT 1", [schemeId]);
    if (pending.length > 0) {
      await dbRun('UPDATE scheme_installments SET status="paid", paid_date=date("now"), paid_amount=amount WHERE id=?', [pending[0].id]);
      await dbRun('UPDATE gold_saving_schemes SET total_paid = total_paid + ? WHERE id=?', [pending[0].amount, schemeId]);
      await dbRun('UPDATE gold_saving_schemes SET status="completed" WHERE id=? AND total_paid >= monthly_amount*total_months', [schemeId]);
      addNotification(`Installment #${pending[0].installment_no} paid`, 'success');
      loadData();
    }
  };

  const filtered = schemes.filter(s => tab === 'all' || s.status === tab);

  return (
    <div>
      <div className="tabs">
        <button className={`tab ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>Active</button>
        <button className={`tab ${tab === 'completed' ? 'active' : ''}`} onClick={() => setTab('completed')}>Completed</button>
        <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All Schemes</button>
      </div>

      <div className="toolbar"><div className="toolbar-right"><button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New Scheme</button></div></div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">🏦 New Gold Saving Scheme</div><button className="title-btn close" onClick={() => setShowForm(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Customer</label><Autocomplete options={customers.map(c => ({value: c.id, label: c.name}))} value={form.customer_id} onChange={v => setForm({...form, customer_id: v})} placeholder="Search customer..." creatable={false} /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Scheme</label><select className="form-input" value={form.scheme_name} onChange={e => setForm({...form, scheme_name: e.target.value})}><option>Gold Savings</option><option>Gold Plus</option><option>Diamond Scheme</option></select></div>
                <div className="form-group"><label className="form-label">Start Date</label><input type="date" className="form-input" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Monthly Amount (₹)</label><NumberInput value={form.monthly_amount} onChange={v => setForm({...form, monthly_amount: v === '' ? 0 : parseFloat(v) || 0})} /></div>
                <div className="form-group"><label className="form-label">Duration (months)</label><NumberInput value={form.total_months} onChange={v => setForm({...form, total_months: v === '' ? 12 : parseInt(v) || 12})} /></div>
              </div>
              {form.monthly_amount > 0 && form.total_months > 0 && (
                <div className="card mt-2" style={{ background: 'rgba(245,158,11,0.08)' }}>
                  <div className="flex-between"><span>Total Investment:</span><strong>{formatCurrency(form.monthly_amount * form.total_months)}</strong></div>
                  <div className="flex-between"><span>Maturity (est.):</span><strong className="text-gold">{formatCurrency(form.monthly_amount * form.total_months * 1.1)}</strong></div>
                </div>
              )}
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={createScheme}>Create Scheme</button></div>
          </div>
        </div>
      )}

      <div className="card">
        <table><thead><tr><th>Customer</th><th>Scheme</th><th>Monthly</th><th>Months</th><th>Paid</th><th>Balance</th><th>Maturity</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>{filtered.map(s => {
          const totalDue = s.monthly_amount * s.total_months;
          const balance = totalDue - (s.total_paid || 0);
          return <tr key={s.id}>
            <td><strong>{s.customer_name}</strong></td><td>{s.scheme_name}</td>
            <td>{formatCurrency(s.monthly_amount)}</td><td>{s.total_months}</td>
            <td className="text-green">{formatCurrency(s.total_paid)}</td>
            <td className="text-red">{formatCurrency(balance)}</td>
            <td className="text-gold">{formatCurrency(s.maturity_amount)}</td>
            <td><span className={`badge ${s.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>{s.status}</span></td>
            <td>{s.status !== 'completed' && <button className="btn btn-success btn-xs" onClick={() => payInstallment(s.id)}>Pay</button>}</td>
          </tr>;
        })}</tbody></table>
      </div>
    </div>
  );
}
