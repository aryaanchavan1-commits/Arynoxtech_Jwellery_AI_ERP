import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { AuthContext } from '../../contexts/AuthContext';

const DEFAULT_HSN_CODES = [
  { code: '71131100', description: 'Silver jewellery', gst_rate: 3.0, category: 'Silver' },
  { code: '71131910', description: 'Gold jewellery', gst_rate: 3.0, category: 'Gold' },
  { code: '71131920', description: 'Platinum jewellery', gst_rate: 3.0, category: 'Platinum' },
  { code: '71131930', description: 'Diamond jewellery', gst_rate: 3.0, category: 'Diamond' },
  { code: '71131940', description: 'Stone-studded jewellery', gst_rate: 3.0, category: 'Stone' },
  { code: '71023100', description: 'Rough diamonds', gst_rate: 0.25, category: 'Diamond' },
  { code: '71023900', description: 'Cut/polished diamonds', gst_rate: 0.25, category: 'Diamond' },
  { code: '71031000', description: 'Precious stones', gst_rate: 0.25, category: 'Stone' },
  { code: '71039100', description: 'Rubies/sapphires/emeralds', gst_rate: 0.25, category: 'Stone' },
  { code: '71039900', description: 'Other precious stones', gst_rate: 0.25, category: 'Stone' },
];

