import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';

export default function PurchaseManagement() {
  const { setPageTitle, formatCurrency, formatWeight, dbQuery, dbRun, addNotification } = useContext(AppContext);
  const [tab, setTab] = useState('purchase');
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    voucher_no: 'PUR-' + Date.now().toString(36).toUpperCase(),
    date: new Date().toISOString().split('T')[0],
    party_id: '', narration: '', total_amount: 0, gold_weight: 0,
    voucher_type: 'Purchase'
  });
  const [lineItems, setLineItems] = useState([]);

  useEffect(() => {
    setPageTitle('Purchase Management');
    loadData();
  }, []);

  const loadData = async () => {
    const pData = await dbQuery(`
      SELECT t.*, p.name as party_name FROM transactions t
      LEFT JOIN parties p ON t.party_id = p.id
      WHERE t.voucher_type IN ('Purchase','Purchase_Return')
      ORDER BY t.created_at DESC LIMIT 50
    `);
    setPurchases(pData);
    const sData = await dbQuery("SELECT * FROM parties WHERE type IN ('Supplier','Both') ORDER BY name");
    setSuppliers(sData);
    const iData = await dbQuery("SELECT * FROM items WHERE status='active' ORDER BY name");
    setItems(iData);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      id: crypto.randomUUID(), item_id: '', weight: 0, purity: '22K',
      rate: 0, amount: 0, qty: 1
    }]);
  };

  const updateLineItem = (id, field, value) => {
    const updated = lineItems.map(item => {
      if (item.id !== id) return item;
      const newItem = { ...item, [field]: value };
      if (field === 'item_id') {
        const sel = items.find(i => i.id === value);
        if (sel) { newItem.rate = sel.cost_price || 0; newItem.purity = sel.purity; newItem.weight = sel.weight; }
      }
      newItem.amount = (newItem.qty || 1) * (newItem.rate || 0);
      return newItem;
    });
    setLineItems(updated);
    const total = updated.reduce((sum, i) => sum + (i.amount || 0), 0);
    const wt = updated.reduce((sum, i) => sum + (i.weight || 0), 0);
    setForm(prev => ({ ...prev, total_amount: total, gold_weight: wt }));
  };

  const removeLineItem = (id) => {
    const updated = lineItems.filter(i => i.id !== id);
    setLineItems(updated);
    const total = updated.reduce((sum, i) => sum + (i.amount || 0), 0);
    const wt = updated.reduce((sum, i) => sum + (i.weight || 0), 0);
    setForm(prev => ({ ...prev, total_amount: total, gold_weight: wt }));
  };

  const savePurchase = async () => {
    if (!form.party_id) { addNotification('Select supplier', 'error'); return; }
    const txId = crypto.randomUUID();
    await dbRun('INSERT INTO transactions (id, voucher_no, voucher_type, date, party_id, narration, total_amount, gold_weight) VALUES (?,?,?,?,?,?,?,?)',
      [txId, form.voucher_no, 'Purchase', form.date, form.party_id, form.narration, form.total_amount, form.gold_weight]);

    for (const item of lineItems) {
      await dbRun(`INSERT INTO transaction_entries (id, transaction_id, item_id, rate, qty, amount, weight) VALUES (?,?,?,?,?,?,?)`,
        [crypto.randomUUID(), txId, item.item_id, item.rate, item.qty, item.amount, item.weight]);

      if (item.item_id) {
        const existing = await dbQuery('SELECT id FROM sale_invoice_items WHERE item_id=? AND transaction_id=?', [item.item_id, txId]);
        if (existing.length === 0) {
          await dbRun('UPDATE items SET current_qty = current_qty + ? WHERE id=?', [item.qty || 1, item.item_id]);
        }
      }
    }

    addNotification(`Purchase ${form.voucher_no} saved`, 'success');
    setShowForm(false);
    setLineItems([]);
    loadData();
  };

  const filtered = purchases.filter(p =>
    p.voucher_no?.includes(search) || p.party_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="tabs">
        <button className={`tab ${tab === 'purchase' ? 'active' : ''}`} onClick={() => setTab('purchase')}>Purchase</button>
        <button className={`tab ${tab === 'return' ? 'active' : ''}`} onClick={() => setTab('return')}>Purchase Return</button>
        <button className={`tab ${tab === 'rates' ? 'active' : ''}`} onClick={() => setTab('rates')}>Metal Rates</button>
      </div>

      {tab === 'purchase' && (
        <div>
          <div className="toolbar">
            <div className="toolbar-left">
              <input className="search-input" placeholder="Search purchases..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="toolbar-right">
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New Purchase</button>
            </div>
          </div>

          {showForm && (
            <div className="modal-overlay" onClick={() => setShowForm(false)}>
              <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 800 }}>
                <div className="modal-header">
                  <div className="modal-title">New Purchase</div>
                  <button className="title-btn close" onClick={() => setShowForm(false)}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="grid-3" style={{ marginBottom: 16 }}>
                    <div className="form-group">
                      <label className="form-label">Voucher No</label>
                      <input className="form-input" value={form.voucher_no} onChange={e => setForm({...form, voucher_no: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Date</label>
                      <input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Supplier</label>
                      <select className="form-input" value={form.party_id} onChange={e => setForm({...form, party_id: e.target.value})}>
                        <option value="">Select Supplier</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>Purchase Items</strong>
                    <button className="btn btn-secondary btn-sm" onClick={addLineItem}>+ Add Item</button>
                  </div>

                  <div className="table-container" style={{ marginBottom: 16 }}>
                    <table>
                      <thead><tr><th>Item</th><th>Purity</th><th>Weight</th><th>Rate</th><th>Qty</th><th>Amount</th><th></th></tr></thead>
                      <tbody>
                        {lineItems.map(item => (
                          <tr key={item.id}>
                            <td>
                              <select className="form-input" value={item.item_id} onChange={e => updateLineItem(item.id, 'item_id', e.target.value)}>
                                <option value="">Select</option>
                                {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                              </select>
                            </td>
                            <td><input className="form-input" style={{ width: 60 }} value={item.purity} onChange={e => updateLineItem(item.id, 'purity', e.target.value)} /></td>
                            <td><input type="number" step="0.001" className="form-input" style={{ width: 80 }} value={item.weight} onChange={e => updateLineItem(item.id, 'weight', parseFloat(e.target.value) || 0)} /></td>
                            <td><input type="number" className="form-input" style={{ width: 80 }} value={item.rate} onChange={e => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)} /></td>
                            <td><input type="number" className="form-input" style={{ width: 60 }} value={item.qty} onChange={e => updateLineItem(item.id, 'qty', parseFloat(e.target.value) || 1)} /></td>
                            <td>{formatCurrency(item.amount)}</td>
                            <td><button className="btn btn-danger btn-sm" onClick={() => removeLineItem(item.id)}>✕</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24 }}>
                    <span>Total: <strong style={{ color: '#f59e0b' }}>{formatCurrency(form.total_amount)}</strong></span>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={savePurchase}>Save Purchase</button>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="table-container">
              <table>
                <thead><tr><th>Voucher No</th><th>Date</th><th>Supplier</th><th>Amount</th><th>Weight</th><th>Type</th></tr></thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id}>
                      <td><strong>{p.voucher_no}</strong></td>
                      <td>{p.date}</td>
                      <td>{p.party_name}</td>
                      <td>{formatCurrency(p.total_amount)}</td>
                      <td>{formatWeight(p.gold_weight)}</td>
                      <td><span className="badge badge-success">Purchase</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'rates' && <MetalRatesSection dbQuery={dbQuery} dbRun={dbRun} addNotification={addNotification} formatCurrency={formatCurrency} />}
    </div>
  );
}

function MetalRatesSection({ dbQuery, dbRun, addNotification, formatCurrency }) {
  const [rates, setRates] = useState([]);
  const [form, setForm] = useState({ metal_type: 'Gold', purity: '24K', rate_per_gram: 0, rate_date: new Date().toISOString().split('T')[0] });

  useEffect(() => { dbQuery('SELECT * FROM metal_rates ORDER BY rate_date DESC LIMIT 30').then(setRates); }, []);

  const submitRate = async () => {
    await dbRun('INSERT INTO metal_rates (id, metal_type, purity, rate_per_gram, rate_date) VALUES (?,?,?,?,?)',
      [crypto.randomUUID(), form.metal_type, form.purity, form.rate_per_gram, form.rate_date]);
    addNotification('Rate updated', 'success');
    dbQuery('SELECT * FROM metal_rates ORDER BY rate_date DESC LIMIT 30').then(setRates);
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="grid-4">
          <div className="form-group">
            <label className="form-label">Metal</label>
            <select className="form-input" value={form.metal_type} onChange={e => setForm({...form, metal_type: e.target.value})}>
              <option>Gold</option><option>Silver</option><option>Platinum</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Purity</label>
            <select className="form-input" value={form.purity} onChange={e => setForm({...form, purity: e.target.value})}>
              <option>24K</option><option>22K</option><option>18K</option><option>916</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Rate per Gram (₹)</label>
            <input type="number" className="form-input" value={form.rate_per_gram} onChange={e => setForm({...form, rate_per_gram: parseFloat(e.target.value) || 0})} />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-primary" onClick={submitRate}>Set Rate</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Date</th><th>Metal</th><th>Purity</th><th>Rate/g</th></tr></thead>
            <tbody>
              {rates.map(r => (
                <tr key={r.id}>
                  <td>{r.rate_date}</td>
                  <td>{r.metal_type}</td>
                  <td>{r.purity}</td>
                  <td><strong>{formatCurrency(r.rate_per_gram)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
