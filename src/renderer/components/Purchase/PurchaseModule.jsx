import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { VoucherHelper } from '../../utils/VoucherHelper';
import Autocomplete, { PURITY_OPTIONS, METAL_OPTIONS } from '../Common/Autocomplete';
import NumberInput from '../../utils/NumberInput';

export default function PurchaseModule() {
  const { setPageTitle, formatCurrency, formatWeight, dbQuery, dbRun, addNotification } = useContext(AppContext);
  const [tab, setTab] = useState('purchase');
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [form, setForm] = useState({ voucher_no: '', date: new Date().toISOString().split('T')[0], party_id: '', narration: '', total_amount: '', gold_weight: '', voucher_type: 'Purchase' });
  const [lineItems, setLineItems] = useState([]);

  useEffect(() => { setPageTitle('Purchase'); loadData(); genVoucherNo(); }, []);

  const loadData = async () => {
    setPurchases(await dbQuery("SELECT t.*, p.name as party_name FROM transactions t LEFT JOIN parties p ON t.party_id=p.id WHERE t.voucher_type IN ('Purchase','Purchase_Return') ORDER BY t.created_at DESC LIMIT 200"));
    setSuppliers(await dbQuery("SELECT * FROM parties WHERE type IN ('Supplier','Both') ORDER BY name"));
    setItems(await dbQuery("SELECT * FROM items WHERE status='active' ORDER BY name"));
  };

  const genVoucherNo = async () => {
    const no = await VoucherHelper.getNextNumber(dbRun, dbQuery, 'Purchase');
    setForm(prev => ({ ...prev, voucher_no: no }));
  };

  const addLineItem = () => setLineItems([...lineItems, { id: crypto.randomUUID(), item_id: '', weight: '', purity: '22K', rate: '', qty: 1, amount: '' }]);

  const updateLineItem = (id, field, value) => {
    const updated = lineItems.map(item => {
      if (item.id !== id) return item;
      const newItem = { ...item, [field]: value };
      if (field === 'item_id') { const sel = items.find(i => i.id === value); if (sel) { newItem.rate = sel.cost_price || 0; newItem.purity = sel.purity; newItem.weight = sel.weight || 0; } }
      newItem.amount = (newItem.qty || 1) * (newItem.rate || 0);
      return newItem;
    });
    setLineItems(updated);
    setForm(prev => ({ ...prev, total_amount: updated.reduce((s, i) => s + (i.amount || 0), 0), gold_weight: updated.reduce((s, i) => s + (i.weight || 0), 0) }));
  };

  const removeLineItem = (id) => {
    const updated = lineItems.filter(i => i.id !== id);
    setLineItems(updated);
    setForm(prev => ({ ...prev, total_amount: updated.reduce((s, i) => s + (i.amount || 0), 0), gold_weight: updated.reduce((s, i) => s + (i.weight || 0), 0) }));
  };

  const savePurchase = async () => {
    if (!form.party_id) { addNotification('Select supplier', 'error'); return; }
    if (!form.voucher_no) { addNotification('Voucher number not generated', 'error'); return; }

    if (editMode) {
      await dbRun('UPDATE transactions SET date=?,party_id=?,narration=?,total_amount=?,gold_weight=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',
        [form.date, form.party_id, form.narration, form.total_amount, form.gold_weight, editMode.id]);
      const oldItems = await dbQuery("SELECT * FROM transaction_entries WHERE transaction_id=?", [editMode.id]);
      for (const oi of oldItems) { if (oi.item_id) await dbRun('UPDATE items SET current_qty = current_qty - ? WHERE id=?', [oi.qty || 1, oi.item_id]); }
      await dbRun('DELETE FROM transaction_entries WHERE transaction_id=?', [editMode.id]);
      for (const item of lineItems) {
        await dbRun('INSERT INTO transaction_entries (id,transaction_id,item_id,rate,qty,amount,weight) VALUES (?,?,?,?,?,?,?)',
          [crypto.randomUUID(), editMode.id, item.item_id, item.rate, item.qty, item.amount, item.weight]);
        if (item.item_id) await dbRun('UPDATE items SET current_qty = current_qty + ? WHERE id=?', [item.qty || 1, item.item_id]);
      }
      addNotification(`Purchase ${form.voucher_no} updated`, 'success');
      setShowForm(false); setEditMode(null); setLineItems([]); genVoucherNo(); loadData();
      return;
    }

    const txId = crypto.randomUUID();
    await dbRun('INSERT INTO transactions (id,voucher_no,voucher_type,date,party_id,narration,total_amount,gold_weight) VALUES (?,?,?,?,?,?,?,?)',
      [txId, form.voucher_no, 'Purchase', form.date, form.party_id, form.narration, form.total_amount, form.gold_weight]);
    for (const item of lineItems) {
      await dbRun('INSERT INTO transaction_entries (id,transaction_id,item_id,rate,qty,amount,weight) VALUES (?,?,?,?,?,?,?)',
        [crypto.randomUUID(), txId, item.item_id, item.rate, item.qty, item.amount, item.weight]);
      if (item.item_id) await dbRun('UPDATE items SET current_qty = current_qty + ? WHERE id=?', [item.qty || 1, item.item_id]);
    }
    addNotification(`Purchase ${form.voucher_no} saved`, 'success');
    setShowForm(false); setLineItems([]); genVoucherNo(); loadData();
  };

  const editPurchase = async (p) => {
    setEditMode(p);
    const itemsList = await dbQuery("SELECT * FROM transaction_entries WHERE transaction_id=?", [p.id]);
    setForm({ voucher_no: p.voucher_no, date: p.date, party_id: p.party_id, narration: p.narration || '', total_amount: p.total_amount, gold_weight: p.gold_weight, voucher_type: 'Purchase' });
    setLineItems(itemsList.map(i => ({ id: i.id, item_id: i.item_id, weight: i.weight || '', purity: '22K', rate: i.rate || '', qty: i.qty || 1, amount: i.amount || '' })));
    setShowForm(true);
  };

  const cancelPurchase = async (p) => {
    if (!confirm(`Cancel purchase ${p.voucher_no}? Stock will be adjusted.`)) return;
    await dbRun("UPDATE transactions SET status='cancelled', updated_at=CURRENT_TIMESTAMP WHERE id=?", [p.id]);
    const itemsList = await dbQuery("SELECT * FROM transaction_entries WHERE transaction_id=?", [p.id]);
    for (const item of itemsList) { if (item.item_id) await dbRun('UPDATE items SET current_qty = current_qty - ? WHERE id=?', [item.qty || 1, item.item_id]); }
    addNotification(`Purchase ${p.voucher_no} cancelled`, 'info');
    loadData();
  };

  const filtered = purchases.filter(p => p.voucher_no?.includes(search) || p.party_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="tabs">
        <button className={`tab ${tab === 'purchase' ? 'active' : ''}`} onClick={() => setTab('purchase')}>📥 Purchase</button>
        <button className={`tab ${tab === 'return' ? 'active' : ''}`} onClick={() => setTab('return')}>↩️ Returns</button>
        <button className={`tab ${tab === 'rates' ? 'active' : ''}`} onClick={() => setTab('rates')}>🏅 Metal Rates</button>
      </div>

      {tab === 'purchase' && (
        <div>
          <div className="toolbar"><div className="toolbar-left"><input className="search-input" placeholder="Search purchases..." value={search} onChange={e => setSearch(e.target.value)} /></div><div className="toolbar-right"><button className="btn btn-primary" onClick={() => { setEditMode(null); genVoucherNo(); setShowForm(true); }}>+ New Purchase</button></div></div>

          {showForm && (
            <div className="modal-overlay" onClick={() => { setShowForm(false); setEditMode(null); }}>
              <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                <div className="modal-header"><div className="modal-title">{editMode ? '✏️ Edit Purchase' : '📥 New Purchase Entry'}</div><button className="title-btn close" onClick={() => { setShowForm(false); setEditMode(null); }}>✕</button></div>
                <div className="modal-body">
                  <div className="form-row-4 mb-4">
                    <div className="form-group"><label className="form-label">Voucher No</label><input className="form-input" value={form.voucher_no} onChange={e => setForm({...form, voucher_no: e.target.value})} /></div>
                    <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
                    <div className="form-group"><label className="form-label">Supplier</label><Autocomplete options={suppliers.map(s => ({value: s.id, label: s.name}))} value={form.party_id} onChange={v => setForm({...form, party_id: v})} placeholder="Type to search supplier..." style={{ width: '100%' }} /></div>
                    <div className="form-group"><label className="form-label">Narration</label><input className="form-input" value={form.narration} onChange={e => setForm({...form, narration: e.target.value})} /></div>
                  </div>
                  <div className="flex-between mb-4"><strong>Items</strong><button className="btn btn-secondary btn-sm" onClick={addLineItem}>+ Add Item</button></div>
                  <div className="table-container mb-4">
                    <table><thead><tr><th>Item</th><th>Purity</th><th>Weight</th><th>Rate</th><th>Qty</th><th>Amount</th><th></th></tr></thead>
                    <tbody>{lineItems.map(item => <tr key={item.id}><td><Autocomplete options={items.map(i => ({value: i.id, label: i.name}))} value={item.item_id} onChange={v => updateLineItem(item.id, 'item_id', v)} placeholder="Type to search item..." style={{ width: 150 }} /></td><td><Autocomplete options={PURITY_OPTIONS} value={item.purity} onChange={v => updateLineItem(item.id, 'purity', v)} style={{ width: 80 }} placeholder="Purity" /></td><td><NumberInput value={item.weight} onChange={v => updateLineItem(item.id, 'weight', v)} style={{ width: 80 }} placeholder="Weight" /></td><td><NumberInput value={item.rate} onChange={v => updateLineItem(item.id, 'rate', v)} style={{ width: 80 }} placeholder="Rate" /></td><td><NumberInput value={item.qty} onChange={v => updateLineItem(item.id, 'qty', v === '' ? '' : v || 1)} style={{ width: 60 }} placeholder="Qty" /></td><td className="fw-bold">{formatCurrency(item.amount)}</td><td><button className="btn btn-danger btn-xs" onClick={() => removeLineItem(item.id)}>✕</button></td></tr>)}</tbody></table>
                  </div>
                  <div className="flex-end" style={{ display: 'flex', justifyContent: 'flex-end' }}>Total: <strong style={{ fontSize: 18, color: '#f59e0b' }}>{formatCurrency(form.total_amount)}</strong></div>
                </div>
                <div className="modal-footer"><button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditMode(null); }}>Cancel</button><button className="btn btn-primary" onClick={savePurchase}>💾 Save Purchase</button></div>
              </div>
            </div>
          )}

          <div className="card">
            <table><thead><tr><th>Voucher</th><th>Date</th><th>Supplier</th><th>Amount</th><th>Weight</th><th>Status</th><th></th></tr></thead>
            <tbody>{filtered.map(p => <tr key={p.id} className={p.status === 'cancelled' ? 'cancelled-row' : ''}><td><strong>{p.voucher_no}</strong></td><td>{p.date}</td><td>{p.party_name}</td><td className={`fw-bold ${p.status === 'cancelled' ? 'text-muted' : 'text-red'}`}>{formatCurrency(p.total_amount)}</td><td>{formatWeight(p.gold_weight)}</td><td>{p.status === 'cancelled' ? <span className="badge badge-danger">Cancelled</span> : <span className="badge badge-success">Active</span>}</td>
              <td><div className="btn-group">{p.status !== 'cancelled' && <button className="btn btn-xs btn-secondary" onClick={() => editPurchase(p)}>✏️</button>}{p.status !== 'cancelled' && <button className="btn btn-xs btn-danger" onClick={() => cancelPurchase(p)}>🚫</button>}</div></td>
            </tr>)}</tbody></table>
          </div>
        </div>
      )}

      {tab === 'rates' && <MetalRatesSection />}
      {tab === 'return' && <div className="card"><div className="empty-state"><div className="empty-state-icon">↩️</div><div className="empty-state-text">Purchase Returns</div></div></div>}
    </div>
  );
}

