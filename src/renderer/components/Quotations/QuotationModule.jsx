import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AppContext } from '../../contexts/AppContext';
import Autocomplete, { PURITY_OPTIONS } from '../Common/Autocomplete';

const QTN_STATUS_STYLES = {
  active: 'badge-info',
  accepted: 'badge-success',
  expired: 'badge-cyan',
  converted: 'badge-purple'
};

export default function QuotationModule() {
  const { setPageTitle } = useContext(AppContext);
  const [tab, setTab] = useState('list');

  useEffect(() => { setPageTitle('Quotations'); }, []);

  const tabs = [
    { id: 'list', label: 'Quotations List', component: QuotationsList },
    { id: 'new', label: 'New / Edit Quotation', component: NewQuotation },
    { id: 'print', label: 'Print Preview', component: PrintQuotation },
  ];

  const ActiveTab = tabs.find(t => t.id === tab)?.component;
  return (
    <div>
      <div className="tabs">
        {tabs.map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {ActiveTab && <ActiveTab onTabChange={setTab} />}
    </div>
  );
}

function QuotationsList({ onTabChange }) {
  const { dbQuery, dbRun, addNotification, formatCurrency } = useContext(AppContext);
  const [quotations, setQuotations] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => { loadQuotations(); }, []);

  const loadQuotations = async () => {
    const data = await dbQuery(`SELECT q.*,
      COALESCE((SELECT SUM(amount) FROM quotation_items WHERE quotation_id = q.id), 0) as total_amount,
      COALESCE((SELECT COUNT(*) FROM quotation_items WHERE quotation_id = q.id), 0) as items_count
      FROM quotations q ORDER BY q.created_at DESC`);
    setQuotations(data);
  };

  const deleteQuotation = async (id) => {
    if (!confirm('Delete this quotation?')) return;
    await dbRun('DELETE FROM quotation_items WHERE quotation_id=?', [id]);
    await dbRun('DELETE FROM quotations WHERE id=?', [id]);
    addNotification('Quotation deleted', 'info');
    loadQuotations();
  };

  const convertToSale = async (q) => {
    if (!confirm(`Convert Quotation ${q.quotation_no} to Sale?`)) return;
    const saleId = crypto.randomUUID();
    const saleNo = 'SALE-' + Date.now().toString(36).toUpperCase();
    const items = await dbQuery('SELECT * FROM quotation_items WHERE quotation_id=?', [q.id]);
    if (items.length === 0) { addNotification('No items in quotation to convert', 'error'); return; }
    await dbRun(`INSERT INTO sales (id, invoice_no, date, party_id, subtotal, total_amount, status)
      VALUES (?,?,?,?,?,?,'completed')`,
      [saleId, saleNo, new Date().toISOString().split('T')[0], q.customer_id, q.subtotal, q.total_amount]);
    for (const item of items) {
      await dbRun(`INSERT INTO sale_items (id, sale_id, item_id, item_name, purity, weight, rate, making_charges, amount)
        VALUES (?,?,?,?,?,?,?,?,?)`,
        [crypto.randomUUID(), saleId, item.item_id, item.item_name, item.purity, item.weight, item.rate, item.making_charges, item.amount]);
    }
    await dbRun("UPDATE quotations SET status='converted' WHERE id=?", [q.id]);
    addNotification(`Quotation converted to sale (${saleNo})`, 'success');
    loadQuotations();
  };

  const filtered = quotations.filter(q =>
    (filterStatus === 'all' || q.status === filterStatus) &&
    (q.quotation_no?.toLowerCase().includes(search.toLowerCase()) ||
     q.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
     q.customer_phone?.includes(search))
  );

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon gold">📄</div>
          <div className="stat-content">
            <div className="stat-value">{quotations.length}</div>
            <div className="stat-label">Total</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div className="stat-content">
            <div className="stat-value">{quotations.filter(q => q.status === 'accepted').length}</div>
            <div className="stat-label">Accepted</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan">🔄</div>
          <div className="stat-content">
            <div className="stat-value">{quotations.filter(q => q.status === 'active').length}</div>
            <div className="stat-label">Active</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">💜</div>
          <div className="stat-content">
            <div className="stat-value">{quotations.filter(q => q.status === 'converted').length}</div>
            <div className="stat-label">Converted</div>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <input className="search-input" placeholder="Search by no, customer, phone..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-input" style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="accepted">Accepted</option>
            <option value="expired">Expired</option>
            <option value="converted">Converted</option>
          </select>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-primary" onClick={() => onTabChange('new')}>+ New Quotation</button>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Quotation No</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Valid Until</th>
                <th>Items</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-state-icon">📄</div>
                      <div className="empty-state-text">No quotations found</div>
                      <div className="empty-state-hint">Create a new quotation to get started</div>
                    </div>
                  </td>
                </tr>
              )}
              {filtered.map(q => (
                <tr key={q.id}>
                  <td><strong className="text-gold">{q.quotation_no}</strong></td>
                  <td>{q.date?.slice(0, 10)}</td>
                  <td>
                    <strong>{q.customer_name}</strong>
                    {q.customer_phone && <div className="text-muted" style={{ fontSize: 11 }}>{q.customer_phone}</div>}
                  </td>
                  <td style={{ color: q.valid_until && new Date(q.valid_until) < new Date() ? '#ef4444' : 'inherit' }}>
                    {q.valid_until?.slice(0, 10) || '-'}
                  </td>
                  <td><span className="badge badge-info">{q.items_count}</span></td>
                  <td className="fw-bold">{formatCurrency(q.total_amount)}</td>
                  <td><span className={`badge ${QTN_STATUS_STYLES[q.status] || 'badge-info'}`}>{q.status}</span></td>
                  <td>
                    <div className="btn-group">
                      <button className="btn btn-info btn-xs" onClick={() => onTabChange('print')} title="Print">🖨️</button>
                      <button className="btn btn-success btn-xs" onClick={() => convertToSale(q)} title="Convert to Sale" disabled={q.status === 'converted'}>💰</button>
                      <button className="btn btn-danger btn-xs" onClick={() => deleteQuotation(q.id)} title="Delete">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function NewQuotation() {
  const { addNotification, dbQuery, dbRun, formatCurrency, currentDate } = useContext(AppContext);
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [goldRate, setGoldRate] = useState(0);
  const [fromCustomerList, setFromCustomerList] = useState(true);

  const [form, setForm] = useState({
    id: '', quotation_no: '', date: new Date().toISOString().split('T')[0],
    valid_until: '', customer_id: '', customer_name: '', customer_phone: '',
    subtotal: 0, total_amount: 0, notes: '', status: 'active'
  });

  const [lineItems, setLineItems] = useState([]);

  const calcDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    Promise.all([
      dbQuery("SELECT id, name, phone FROM parties WHERE type IN ('Customer','Both') ORDER BY name"),
      dbQuery("SELECT id, name, code FROM items WHERE status='active' ORDER BY name"),
      dbQuery("SELECT rate_per_gram FROM metal_rates WHERE metal_type='Gold' AND purity='22K' ORDER BY rate_date DESC LIMIT 1"),
      dbQuery("SELECT quotation_no FROM quotations ORDER BY rowid DESC LIMIT 1")
    ]).then(([cust, itms, rates, last]) => {
      setCustomers(cust);
      setItems(itms);
      setGoldRate(rates.length > 0 ? rates[0].rate_per_gram : 0);
      const yr = new Date().getFullYear().toString().slice(-2);
      const lastNo = last.length > 0 ? parseInt(last[0].quotation_no?.split('-')[1] || '0', 10) : 0;
      const newSeq = String(lastNo + 1).padStart(4, '0');
      setForm(f => ({
        ...f, quotation_no: `QTN-${yr}${newSeq}`,
        valid_until: calcDate(15)
      }));
    });
  }, []);

  const addLineItem = () => {
    setLineItems(prev => [...prev, {
      id: crypto.randomUUID(), item_id: '', item_name: '', purity: '22K',
      weight: 0, rate: goldRate, making_charges: 0, amount: 0
    }]);
  };

  const updateLineItem = (index, field, value) => {
    setLineItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'weight' || field === 'rate' || field === 'making_charges') {
        const w = parseFloat(updated[index].weight) || 0;
        const r = parseFloat(updated[index].rate) || 0;
        const mc = parseFloat(updated[index].making_charges) || 0;
        updated[index].amount = (w * r) + mc;
      }
      return updated;
    });
  };

  const removeLineItem = (index) => {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const calcTotals = useCallback(() => {
    const subtotal = lineItems.reduce((s, li) => s + ((parseFloat(li.weight) || 0) * (parseFloat(li.rate) || 0)), 0);
    const total = lineItems.reduce((s, li) => s + (li.amount || 0), 0);
    return { subtotal, total };
  }, [lineItems]);

  useEffect(() => {
    const { subtotal, total } = calcTotals();
    setForm(f => ({ ...f, subtotal, total_amount: total }));
  }, [calcTotals]);

  const handleSubmit = async () => {
    const cName = fromCustomerList ? form.customer_name : form.customer_name;
    if (!cName) { addNotification('Customer name is required', 'error'); return; }
    if (lineItems.length === 0) { addNotification('Add at least one line item', 'error'); return; }

    const id = form.id || crypto.randomUUID();
    const qNo = form.quotation_no;

    if (form.id) {
      await dbRun(`UPDATE quotations SET date=?, valid_until=?, customer_id=?, customer_name=?, customer_phone=?, subtotal=?, total_amount=?, notes=?, status=? WHERE id=?`,
        [form.date, form.valid_until, form.customer_id, cName, form.customer_phone, form.subtotal, form.total_amount, form.notes, form.status, form.id]);
      await dbRun('DELETE FROM quotation_items WHERE quotation_id=?', [form.id]);
    } else {
      await dbRun(`INSERT INTO quotations (id, quotation_no, date, valid_until, customer_id, customer_name, customer_phone, subtotal, total_amount, notes, status)
        VALUES (?,?,?,?,?,?,?,?,?,?,'active')`,
        [id, qNo, form.date, form.valid_until, form.customer_id, cName, form.customer_phone, form.subtotal, form.total_amount, form.notes]);
    }

    for (const li of lineItems) {
      await dbRun(`INSERT INTO quotation_items (id, quotation_id, item_id, item_name, purity, weight, rate, making_charges, amount)
        VALUES (?,?,?,?,?,?,?,?,?)`,
        [crypto.randomUUID(), id, li.item_id, li.item_name, li.purity, li.weight, li.rate, li.making_charges, li.amount]);
    }

    addNotification(form.id ? 'Quotation updated' : `Quotation ${qNo} created`, 'success');
    resetForm(calcDate(15));
  };

  const resetForm = (validUntil) => {
    setForm({
      id: '', quotation_no: form.quotation_no, date: new Date().toISOString().split('T')[0],
      valid_until: validUntil, customer_id: '', customer_name: '', customer_phone: '',
      subtotal: 0, total_amount: 0, notes: '', status: 'active'
    });
    setLineItems([]);
    setFromCustomerList(true);
    const yr = new Date().getFullYear().toString().slice(-2);
    const lastNo = parseInt(form.quotation_no?.split('-')[1] || '0', 10);
    const newSeq = String(lastNo + 1).padStart(4, '0');
    setForm(f => ({ ...f, quotation_no: `QTN-${yr}${newSeq}` }));
  };

  return (
    <div>
      <div className="card mb-4">
        <div className="section-title">Quotation Details</div>
        <div className="form-row-4">
          <div className="form-group">
            <label className="form-label">Quotation No</label>
            <input className="form-input" value={form.quotation_no} disabled style={{ fontWeight: 600, color: '#f59e0b' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Valid Until</label>
            <input type="date" className="form-input" value={form.valid_until} onChange={e => setForm({...form, valid_until: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Current Gold Rate (22K/g)</label>
            <div className="form-input" style={{ display: 'flex', alignItems: 'center', fontWeight: 600, color: '#f59e0b', background: 'rgba(245,158,11,0.05)' }}>
              ₹{goldRate.toLocaleString('en-IN')}
              <span style={{ marginLeft: 8, fontSize: 11, color: '#64748b', fontWeight: 400 }}>/g</span>
            </div>
          </div>
        </div>

        <div className="section-title">Customer</div>
        <div className="form-row-4">
          <div className="form-group">
            <label className="form-label">
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={fromCustomerList} onChange={e => setFromCustomerList(e.target.checked)} />
                From parties list
              </label>
            </label>
            {fromCustomerList ? (
              <select className="form-input" value={form.customer_id} onChange={e => {
                const c = customers.find(cust => cust.id === e.target.value);
                setForm({...form, customer_id: e.target.value, customer_name: c?.name || '', customer_phone: c?.phone || ''});
              }}>
                <option value="">Select Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
              </select>
            ) : (
              <input className="form-input" placeholder="Customer name" value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} />
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" value={form.customer_phone || ''} onChange={e => setForm({...form, customer_phone: e.target.value})} />
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <div className="card-title">Line Items</div>
          <button className="btn btn-secondary btn-sm" onClick={addLineItem}>+ Add Item</button>
        </div>
        {lineItems.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 20px' }}>
            <div className="empty-state-icon">📦</div>
            <div className="empty-state-text">No items added</div>
            <div className="empty-state-hint">Click "Add Item" to add products to this quotation</div>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: 180 }}>Item</th>
                  <th style={{ width: 100 }}>Purity</th>
                  <th style={{ width: 100 }}>Weight (g)</th>
                  <th style={{ width: 110 }}>Rate (₹/g)</th>
                  <th style={{ width: 110 }}>Making (₹)</th>
                  <th style={{ width: 120 }}>Amount</th>
                  <th style={{ width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((li, idx) => (
                  <tr key={li.id}>
                    <td>
                      <ItemSelector
                        items={items}
                        value={li.item_id}
                        itemName={li.item_name}
                        onSelect={(id, name) => {
                          updateLineItem(idx, 'item_id', id || '');
                          updateLineItem(idx, 'item_name', name);
                        }}
                      />
                    </td>
                    <td>
                      <Autocomplete
                        options={PURITY_OPTIONS}
                        value={li.purity}
                        onChange={v => updateLineItem(idx, 'purity', v)}
                        placeholder="Purity"
                        creatable
                        style={{ width: 100 }}
                      />
                    </td>
                    <td>
                      <input type="number" step="0.001" className="form-input"
                        value={li.weight || ''}
                        onChange={e => updateLineItem(idx, 'weight', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                        style={{ width: 100 }} />
                    </td>
                    <td>
                      <input type="number" className="form-input"
                        value={li.rate || ''}
                        onChange={e => updateLineItem(idx, 'rate', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                        style={{ width: 110 }} />
                    </td>
                    <td>
                      <input type="number" className="form-input"
                        value={li.making_charges || ''}
                        onChange={e => updateLineItem(idx, 'making_charges', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                        style={{ width: 110 }} />
                    </td>
                    <td className="fw-bold">{formatCurrency(li.amount)}</td>
                    <td>
                      <button className="btn btn-danger btn-xs" onClick={() => removeLineItem(idx)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{ borderTop: '2px solid var(--border-color)' }}>
                <tr>
                  <td colSpan={4} style={{ textAlign: 'right', fontWeight: 600 }}>Subtotal (weight × rate):</td>
                  <td colSpan={3} className="fw-bold">{formatCurrency(form.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={4} style={{ textAlign: 'right', fontWeight: 600, fontSize: 16 }}>Total Amount:</td>
                  <td colSpan={3} className="fw-bold text-gold" style={{ fontSize: 18 }}>{formatCurrency(form.total_amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="card mb-4">
        <div className="section-title">Notes</div>
        <div className="form-group">
          <textarea className="form-input" rows={3} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Terms, delivery instructions, payment terms..." />
        </div>
        <div className="card-footer">
          <button className="btn btn-primary" onClick={handleSubmit}>💾 Save Quotation</button>
        </div>
      </div>
    </div>
  );
}

function ItemSelector({ items, value, itemName, onSelect }) {
  const [inputType, setInputType] = useState(value ? 'list' : 'manual');
  useEffect(() => {
    if (value) setInputType('list');
  }, [value]);
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <button className="btn btn-xs btn-secondary" onClick={() => setInputType(inputType === 'list' ? 'manual' : 'list')}
        title={inputType === 'list' ? 'Manual entry' : 'Select from list'} style={{ fontSize: 10, padding: '2px 4px' }}>
        {inputType === 'list' ? '📋' : '✏️'}
      </button>
      {inputType === 'list' ? (
        <select className="form-input" value={value} onChange={e => {
          const item = items.find(i => i.id === e.target.value);
          onSelect(item?.id || '', item?.name || '');
        }} style={{ width: 160 }}>
          <option value="">Select</option>
          {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.code})</option>)}
        </select>
      ) : (
        <input className="form-input" value={itemName} onChange={e => onSelect('', e.target.value)}
          placeholder="Item name" style={{ width: 160 }} />
      )}
    </div>
  );
}

function PrintQuotation() {
  const { dbQuery, formatCurrency } = useContext(AppContext);
  const [quotations, setQuotations] = useState([]);
  const [selectedQId, setSelectedQId] = useState('');
  const [qtn, setQtn] = useState(null);
  const [items, setItems] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dbQuery('SELECT * FROM quotations ORDER BY created_at DESC'),
      dbQuery('SELECT * FROM settings WHERE key="company_name" OR key="company_address" OR key="company_phone" OR key="company_gstin" OR key="company_email"')
    ]).then(([quotes, settings]) => {
      setQuotations(quotes);
      const comp = {};
      settings.forEach(s => { comp[s.key] = s.value; });
      setCompany(comp);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedQId) { setQtn(null); setItems([]); return; }
    const q = quotations.find(x => x.id === selectedQId);
    setQtn(q);
    if (q) {
      dbQuery('SELECT * FROM quotation_items WHERE quotation_id=?', [q.id]).then(setItems);
    }
  }, [selectedQId, quotations]);

  const openPrintWindow = () => {
    if (!qtn) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    const terms = '1. This is a computer generated quotation.\n2. Prices are subject to change based on prevailing market rates.\n3. Delivery time subject to manufacturing schedule.\n4. GST extra as applicable.\n5. This quotation is valid until ' + (qtn.valid_until?.slice(0, 10) || 'N/A') + '.';

    win.document.write(`
      <html>
      <head>
        <title>Quotation ${qtn.quotation_no}</title>
        <style>
          @page { margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', Arial, sans-serif; color: #1e293b; padding: 40px; font-size: 13px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #d97706; padding-bottom: 20px; }
          .header h1 { font-size: 24px; color: #d97706; margin-bottom: 4px; }
          .header .sub { color: #64748b; font-size: 12px; }
          .header .details { display: flex; justify-content: space-between; margin-top: 16px; text-align: left; }
          .qtn-info { text-align: right; }
          .qtn-info .no { font-size: 18px; font-weight: 700; color: #d97706; }
          .customer-section { margin-bottom: 24px; padding: 16px; background: #f8fafc; border-radius: 8px; }
          .customer-section h3 { font-size: 14px; color: #64748b; margin-bottom: 4px; }
          .customer-section .name { font-size: 16px; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { background: #d97706; color: white; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
          td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
          tfoot td { font-weight: 700; border-top: 2px solid #d97706; }
          .total-row { font-size: 16px; }
          .total-row td:last-child { font-size: 20px; color: #d97706; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; gap: 40px; }
          .footer .terms { flex: 1; }
          .footer .terms h4 { font-size: 12px; color: #64748b; margin-bottom: 8px; text-transform: uppercase; }
          .footer .terms p { font-size: 11px; color: #475569; line-height: 1.6; white-space: pre-line; }
          .footer .signature { text-align: center; flex: 0 0 200px; }
          .footer .signature .line { border-top: 1px solid #94a3b8; margin-top: 50px; padding-top: 8px; font-size: 12px; color: #64748b; }
          .gold-rate { margin-top: 16px; padding: 12px 16px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; font-size: 13px; }
          .gold-rate strong { color: #d97706; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align:center;margin-bottom:20px;">
          <button onclick="window.print()" style="padding:10px 24px;background:#d97706;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;">🖨️ Print This Quotation</button>
          <button onclick="window.close()" style="padding:10px 24px;background:#64748b;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;margin-left:8px;">✕ Close</button>
        </div>

        <div class="header">
          <h1>${company?.company_name || 'Arynoxtech Jewellery'}</h1>
          <div class="sub">${company?.company_address || ''}${company?.company_phone ? ' | Ph: ' + company.company_phone : ''}${company?.company_email ? ' | Email: ' + company.company_email : ''}</div>
          <div class="sub">${company?.company_gstin ? 'GSTIN: ' + company.company_gstin : ''}</div>
          <div class="details">
            <div><strong>Date:</strong> ${qtn.date?.slice(0, 10) || 'N/A'} | <strong>Valid Until:</strong> ${qtn.valid_until?.slice(0, 10) || 'N/A'}</div>
            <div class="qtn-info"><span class="no">${qtn.quotation_no}</span><br><span style="color:#64748b;font-size:11px;">Quotation</span></div>
          </div>
        </div>

        <div class="customer-section">
          <h3>Customer</h3>
          <div class="name">${qtn.customer_name || 'N/A'}</div>
          ${qtn.customer_phone ? '<div style="color:#475569;font-size:13px;">Phone: ' + qtn.customer_phone + '</div>' : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th>Purity</th>
              <th style="text-align:right;">Weight (g)</th>
              <th style="text-align:right;">Rate (₹/g)</th>
              <th style="text-align:right;">Making (₹)</th>
              <th style="text-align:right;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((li, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${li.item_name}</strong></td>
                <td>${li.purity || '-'}</td>
                <td style="text-align:right;">${(li.weight || 0).toFixed(3)}</td>
                <td style="text-align:right;">${(li.rate || 0).toFixed(2)}</td>
                <td style="text-align:right;">${(li.making_charges || 0).toFixed(2)}</td>
                <td style="text-align:right;">${(li.amount || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3"></td>
              <td style="text-align:right;"><strong>${items.reduce((s, li) => s + (parseFloat(li.weight) || 0), 0).toFixed(3)} g</strong></td>
              <td></td>
              <td style="text-align:right;">Subtotal:</td>
              <td style="text-align:right;">${formatCurrency(qtn.subtotal)}</td>
            </tr>
            <tr class="total-row">
              <td colspan="6" style="text-align:right;">Total Amount:</td>
              <td style="text-align:right;font-size:20px;font-weight:700;color:#d97706;">${formatCurrency(qtn.total_amount)}</td>
            </tr>
          </tfoot>
        </table>

        ${goldRate ? `<div class="gold-rate"><strong>Gold Rate:</strong> 22K Gold: ₹${(parseInt(items[0]?.rate || 0)).toLocaleString('en-IN')}/g (as on ${qtn.date?.slice(0, 10) || 'date'})</div>` : ''}

        <div class="footer">
          <div class="terms">
            <h4>Terms & Conditions</h4>
            <p>${terms}</p>
          </div>
          <div class="signature">
            <div class="line">Authorized Signature</div>
          </div>
        </div>

        ${qtn.notes ? `<div style="margin-top:20px;padding:12px 16px;background:#f8fafc;border-radius:8px;font-size:12px;color:#475569;"><strong>Notes:</strong> ${qtn.notes}</div>` : ''}
      </body>
      </html>
    `);
    win.document.close();
  };

  if (loading) return <div className="card"><div className="empty-state"><div className="empty-state-icon">⏳</div><div className="empty-state-text">Loading...</div></div></div>;

  return (
    <div>
      <div className="card mb-4">
        <div className="form-row-4">
          <div className="form-group" style={{ gridColumn: 'span 3' }}>
            <label className="form-label">Select Quotation</label>
            <select className="form-input" value={selectedQId} onChange={e => setSelectedQId(e.target.value)}>
              <option value="">Choose a quotation</option>
              {quotations.map(q => (
                <option key={q.id} value={q.id}>
                  {q.quotation_no} - {q.customer_name || 'N/A'} ({formatCurrency(q.total_amount)})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-primary btn-block" disabled={!qtn} onClick={openPrintWindow}>
              🖨️ Print Preview
            </button>
          </div>
        </div>
      </div>

      {!qtn && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📄</div>
            <div className="empty-state-text">Select a quotation to print</div>
            <div className="empty-state-hint">Choose a quotation from the dropdown above</div>
          </div>
        </div>
      )}

      {qtn && (
        <div className="card">
          <div className="section-title">Quotation Preview</div>
          <div style={{ padding: 20, background: 'white', borderRadius: 8, color: '#1e293b', fontSize: 13 }}>
            <div style={{ textAlign: 'center', marginBottom: 20, borderBottom: '2px solid #d97706', paddingBottom: 16 }}>
              <h2 style={{ color: '#d97706', margin: 0 }}>{company?.company_name || 'Arynoxtech Jewellery'}</h2>
              <div style={{ color: '#64748b', fontSize: 12 }}>{company?.company_address || ''}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div><strong>Date:</strong> {qtn.date?.slice(0, 10)} | <strong>Valid Until:</strong> {qtn.valid_until?.slice(0, 10)}</div>
              <div style={{ textAlign: 'right' }}><strong style={{ color: '#d97706', fontSize: 18 }}>{qtn.quotation_no}</strong></div>
            </div>
            <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, marginBottom: 16 }}>
              <strong style={{ color: '#64748b', fontSize: 12 }}>CUSTOMER</strong>
              <div style={{ fontWeight: 600 }}>{qtn.customer_name}</div>
              {qtn.customer_phone && <div style={{ color: '#475569' }}>{qtn.customer_phone}</div>}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
              <thead>
                <tr style={{ background: '#d97706', color: 'white' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 12 }}>#</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 12 }}>Item</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 12 }}>Purity</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 12 }}>Weight</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 12 }}>Rate</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 12 }}>Making</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 12 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((li, idx) => (
                  <tr key={li.id}>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>{li.item_name}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0' }}>{li.purity || '-'}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>{(li.weight || 0).toFixed(3)}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>{(li.rate || 0).toFixed(2)}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>{(li.making_charges || 0).toFixed(2)}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 600 }}>{(li.amount || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, borderTop: '2px solid #d97706' }}>Total:</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, fontSize: 18, color: '#d97706', borderTop: '2px solid #d97706' }}>
                    {formatCurrency(qtn.total_amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
            {qtn.notes && (
              <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 12, color: '#475569' }}>
                <strong>Notes:</strong> {qtn.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