export default function GSTModule() {
  const { setPageTitle, formatCurrency, dbQuery, dbRun, addNotification } = useContext(AppContext);
  const { user } = useContext(AuthContext);
  const [tab, setTab] = useState('hsn');

  useEffect(() => { setPageTitle('GST Management'); }, []);

  const tabs = [
    { id: 'hsn', label: 'HSN Codes', component: HSNCodeSection },
    { id: 'invoices', label: 'GST Invoices', component: GSTInvoiceSection },
    { id: 'gstr1', label: 'GSTR-1 Report', component: GSTR1Section },
    { id: 'gstr3b', label: 'GSTR-3B Summary', component: GSTR3BSection },
  ];

  const ActiveTab = tabs.find(t => t.id === tab)?.component;
  return (
    <div>
      <div className="tabs">{tabs.map(t => <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>
      {ActiveTab && <ActiveTab />}
    </div>
  );
}

function HSNCodeSection() {
  const { dbQuery, dbRun, addNotification, formatCurrency } = useContext(AppContext);
  const [hsnCodes, setHsnCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [form, setForm] = useState({ code: '', description: '', gst_rate: 3.0, category: 'Gold', igst: 0, cgst: 0, sgst: 0, cess: 0 });
  const [search, setSearch] = useState('');

  useEffect(() => { loadHSNCodes(); }, []);

  const loadHSNCodes = async () => {
    setLoading(true);
    setError(null);
    try {
      let codes = await dbQuery('SELECT * FROM hsn_codes ORDER BY code');
      if (!codes || codes.length === 0) {
        for (const hsn of DEFAULT_HSN_CODES) {
          await dbRun('INSERT OR IGNORE INTO hsn_codes (id, code, description, gst_rate, category) VALUES (?,?,?,?,?)',
            [crypto.randomUUID(), hsn.code, hsn.description, hsn.gst_rate, hsn.category]);
        }
        codes = await dbQuery('SELECT * FROM hsn_codes ORDER BY code');
      }
      setHsnCodes(codes || []);
    } catch (err) {
      setError(err.message);
      addNotification('Failed to load HSN codes: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateGST = (rate) => {
    const r = parseFloat(rate) || 0;
    const half = r / 2;
    return { igst: r, cgst: half, sgst: half };
  };

  const openForm = (hsn = null) => {
    if (hsn) {
      const gst = calculateGST(hsn.gst_rate);
      setForm({ code: hsn.code, description: hsn.description, gst_rate: hsn.gst_rate, category: hsn.category || 'Gold', igst: gst.igst, cgst: gst.cgst, sgst: gst.sgst, cess: hsn.cess || 0 });
      setEditMode(hsn);
    } else {
      setForm({ code: '', description: '', gst_rate: 3.0, category: 'Gold', igst: 1.5, cgst: 1.5, sgst: 1.5, cess: 0 });
      setEditMode(null);
    }
    setShowForm(true);
  };

  const saveHSN = async () => {
    if (!form.code || !form.description) { addNotification('Code and description are required', 'error'); return; }
    if (!form.gst_rate || parseFloat(form.gst_rate) <= 0) { addNotification('Valid GST rate is required', 'error'); return; }
    const gst = calculateGST(form.gst_rate);
    try {
      if (editMode) {
        await dbRun('UPDATE hsn_codes SET code=?, description=?, gst_rate=?, category=?, cess=? WHERE id=?',
          [form.code, form.description, form.gst_rate, form.category, form.cess, editMode.id]);
        addNotification(`HSN ${form.code} updated`, 'success');
      } else {
        const existing = await dbQuery('SELECT id FROM hsn_codes WHERE code=?', [form.code]);
        if (existing && existing.length > 0) { addNotification('HSN code already exists', 'error'); return; }
        await dbRun('INSERT INTO hsn_codes (id, code, description, gst_rate, category, cess) VALUES (?,?,?,?,?,?)',
          [crypto.randomUUID(), form.code, form.description, form.gst_rate, form.category, form.cess]);
        addNotification(`HSN ${form.code} created`, 'success');
      }
      setShowForm(false);
      loadHSNCodes();
    } catch (err) {
      addNotification('Error saving HSN: ' + err.message, 'error');
    }
  };

  const deleteHSN = async (hsn) => {
    if (!confirm(`Delete HSN code ${hsn.code} - ${hsn.description}?`)) return;
    try {
      await dbRun('DELETE FROM hsn_codes WHERE id=?', [hsn.id]);
      addNotification(`HSN ${hsn.code} deleted`, 'info');
      loadHSNCodes();
    } catch (err) {
      addNotification('Error deleting HSN: ' + err.message, 'error');
    }
  };

  const updateRate = (rate) => {
    const r = parseFloat(rate) || 0;
    const gst = calculateGST(r);
    setForm(prev => ({ ...prev, gst_rate: r, igst: gst.igst, cgst: gst.cgst, sgst: gst.sgst }));
  };

  const filtered = hsnCodes.filter(h => h.code?.includes(search) || h.description?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="loading-spinner" />;
  if (error) return <div className="card"><div className="empty-state"><div className="empty-state-icon">⚠️</div><div className="empty-state-text">Error loading HSN codes</div><div className="empty-state-hint">{error}</div></div></div>;

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-left"><input className="search-input" placeholder="Search HSN codes..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="toolbar-right"><button className="btn btn-primary" onClick={() => openForm()}>+ Add HSN Code</button></div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">{editMode ? '✏️ Edit HSN Code' : '➕ Add HSN Code'}</div><button className="title-btn close" onClick={() => setShowForm(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-row-4 mb-4">
                <div className="form-group"><label className="form-label">HSN Code</label><input className="form-input" value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="8-digit code" maxLength={8} /></div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Description</label><input className="form-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Item description" /></div>
                <div className="form-group"><label className="form-label">Category</label>
                  <select className="form-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    <option value="Gold">Gold</option><option value="Silver">Silver</option><option value="Platinum">Platinum</option><option value="Diamond">Diamond</option><option value="Stone">Stone</option><option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-row-4 mb-4">
                <div className="form-group"><label className="form-label">GST Rate (%)</label><input type="number" step="0.01" className="form-input" value={form.gst_rate} onChange={e => updateRate(e.target.value)} /></div>
                <div className="form-group"><label className="form-label">IGST (%)</label><input type="number" className="form-input" value={form.igst} readOnly style={{ opacity: 0.7 }} /></div>
                <div className="form-group"><label className="form-label">CGST (%)</label><input type="number" className="form-input" value={form.cgst} readOnly style={{ opacity: 0.7 }} /></div>
                <div className="form-group"><label className="form-label">SGST (%)</label><input type="number" className="form-input" value={form.sgst} readOnly style={{ opacity: 0.7 }} /></div>
                <div className="form-group"><label className="form-label">Cess (%)</label><input type="number" step="0.01" className="form-input" value={form.cess} onChange={e => setForm({...form, cess: parseFloat(e.target.value) || 0})} /></div>
              </div>
              <div style={{ padding: '8px 12px', background: 'rgba(245,158,11,0.08)', borderRadius: 8, fontSize: 12, color: '#94a3b8' }}>
                GST Rate {form.gst_rate}% → IGST: {form.igst}% | CGST: {form.cgst}% | SGST: {form.sgst}%
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={saveHSN}>💾 Save HSN Code</button></div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-text">No HSN codes found</div><div className="empty-state-hint">{search ? 'Try a different search term' : 'Click + Add HSN Code to create one'}</div></div></div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead><tr><th>HSN Code</th><th>Description</th><th>Category</th><th>GST Rate</th><th>IGST</th><th>CGST</th><th>SGST</th><th>Cess</th><th></th></tr></thead>
              <tbody>
                {filtered.map(hsn => {
                  const gst = calculateGST(hsn.gst_rate);
                  return (
                    <tr key={hsn.id || hsn.code}>
                      <td><span className="badge badge-gold fw-bold">{hsn.code}</span></td>
                      <td>{hsn.description}</td>
                      <td><span className="badge badge-info">{hsn.category || '-'}</span></td>
                      <td className="fw-bold text-gold">{hsn.gst_rate}%</td>
                      <td>{gst.igst}%</td>
                      <td className="text-green">{gst.cgst}%</td>
                      <td className="text-green">{gst.sgst}%</td>
                      <td>{hsn.cess ? hsn.cess + '%' : '-'}</td>
                      <td>
                        <div className="btn-group">
                          <button className="btn btn-xs btn-secondary" onClick={() => openForm(hsn)} title="Edit">✏️</button>
                          <button className="btn btn-xs btn-danger" onClick={() => deleteHSN(hsn)} title="Delete">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function GSTInvoiceSection() {
  const { dbQuery, dbRun, addNotification, formatCurrency } = useContext(AppContext);
  const [transactions, setTransactions] = useState([]);
  const [hsnCodes, setHsnCodes] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [invoice, setInvoice] = useState({
    voucher_no: '', date: new Date().toISOString().split('T')[0],
    party_id: '', narration: '', is_inter_state: false,
  });
  const [lineItems, setLineItems] = useState([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const txs = await dbQuery(`
        SELECT t.*, p.name as party_name, p.gstin as party_gstin
        FROM transactions t LEFT JOIN parties p ON t.party_id = p.id
        WHERE t.voucher_type = 'GST_Invoice' ORDER BY t.created_at DESC LIMIT 200
      `);
      setTransactions(txs || []);
      let hsn = await dbQuery('SELECT * FROM hsn_codes ORDER BY code');
      if (!hsn || hsn.length === 0) {
        for (const h of DEFAULT_HSN_CODES) {
          await dbRun('INSERT OR IGNORE INTO hsn_codes (id,code,description,gst_rate,category) VALUES (?,?,?,?,?)',
            [crypto.randomUUID(), h.code, h.description, h.gst_rate, h.category]);
        }
        hsn = await dbQuery('SELECT * FROM hsn_codes ORDER BY code');
      }
      setHsnCodes(hsn || []);
      setParties(await dbQuery("SELECT * FROM parties WHERE type IN ('Customer','Both') ORDER BY name"));
    } catch (err) {
      addNotification('Error loading data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const genVoucherNo = async () => {
    const existing = await dbQuery("SELECT COUNT(*) as cnt FROM transactions WHERE voucher_type='GST_Invoice'");
    const num = (existing?.[0]?.cnt || 0) + 1;
    setInvoice(prev => ({ ...prev, voucher_no: `GST-${String(num).padStart(4, '0')}` }));
  };

  const openNewInvoice = async () => {
    setInvoice({
      voucher_no: '', date: new Date().toISOString().split('T')[0],
      party_id: '', narration: '', is_inter_state: false,
    });
    setLineItems([]);
    await genVoucherNo();
    setShowForm(true);
  };

  const addLineItem = () => setLineItems([...lineItems, {
    id: crypto.randomUUID(), hsn_code: '', description: '', qty: 1, taxable_value: 0,
    gst_rate: 3.0, igst: 0, cgst: 0, sgst: 0, cess: 0, total: 0
  }]);

  const updateLineItem = (id, field, value) => {
    const updated = lineItems.map(item => {
      if (item.id !== id) return item;
      const newItem = { ...item, [field]: value };
      if (field === 'hsn_code') {
        const hsn = hsnCodes.find(h => h.code === value);
        if (hsn) {
          const half = hsn.gst_rate / 2;
          newItem.description = hsn.description;
          newItem.gst_rate = hsn.gst_rate;
          newItem.igst = invoice.is_inter_state ? hsn.gst_rate : 0;
          newItem.cgst = invoice.is_inter_state ? 0 : half;
          newItem.sgst = invoice.is_inter_state ? 0 : half;
          newItem.cess = hsn.cess || 0;
        }
      }
      if (field === 'is_inter_state') {
        const hsn = hsnCodes.find(h => h.code === newItem.hsn_code);
        const rate = newItem.gst_rate;
        const half = rate / 2;
        newItem.is_inter_state = value;
        newItem.igst = value ? rate : 0;
        newItem.cgst = value ? 0 : half;
        newItem.sgst = value ? 0 : half;
      }
      const taxable = parseFloat(newItem.taxable_value) || 0;
      const qty = parseFloat(newItem.qty) || 1;
      const base = taxable * qty;
      const igstAmt = base * newItem.igst / 100;
      const cgstAmt = base * newItem.cgst / 100;
      const sgstAmt = base * newItem.sgst / 100;
      const cessAmt = base * (newItem.cess || 0) / 100;
      newItem.total = base + igstAmt + cgstAmt + sgstAmt + cessAmt;
      return newItem;
    });
    setLineItems(updated);
  };

  const removeLineItem = (id) => setLineItems(lineItems.filter(i => i.id !== id));

  const saveInvoice = async () => {
    if (lineItems.length === 0) { addNotification('Add at least one line item', 'error'); return; }
    if (!invoice.voucher_no) { addNotification('Voucher number required', 'error'); return; }
    const totalTaxable = lineItems.reduce((s, i) => s + (parseFloat(i.taxable_value) || 0) * (parseFloat(i.qty) || 1), 0);
    const totalIGST = lineItems.reduce((s, i) => s + ((parseFloat(i.taxable_value) || 0) * (parseFloat(i.qty) || 1) * i.igst / 100), 0);
    const totalCGST = lineItems.reduce((s, i) => s + ((parseFloat(i.taxable_value) || 0) * (parseFloat(i.qty) || 1) * i.cgst / 100), 0);
    const totalSGST = lineItems.reduce((s, i) => s + ((parseFloat(i.taxable_value) || 0) * (parseFloat(i.qty) || 1) * i.sgst / 100), 0);
    const totalCess = lineItems.reduce((s, i) => s + ((parseFloat(i.taxable_value) || 0) * (parseFloat(i.qty) || 1) * (i.cess || 0) / 100), 0);
    const grandTotal = totalTaxable + totalIGST + totalCGST + totalSGST + totalCess;

    try {
      const txId = crypto.randomUUID();
      await dbRun(
        'INSERT INTO transactions (id,voucher_no,voucher_type,date,party_id,narration,total_amount,is_inter_state) VALUES (?,?,?,?,?,?,?,?)',
        [txId, invoice.voucher_no, 'GST_Invoice', invoice.date, invoice.party_id || null, invoice.narration, grandTotal, invoice.is_inter_state ? 1 : 0]
      );
      for (const item of lineItems) {
        await dbRun(
          'INSERT INTO gst_invoice_items (id,transaction_id,hsn_code,description,qty,taxable_value,gst_rate,igst_rate,cgst_rate,sgst_rate,cess_rate,igst_amount,cgst_amount,sgst_amount,cess_amount,total) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
          [crypto.randomUUID(), txId, item.hsn_code, item.description, item.qty, item.taxable_value, item.gst_rate,
           item.igst, item.cgst, item.sgst, item.cess || 0,
           (parseFloat(item.taxable_value) || 0) * (parseFloat(item.qty) || 1) * item.igst / 100,
           (parseFloat(item.taxable_value) || 0) * (parseFloat(item.qty) || 1) * item.cgst / 100,
           (parseFloat(item.taxable_value) || 0) * (parseFloat(item.qty) || 1) * item.sgst / 100,
           (parseFloat(item.taxable_value) || 0) * (parseFloat(item.qty) || 1) * (item.cess || 0) / 100,
           item.total]
        );
      }
      addNotification(`GST Invoice ${invoice.voucher_no} created`, 'success');
      setShowForm(false);
      loadData();
    } catch (err) {
      addNotification('Error saving invoice: ' + err.message, 'error');
    }
  };

  const toggleInterState = () => {
    const newVal = !invoice.is_inter_state;
    setInvoice(prev => ({ ...prev, is_inter_state: newVal }));
    setLineItems(lineItems.map(item => {
      const half = item.gst_rate / 2;
      return {
        ...item,
        igst: newVal ? item.gst_rate : 0,
        cgst: newVal ? 0 : half,
        sgst: newVal ? 0 : half,
        total: ((parseFloat(item.taxable_value) || 0) * (parseFloat(item.qty) || 1)) * (1 + (newVal ? item.gst_rate : half + half) / 100) + ((parseFloat(item.taxable_value) || 0) * (parseFloat(item.qty) || 1) * (item.cess || 0) / 100)
      };
    }));
  };

  const totals = {
    taxable: lineItems.reduce((s, i) => s + (parseFloat(i.taxable_value) || 0) * (parseFloat(i.qty) || 1), 0),
    igst: lineItems.reduce((s, i) => s + ((parseFloat(i.taxable_value) || 0) * (parseFloat(i.qty) || 1) * i.igst / 100), 0),
    cgst: lineItems.reduce((s, i) => s + ((parseFloat(i.taxable_value) || 0) * (parseFloat(i.qty) || 1) * i.cgst / 100), 0),
    sgst: lineItems.reduce((s, i) => s + ((parseFloat(i.taxable_value) || 0) * (parseFloat(i.qty) || 1) * i.sgst / 100), 0),
    cess: lineItems.reduce((s, i) => s + ((parseFloat(i.taxable_value) || 0) * (parseFloat(i.qty) || 1) * (i.cess || 0) / 100), 0),
  };
  totals.grand = totals.taxable + totals.igst + totals.cgst + totals.sgst + totals.cess;

  const filtered = transactions.filter(t => t.voucher_no?.includes(search) || t.party_name?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="loading-spinner" />;

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-left"><input className="search-input" placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="toolbar-right"><button className="btn btn-primary" onClick={openNewInvoice}>+ New GST Invoice</button></div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">🧾 GST Invoice Entry</div><button className="title-btn close" onClick={() => setShowForm(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-row-4 mb-4">
                <div className="form-group"><label className="form-label">Invoice No</label><input className="form-input" value={invoice.voucher_no} onChange={e => setInvoice({...invoice, voucher_no: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={invoice.date} onChange={e => setInvoice({...invoice, date: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Customer</label>
                  <select className="form-input" value={invoice.party_id} onChange={e => setInvoice({...invoice, party_id: e.target.value})}>
                    <option value="">Walk-in Customer</option>{parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 22 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: '#94a3b8' }}>
                    <input type="checkbox" checked={invoice.is_inter_state} onChange={toggleInterState} /> Inter-State (IGST)
                  </label>
                </div>
              </div>
              <div className="flex-between mb-4">
                <strong>Invoice Items</strong>
                <button className="btn btn-secondary btn-sm" onClick={addLineItem}>+ Add Item</button>
              </div>
              <div className="table-container mb-4" style={{ maxHeight: 300, overflowY: 'auto' }}>
                <table>
                  <thead><tr><th>HSN Code</th><th>Description</th><th>Qty</th><th>Taxable Value</th><th>IGST</th><th>CGST</th><th>SGST</th><th>Cess</th><th>Total</th><th></th></tr></thead>
                  <tbody>
                    {lineItems.map(item => (
                      <tr key={item.id}>
                        <td>
                          <select className="form-input" value={item.hsn_code} onChange={e => updateLineItem(item.id, 'hsn_code', e.target.value)} style={{ width: 130 }}>
                            <option value="">Select</option>{hsnCodes.map(h => <option key={h.code} value={h.code}>{h.code}</option>)}
                          </select>
                        </td>
                        <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description || '-'}</td>
                        <td><input type="number" min="1" className="form-input" style={{ width: 60 }} value={item.qty} onChange={e => updateLineItem(item.id, 'qty', parseInt(e.target.value) || 1)} /></td>
                        <td><input type="number" step="0.01" className="form-input" style={{ width: 110 }} value={item.taxable_value || ''} onChange={e => { const v = e.target.value; updateLineItem(item.id, 'taxable_value', v === '' ? 0 : parseFloat(v) || 0); }} /></td>
                        <td className="fw-bold text-blue">{item.igst > 0 ? formatCurrency(((parseFloat(item.taxable_value) || 0) * (parseFloat(item.qty) || 1) * item.igst / 100)) : '-'}</td>
                        <td className="fw-bold text-green">{item.cgst > 0 ? formatCurrency(((parseFloat(item.taxable_value) || 0) * (parseFloat(item.qty) || 1) * item.cgst / 100)) : '-'}</td>
                        <td className="fw-bold text-green">{item.sgst > 0 ? formatCurrency(((parseFloat(item.taxable_value) || 0) * (parseFloat(item.qty) || 1) * item.sgst / 100)) : '-'}</td>
                        <td className="text-muted">{item.cess > 0 ? item.cess + '%' : '-'}</td>
                        <td className="fw-bold text-gold">{formatCurrency(item.total)}</td>
                        <td><button className="btn btn-danger btn-xs" onClick={() => removeLineItem(item.id)}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {lineItems.length > 0 && (
                <div className="card" style={{ background: 'var(--bg-primary)', padding: 12, marginBottom: 8 }}>
                  <div className="flex-between">
                    <div style={{ display: 'flex', gap: 20, fontSize: 12 }}>
                      <span>Taxable: <strong>{formatCurrency(totals.taxable)}</strong></span>
                      {totals.igst > 0 && <span>IGST: <strong className="text-blue">{formatCurrency(totals.igst)}</strong></span>}
                      {totals.cgst > 0 && <span>CGST: <strong className="text-green">{formatCurrency(totals.cgst)}</strong></span>}
                      {totals.sgst > 0 && <span>SGST: <strong className="text-green">{formatCurrency(totals.sgst)}</strong></span>}
                      {totals.cess > 0 && <span>Cess: <strong>{formatCurrency(totals.cess)}</strong></span>}
                    </div>
                    <div style={{ fontSize: 16 }}>Grand Total: <strong className="text-gold">{formatCurrency(totals.grand)}</strong></div>
                  </div>
                </div>
              )}
              <div className="form-group"><label className="form-label">Narration</label><input className="form-input" value={invoice.narration} onChange={e => setInvoice({...invoice, narration: e.target.value})} placeholder="Optional notes..." /></div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={saveInvoice}>💾 Save Invoice</button></div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-state-icon">🧾</div><div className="empty-state-text">No GST invoices found</div><div className="empty-state-hint">{search ? 'Try a different search term' : 'Click + New GST Invoice to create one'}</div></div></div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead><tr><th>Invoice No</th><th>Date</th><th>Customer</th><th>Taxable Value</th><th>IGST</th><th>CGST</th><th>SGST</th><th>Total</th><th>Type</th></tr></thead>
              <tbody>
                {filtered.map(tx => {
                  const items = tx.id ? [] : [];
                  return (
                    <tr key={tx.id}>
                      <td><strong>{tx.voucher_no}</strong></td>
                      <td>{tx.date}</td>
                      <td>{tx.party_name || 'Walk-in'}</td>
                      <td className="fw-bold">{formatCurrency(tx.total_amount)}</td>
                      <td className="text-blue">{formatCurrency(0)}</td>
                      <td className="text-green">{formatCurrency(0)}</td>
                      <td className="text-green">{formatCurrency(0)}</td>
                      <td className="fw-bold text-gold">{formatCurrency(tx.total_amount)}</td>
                      <td><span className={`badge ${tx.is_inter_state ? 'badge-purple' : 'badge-success'}`}>{tx.is_inter_state ? 'IGST' : 'CGST+SGST'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function GSTR1Section() {
  const { dbQuery, formatCurrency, addNotification } = useContext(AppContext);
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totals, setTotals] = useState({ qty: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 });
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [dateFrom, setDateFrom] = useState(firstDay.toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(today.toISOString().split('T')[0]);
  const [error, setError] = useState(null);

  useEffect(() => { loadGSTR1(); }, [dateFrom, dateTo]);

  const loadGSTR1 = async () => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await dbQuery(`
        SELECT g.hsn_code, g.description,
               SUM(g.qty) as total_qty,
               SUM(g.taxable_value * g.qty) as total_taxable,
               SUM(g.igst_amount) as total_igst,
               SUM(g.cgst_amount) as total_cgst,
               SUM(g.sgst_amount) as total_sgst,
               SUM(g.cess_amount) as total_cess,
               SUM(g.total) as grand_total
        FROM gst_invoice_items g
        JOIN transactions t ON g.transaction_id = t.id
        WHERE t.date >= ? AND t.date <= ? AND t.voucher_type = 'GST_Invoice' AND t.status IS DISTINCT FROM 'cancelled'
        GROUP BY g.hsn_code, g.description
        ORDER BY g.hsn_code
      `, [dateFrom, dateTo]);
      setReport(rows || []);
      const t = (rows || []).reduce((acc, r) => ({
        qty: acc.qty + (r.total_qty || 0),
        taxable: acc.taxable + (r.total_taxable || 0),
        igst: acc.igst + (r.total_igst || 0),
        cgst: acc.cgst + (r.total_cgst || 0),
        sgst: acc.sgst + (r.total_sgst || 0),
        cess: acc.cess + (r.total_cess || 0),
      }), { qty: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 });
      setTotals(t);
    } catch (err) {
      setError(err.message);
      addNotification('Error loading GSTR-1: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) { addNotification('Please allow pop-ups for printing', 'error'); return; }
    printWin.document.write(`
      <html><head><title>GSTR-1 Report</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 11px; padding: 20px; color: #000; }
        h2 { text-align: center; margin-bottom: 4px; }
        h4 { text-align: center; color: #666; margin-top: 0; font-weight: normal; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th { background: #f5f5f5; padding: 6px 8px; text-align: left; font-size: 10px; border: 1px solid #ccc; }
        td { padding: 5px 8px; border: 1px solid #ddd; }
        .total-row { font-weight: bold; background: #fafafa; }
        .right { text-align: right; }
        .center { text-align: center; }
        .print-date { text-align: right; font-size: 10px; color: #999; margin-bottom: 8px; }
        @media print { body { padding: 10mm; } }
      </style></head><body>
      <h2>GSTR-1 Report</h2>
      <h4>Period: ${dateFrom} to ${dateTo}</h4>
      <div class="print-date">Generated: ${new Date().toLocaleString('en-IN')}</div>
      <table>
        <thead><tr><th>HSN Code</th><th>Description</th><th>UQC</th><th>Total Qty</th><th>Taxable Value</th><th>IGST</th><th>CGST</th><th>SGST</th><th>Cess</th><th>Total</th></tr></thead>
        <tbody>
          ${report.map(r => `<tr>
            <td>${r.hsn_code}</td>
            <td>${r.description || '-'}</td>
            <td class="center">Nos</td>
            <td class="right">${(r.total_qty || 0).toFixed(2)}</td>
            <td class="right">${(r.total_taxable || 0).toFixed(2)}</td>
            <td class="right">${(r.total_igst || 0).toFixed(2)}</td>
            <td class="right">${(r.total_cgst || 0).toFixed(2)}</td>
            <td class="right">${(r.total_sgst || 0).toFixed(2)}</td>
            <td class="right">${(r.total_cess || 0).toFixed(2)}</td>
            <td class="right">${((r.total_taxable || 0) + (r.total_igst || 0) + (r.total_cgst || 0) + (r.total_sgst || 0) + (r.total_cess || 0)).toFixed(2)}</td>
          </tr>`).join('')}
          <tr class="total-row">
            <td colspan="3"><strong>Grand Total</strong></td>
            <td class="right"><strong>${totals.qty.toFixed(2)}</strong></td>
            <td class="right"><strong>${totals.taxable.toFixed(2)}</strong></td>
            <td class="right"><strong>${totals.igst.toFixed(2)}</strong></td>
            <td class="right"><strong>${totals.cgst.toFixed(2)}</strong></td>
            <td class="right"><strong>${totals.sgst.toFixed(2)}</strong></td>
            <td class="right"><strong>${totals.cess.toFixed(2)}</strong></td>
            <td class="right"><strong>${(totals.taxable + totals.igst + totals.cgst + totals.sgst + totals.cess).toFixed(2)}</strong></td>
          </tr>
        </tbody>
      </table>
      <script>window.print();window.close();</script>
      </body></html>
    `);
    printWin.document.close();
  };

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ marginBottom: 2 }}>From Date</label><input type="date" className="form-input" style={{ width: 150 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
          <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ marginBottom: 2 }}>To Date</label><input type="date" className="form-input" style={{ width: 150 }} value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
          <button className="btn btn-secondary btn-sm" onClick={loadGSTR1} style={{ marginTop: 18 }}>🔄 Refresh</button>
        </div>
        <div className="toolbar-right"><button className="btn btn-primary" onClick={handlePrint}>🖨️ Print / Export</button></div>
      </div>

      {loading ? <div className="loading-spinner" /> : error ? (
        <div className="card"><div className="empty-state"><div className="empty-state-icon">⚠️</div><div className="empty-state-text">Error loading report</div><div className="empty-state-hint">{error}</div></div></div>
      ) : report.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-state-icon">📊</div><div className="empty-state-text">No GSTR-1 data for the selected period</div><div className="empty-state-hint">Create GST invoices to see them here</div></div></div>
      ) : (
        <div className="card">
          <div className="card-header"><div className="card-title">📊 GSTR-1 Report</div><span className="badge badge-info">{report.length} HSN codes</span></div>
          <div className="table-container">
            <table>
              <thead><tr><th>HSN Code</th><th>Description</th><th>UQC</th><th>Total Qty</th><th>Taxable Value</th><th>IGST</th><th>CGST</th><th>SGST</th><th>Cess</th><th>Total</th></tr></thead>
              <tbody>
                {report.map((r, i) => (
                  <tr key={i}>
                    <td><span className="badge badge-gold">{r.hsn_code}</span></td>
                    <td>{r.description || '-'}</td>
                    <td><span className="badge badge-cyan">Nos</span></td>
                    <td className="fw-bold">{(r.total_qty || 0).toFixed(2)}</td>
                    <td className="fw-bold">{formatCurrency(r.total_taxable || 0)}</td>
                    <td className="text-blue">{r.total_igst > 0 ? formatCurrency(r.total_igst) : '-'}</td>
                    <td className="text-green">{r.total_cgst > 0 ? formatCurrency(r.total_cgst) : '-'}</td>
                    <td className="text-green">{r.total_sgst > 0 ? formatCurrency(r.total_sgst) : '-'}</td>
                    <td className="text-muted">{r.total_cess > 0 ? formatCurrency(r.total_cess) : '-'}</td>
                    <td className="fw-bold text-gold">{formatCurrency((r.total_taxable || 0) + (r.total_igst || 0) + (r.total_cgst || 0) + (r.total_sgst || 0) + (r.total_cess || 0))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #f59e0b', background: 'rgba(245,158,11,0.05)' }}>
                  <td colSpan={3}><strong>Grand Total</strong></td>
                  <td><strong className="fw-bold">{(totals.qty || 0).toFixed(2)}</strong></td>
                  <td><strong className="fw-bold">{formatCurrency(totals.taxable)}</strong></td>
                  <td><strong className="text-blue">{totals.igst > 0 ? formatCurrency(totals.igst) : '-'}</strong></td>
                  <td><strong className="text-green">{totals.cgst > 0 ? formatCurrency(totals.cgst) : '-'}</strong></td>
                  <td><strong className="text-green">{totals.sgst > 0 ? formatCurrency(totals.sgst) : '-'}</strong></td>
                  <td><strong className="text-muted">{totals.cess > 0 ? formatCurrency(totals.cess) : '-'}</strong></td>
                  <td><strong className="text-gold">{formatCurrency(totals.taxable + totals.igst + totals.cgst + totals.sgst + totals.cess)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function GSTR3BSection() {
  const { dbQuery, formatCurrency, addNotification } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { loadGSTR3B(); }, [period]);

  const loadGSTR3B = async () => {
    if (!period) return;
    setLoading(true);
    setError(null);
    try {
      const year = period.split('-')[0];
      const month = period.split('-')[1];
      const firstDay = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

      const outwardSupplies = await dbQuery(`
        SELECT COALESCE(SUM(g.taxable_value * g.qty), 0) as taxable,
               COALESCE(SUM(g.igst_amount), 0) as igst,
               COALESCE(SUM(g.cgst_amount), 0) as cgst,
               COALESCE(SUM(g.sgst_amount), 0) as sgst,
               COALESCE(SUM(g.cess_amount), 0) as cess
        FROM gst_invoice_items g
        JOIN transactions t ON g.transaction_id = t.id
        WHERE t.date >= ? AND t.date <= ? AND t.voucher_type = 'GST_Invoice' AND t.status IS DISTINCT FROM 'cancelled'
      `, [firstDay, lastDay]);

      const purchases = await dbQuery(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM transactions
        WHERE date >= ? AND date <= ? AND voucher_type = 'Purchase' AND status IS DISTINCT FROM 'cancelled'
      `, [firstDay, lastDay]);

      const os = outwardSupplies[0] || { taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 };
      const purchaseTotal = purchases[0]?.total || 0;

      setData({
        period: { year, month, firstDay, lastDay },
        outward: {
          taxable: os.taxable,
          igst: os.igst,
          cgst: os.cgst,
          sgst: os.sgst,
          cess: os.cess,
          total: os.taxable + os.igst + os.cgst + os.sgst + os.cess,
        },
        purchase: {
          taxable: purchaseTotal,
        },
        itc: {
          eligible: purchaseTotal * 0.03,
          reversed: 0,
          net: purchaseTotal * 0.03,
        },
      });
    } catch (err) {
      setError(err.message);
      addNotification('Error loading GSTR-3B: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!data) return;
    const printWin = window.open('', '_blank');
    if (!printWin) { addNotification('Please allow pop-ups for printing', 'error'); return; }
    const d = data;
    printWin.document.write(`
      <html><head><title>GSTR-3B Summary</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 11px; padding: 20px; color: #000; }
        h2 { text-align: center; margin-bottom: 4px; }
        h4 { text-align: center; color: #666; margin-top: 0; font-weight: normal; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th { background: #f5f5f5; padding: 6px 8px; text-align: left; font-size: 10px; border: 1px solid #ccc; }
        td { padding: 5px 8px; border: 1px solid #ddd; }
        .section { background: #eef; font-weight: bold; }
        .right { text-align: right; }
        .total-row { font-weight: bold; background: #fafafa; }
        .print-date { text-align: right; font-size: 10px; color: #999; }
        @media print { body { padding: 10mm; } }
      </style></head><body>
      <h2>GSTR-3B Summary</h2>
      <h4>Period: ${d.period.year}-${d.period.month}</h4>
      <div class="print-date">Generated: ${new Date().toLocaleString('en-IN')}</div>
      <table>
        <tr class="section"><td colspan="2">3.1(a) Outward Taxable Supplies (with ITC)</td></tr>
        <tr><td>Taxable Value</td><td class="right">${d.outward.taxable.toFixed(2)}</td></tr>
        <tr><td>IGST</td><td class="right">${d.outward.igst.toFixed(2)}</td></tr>
        <tr><td>CGST</td><td class="right">${d.outward.cgst.toFixed(2)}</td></tr>
        <tr><td>SGST</td><td class="right">${d.outward.sgst.toFixed(2)}</td></tr>
        <tr><td>Cess</td><td class="right">${d.outward.cess.toFixed(2)}</td></tr>
        <tr class="total-row"><td>Total Outward</td><td class="right">${d.outward.total.toFixed(2)}</td></tr>
        <tr class="section"><td colspan="2">3.1(b) Outward Supplies (Reverse Charge)</td></tr>
        <tr><td>Taxable Value</td><td class="right">0.00</td></tr>
        <tr><td>Tax</td><td class="right">0.00</td></tr>
        <tr class="section"><td colspan="2">4. Eligible ITC</td></tr>
        <tr><td>ITC on Purchases (3%)</td><td class="right">${d.itc.eligible.toFixed(2)}</td></tr>
        <tr><td>Reversed ITC</td><td class="right">${d.itc.reversed.toFixed(2)}</td></tr>
        <tr class="total-row"><td>Net ITC</td><td class="right">${d.itc.net.toFixed(2)}</td></tr>
        <tr class="section"><td colspan="2">5. Net Tax Payable</td></tr>
        <tr><td>IGST Payable</td><td class="right">${Math.max(0, d.outward.igst - d.itc.net).toFixed(2)}</td></tr>
        <tr><td>CGST Payable</td><td class="right">${d.outward.cgst.toFixed(2)}</td></tr>
        <tr><td>SGST Payable</td><td class="right">${d.outward.sgst.toFixed(2)}</td></tr>
        <tr><td>Cess Payable</td><td class="right">${d.outward.cess.toFixed(2)}</td></tr>
        <tr class="total-row"><td>Total Tax Payable</td><td class="right">${(Math.max(0, d.outward.igst - d.itc.net) + d.outward.cgst + d.outward.sgst + d.outward.cess).toFixed(2)}</td></tr>
      </table>
      <script>window.print();window.close();</script>
      </body></html>
    `);
    printWin.document.close();
  };

  const months = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0');
    return { value: `2026-${m}`, label: `${new Date(2026, i).toLocaleString('en-US', { month: 'long' })} 2026` };
  });

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ marginBottom: 2 }}>Tax Period</label>
            <select className="form-input" style={{ width: 200 }} value={period} onChange={e => setPeriod(e.target.value)}>
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={loadGSTR3B} style={{ marginTop: 18 }}>🔄 Refresh</button>
        </div>
        <div className="toolbar-right">{data && <button className="btn btn-primary" onClick={handlePrint}>🖨️ Print</button>}</div>
      </div>

      {loading ? <div className="loading-spinner" /> : error ? (
        <div className="card"><div className="empty-state"><div className="empty-state-icon">⚠️</div><div className="empty-state-text">Error loading GSTR-3B</div><div className="empty-state-hint">{error}</div></div></div>
      ) : !data ? (
        <div className="card"><div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-text">No data for the selected period</div><div className="empty-state-hint">Select a period with GST invoices</div></div></div>
      ) : (
        <div className="grid-2">
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header">
              <div className="card-title">📋 GSTR-3B Summary</div>
              <span className="badge badge-gold">{data.period.year}-{data.period.month}</span>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">3.1(a) Outward Supplies</div><span className="badge badge-success">With ITC</span></div>
            <table>
              <tbody>
                <tr><td>Taxable Value</td><td className="fw-bold text-right">{formatCurrency(data.outward.taxable)}</td></tr>
                <tr><td>IGST</td><td className="text-blue fw-bold text-right">{formatCurrency(data.outward.igst)}</td></tr>
                <tr><td>CGST</td><td className="text-green fw-bold text-right">{formatCurrency(data.outward.cgst)}</td></tr>
                <tr><td>SGST</td><td className="text-green fw-bold text-right">{formatCurrency(data.outward.sgst)}</td></tr>
                <tr><td>Cess</td><td className="fw-bold text-right">{formatCurrency(data.outward.cess)}</td></tr>
                <tr style={{ borderTop: '2px solid #f59e0b' }}><td><strong>Total</strong></td><td className="text-gold fw-bold text-right">{formatCurrency(data.outward.total)}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">3.1(b) Reverse Charge</div><span className="badge badge-warning">RCM</span></div>
            <table>
              <tbody>
                <tr><td>Taxable Value</td><td className="text-muted text-right">₹0.00</td></tr>
                <tr><td>Tax Amount</td><td className="text-muted text-right">₹0.00</td></tr>
                <tr style={{ borderTop: '2px solid #f59e0b' }}><td><strong>Total</strong></td><td className="text-muted text-right">₹0.00</td></tr>
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">4. Eligible ITC</div><span className="badge badge-info">Input Tax Credit</span></div>
            <table>
              <tbody>
                <tr><td>ITC on Purchases (3% est.)</td><td className="text-green fw-bold text-right">{formatCurrency(data.itc.eligible)}</td></tr>
                <tr><td>Reversed ITC</td><td className="text-red fw-bold text-right">{formatCurrency(data.itc.reversed)}</td></tr>
                <tr style={{ borderTop: '2px solid #f59e0b' }}><td><strong>Net ITC</strong></td><td className="text-gold fw-bold text-right">{formatCurrency(data.itc.net)}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">5. Net Tax Payable</div><span className="badge badge-danger">Payment Due</span></div>
            <table>
              <tbody>
                <tr><td>IGST Payable</td><td className="text-blue fw-bold text-right">{formatCurrency(Math.max(0, data.outward.igst - data.itc.net))}</td></tr>
                <tr><td>CGST Payable</td><td className="text-green fw-bold text-right">{formatCurrency(data.outward.cgst)}</td></tr>
                <tr><td>SGST Payable</td><td className="text-green fw-bold text-right">{formatCurrency(data.outward.sgst)}</td></tr>
                <tr><td>Cess Payable</td><td className="fw-bold text-right">{formatCurrency(data.outward.cess)}</td></tr>
                <tr style={{ borderTop: '2px solid #ef4444' }}>
                  <td><strong>Total Tax Payable</strong></td>
                  <td className="text-red fw-bold text-right">{formatCurrency(Math.max(0, data.outward.igst - data.itc.net) + data.outward.cgst + data.outward.sgst + data.outward.cess)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header"><div className="card-title">6. Payment of Tax</div><span className="badge badge-success">Summary</span></div>
            <div className="grid-4" style={{ textAlign: 'center' }}>
              <div><div className="stat-label">IGST</div><div className="stat-value text-blue">{formatCurrency(Math.max(0, data.outward.igst - data.itc.net))}</div></div>
              <div><div className="stat-label">CGST</div><div className="stat-value text-green">{formatCurrency(data.outward.cgst)}</div></div>
              <div><div className="stat-label">SGST</div><div className="stat-value text-green">{formatCurrency(data.outward.sgst)}</div></div>
              <div><div className="stat-label">Cess</div><div className="stat-value">{formatCurrency(data.outward.cess)}</div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
