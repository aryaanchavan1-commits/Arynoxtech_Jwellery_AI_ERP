import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { PrintService } from '../../utils/PrintService';
import { VoucherHelper } from '../../utils/VoucherHelper';
import Autocomplete, { PURITY_OPTIONS, PAYMENT_OPTIONS } from '../Common/Autocomplete';
import NumberInput from '../../utils/NumberInput';

export default function SalesModule() {
  const { setPageTitle, formatCurrency, formatWeight, dbQuery, dbRun, addNotification } = useContext(AppContext);
  const [tab, setTab] = useState('retail');

  useEffect(() => { setPageTitle('Sales'); }, []);

  const tabs = [
    { id: 'retail', label: '🛍️ Retail Sale', component: RetailSale },
    { id: 'wholesale', label: '🏬 Wholesale', component: WholesaleSale },
    { id: 'estimate', label: '📝 Estimate', component: EstimateSection },
    { id: 'orders', label: '📦 Orders', component: OrderSection },
    { id: 'exchange', label: '🔄 Exchange', component: ExchangeSection },
    { id: 'repairing', label: '🔧 Repairing', component: RepairSection },
  ];

  const ActiveTab = tabs.find(t => t.id === tab)?.component;
  return (
    <div>
      <div className="tabs">{tabs.map(t => <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>
      {ActiveTab && <ActiveTab />}
    </div>
  );
}

function RetailSale() {
  const { addNotification, dbQuery, dbRun, formatCurrency, formatWeight } = useContext(AppContext);
  const [invoices, setInvoices] = useState([]);
  const [parties, setParties] = useState([]);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [invoice, setInvoice] = useState({
    voucher_no: '', date: new Date().toISOString().split('T')[0],
    party_id: '', narration: '', total_amount: 0, gold_weight: 0,
    gst_amount: 0, gst_rate: 3,
    voucher_type: 'Sale_Retail', payment_mode: 'Cash'
  });
  const [lineItems, setLineItems] = useState([]);
  const [goldRate, setGoldRate] = useState(0);
  const [isGst, setIsGst] = useState(false);
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');

  useEffect(() => {
    loadData();
    dbQuery("SELECT rate_per_gram FROM metal_rates WHERE metal_type='Gold' AND purity='24K' ORDER BY rate_date DESC LIMIT 1").then(r => setGoldRate(r[0]?.rate_per_gram || 0));
    window.electronAPI.printer.list().then(list => { setPrinters(list || []); if (list?.length) setSelectedPrinter(list[0].name); }).catch(() => {});
    genVoucherNo();
  }, []);

  const openNewForm = async () => {
    setEditMode(null);
    resetForm();
    await genVoucherNo();
    setShowForm(true);
  };

  const genVoucherNo = async () => {
    const no = await VoucherHelper.getNextNumber(dbRun, dbQuery, 'Sale_Retail');
    setInvoice(prev => ({ ...prev, voucher_no: no }));
  };

  const resetForm = () => {
    setInvoice({
      voucher_no: '', date: new Date().toISOString().split('T')[0],
      party_id: '', narration: '', total_amount: 0, gold_weight: 0,
      gst_amount: 0, gst_rate: 3,
      voucher_type: 'Sale_Retail', payment_mode: 'Cash'
    });
    setLineItems([]);
    setEditMode(null);
  };

  const loadData = async () => {
    setInvoices(await dbQuery("SELECT t.*, p.name as party_name FROM transactions t LEFT JOIN parties p ON t.party_id = p.id WHERE t.voucher_type IN ('Sale_Retail','Sale_Wholesale') ORDER BY t.created_at DESC LIMIT 200"));
    setParties(await dbQuery("SELECT * FROM parties WHERE type IN ('Customer','Both') ORDER BY name"));
    setItems(await dbQuery("SELECT i.*, c.name as category_name FROM items i LEFT JOIN categories c ON i.category_id=c.id WHERE i.status='active' ORDER BY i.name"));
  };

  const addLineItem = () => setLineItems([...lineItems, { id: crypto.randomUUID(), item_id: '', qty: 1, weight: '', stone_weight: 0, purity: '22K', rate: goldRate, making_charges: '', wastage_charges: 0, discount: '', amount: '' }]);

  const updateLineItem = (id, field, value) => {
    const updated = lineItems.map(item => {
      if (item.id !== id) return item;
      const newItem = { ...item, [field]: value };
      if (field === 'item_id') {
        const sel = items.find(i => i.id === value);
        if (sel) { newItem.rate = sel.selling_price || goldRate; newItem.purity = sel.purity; newItem.weight = sel.weight ?? ''; newItem.stone_weight = sel.stone_weight ?? 0; newItem.making_charges = sel.making_charges ?? ''; }
      }
      newItem.amount = (parseFloat(newItem.qty) || 1) * (parseFloat(newItem.rate) || 0) + (parseFloat(newItem.making_charges) || 0) + (parseFloat(newItem.wastage_charges) || 0) - (parseFloat(newItem.discount) || 0);
      const gstRate = parseFloat(newItem.gst_rate) || 3;
      newItem.taxable = parseFloat(newItem.amount) || 0;
      newItem.gst_amount = newItem.taxable * gstRate / 100;
      newItem.cgst = newItem.gst_amount / 2;
      newItem.sgst = newItem.gst_amount / 2;
      return newItem;
    });
    setLineItems(updated);
    setInvoice(prev => ({ ...prev, total_amount: updated.reduce((s, i) => s + (i.amount || 0), 0), gst_amount: updated.reduce((s, i) => s + (i.gst_amount || 0), 0), gold_weight: updated.reduce((s, i) => s + (i.weight || 0), 0) }));
  };

  const removeLineItem = (id) => {
    const updated = lineItems.filter(i => i.id !== id);
    setLineItems(updated);
    setInvoice(prev => ({ ...prev, total_amount: updated.reduce((s, i) => s + (i.amount || 0), 0), gold_weight: updated.reduce((s, i) => s + (i.weight || 0), 0) }));
  };

  const saveInvoice = async () => {
    if (!invoice.party_id) { addNotification('Select customer', 'error'); return; }
    if (lineItems.length === 0) { addNotification('Add items', 'error'); return; }
    if (!invoice.voucher_no) { addNotification('Voucher number not generated', 'error'); return; }

    if (editMode) {
      await dbRun('UPDATE transactions SET date=?,party_id=?,narration=?,total_amount=?,gold_weight=?,payment_mode=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',
        [invoice.date, invoice.party_id, invoice.narration, invoice.total_amount, invoice.gold_weight, invoice.payment_mode, editMode.id]);
      await dbRun('DELETE FROM sale_invoice_items WHERE transaction_id=?', [editMode.id]);
      for (const item of lineItems) {
        await dbRun('INSERT INTO sale_invoice_items (id,transaction_id,item_id,qty,weight,stone_weight,purity,rate,making_charges,wastage_charges,discount,amount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
          [crypto.randomUUID(), editMode.id, item.item_id, item.qty, item.weight, item.stone_weight, item.purity, item.rate, item.making_charges, item.wastage_charges, item.discount, item.amount]);
      }
      addNotification(`Invoice ${invoice.voucher_no} updated`, 'success');
      setShowForm(false);
      setEditMode(null);
      resetForm();
      loadData();
      return;
    }

    const txId = crypto.randomUUID();
    const totalGst = lineItems.reduce((s,i) => s + (i.gst_amount || 0), 0);
    await dbRun('INSERT INTO transactions (id,voucher_no,voucher_type,date,party_id,narration,total_amount,gold_weight,gst_amount,payment_mode) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [txId, invoice.voucher_no, invoice.voucher_type, invoice.date, invoice.party_id, invoice.narration, invoice.total_amount, invoice.gold_weight, totalGst, invoice.payment_mode]);
    for (const item of lineItems) {
      await dbRun('INSERT INTO sale_invoice_items (id,transaction_id,item_id,qty,weight,stone_weight,purity,rate,making_charges,wastage_charges,discount,amount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        [crypto.randomUUID(), txId, item.item_id, item.qty, item.weight, item.stone_weight, item.purity, item.rate, item.making_charges, item.wastage_charges, item.discount, item.amount]);
      if (item.item_id) await dbRun('UPDATE items SET current_qty = current_qty - ? WHERE id = ?', [item.qty || 1, item.item_id]);
    }
    addNotification(`Invoice ${invoice.voucher_no} created`, 'success');
    setShowForm(false);
    resetForm();
    await genVoucherNo();
    loadData();
  };

  const editInvoice = async (inv) => {
    setEditMode(inv);
    const itemsList = await dbQuery("SELECT sii.*, i.name, i.code FROM sale_invoice_items sii LEFT JOIN items i ON sii.item_id=i.id WHERE sii.transaction_id=?", [inv.id]);
    setInvoice({
      voucher_no: inv.voucher_no, date: inv.date, party_id: inv.party_id,
      narration: inv.narration || '', total_amount: inv.total_amount,
      gold_weight: inv.gold_weight, voucher_type: inv.voucher_type,
      payment_mode: inv.payment_mode || 'Cash'
    });
    setLineItems(itemsList.map(i => ({
      id: i.id, item_id: i.item_id, qty: i.qty || 1, weight: i.weight || '',
      stone_weight: i.stone_weight || 0, purity: i.purity || '22K', rate: i.rate || '',
      making_charges: i.making_charges || '', wastage_charges: i.wastage_charges || 0,
      discount: i.discount || '', amount: i.amount || ''
    })));
    const party = parties.find(p => p.id === inv.party_id);
    setIsGst(!!party?.gstin);
    setShowForm(true);
  };

  const cancelInvoice = async (inv) => {
    if (!confirm(`Cancel invoice ${inv.voucher_no}? This will restore stock quantities.`)) return;
    await dbRun("UPDATE transactions SET status='cancelled', updated_at=CURRENT_TIMESTAMP WHERE id=?", [inv.id]);
    const itemsList = await dbQuery("SELECT * FROM sale_invoice_items WHERE transaction_id=?", [inv.id]);
    for (const item of itemsList) {
      if (item.item_id) await dbRun('UPDATE items SET current_qty = current_qty + ? WHERE id = ?', [item.qty || 1, item.item_id]);
    }
    addNotification(`Invoice ${inv.voucher_no} cancelled`, 'info');
    loadData();
  };

  const printReceipt = async (inv) => {
    const itemsList = await dbQuery("SELECT sii.*, i.name, i.code FROM sale_invoice_items sii LEFT JOIN items i ON sii.item_id=i.id WHERE sii.transaction_id=?", [inv.id]);
    const company = await window.electronAPI.config.get();
    const party = inv.party_id ? await dbQuery("SELECT * FROM parties WHERE id=?", [inv.party_id]) : [];
    const invoiceData = { ...inv, party_name: inv.party_name || 'Walk-in', gstin: party[0]?.gstin || '', paperWidth: 80, paperHeight: 297 };
    const isGstInvoice = isGst || !!party[0]?.gstin;
    const html = PrintService.generateReceiptHTML(invoiceData, itemsList.map(i => ({ ...i, name: i.name || i.code || 'Item' })), company, isGstInvoice);
    try {
      if (selectedPrinter) await window.electronAPI.printer.printSilent(html, selectedPrinter, { margins: { marginType: 'none' } });
      else await window.electronAPI.printer.print(html, { margins: { marginType: 'none' } });
      addNotification('Receipt sent to printer', 'success');
    } catch (e) { addNotification('Print error: ' + e.message, 'error'); }
  };

  const printAfterSave = async (txId) => {
    const company = await window.electronAPI.config.get();
    const party = await dbQuery("SELECT * FROM parties WHERE id=?", [invoice.party_id]);
    const invoiceData = { ...invoice, party_name: party[0]?.name || 'Walk-in', gstin: party[0]?.gstin || '', paperWidth: 80, paperHeight: 297 };
    const html = PrintService.generateReceiptHTML(invoiceData, lineItems.map(i => {
      const match = items.find(it => it.id === i.item_id);
      return { ...i, name: match?.name || match?.code || 'Item' };
    }), company, isGst || !!party[0]?.gstin);
    try {
      if (selectedPrinter) await window.electronAPI.printer.printSilent(html, selectedPrinter, { margins: { marginType: 'none' } });
      else await window.electronAPI.printer.print(html, { margins: { marginType: 'none' } });
    } catch (e) {}
  };

  const saveAndPrint = async () => {
    if (!invoice.party_id) { addNotification('Select customer', 'error'); return; }
    if (lineItems.length === 0) { addNotification('Add items', 'error'); return; }
    if (!invoice.voucher_no) { addNotification('Voucher number not generated', 'error'); return; }

    if (editMode) {
      await dbRun('UPDATE transactions SET date=?,party_id=?,narration=?,total_amount=?,gold_weight=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',
        [invoice.date, invoice.party_id, invoice.narration, invoice.total_amount, invoice.gold_weight, editMode.id]);
      await dbRun('DELETE FROM sale_invoice_items WHERE transaction_id=?', [editMode.id]);
      for (const item of lineItems) {
        await dbRun('INSERT INTO sale_invoice_items (id,transaction_id,item_id,qty,weight,stone_weight,purity,rate,making_charges,wastage_charges,discount,amount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
          [crypto.randomUUID(), editMode.id, item.item_id, item.qty, item.weight, item.stone_weight, item.purity, item.rate, item.making_charges, item.wastage_charges, item.discount, item.amount]);
      }
      addNotification(`Invoice ${invoice.voucher_no} updated`, 'success');
      await printAfterSave(editMode.id);
      setShowForm(false); setEditMode(null); resetForm(); await genVoucherNo(); loadData();
      return;
    }

    const txId = crypto.randomUUID();
    const totalGst = lineItems.reduce((s,i) => s + (i.gst_amount || 0), 0);
    await dbRun('INSERT INTO transactions (id,voucher_no,voucher_type,date,party_id,narration,total_amount,gold_weight,gst_amount,payment_mode) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [txId, invoice.voucher_no, invoice.voucher_type, invoice.date, invoice.party_id, invoice.narration, invoice.total_amount, invoice.gold_weight, totalGst, invoice.payment_mode]);
    for (const item of lineItems) {
      await dbRun('INSERT INTO sale_invoice_items (id,transaction_id,item_id,qty,weight,stone_weight,purity,rate,making_charges,wastage_charges,discount,amount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        [crypto.randomUUID(), txId, item.item_id, item.qty, item.weight, item.stone_weight, item.purity, item.rate, item.making_charges, item.wastage_charges, item.discount, item.amount]);
      if (item.item_id) await dbRun('UPDATE items SET current_qty = current_qty - ? WHERE id = ?', [item.qty || 1, item.item_id]);
    }
    addNotification(`Invoice ${invoice.voucher_no} created`, 'success');
    await printAfterSave(txId);
    setShowForm(false); resetForm(); await genVoucherNo(); loadData();
  };

  const filtered = invoices.filter(i => i.voucher_no?.includes(search) || i.party_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-left"><input className="search-input" placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="toolbar-right">
          <select className="form-input" style={{ width: 160, fontSize: 11 }} value={selectedPrinter} onChange={e => setSelectedPrinter(e.target.value)}>
            {printers.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            <option value="">Default Printer</option>
          </select>
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8' }}>
            <input type="checkbox" checked={isGst} onChange={e => setIsGst(e.target.checked)} /> GST
          </label>
          <button className="btn btn-primary" onClick={openNewForm}>+ New Sale</button>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditMode(null); }}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">{editMode ? '✏️ Edit Sale Invoice' : '🧾 New Sale Invoice'}</div><button className="title-btn close" onClick={() => { setShowForm(false); setEditMode(null); }}>✕</button></div>
            <div className="modal-body">
              <div className="form-row-4 mb-4">
                <div className="form-group"><label className="form-label">Voucher No</label><input className="form-input" value={invoice.voucher_no} onChange={e => setInvoice({...invoice, voucher_no: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={invoice.date} onChange={e => setInvoice({...invoice, date: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Customer</label>
                  <Autocomplete options={parties.map(p => ({value: p.id, label: p.name}))} value={invoice.party_id} onChange={v => { const p = parties.find(x => x.id === v); setInvoice({...invoice, party_id: v}); setIsGst(!!p?.gstin); }} placeholder="Walk-in Customer" creatable={false} />
                </div>
                <div className="form-group"><label className="form-label">Payment Mode</label>
                  <Autocomplete options={PAYMENT_OPTIONS} value={invoice.payment_mode} onChange={v => setInvoice({...invoice, payment_mode: v})} placeholder="Payment mode" />
                </div>
              </div>
              <div className="flex-between mb-4"><strong>Invoice Items</strong><button className="btn btn-secondary btn-sm" onClick={addLineItem}>+ Add Item</button></div>
              <div className="table-container mb-4">
                <table>
                  <thead><tr><th>Item</th><th>Purity</th><th>Wt</th><th>Rate</th><th>Making</th><th>Disc</th><th>Amt</th><th>CGST</th><th>SGST</th><th>Total</th><th></th></tr></thead>
                  <tbody>
                    {lineItems.map(item => (
                      <tr key={item.id}>
                        <td><Autocomplete options={items.map(i => ({value: i.id, label: `${i.name} (${i.code})`}))} value={item.item_id} onChange={v => updateLineItem(item.id, 'item_id', v)} placeholder="Select item" creatable={false} /></td>
                        <td><Autocomplete options={PURITY_OPTIONS} value={item.purity} onChange={v => updateLineItem(item.id, 'purity', v)} style={{ width: 80 }} placeholder="Purity" /></td>
                        <td><NumberInput value={item.weight} onChange={v => updateLineItem(item.id, 'weight', v)} style={{ width: 80 }} step="0.001" /></td>
                        <td><NumberInput value={item.rate} onChange={v => updateLineItem(item.id, 'rate', v)} style={{ width: 80 }} /></td>
                        <td><NumberInput value={item.making_charges} onChange={v => updateLineItem(item.id, 'making_charges', v)} style={{ width: 70 }} /></td>
                        <td><NumberInput value={item.discount} onChange={v => updateLineItem(item.id, 'discount', v)} style={{ width: 70 }} /></td>
                        <td className="fw-bold text-gold">{formatCurrency(item.amount)}</td>
                        <td>{formatCurrency(item.cgst || 0)}</td>
                        <td>{formatCurrency(item.sgst || 0)}</td>
                        <td className="fw-bold text-gold">{formatCurrency((item.amount || 0) + (item.gst_amount || 0))}</td>
                        <td><button className="btn btn-danger btn-xs" onClick={() => removeLineItem(item.id)}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex-end" style={{ display: 'flex', justifyContent: 'flex-end', gap: 24 }}>
                <span>Total Weight: <strong>{formatWeight(invoice.gold_weight)}</strong></span>
                <span>Subtotal: {formatCurrency(invoice.total_amount)}</span>
                <span>GST: {formatCurrency(invoice.gst_amount || 0)}</span>
                <span>Grand Total: <strong style={{fontSize:18,color:'#f59e0b'}}>{formatCurrency((invoice.total_amount || 0) + (invoice.gst_amount || 0))}</strong></span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditMode(null); }}>Cancel</button>
              <button className="btn btn-primary" onClick={saveInvoice}>💾 Save</button>
              <button className="btn btn-success" onClick={saveAndPrint}>💾 🖨️ Save & Print</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <table>
          <thead><tr><th>Voucher</th><th>Date</th><th>Customer</th><th>Amount</th><th>Weight</th><th>Payment</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {filtered.map(inv => <tr key={inv.id} className={inv.status === 'cancelled' ? 'cancelled-row' : ''}>
              <td><strong>{inv.voucher_no}</strong></td><td>{inv.date}</td>
              <td>{inv.party_name || 'Walk-in'}</td>
              <td className={`fw-bold ${inv.status === 'cancelled' ? 'text-muted' : 'text-green'}`}>{formatCurrency(inv.total_amount)}</td>
              <td>{formatWeight(inv.gold_weight)}</td>
              <td><span className="badge badge-info">{inv.payment_mode || 'Cash'}</span></td>
              <td>{inv.status === 'cancelled' ? <span className="badge badge-danger">Cancelled</span> : <span className="badge badge-success">Active</span>}</td>
              <td>
                <div className="btn-group">
                  {inv.status !== 'cancelled' && <button className="btn btn-xs btn-secondary" onClick={() => editInvoice(inv)} title="Edit">✏️</button>}
                  <button className="btn btn-xs btn-secondary" onClick={() => printReceipt(inv)} title="Print Receipt">🖨️</button>
                  {inv.status !== 'cancelled' && <button className="btn btn-xs btn-danger" onClick={() => cancelInvoice(inv)} title="Cancel Invoice">🚫</button>}
                </div>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WholesaleSale() {
  const { addNotification, dbQuery, dbRun, formatCurrency, formatWeight } = useContext(AppContext);
  const [invoices, setInvoices] = useState([]);
  const [parties, setParties] = useState([]);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [invoice, setInvoice] = useState({
    voucher_no: '', date: new Date().toISOString().split('T')[0],
    party_id: '', narration: '', total_amount: 0, gold_weight: 0, voucher_type: 'Sale_Wholesale', payment_mode: 'Credit'
  });
  const [lineItems, setLineItems] = useState([]);
  const [goldRate, setGoldRate] = useState(0);
  const [selectedPrinter, setSelectedPrinter] = useState('');

  useEffect(() => {
    dbQuery("SELECT t.*, p.name as party_name FROM transactions t LEFT JOIN parties p ON t.party_id=p.id WHERE t.voucher_type='Sale_Wholesale' ORDER BY t.created_at DESC LIMIT 200").then(setInvoices);
    dbQuery("SELECT * FROM parties WHERE type IN ('Customer','Both') ORDER BY name").then(setParties);
    dbQuery("SELECT * FROM items WHERE status='active' ORDER BY name").then(setItems);
    dbQuery("SELECT rate_per_gram FROM metal_rates WHERE metal_type='Gold' AND purity='24K' ORDER BY rate_date DESC LIMIT 1").then(r => setGoldRate(r[0]?.rate_per_gram || 0));
    window.electronAPI.printer.list().then(list => { if (list?.length) setSelectedPrinter(list[0].name); }).catch(() => {});
    genWsVoucherNo();
  }, []);

  const genWsVoucherNo = async () => {
    const no = await VoucherHelper.getNextNumber(dbRun, dbQuery, 'Sale_Wholesale');
    setInvoice(prev => ({ ...prev, voucher_no: no }));
  };

  const saveWsInvoice = async () => {
    if (!invoice.party_id) { addNotification('Select customer', 'error'); return; }
    if (lineItems.length === 0) { addNotification('Add items', 'error'); return; }
    if (!invoice.voucher_no) { addNotification('Voucher number not generated', 'error'); return; }

    if (editMode) {
      await dbRun('UPDATE transactions SET date=?,party_id=?,narration=?,total_amount=?,gold_weight=?,payment_mode=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',
        [invoice.date, invoice.party_id, invoice.narration, invoice.total_amount, invoice.gold_weight, invoice.payment_mode, editMode.id]);
      await dbRun('DELETE FROM sale_invoice_items WHERE transaction_id=?', [editMode.id]);
      for (const item of lineItems) {
        await dbRun('INSERT INTO sale_invoice_items (id,transaction_id,item_id,qty,weight,purity,rate,making_charges,discount,amount) VALUES (?,?,?,?,?,?,?,?,?,?)',
          [crypto.randomUUID(), editMode.id, item.item_id, item.qty, item.weight, item.purity, item.rate, item.making_charges, item.discount, item.amount]);
      }
      addNotification(`Wholesale ${invoice.voucher_no} updated`, 'success');
      setShowForm(false); setEditMode(null); setLineItems([]); genWsVoucherNo();
      dbQuery("SELECT t.*, p.name as party_name FROM transactions t LEFT JOIN parties p ON t.party_id=p.id WHERE t.voucher_type='Sale_Wholesale' ORDER BY t.created_at DESC LIMIT 200").then(setInvoices);
      return;
    }

    const txId = crypto.randomUUID();
    await dbRun('INSERT INTO transactions (id,voucher_no,voucher_type,date,party_id,narration,total_amount,gold_weight,payment_mode) VALUES (?,?,?,?,?,?,?,?,?)',
      [txId, invoice.voucher_no, 'Sale_Wholesale', invoice.date, invoice.party_id, invoice.narration, invoice.total_amount, invoice.gold_weight, invoice.payment_mode]);
    for (const item of lineItems) {
      await dbRun('INSERT INTO sale_invoice_items (id,transaction_id,item_id,qty,weight,purity,rate,making_charges,discount,amount) VALUES (?,?,?,?,?,?,?,?,?,?)',
        [crypto.randomUUID(), txId, item.item_id, item.qty, item.weight, item.purity, item.rate, item.making_charges, item.discount, item.amount]);
      if (item.item_id) await dbRun('UPDATE items SET current_qty = current_qty - ? WHERE id = ?', [item.qty || 1, item.item_id]);
    }
    addNotification(`Wholesale invoice ${invoice.voucher_no} created`, 'success');
    setShowForm(false); setLineItems([]); genWsVoucherNo();
    dbQuery("SELECT t.*, p.name as party_name FROM transactions t LEFT JOIN parties p ON t.party_id=p.id WHERE t.voucher_type='Sale_Wholesale' ORDER BY t.created_at DESC LIMIT 200").then(setInvoices);
  };

  const editWsInvoice = async (inv) => {
    setEditMode(inv);
    const itemsList = await dbQuery("SELECT sii.*, i.name FROM sale_invoice_items sii LEFT JOIN items i ON sii.item_id=i.id WHERE sii.transaction_id=?", [inv.id]);
    setInvoice({ voucher_no: inv.voucher_no, date: inv.date, party_id: inv.party_id, narration: inv.narration || '', total_amount: inv.total_amount, gold_weight: inv.gold_weight, voucher_type: 'Sale_Wholesale', payment_mode: inv.payment_mode || 'Credit' });
    setLineItems(itemsList.map(i => ({ id: i.id, item_id: i.item_id, qty: i.qty || 1, weight: i.weight || '', purity: i.purity || '24K', rate: i.rate || '', making_charges: i.making_charges || '', discount: i.discount || '', amount: i.amount || '' })));
    setShowForm(true);
  };

  const cancelWsInvoice = async (inv) => {
    if (!confirm(`Cancel wholesale invoice ${inv.voucher_no}?`)) return;
    await dbRun("UPDATE transactions SET status='cancelled', updated_at=CURRENT_TIMESTAMP WHERE id=?", [inv.id]);
    const itemsList = await dbQuery("SELECT * FROM sale_invoice_items WHERE transaction_id=?", [inv.id]);
    for (const item of itemsList) { if (item.item_id) await dbRun('UPDATE items SET current_qty = current_qty + ? WHERE id = ?', [item.qty || 1, item.item_id]); }
    addNotification(`Wholesale ${inv.voucher_no} cancelled`, 'info');
    dbQuery("SELECT t.*, p.name as party_name FROM transactions t LEFT JOIN parties p ON t.party_id=p.id WHERE t.voucher_type='Sale_Wholesale' ORDER BY t.created_at DESC LIMIT 200").then(setInvoices);
  };

  const printWholesaleReceipt = async (inv) => {
    const itemsList = await dbQuery("SELECT sii.*, i.name, i.code FROM sale_invoice_items sii LEFT JOIN items i ON sii.item_id=i.id WHERE sii.transaction_id=?", [inv.id]);
    const company = await window.electronAPI.config.get();
    const html = PrintService.generateReceiptHTML({ ...inv, party_name: inv.party_name || 'Walk-in', paperWidth: 80 }, itemsList.map(i => ({ ...i, name: i.name || i.code || 'Item' })), company, true);
    try {
      if (selectedPrinter) await window.electronAPI.printer.printSilent(html, selectedPrinter, { margins: { marginType: 'none' } });
      else await window.electronAPI.printer.print(html, { margins: { marginType: 'none' } });
    } catch (e) { addNotification('Print error: ' + e.message, 'error'); }
  };

  return (
    <div>
      <div className="toolbar"><div className="toolbar-left"><input className="search-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div><div className="toolbar-right"><button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New Wholesale</button></div></div>
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditMode(null); }}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">{editMode ? '✏️ Edit Wholesale' : '📦 Wholesale Invoice'}</div><button className="title-btn close" onClick={() => { setShowForm(false); setEditMode(null); }}>✕</button></div>
            <div className="modal-body">
              <div className="form-row-4 mb-4">
                <div className="form-group"><label className="form-label">Invoice No</label><input className="form-input" value={invoice.voucher_no} onChange={e => setInvoice({...invoice, voucher_no: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={invoice.date} onChange={e => setInvoice({...invoice, date: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Customer</label><Autocomplete options={parties.map(p => ({value: p.id, label: p.name}))} value={invoice.party_id} onChange={v => setInvoice({...invoice, party_id: v})} placeholder="Select customer" creatable={false} /></div>
                <div className="form-group"><label className="form-label">Payment</label><Autocomplete options={PAYMENT_OPTIONS} value={invoice.payment_mode} onChange={v => setInvoice({...invoice, payment_mode: v})} placeholder="Payment mode" creatable /></div>
              </div>
              <div className="flex-between mb-4"><strong>Items</strong><button className="btn btn-secondary btn-sm" onClick={() => setLineItems([...lineItems, { id: crypto.randomUUID(), item_id: '', qty: 1, weight: '', purity: '24K', rate: goldRate * 0.95, making_charges: '', discount: '', amount: '' }])}>+ Add</button></div>
              <div className="table-container mb-4">
                <table><thead><tr><th>Item</th><th>Purity</th><th>Weight</th><th>Qty</th><th>Rate</th><th>Disc</th><th>Amount</th><th></th></tr></thead>
                <tbody>{lineItems.map(item => {
                  const upd = (f, v) => {
                    const updated = lineItems.map(it => it.id === item.id ? { ...it, [f]: v, amount: (parseFloat(it.qty) || 1) * (parseFloat(f === 'rate' ? v : it.rate) || 0) + (parseFloat(f === 'making_charges' ? v : it.making_charges) || 0) - (parseFloat(f === 'discount' ? v : it.discount) || 0) } : it);
                    setLineItems(updated);
                    setInvoice(prev => ({ ...prev, total_amount: updated.reduce((s, i) => s + (i.amount || 0), 0), gold_weight: updated.reduce((s, i) => s + (i.weight || 0), 0) }));
                  };
                  return <tr key={item.id}>
                    <td><select className="form-input" value={item.item_id} onChange={e => { const s = items.find(x => x.id === e.target.value); upd('item_id', e.target.value); if (s) { upd('rate', s.selling_price * 0.95 || goldRate * 0.95); upd('purity', s.purity); upd('weight', s.weight ?? ''); }}}><option value="">Select</option>{items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></td>
                    <td><Autocomplete options={PURITY_OPTIONS} value={item.purity} onChange={v => upd('purity', v)} style={{ width: 80 }} placeholder="Purity" creatable /></td>
                    <td><NumberInput value={item.weight} onChange={v => upd('weight', v)} style={{ width: 70 }} step="0.001" /></td>
                    <td><NumberInput value={item.qty} onChange={v => upd('qty', v)} style={{ width: 50 }} /></td>
                    <td><NumberInput value={item.rate} onChange={v => upd('rate', v)} style={{ width: 75 }} /></td>
                    <td><NumberInput value={item.discount} onChange={v => upd('discount', v)} style={{ width: 65 }} /></td>
                    <td className="fw-bold text-gold">{formatCurrency(item.amount)}</td>
                    <td><button className="btn btn-danger btn-xs" onClick={() => { const updated = lineItems.filter(i => i.id !== item.id); setLineItems(updated); setInvoice(prev => ({ ...prev, total_amount: updated.reduce((s, i) => s + (i.amount || 0), 0), gold_weight: updated.reduce((s, i) => s + (i.weight || 0), 0) })); }}>✕</button></td>
                  </tr>;
                })}</tbody></table>
              </div>
              <div className="flex-end" style={{ display: 'flex', justifyContent: 'flex-end', gap: 24 }}>
                <span>Weight: <strong>{formatWeight(invoice.gold_weight)}</strong></span>
                <span>Total: <strong style={{ fontSize: 18, color: '#f59e0b' }}>{formatCurrency(invoice.total_amount)}</strong></span>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditMode(null); }}>Cancel</button><button className="btn btn-success" onClick={saveWsInvoice}>💾 Save</button></div>
          </div>
        </div>
      )}
      <div className="card">
        <table><thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Amount</th><th>Weight</th><th>Payment</th><th>Status</th><th></th></tr></thead>
          <tbody>{invoices.filter(i => i.voucher_no?.includes(search) || i.party_name?.toLowerCase().includes(search.toLowerCase())).map(inv => <tr key={inv.id} className={inv.status === 'cancelled' ? 'cancelled-row' : ''}>
            <td><strong>{inv.voucher_no}</strong></td><td>{inv.date}</td><td>{inv.party_name}</td>
            <td className={`fw-bold ${inv.status === 'cancelled' ? 'text-muted' : 'text-green'}`}>{formatCurrency(inv.total_amount)}</td><td>{formatWeight(inv.gold_weight)}</td>
            <td><span className="badge badge-info">{inv.payment_mode}</span></td>
            <td>{inv.status === 'cancelled' ? <span className="badge badge-danger">Cancelled</span> : <span className="badge badge-success">Active</span>}</td>
            <td><div className="btn-group">
              {inv.status !== 'cancelled' && <button className="btn btn-xs btn-secondary" onClick={() => editWsInvoice(inv)}>✏️</button>}
              <button className="btn btn-xs btn-secondary" onClick={() => printWholesaleReceipt(inv)}>🖨️</button>
              {inv.status !== 'cancelled' && <button className="btn btn-xs btn-danger" onClick={() => cancelWsInvoice(inv)}>🚫</button>}
            </div></td>
          </tr>)}</tbody></table>
      </div>
    </div>
  );
}

function EstimateSection() {
  const { dbQuery, formatCurrency } = useContext(AppContext);
  const [estimates, setEstimates] = useState([]);
  useEffect(() => { dbQuery("SELECT t.*, p.name as party_name FROM transactions t LEFT JOIN parties p ON t.party_id=p.id WHERE t.voucher_type='Estimate' ORDER BY t.created_at DESC").then(setEstimates); }, []);
  return (
    <div className="card">
      <div className="card-header"><div className="card-title">📝 Estimate / Quotation Memos</div><button className="btn btn-primary btn-sm">+ New Estimate</button></div>
      <table><thead><tr><th>Estimate No</th><th>Date</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead><tbody>{estimates.map(e => <tr key={e.id}><td>{e.voucher_no}</td><td>{e.date}</td><td>{e.party_name}</td><td>{formatCurrency(e.total_amount)}</td><td><span className="badge badge-warning">{e.status}</span></td></tr>)}</tbody></table>
    </div>
  );
}

function OrderSection() {
  const { dbQuery, formatCurrency, dbRun, addNotification } = useContext(AppContext);
  const [orders, setOrders] = useState([]);
  const [parties, setParties] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ voucher_no: 'ORD-' + Date.now().toString(36).toUpperCase(), date: new Date().toISOString().split('T')[0], party_id: '', delivery_date: '', total_amount: 0, narration: '' });
  const [items, setItems] = useState([]);

  useEffect(() => {
    dbQuery("SELECT t.*, p.name as party_name FROM transactions t LEFT JOIN parties p ON t.party_id=p.id WHERE t.voucher_type='Order' ORDER BY t.created_at DESC").then(setOrders);
    dbQuery("SELECT * FROM parties WHERE type IN ('Customer','Both') ORDER BY name").then(setParties);
    dbQuery("SELECT * FROM items WHERE status='active' ORDER BY name").then(setItems);
  }, []);

  const saveOrder = async () => {
    if (!form.party_id) { addNotification('Select customer', 'error'); return; }
    await dbRun('INSERT INTO transactions (id,voucher_no,voucher_type,date,party_id,narration,total_amount,status) VALUES (?,?,?,?,?,?,?,"pending")',
      [crypto.randomUUID(), form.voucher_no, 'Order', form.date, form.party_id, form.narration, form.total_amount]);
    addNotification(`Order ${form.voucher_no} created`, 'success');
    setShowForm(false);
    dbQuery("SELECT t.*, p.name as party_name FROM transactions t LEFT JOIN parties p ON t.party_id=p.id WHERE t.voucher_type='Order' ORDER BY t.created_at DESC").then(setOrders);
  };

  return (
    <div className="card">
      <div className="card-header"><div className="card-title">📦 Customer Orders</div><button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ New Order</button></div>
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">New Order</div><button className="title-btn close" onClick={() => setShowForm(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Order No</label><input className="form-input" value={form.voucher_no} onChange={e => setForm({...form, voucher_no: e.target.value})} /></div>
              <div className="form-row"><div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div><div className="form-group"><label className="form-label">Delivery Date</label><input type="date" className="form-input" value={form.delivery_date} onChange={e => setForm({...form, delivery_date: e.target.value})} /></div></div>
              <div className="form-group"><label className="form-label">Customer</label><select className="form-input" value={form.party_id} onChange={e => setForm({...form, party_id: e.target.value})}><option value="">Select</option>{parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Amount</label><input type="number" className="form-input" value={form.total_amount || ''} onChange={e => { const v = e.target.value; setForm({...form, total_amount: v === '' ? '' : parseFloat(v) || 0}); }} /></div>
              <div className="form-group"><label className="form-label">Narration</label><textarea className="form-input" rows={2} value={form.narration} onChange={e => setForm({...form, narration: e.target.value})} /></div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={saveOrder}>Save Order</button></div>
          </div>
        </div>
      )}
      <table><thead><tr><th>Order No</th><th>Date</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead><tbody>{orders.map(o => <tr key={o.id}><td><strong>{o.voucher_no}</strong></td><td>{o.date}</td><td>{o.party_name}</td><td>{formatCurrency(o.total_amount)}</td><td><span className={`badge ${o.status === 'completed' ? 'badge-success' : o.status === 'cancelled' ? 'badge-danger' : 'badge-warning'}`}>{o.status}</span></td></tr>)}</tbody></table>
    </div>
  );
}

function ExchangeSection() {
  const { dbQuery, formatCurrency } = useContext(AppContext);
  const [transactions, setTransactions] = useState([]);
  useEffect(() => {
    dbQuery("SELECT t.*, p.name as party_name FROM transactions t LEFT JOIN parties p ON t.party_id=p.id WHERE t.voucher_type='Sale_Retail' AND t.id IN (SELECT DISTINCT transaction_id FROM sale_invoice_items WHERE old_exchange_value > 0) ORDER BY t.created_at DESC").then(setTransactions);
  }, []);
  return (
    <div className="card">
      <div className="card-header"><div className="card-title">🔄 Old Gold Exchange</div><span className="badge badge-gold">Exchange Transactions</span></div>
      <table><thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>New Amount</th><th>Exchange Value</th><th>Net Payable</th></tr></thead>
      <tbody>{transactions.map(t => <tr key={t.id}><td>{t.voucher_no}</td><td>{t.date}</td><td>{t.party_name}</td><td>{formatCurrency(t.total_amount)}</td><td className="text-green">-{formatCurrency(0)}</td><td className="fw-bold">{formatCurrency(t.total_amount)}</td></tr>)}</tbody></table>
    </div>
  );
}

function RepairSection() {
  const { addNotification, dbQuery, dbRun } = useContext(AppContext);
  const [repairs, setRepairs] = useState([]);
  const [parties, setParties] = useState([]);
  const [karagirs, setKaragirs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ voucher_no: 'REP-' + Date.now().toString(36).toUpperCase(), date: new Date().toISOString().split('T')[0], customer_id: '', karagir_id: '', description: '', weight: '', charges: '', delivery_date: '' });

  useEffect(() => {
    dbQuery("SELECT t.*, p.name as party_name FROM transactions t LEFT JOIN parties p ON t.party_id=p.id WHERE t.voucher_type='Repairing' ORDER BY t.created_at DESC").then(setRepairs);
    dbQuery("SELECT * FROM parties WHERE type IN ('Customer','Both') ORDER BY name").then(setParties);
    dbQuery("SELECT * FROM parties WHERE type='Karagir' ORDER BY name").then(setKaragirs);
  }, []);

  const saveRepair = async () => {
    if (!form.customer_id) { addNotification('Select customer', 'error'); return; }
    await dbRun('INSERT INTO transactions (id,voucher_no,voucher_type,date,party_id,narration,total_amount,status) VALUES (?,?,?,?,?,?,?,"pending")',
      [crypto.randomUUID(), form.voucher_no, 'Repairing', form.date, form.customer_id, form.description, form.charges]);
    addNotification(`Repair ticket ${form.voucher_no} created`, 'success');
    setShowForm(false);
    dbQuery("SELECT t.*, p.name as party_name FROM transactions t LEFT JOIN parties p ON t.party_id=p.id WHERE t.voucher_type='Repairing' ORDER BY t.created_at DESC").then(setRepairs);
  };

  return (
    <div className="card">
      <div className="card-header"><div className="card-title">🔧 Repairing Management</div><button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ New Repair Ticket</button></div>
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">New Repair Ticket</div><button className="title-btn close" onClick={() => setShowForm(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-row"><div className="form-group"><label className="form-label">Ticket No</label><input className="form-input" value={form.voucher_no} onChange={e => setForm({...form, voucher_no: e.target.value})} /></div><div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div></div>
              <div className="form-group"><label className="form-label">Customer</label><select className="form-input" value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})}><option value="">Select</option>{parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Assign to Karagir</label><select className="form-input" value={form.karagir_id} onChange={e => setForm({...form, karagir_id: e.target.value})}><option value="">Select</option>{karagirs.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}</select></div>
              <div className="form-row"><div className="form-group"><label className="form-label">Weight (g)</label><input type="number" step="0.001" className="form-input" value={form.weight || ''} onChange={e => { const v = e.target.value; setForm({...form, weight: v === '' ? '' : parseFloat(v) || 0}); }} /></div><div className="form-group"><label className="form-label">Charges (₹)</label><input type="number" className="form-input" value={form.charges || ''} onChange={e => { const v = e.target.value; setForm({...form, charges: v === '' ? '' : parseFloat(v) || 0}); }} /></div></div>
              <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Delivery Date</label><input type="date" className="form-input" value={form.delivery_date} onChange={e => setForm({...form, delivery_date: e.target.value})} /></div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={saveRepair}>Create Ticket</button></div>
          </div>
        </div>
      )}
      <table><thead><tr><th>Ticket No</th><th>Date</th><th>Customer</th><th>Weight</th><th>Charges</th><th>Status</th></tr></thead><tbody>{repairs.map(r => <tr key={r.id}><td><strong>{r.voucher_no}</strong></td><td>{r.date}</td><td>{r.party_name}</td><td>{r.gold_weight || '-'}g</td><td>{r.total_amount}</td><td><span className={`badge ${r.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>{r.status}</span></td></tr>)}</tbody></table>
    </div>
  );
}
