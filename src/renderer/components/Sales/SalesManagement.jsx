import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';

export default function SalesManagement() {
  const { setPageTitle, formatCurrency, formatWeight, dbQuery, dbRun, addNotification } = useContext(AppContext);
  const [tab, setTab] = useState('retail');
  const [invoices, setInvoices] = useState([]);
  const [parties, setParties] = useState([]);
  const [items, setItems] = useState([]);
  const [showInvoice, setShowInvoice] = useState(false);
  const [search, setSearch] = useState('');

  const [invoice, setInvoice] = useState({
    voucher_no: 'SALE-' + Date.now().toString(36).toUpperCase(),
    date: new Date().toISOString().split('T')[0],
    party_id: '', narration: '', total_amount: 0, gold_weight: 0,
    voucher_type: 'Sale_Retail', payment_mode: 'Cash'
  });
  const [lineItems, setLineItems] = useState([]);

  useEffect(() => {
    setPageTitle('Sales Management');
    loadData();
  }, []);

  const loadData = async () => {
    const invData = await dbQuery(`
      SELECT t.*, p.name as party_name FROM transactions t
      LEFT JOIN parties p ON t.party_id = p.id
      WHERE t.voucher_type IN ('Sale_Retail','Sale_Wholesale')
      ORDER BY t.created_at DESC LIMIT 50
    `);
    setInvoices(invData);
    const partyData = await dbQuery("SELECT * FROM parties WHERE type IN ('Customer','Both') ORDER BY name");
    setParties(partyData);
    const itemData = await dbQuery("SELECT * FROM items WHERE status='active' ORDER BY name");
    setItems(itemData);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      id: crypto.randomUUID(), item_id: '', barcode: '', weight: 0,
      stone_weight: 0, purity: '22K', rate: 0, making_charges: 0,
      wastage_charges: 0, discount: 0, amount: 0, qty: 1
    }]);
  };

  const updateLineItem = (id, field, value) => {
    const updated = lineItems.map(item => {
      if (item.id !== id) return item;
      const newItem = { ...item, [field]: value };
      if (field === 'item_id') {
        const selected = items.find(i => i.id === value);
        if (selected) {
          newItem.rate = selected.selling_price || 0;
          newItem.purity = selected.purity || '22K';
          newItem.weight = selected.weight || 0;
          newItem.stone_weight = selected.stone_weight || 0;
          newItem.making_charges = selected.making_charges || 0;
        }
      }
      newItem.amount = (newItem.qty || 1) * (newItem.rate || 0) + (newItem.making_charges || 0) - (newItem.discount || 0);
      return newItem;
    });
    setLineItems(updated);
    calcTotal(updated);
  };

  const calcTotal = (items) => {
    const total = items.reduce((sum, i) => sum + (i.amount || 0), 0);
    const wt = items.reduce((sum, i) => sum + (i.weight || 0), 0);
    setInvoice(prev => ({ ...prev, total_amount: total, gold_weight: wt }));
  };

  const removeLineItem = (id) => {
    const updated = lineItems.filter(i => i.id !== id);
    setLineItems(updated);
    calcTotal(updated);
  };

  const saveInvoice = async () => {
    if (!invoice.party_id) {
      addNotification('Please select a customer', 'error');
      return;
    }
    if (lineItems.length === 0) {
      addNotification('Add at least one item', 'error');
      return;
    }

    const txId = crypto.randomUUID();
    await dbRun(`INSERT INTO transactions (id, voucher_no, voucher_type, date, party_id, narration, total_amount, gold_weight) VALUES (?,?,?,?,?,?,?,?)`,
      [txId, invoice.voucher_no, invoice.voucher_type, invoice.date, invoice.party_id,
       invoice.narration, invoice.total_amount, invoice.gold_weight]);

    for (const item of lineItems) {
      await dbRun(`INSERT INTO sale_invoice_items (id, transaction_id, item_id, barcode, weight, stone_weight, purity, rate, making_charges, wastage_charges, discount, amount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [crypto.randomUUID(), txId, item.item_id, item.barcode, item.weight,
         item.stone_weight, item.purity, item.rate, item.making_charges,
         item.wastage_charges, item.discount, item.amount]);

      if (item.item_id) {
        await dbRun('UPDATE items SET current_qty = current_qty - ? WHERE id = ?', [item.qty || 1, item.item_id]);
      }
    }

    addNotification(`Invoice ${invoice.voucher_no} created successfully`, 'success');
    setShowInvoice(false);
    resetInvoice();
    loadData();
  };

  const resetInvoice = () => {
    setInvoice({
      voucher_no: 'SALE-' + Date.now().toString(36).toUpperCase(),
      date: new Date().toISOString().split('T')[0],
      party_id: '', narration: '', total_amount: 0, gold_weight: 0,
      voucher_type: tab === 'retail' ? 'Sale_Retail' : 'Sale_Wholesale', payment_mode: 'Cash'
    });
    setLineItems([]);
  };

  const filtered = invoices.filter(i =>
    i.voucher_no?.includes(search) || i.party_name?.toLowerCase().includes(search.toLowerCase())
  );

  const renderInvoiceForm = () => (
    <div className="modal-overlay" onClick={() => setShowInvoice(false)}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 800 }}>
        <div className="modal-header">
          <div className="modal-title">New {tab === 'retail' ? 'Retail' : 'Wholesale'} Sale Invoice</div>
          <button className="title-btn close" onClick={() => setShowInvoice(false)}>✕</button>
        </div>
        <div className="modal-body">
          <div className="grid-4" style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">Voucher No</label>
              <input className="form-input" value={invoice.voucher_no} onChange={e => setInvoice({...invoice, voucher_no: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={invoice.date} onChange={e => setInvoice({...invoice, date: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Customer</label>
              <select className="form-input" value={invoice.party_id} onChange={e => setInvoice({...invoice, party_id: e.target.value})}>
                <option value="">Select Customer</option>
                {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Payment Mode</label>
              <select className="form-input" value={invoice.payment_mode} onChange={e => setInvoice({...invoice, payment_mode: e.target.value})}>
                <option>Cash</option><option>Credit Card</option><option>UPI</option><option>Both</option><option>Exchange</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Invoice Items</strong>
            <button className="btn btn-secondary btn-sm" onClick={addLineItem}>+ Add Item</button>
          </div>

          <div className="table-container" style={{ marginBottom: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Item</th><th>Purity</th><th>Weight</th><th>Rate</th>
                  <th>Making</th><th>Disc</th><th>Amount</th><th></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map(item => (
                  <tr key={item.id}>
                    <td>
                      <select className="form-input" value={item.item_id} onChange={e => updateLineItem(item.id, 'item_id', e.target.value)}>
                        <option value="">Select</option>
                        {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.code})</option>)}
                      </select>
                    </td>
                    <td><input className="form-input" style={{ width: 60 }} value={item.purity} onChange={e => updateLineItem(item.id, 'purity', e.target.value)} /></td>
                    <td><input type="number" step="0.001" className="form-input" style={{ width: 80 }} value={item.weight} onChange={e => updateLineItem(item.id, 'weight', parseFloat(e.target.value) || 0)} /></td>
                    <td><input type="number" className="form-input" style={{ width: 80 }} value={item.rate} onChange={e => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)} /></td>
                    <td><input type="number" className="form-input" style={{ width: 70 }} value={item.making_charges} onChange={e => updateLineItem(item.id, 'making_charges', parseFloat(e.target.value) || 0)} /></td>
                    <td><input type="number" className="form-input" style={{ width: 70 }} value={item.discount} onChange={e => updateLineItem(item.id, 'discount', parseFloat(e.target.value) || 0)} /></td>
                    <td>{formatCurrency(item.amount)}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => removeLineItem(item.id)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, fontSize: 14 }}>
            <span>Total Weight: <strong>{formatWeight(invoice.gold_weight)}</strong></span>
            <span>Total Amount: <strong style={{ color: '#f59e0b' }}>{formatCurrency(invoice.total_amount)}</strong></span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowInvoice(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveInvoice}>Save Invoice</button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="tabs">
        <button className={`tab ${tab === 'retail' ? 'active' : ''}`} onClick={() => setTab('retail')}>Retail Sale</button>
        <button className={`tab ${tab === 'wholesale' ? 'active' : ''}`} onClick={() => setTab('wholesale')}>Wholesale Sale</button>
        <button className={`tab ${tab === 'estimate' ? 'active' : ''}`} onClick={() => setTab('estimate')}>Estimate/Quotation</button>
        <button className={`tab ${tab === 'order' ? 'active' : ''}`} onClick={() => setTab('order')}>Orders</button>
        <button className={`tab ${tab === 'karagir' ? 'active' : ''}`} onClick={() => setTab('karagir')}>Karagir Nave/Jama</button>
      </div>

      {(tab === 'retail' || tab === 'wholesale') && (
        <div>
          <div className="toolbar">
            <div className="toolbar-left">
              <input className="search-input" placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="toolbar-right">
              <button className="btn btn-primary" onClick={() => {
                resetInvoice();
                setInvoice(prev => ({ ...prev, voucher_type: tab === 'retail' ? 'Sale_Retail' : 'Sale_Wholesale' }));
                setShowInvoice(true);
              }}>
                + New {tab === 'retail' ? 'Retail' : 'Wholesale'} Invoice
              </button>
            </div>
          </div>

          <div className="card">
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Voucher No</th><th>Date</th><th>Customer</th><th>Amount</th><th>Gold Wt</th><th>Type</th></tr>
                </thead>
                <tbody>
                  {filtered.map(inv => (
                    <tr key={inv.id}>
                      <td><strong>{inv.voucher_no}</strong></td>
                      <td>{inv.date}</td>
                      <td>{inv.party_name || 'Walk-in'}</td>
                      <td>{formatCurrency(inv.total_amount)}</td>
                      <td>{formatWeight(inv.gold_weight)}</td>
                      <td><span className="badge badge-info">{inv.voucher_type === 'Sale_Retail' ? 'Retail' : 'Wholesale'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {showInvoice && renderInvoiceForm()}
        </div>
      )}

      {tab === 'estimate' && <EstimateSection dbQuery={dbQuery} dbRun={dbRun} addNotification={addNotification} parties={parties} items={items} formatCurrency={formatCurrency} formatWeight={formatWeight} />}
      {tab === 'order' && <OrderSection dbQuery={dbQuery} dbRun={dbRun} addNotification={addNotification} formatCurrency={formatCurrency} />}
      {tab === 'karagir' && <KaragirSection dbQuery={dbQuery} dbRun={dbRun} addNotification={addNotification} formatCurrency={formatCurrency} formatWeight={formatWeight} />}
    </div>
  );
}

function EstimateSection({ dbQuery, dbRun, addNotification, parties, items, formatCurrency, formatWeight }) {
  return (
    <div className="card">
      <p style={{ color: '#64748b', marginBottom: 16 }}>Create and manage estimate memos (quotations) for customers.</p>
      <button className="btn btn-primary">+ New Estimate</button>
    </div>
  );
}

function OrderSection({ dbQuery, dbRun, addNotification, formatCurrency }) {
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    dbQuery("SELECT t.*, p.name as party_name FROM transactions t LEFT JOIN parties p ON t.party_id = p.id WHERE t.voucher_type='Order' ORDER BY t.created_at DESC").then(setOrders);
  }, []);
  return (
    <div className="card">
      <div className="table-container">
        <table>
          <thead><tr><th>Order No</th><th>Date</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td>{o.voucher_no}</td><td>{o.date}</td><td>{o.party_name}</td>
                <td>{formatCurrency(o.total_amount)}</td>
                <td><span className="badge badge-warning">{o.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KaragirSection({ dbQuery, dbRun, addNotification, formatCurrency, formatWeight }) {
  const [karagirs, setKaragirs] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({ karagir_id: '', type: 'Nave', gold_given: 0, gold_received: 0, making_charges: 0, amount: 0, due_date: '' });

  useEffect(() => {
    dbQuery("SELECT * FROM parties WHERE type='Karagir' ORDER BY name").then(setKaragirs);
    dbQuery(`
      SELECT kt.*, p.name as karagir_name FROM karagir_transactions kt
      LEFT JOIN parties p ON kt.karagir_id = p.id
      ORDER BY kt.rowid DESC LIMIT 50
    `).then(setTransactions);
  }, []);

  const submitKaragir = async () => {
    if (!form.karagir_id) { addNotification('Select a karagir', 'error'); return; }
    const txId = crypto.randomUUID();
    await dbRun('INSERT INTO transactions (id, voucher_no, voucher_type, date, party_id, total_amount) VALUES (?,?,?,?,?,?)',
      [txId, 'KAR-' + Date.now().toString(36).toUpperCase(), form.type === 'Nave' ? 'Karagir_Nave' : 'Karagir_Jama',
       new Date().toISOString().split('T')[0], form.karagir_id, form.amount]);
    await dbRun('INSERT INTO karagir_transactions (id, transaction_id, karagir_id, type, gold_given_weight, gold_received_weight, making_charges, amount, due_date) VALUES (?,?,?,?,?,?,?,?,?)',
      [crypto.randomUUID(), txId, form.karagir_id, form.type, form.gold_given, form.gold_received, form.making_charges, form.amount, form.due_date]);
    addNotification('Karagir transaction saved', 'success');
    setForm({ karagir_id: '', type: 'Nave', gold_given: 0, gold_received: 0, making_charges: 0, amount: 0, due_date: '' });
    dbQuery(`SELECT kt.*, p.name as karagir_name FROM karagir_transactions kt LEFT JOIN parties p ON kt.karagir_id = p.id ORDER BY kt.rowid DESC LIMIT 50`).then(setTransactions);
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="grid-4">
          <div className="form-group">
            <label className="form-label">Karagir</label>
            <select className="form-input" value={form.karagir_id} onChange={e => setForm({...form, karagir_id: e.target.value})}>
              <option value="">Select Karagir</option>
              {karagirs.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
              <option>Nave</option><option>Jama</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Gold Given (g)</label>
            <input type="number" step="0.001" className="form-input" value={form.gold_given} onChange={e => setForm({...form, gold_given: parseFloat(e.target.value) || 0})} />
          </div>
          <div className="form-group">
            <label className="form-label">Gold Received (g)</label>
            <input type="number" step="0.001" className="form-input" value={form.gold_received} onChange={e => setForm({...form, gold_received: parseFloat(e.target.value) || 0})} />
          </div>
          <div className="form-group">
            <label className="form-label">Making Charges</label>
            <input type="number" className="form-input" value={form.making_charges} onChange={e => setForm({...form, making_charges: parseFloat(e.target.value) || 0})} />
          </div>
          <div className="form-group">
            <label className="form-label">Amount</label>
            <input type="number" className="form-input" value={form.amount} onChange={e => setForm({...form, amount: parseFloat(e.target.value) || 0})} />
          </div>
          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input type="date" className="form-input" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-primary" onClick={submitKaragir}>Submit</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Karagir</th><th>Type</th><th>Gold Given</th><th>Gold Received</th><th>Making</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id}>
                  <td>{t.karagir_name}</td>
                  <td><span className={`badge ${t.type === 'Nave' ? 'badge-info' : 'badge-success'}`}>{t.type}</span></td>
                  <td>{formatWeight(t.gold_given_weight)}</td>
                  <td>{formatWeight(t.gold_received_weight)}</td>
                  <td>{formatCurrency(t.making_charges)}</td>
                  <td>{formatCurrency(t.amount)}</td>
                  <td><span className={`badge ${t.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
