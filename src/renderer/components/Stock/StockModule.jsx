import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import Autocomplete from '../Common/Autocomplete';
import NumberInput from '../../utils/NumberInput';

export default function StockModule() {
  const { setPageTitle, formatCurrency, formatWeight, dbQuery, dbRun, addNotification } = useContext(AppContext);
  const [tab, setTab] = useState('inventory');

  useEffect(() => { setPageTitle('Stock Management'); }, []);

  const tabs = [
    { id: 'inventory', label: '💎 Inventory', component: InventoryView },
    { id: 'transfer', label: '🔄 Transfer', component: StockTransfer },
    { id: 'valuation', label: '💰 Valuation', component: StockValuation },
    { id: 'register', label: '📋 Stock Register', component: StockRegister },
  ];

  const ActiveTab = tabs.find(t => t.id === tab)?.component;
  return (
    <div>
      <div className="tabs">{tabs.map(t => <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>
      {ActiveTab && <ActiveTab />}
    </div>
  );
}

function InventoryView() {
  const { dbQuery, formatCurrency, formatWeight, addNotification } = useContext(AppContext);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [filterMetal, setFilterMetal] = useState('all');

  useEffect(() => {
    dbQuery("SELECT i.*, c.name as category_name FROM items i LEFT JOIN categories c ON i.category_id=c.id WHERE i.status='active' ORDER BY i.name").then(setItems);
  }, []);

  const metals = [...new Set(items.map(i => i.metal_type))];
  const filtered = items.filter(i => (filterMetal === 'all' || i.metal_type === filterMetal) && (i.name?.toLowerCase().includes(search.toLowerCase()) || i.code?.toLowerCase().includes(search.toLowerCase())));

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-left">
          <input className="search-input" placeholder="Search inventory..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-input" style={{ width: 140 }} value={filterMetal} onChange={e => setFilterMetal(e.target.value)}>
            <option value="all">All Metals</option>{metals.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Code</th><th>Name</th><th>Category</th><th>Metal</th><th>Purity</th><th>Weight</th><th>Qty</th><th>Price</th><th>Value</th><th>Location</th></tr></thead>
          <tbody>{filtered.map(item => <tr key={item.id}>
            <td><strong>{item.code}</strong></td><td>{item.name}</td>
            <td>{item.category_name || '-'}</td>
            <td><span className="badge badge-gold">{item.metal_type}</span></td>
            <td>{item.purity}</td>
            <td>{formatWeight(item.weight)}</td>
            <td><span className={`badge ${(item.current_qty||0) <= (item.min_qty||0) ? 'badge-danger' : 'badge-success'}`}>{item.current_qty}</span></td>
            <td>{formatCurrency(item.selling_price)}</td>
            <td className="fw-bold">{formatCurrency((item.selling_price||0) * (item.current_qty||1))}</td>
            <td className="text-muted">{item.tray_no || item.location || '-'}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function StockTransfer() {
  const { addNotification, dbQuery, dbRun, formatWeight } = useContext(AppContext);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ item_id: '', from_tray: '', to_tray: '', qty: 0, date: new Date().toISOString().split('T')[0] });
  useEffect(() => { dbQuery("SELECT * FROM items WHERE status='active' ORDER BY name").then(setItems); }, []);

  const transfer = async () => {
    if (!form.item_id || !form.qty) { addNotification('Select item and qty', 'error'); return; }
    await dbRun('UPDATE items SET tray_no=?, shelf_no=? WHERE id=?', [form.to_tray, form.to_tray, form.item_id]);
    addNotification(`Transferred ${formatWeight(form.qty)}`, 'success');
  };

  return (
    <div className="card">
      <div className="section-title">🔄 Stock Transfer (Tray to Tray)</div>
      <div className="form-row-4">
        <div className="form-group"><label className="form-label">Item</label><Autocomplete options={items.map(i => ({value: i.id, label: `${i.name} (${i.code})`}))} value={form.item_id} onChange={v => setForm({...form, item_id: v})} placeholder="Select" style={{ width: '100%' }} /></div>
        <div className="form-group"><label className="form-label">From Tray</label><input className="form-input" value={form.from_tray} onChange={e => setForm({...form, from_tray: e.target.value})} /></div>
        <div className="form-group"><label className="form-label">To Tray/Shelf</label><input className="form-input" value={form.to_tray} onChange={e => setForm({...form, to_tray: e.target.value})} /></div>
        <div className="form-group"><label className="form-label">Quantity (g)</label><NumberInput value={form.qty} onChange={v => setForm({...form, qty: v})} placeholder="0" /></div>
      </div>
      <button className="btn btn-primary mt-2" onClick={transfer}>🔄 Transfer</button>
    </div>
  );
}

function StockValuation() {
  const { dbQuery, formatCurrency, formatWeight } = useContext(AppContext);
  const [valuation, setValuation] = useState([]);
  useEffect(() => {
    dbQuery("SELECT metal_type, purity, COUNT(*) as cnt, SUM(weight) as total_wt, SUM(weight*selling_price) as total_val FROM items WHERE status='active' GROUP BY metal_type, purity ORDER BY metal_type, purity").then(setValuation);
  }, []);
  const grandTotal = valuation.reduce((s, v) => s + (v.total_val || 0), 0);
  const grandWt = valuation.reduce((s, v) => s + (v.total_wt || 0), 0);

  return (
    <div className="card">
      <div className="card-header"><div className="card-title">💰 Stock Valuation</div><span className="fw-bold text-gold">Total: {formatCurrency(grandTotal)}</span></div>
      <table><thead><tr><th>Metal</th><th>Purity</th><th>Items</th><th>Weight</th><th>Value</th></tr></thead>
      <tbody>{valuation.map((v, i) => <tr key={i}><td><span className="badge badge-gold">{v.metal_type}</span></td><td>{v.purity}</td><td>{v.cnt}</td><td>{formatWeight(v.total_wt)}</td><td className="fw-bold">{formatCurrency(v.total_val)}</td></tr>)}
        <tr style={{ borderTop: '2px solid #f59e0b' }}><td colSpan={2}><strong>Grand Total</strong></td><td><strong>{valuation.reduce((s, v) => s + v.cnt, 0)}</strong></td><td><strong>{formatWeight(grandWt)}</strong></td><td><strong className="text-gold">{formatCurrency(grandTotal)}</strong></td></tr>
      </tbody></table>
    </div>
  );
}

function StockRegister() {
  const { dbQuery, formatCurrency, formatWeight } = useContext(AppContext);
  const [register, setRegister] = useState([]);
  const [fromDate, setFromDate] = useState(new Date(Date.now() - 30*86400000).toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    dbQuery(`SELECT date, voucher_type, voucher_no, total_amount, gold_weight FROM transactions WHERE date BETWEEN ? AND ? ORDER BY date DESC`, [fromDate, toDate]).then(setRegister);
  }, [fromDate, toDate]);

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">📋 Daily Stock Register</div>
        <div className="flex gap-2">
          <input type="date" className="form-input" style={{ width: 140 }} value={fromDate} onChange={e => setFromDate(e.target.value)} />
          <span className="text-muted">to</span>
          <input type="date" className="form-input" style={{ width: 140 }} value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
      </div>
      <table><thead><tr><th>Date</th><th>Voucher</th><th>Type</th><th>Amount</th><th>Weight</th></tr></thead>
      <tbody>{register.map(r => <tr key={r.id || r.voucher_no}><td>{r.date}</td><td><strong>{r.voucher_no}</strong></td><td><span className="badge badge-info">{r.voucher_type}</span></td><td>{formatCurrency(r.total_amount)}</td><td>{formatWeight(r.gold_weight)}</td></tr>)}</tbody></table>
    </div>
  );
}