function MetalRatesSection() {
  const { addNotification, dbQuery, dbRun, formatCurrency } = useContext(AppContext);
  const [rates, setRates] = useState([]);
  const [form, setForm] = useState({ metal_type: 'Gold', purity: '24K', rate_per_gram: '', rate_date: new Date().toISOString().split('T')[0] });
  useEffect(() => { dbQuery('SELECT * FROM metal_rates ORDER BY rate_date DESC LIMIT 50').then(setRates); }, []);

  const submitRate = async () => {
    await dbRun('INSERT INTO metal_rates (id,metal_type,purity,rate_per_gram,rate_date) VALUES (?,?,?,?,?)', [crypto.randomUUID(), form.metal_type, form.purity, form.rate_per_gram, form.rate_date]);
    addNotification('Rate added', 'success');
    dbQuery('SELECT * FROM metal_rates ORDER BY rate_date DESC LIMIT 50').then(setRates);
  };

  return (
    <div>
      <div className="card mb-4">
        <div className="form-row-4">
          <div className="form-group"><label className="form-label">Metal</label><Autocomplete options={METAL_OPTIONS} value={form.metal_type} onChange={v => setForm({...form, metal_type: v})} style={{ width: '100%' }} placeholder="Metal Type" creatable /></div>
          <div className="form-group"><label className="form-label">Purity</label><Autocomplete options={PURITY_OPTIONS} value={form.purity} onChange={v => setForm({...form, purity: v})} style={{ width: '100%' }} placeholder="Purity" creatable /></div>
          <div className="form-group"><label className="form-label">Rate per Gram</label><NumberInput value={form.rate_per_gram} onChange={v => setForm({...form, rate_per_gram: v})} style={{}} placeholder="Rate per Gram" /></div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}><button className="btn btn-primary btn-block" onClick={submitRate}>Add Rate</button></div>
        </div>
      </div>
      <div className="card">
        <table><thead><tr><th>Date</th><th>Metal</th><th>Purity</th><th>Rate/g</th><th>Rate/10g</th></tr></thead>
        <tbody>{rates.map(r => <tr key={r.id}><td>{r.rate_date}</td><td><span className="badge badge-gold">{r.metal_type}</span></td><td>{r.purity}</td><td className="fw-bold text-gold">{formatCurrency(r.rate_per_gram)}</td><td>{formatCurrency((r.rate_per_gram || 0) * 10)}</td></tr>)}</tbody></table>
      </div>
    </div>
  );
}
