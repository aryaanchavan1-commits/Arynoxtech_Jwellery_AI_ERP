import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { PrintService, DEFAULT_BARCODE_SETTINGS } from '../../utils/PrintService';
import Autocomplete, { METAL_OPTIONS, PURITY_OPTIONS } from '../Common/Autocomplete';

export default function MastersModule() {
  const { setPageTitle } = useContext(AppContext);
  const [tab, setTab] = useState('items');

  useEffect(() => { setPageTitle('Masters'); }, []);

  const tabs = [
    { id: 'items', label: '🏷️ Items', component: ItemsMaster },
    { id: 'categories', label: '📂 Categories', component: CategoriesMaster },
    { id: 'parties', label: '👥 Parties', component: PartiesMaster },
    { id: 'barcodes', label: '📋 Barcodes', component: BarcodeMaster },
    { id: 'trays', label: '📦 Trays/Shelves', component: TrayMaster },
    { id: 'employees', label: '👤 Employees', component: EmployeeMaster },
  ];

  const ActiveComponent = tabs.find(t => t.id === tab)?.component;

  return (
    <div>
      <div className="tabs">
        {tabs.map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {ActiveComponent && <ActiveComponent />}
    </div>
  );
}

function ItemsMaster() {
  const { addNotification, dbQuery, dbRun, formatCurrency, formatWeight } = useContext(AppContext);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterMetal, setFilterMetal] = useState('all');

  const [form, setForm] = useState({
    code: '', name: '', category_id: '', metal_type: 'Gold', purity: '22K',
    weight: '', stone_weight: '', making_charges: '', wastage_percent: '',
    cost_price: '', selling_price: '', tray_no: '', shelf_no: '', location: '',
    current_qty: '', min_qty: '', barcode: '', description: '', hsn_code: '',
    gst_rate: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setItems(await dbQuery(
      'SELECT i.*, c.name as category_name FROM items i LEFT JOIN categories c ON i.category_id = c.id WHERE i.status="active" ORDER BY i.updated_at DESC'
    ));
    setCategories(await dbQuery('SELECT * FROM categories ORDER BY name'));
  };

  const printItemBarcode = async (item) => {
    const html = PrintService.generateBarcodeSingleHTML(item, DEFAULT_BARCODE_SETTINGS);
    try {
      await window.electronAPI.printer.print(html, { margins: { marginType: 'none' } });
      addNotification(`Barcode printed for ${item.name}`, 'success');
    } catch (e) { addNotification('Print error: ' + e.message, 'error'); }
  };

  const handleSubmit = async () => {
    if (!form.code || !form.name) { addNotification('Code and Name required', 'error'); return; }
    const id = editItem?.id || crypto.randomUUID();
    const params = [form.code, form.name, form.category_id, form.metal_type, form.purity,
      form.weight, form.stone_weight, form.making_charges, form.wastage_percent,
      form.cost_price, form.selling_price, form.tray_no, form.shelf_no, form.location,
      form.current_qty, form.min_qty, form.barcode, form.description, form.hsn_code,
      form.gst_rate];
    if (editItem) {
      await dbRun(`UPDATE items SET code=?,name=?,category_id=?,metal_type=?,purity=?,weight=?,stone_weight=?,making_charges=?,wastage_percent=?,cost_price=?,selling_price=?,tray_no=?,shelf_no=?,location=?,current_qty=?,min_qty=?,barcode=?,description=?,hsn_code=?,gst_rate=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`, [...params, editItem.id]);
    } else {
      await dbRun(`INSERT INTO items (id,code,name,category_id,metal_type,purity,weight,stone_weight,making_charges,wastage_percent,cost_price,selling_price,tray_no,shelf_no,location,current_qty,min_qty,barcode,description,hsn_code,gst_rate) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [id, ...params]);
    }
    addNotification(editItem ? 'Item updated' : 'Item created', 'success');
    setShowForm(false); setEditItem(null); resetForm(); loadData();
  };

  const resetForm = () => setForm({
    code: '', name: '', category_id: '', metal_type: 'Gold', purity: '22K',
    weight: '', stone_weight: '', making_charges: '', wastage_percent: '',
    cost_price: '', selling_price: '', tray_no: '', shelf_no: '', location: '',
    current_qty: '', min_qty: '', barcode: '', description: '', hsn_code: '', gst_rate: ''
  });

  const editHandler = (item) => {
    setEditItem(item);
    setForm({
      code: item.code, name: item.name, category_id: item.category_id || '',
      metal_type: item.metal_type, purity: item.purity,       weight: item.weight || '',
      stone_weight: item.stone_weight || '', making_charges: item.making_charges || '',
      wastage_percent: item.wastage_percent || '', cost_price: item.cost_price || '',
      selling_price: item.selling_price || '', tray_no: item.tray_no || '',
      shelf_no: item.shelf_no || '', location: item.location || '',
      current_qty: item.current_qty || '', min_qty: item.min_qty || '',
      barcode: item.barcode || '', description: item.description || '', hsn_code: item.hsn_code || '',
      gst_rate: item.gst_rate || ''
    });
    setShowForm(true);
  };

  const deleteHandler = async (id) => {
    if (confirm('Delete this item?')) {
      await dbRun('UPDATE items SET status="deleted" WHERE id=?', [id]);
      addNotification('Item deleted', 'info');
      loadData();
    }
  };

  const filtered = items.filter(i =>
    (filterMetal === 'all' || i.metal_type === filterMetal) &&
    (i.name?.toLowerCase().includes(search.toLowerCase()) ||
     i.code?.toLowerCase().includes(search.toLowerCase()) ||
     i.barcode?.includes(search))
  );

  const totalValue = filtered.reduce((s, i) => s + (i.selling_price || 0) * (i.current_qty || 1), 0);
  const totalWeight = filtered.reduce((s, i) => s + (i.weight || 0), 0);

  const metals = [...new Set(items.map(i => i.metal_type))];

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon gold">💎</div><div className="stat-content"><div className="stat-value">{items.length}</div><div className="stat-label">Total Items</div></div></div>
        <div className="stat-card"><div className="stat-icon cyan">⚖️</div><div className="stat-content"><div className="stat-value">{formatWeight(totalWeight)}</div><div className="stat-label">Total Weight</div></div></div>
        <div className="stat-card"><div className="stat-icon green">💰</div><div className="stat-content"><div className="stat-value">{formatCurrency(totalValue)}</div><div className="stat-label">Stock Value</div></div></div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <input className="search-input" placeholder="Search by name, code, barcode..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-input" style={{ width: 140 }} value={filterMetal} onChange={e => setFilterMetal(e.target.value)}>
            <option value="all">All Metals</option>
            {metals.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-secondary btn-sm" onClick={() => { const sel = filtered.filter(i => i); if (sel.length) printItemBarcode(sel[0]); }}>🏷️ Print Barcode</button>
          <button className="btn btn-primary" onClick={() => { setEditItem(null); resetForm(); setShowForm(true); }}>+ New Item</button>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editItem ? '✏️ Edit Item' : '➕ New Item Master'}</div>
              <button className="title-btn close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="section-title">Basic Details</div>
              <div className="form-row-4">
                <div className="form-group"><label className="form-label">Item Code *</label><input className="form-input" value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} /></div>
                <div className="form-group"><label className="form-label">Item Name *</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Category</label><select className="form-input" value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}><option value="">Select</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div className="form-group"><label className="form-label">HSN Code</label><input className="form-input" value={form.hsn_code} onChange={e => setForm({...form, hsn_code: e.target.value})} /></div>
              </div>
              <div className="section-title">Metal & Weight</div>
              <div className="form-row-4">
                <div className="form-group"><label className="form-label">Metal Type</label><Autocomplete options={METAL_OPTIONS} value={form.metal_type} onChange={v => setForm({...form, metal_type: v})} placeholder="Metal type" /></div>
                <div className="form-group"><label className="form-label">Purity</label><Autocomplete options={PURITY_OPTIONS} value={form.purity} onChange={v => setForm({...form, purity: v})} placeholder="Purity" /></div>
                <div className="form-group"><label className="form-label">Gross Weight (g)</label><input type="number" step="0.001" className="form-input" value={form.weight || ''} onChange={e => { const v = e.target.value; setForm({...form, weight: v === '' ? '' : parseFloat(v) || 0}); }} /></div>
                <div className="form-group"><label className="form-label">Stone Weight (g)</label><input type="number" step="0.001" className="form-input" value={form.stone_weight || ''} onChange={e => { const v = e.target.value; setForm({...form, stone_weight: v === '' ? '' : parseFloat(v) || 0}); }} /></div>
              </div>
              <div className="section-title">Pricing</div>
              <div className="form-row-4">
                <div className="form-group"><label className="form-label">Cost Price (₹)</label><input type="number" className="form-input" value={form.cost_price || ''} onChange={e => { const v = e.target.value; setForm({...form, cost_price: v === '' ? '' : parseFloat(v) || 0}); }} /></div>
                <div className="form-group"><label className="form-label">Selling Price (₹)</label><input type="number" className="form-input" value={form.selling_price || ''} onChange={e => { const v = e.target.value; setForm({...form, selling_price: v === '' ? '' : parseFloat(v) || 0}); }} /></div>
                <div className="form-group"><label className="form-label">Making Charges (₹)</label><input type="number" className="form-input" value={form.making_charges || ''} onChange={e => { const v = e.target.value; setForm({...form, making_charges: v === '' ? '' : parseFloat(v) || 0}); }} /></div>
                <div className="form-group"><label className="form-label">Wastage %</label><input type="number" step="0.1" className="form-input" value={form.wastage_percent || ''} onChange={e => { const v = e.target.value; setForm({...form, wastage_percent: v === '' ? '' : parseFloat(v) || 0}); }} /></div>
                <div className="form-group"><label className="form-label">GST Rate %</label><input type="number" step="0.25" className="form-input" value={form.gst_rate || ''} onChange={e => { const v = e.target.value; setForm({...form, gst_rate: v === '' ? '' : parseFloat(v) || 0}); }} placeholder="3" /></div>
              </div>
              <div className="section-title">Location & Stock</div>
              <div className="form-row-4">
                <div className="form-group"><label className="form-label">Tray No</label><input className="form-input" value={form.tray_no} onChange={e => setForm({...form, tray_no: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Shelf No</label><input className="form-input" value={form.shelf_no} onChange={e => setForm({...form, shelf_no: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Location</label><input className="form-input" value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Barcode</label><input className="form-input" value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Current Qty</label><input type="number" step="0.001" className="form-input" value={form.current_qty || ''} onChange={e => { const v = e.target.value; setForm({...form, current_qty: v === '' ? '' : parseFloat(v) || 0}); }} /></div>
                <div className="form-group"><label className="form-label">Min Qty (Alert)</label><input type="number" step="0.001" className="form-input" value={form.min_qty || ''} onChange={e => { const v = e.target.value; setForm({...form, min_qty: v === '' ? '' : parseFloat(v) || 0}); }} /></div>
              </div>
              <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}>{editItem ? 'Update' : 'Create'} Item</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Code</th><th>Name</th><th>Metal</th><th>Purity</th><th>Weight</th><th>Stone</th><th>Net</th><th>Selling Price</th><th>Tray</th><th>Qty</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={11}><div className="empty-state"><div className="empty-state-icon">💎</div><div className="empty-state-text">No items found</div></div></td></tr>}
              {filtered.map(item => (
                <tr key={item.id}>
                  <td><strong>{item.code}</strong></td>
                  <td>{item.name}<br /><span className="text-xs text-muted">{item.description?.slice(0, 30)}</span></td>
                  <td><span className="badge badge-gold">{item.metal_type}</span></td>
                  <td>{item.purity}</td>
                  <td>{formatWeight(item.weight)}</td>
                  <td>{formatWeight(item.stone_weight)}</td>
                  <td><strong>{formatWeight((item.weight || 0) - (item.stone_weight || 0))}</strong></td>
                  <td>{formatCurrency(item.selling_price)}</td>
                  <td>{item.tray_no || '-'}</td>
                  <td><span className={`badge ${(item.current_qty || 0) <= (item.min_qty || 0) ? 'badge-danger' : 'badge-success'}`}>{item.current_qty || 0}</span></td>
                  <td><div className="btn-group"><button className="btn btn-secondary btn-xs" onClick={() => editHandler(item)}>✏️</button><button className="btn btn-info btn-xs" onClick={() => printItemBarcode(item)} title="Print Barcode">🏷️</button><button className="btn btn-danger btn-xs" onClick={() => deleteHandler(item.id)}>🗑️</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CategoriesMaster() {
  const { addNotification, dbQuery, dbRun } = useContext(AppContext);
  const [cats, setCats] = useState([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('Ornament');
  const [labourCharge, setLabourCharge] = useState('');
  const [wastagePct, setWastagePct] = useState('');
  const [editCatId, setEditCatId] = useState(null);
  useEffect(() => { loadCats(); }, []);

  const loadCats = () => { dbQuery('SELECT * FROM categories ORDER BY name').then(setCats); };

  const addCat = async () => {
    if (!name) return;
    const id = editCatId || crypto.randomUUID();
    if (editCatId) {
      await dbRun('UPDATE categories SET name=?,type=?,labour_charge=?,wastage_percent=? WHERE id=?', [name, type, labourCharge || 0, wastagePct || 0, editCatId]);
    } else {
      await dbRun('INSERT INTO categories (id,name,type,labour_charge,wastage_percent) VALUES (?,?,?,?,?)', [id, name, type, labourCharge || 0, wastagePct || 0]);
    }
    setName(''); setLabourCharge(''); setWastagePct(''); setEditCatId(null);
    addNotification(editCatId ? 'Category updated' : 'Category added', 'success');
    loadCats();
  };

  const editCat = (c) => {
    setName(c.name); setType(c.type); setEditCatId(c.id);
    setLabourCharge(c.labour_charge || ''); setWastagePct(c.wastage_percent || '');
  };

  const delCat = async (id) => {
    if (confirm('Delete category?')) {
      await dbRun('DELETE FROM categories WHERE id=?', [id]);
      loadCats();
    }
  };

  return (
    <div>
      <div className="card mb-4">
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          <input className="form-input" placeholder="Category name" value={name} onChange={e => setName(e.target.value)} style={{ flex: 1, minWidth: 150 }} />
          <select className="form-input" value={type} onChange={e => setType(e.target.value)} style={{ width: 140 }}>
            <option>Ornament</option><option>Stone</option><option>Raw Material</option><option>Findings</option><option>Other</option>
          </select>
          <input type="number" className="form-input" placeholder="Labour charge ₹" value={labourCharge} onChange={e => { const v = e.target.value; setLabourCharge(v === '' ? '' : parseFloat(v) || 0); }} style={{ width: 130 }} />
          <input type="number" step="0.1" className="form-input" placeholder="Wastage %" value={wastagePct} onChange={e => { const v = e.target.value; setWastagePct(v === '' ? '' : parseFloat(v) || 0); }} style={{ width: 120 }} />
          <button className="btn btn-primary" onClick={addCat}>{editCatId ? 'Update' : 'Add'}</button>
          {editCatId && <button className="btn btn-secondary" onClick={() => { setName(''); setLabourCharge(''); setWastagePct(''); setEditCatId(null); }}>Cancel</button>}
        </div>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>Labour ₹</th><th>Wastage %</th><th>Actions</th></tr></thead>
          <tbody>
            {cats.map(c => <tr key={c.id}>
              <td><strong>{c.name}</strong></td>
              <td><span className="badge badge-info">{c.type}</span></td>
              <td>{c.labour_charge ? '₹' + c.labour_charge : '-'}</td>
              <td>{c.wastage_percent ? c.wastage_percent + '%' : '-'}</td>
              <td><button className="btn btn-xs btn-secondary" onClick={() => editCat(c)}>✏️</button> <button className="btn btn-danger btn-xs" onClick={() => delCat(c.id)}>🗑️</button></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PartiesMaster() {
  const { addNotification, dbQuery, dbRun, formatCurrency } = useContext(AppContext);
  const [parties, setParties] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editParty, setEditParty] = useState(null);
  const [form, setForm] = useState({ code: '', name: '', type: 'Customer', gstin: '', phone: '', email: '', address: '', opening_balance: '', credit_limit: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setParties(await dbQuery('SELECT * FROM parties ORDER BY name'));
  };

  const handleSubmit = async () => {
    if (!form.code || !form.name) { addNotification('Code and Name required', 'error'); return; }
    const id = editParty?.id || crypto.randomUUID();
    const params = [form.code, form.name, form.type, form.gstin, form.phone, form.email, form.address, form.opening_balance, form.credit_limit];
    if (editParty) {
      await dbRun(`UPDATE parties SET code=?,name=?,type=?,gstin=?,phone=?,email=?,address=?,opening_balance=?,credit_limit=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`, [...params, editParty.id]);
    } else {
      await dbRun(`INSERT INTO parties (id,code,name,type,gstin,phone,email,address,opening_balance,credit_limit) VALUES (?,?,?,?,?,?,?,?,?,?)`, [id, ...params]);
    }
    addNotification(editParty ? 'Party updated' : 'Party created', 'success');
    setShowForm(false); setEditParty(null); loadData();
  };

  const filtered = parties.filter(p =>
    (filterType === 'all' || p.type === filterType) &&
    (p.name?.toLowerCase().includes(search.toLowerCase()) || p.code?.toLowerCase().includes(search.toLowerCase()) || p.phone?.includes(search))
  );

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-left">
          <input className="search-input" placeholder="Search parties..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-input" style={{ width: 140 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="Customer">Customer</option><option value="Supplier">Supplier</option>
            <option value="Karagir">Karagir</option><option value="Refinery">Refinery</option>
            <option value="Salesman">Salesman</option><option value="Both">Customer & Supplier</option>
          </select>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-primary" onClick={() => { setEditParty(null); setForm({ code: '', name: '', type: 'Customer', gstin: '', phone: '', email: '', address: '', opening_balance: '', credit_limit: '' }); setShowForm(true); }}>+ New Party</button>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editParty ? '✏️ Edit Party' : '➕ New Party'}</div>
              <button className="title-btn close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row-4">
                <div className="form-group"><label className="form-label">Code *</label><input className="form-input" value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} /></div>
                <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Type</label><select className="form-input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option>Customer</option><option>Supplier</option><option>Karagir</option><option>Refinery</option><option>Salesman</option><option>Both</option></select></div>
                <div className="form-group"><label className="form-label">GSTIN</label><input className="form-input" value={form.gstin} onChange={e => setForm({...form, gstin: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Opening Balance</label><input type="number" className="form-input" value={form.opening_balance || ''} onChange={e => { const v = e.target.value; setForm({...form, opening_balance: v === '' ? '' : parseFloat(v) || 0}); }} /></div>
                <div className="form-group"><label className="form-label">Credit Limit</label><input type="number" className="form-input" value={form.credit_limit || ''} onChange={e => { const v = e.target.value; setForm({...form, credit_limit: v === '' ? '' : parseFloat(v) || 0}); }} /></div>
              </div>
              <div className="form-group"><label className="form-label">Address</label><textarea className="form-input" rows={2} value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}>{editParty ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <table>
          <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Phone</th><th>GSTIN</th><th>Balance</th><th>Credit Limit</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(p => <tr key={p.id}>
              <td><strong>{p.code}</strong></td>
              <td>{p.name}</td>
              <td><span className="badge badge-info">{p.type}</span></td>
              <td>{p.phone || '-'}</td>
              <td style={{ fontSize: 11 }}>{p.gstin || '-'}</td>
              <td className={`fw-bold ${p.opening_balance >= 0 ? 'text-green' : 'text-red'}`}>{formatCurrency(p.opening_balance)}</td>
              <td>{formatCurrency(p.credit_limit)}</td>
              <td><button className="btn btn-secondary btn-xs" onClick={() => { setEditParty(p); setForm(p); setShowForm(true); }}>✏️</button></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BarcodeMaster() {
  const { addNotification, dbQuery, dbRun } = useContext(AppContext);
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [barcodes, setBarcodes] = useState([]);

  useEffect(() => {
    dbQuery("SELECT * FROM items WHERE status='active' ORDER BY name").then(setItems);
    dbQuery('SELECT b.*, i.name as item_name FROM barcodes b LEFT JOIN items i ON b.item_id = i.id ORDER BY b.created_at DESC').then(setBarcodes);
  }, []);

  const generateBarcode = async () => {
    if (!selectedItem) { addNotification('Select an item', 'error'); return; }
    const bc = 'BC' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
    await dbRun('INSERT INTO barcodes (id, item_id, barcode) VALUES (?,?,?)', [crypto.randomUUID(), selectedItem, bc]);
    await dbRun('UPDATE items SET barcode=? WHERE id=?', [bc, selectedItem]);
    addNotification(`Barcode ${bc} generated`, 'success');
    dbQuery('SELECT b.*, i.name as item_name FROM barcodes b LEFT JOIN items i ON b.item_id = i.id ORDER BY b.created_at DESC').then(setBarcodes);
  };

  return (
    <div>
      <div className="card mb-4">
        <div className="flex gap-2">
          <select className="form-input" value={selectedItem} onChange={e => setSelectedItem(e.target.value)} style={{ flex: 1 }}>
            <option value="">Select Item</option>
            {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.code})</option>)}
          </select>
          <button className="btn btn-primary" onClick={generateBarcode}>Generate Barcode</button>
        </div>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Barcode</th><th>Item</th><th>Printed</th><th>Date</th></tr></thead>
          <tbody>
            {barcodes.map(b => <tr key={b.id}>
              <td><strong style={{ fontFamily: 'monospace', letterSpacing: 1 }}>{b.barcode}</strong></td>
              <td>{b.item_name}</td>
              <td><span className={`badge ${b.is_printed ? 'badge-success' : 'badge-warning'}`}>{b.is_printed ? '✅ Printed' : '❌ Not Printed'}</span></td>
              <td>{b.created_at?.slice(0, 10)}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrayMaster() {
  const { addNotification, dbQuery, dbRun } = useContext(AppContext);
  const [trays, setTrays] = useState([]);
  const [form, setForm] = useState({ name: '', shelf_no: '', location: '', capacity: '' });
  useEffect(() => { dbQuery('SELECT * FROM trays ORDER BY name').then(setTrays); }, []);

  const addTray = async () => {
    if (!form.name) return;
    await dbRun('INSERT INTO trays (id,name,shelf_no,location,capacity) VALUES (?,?,?,?,?)', [crypto.randomUUID(), form.name, form.shelf_no, form.location, form.capacity]);
    setForm({ name: '', shelf_no: '', location: '', capacity: '' });
    addNotification('Tray added', 'success');
    dbQuery('SELECT * FROM trays ORDER BY name').then(setTrays);
  };

  const delTray = async (id) => {
    if (confirm('Delete tray?')) { await dbRun('DELETE FROM trays WHERE id=?', [id]); dbQuery('SELECT * FROM trays ORDER BY name').then(setTrays); }
  };

  return (
    <div>
      <div className="card mb-4">
        <div className="form-row-4">
          <input className="form-input" placeholder="Tray name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <input className="form-input" placeholder="Shelf No" value={form.shelf_no} onChange={e => setForm({...form, shelf_no: e.target.value})} />
          <input className="form-input" placeholder="Location" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
          <button className="btn btn-primary" onClick={addTray}>Add Tray</button>
        </div>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Shelf</th><th>Location</th><th>Capacity</th><th>Items Count</th><th>Actions</th></tr></thead>
          <tbody>
            {trays.map(t => <tr key={t.id}>
              <td><strong>{t.name}</strong></td>
              <td>{t.shelf_no || '-'}</td><td>{t.location || '-'}</td>
              <td>{t.capacity || '-'}</td>
              <td><span className="badge badge-info">{t.current_count || 0}</span></td>
              <td><button className="btn btn-danger btn-xs" onClick={() => delTray(t.id)}>🗑️</button></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmployeeMaster() {
  const { addNotification, dbQuery, dbRun, formatCurrency } = useContext(AppContext);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ code: '', name: '', type: 'Staff', phone: '', email: '', commission_percent: '', salary: '' });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { dbQuery('SELECT * FROM employees ORDER BY name').then(setEmployees); }, []);

  const handleSubmit = async () => {
    if (!form.code || !form.name) return;
    const id = crypto.randomUUID();
    await dbRun('INSERT INTO employees (id,code,name,type,phone,email,commission_percent,salary) VALUES (?,?,?,?,?,?,?,?)', [id, form.code, form.name, form.type, form.phone, form.email, form.commission_percent, form.salary]);
    addNotification('Employee added', 'success');
    setShowForm(false);
    setForm({ code: '', name: '', type: 'Staff', phone: '', email: '', commission_percent: '', salary: '' });
    dbQuery('SELECT * FROM employees ORDER BY name').then(setEmployees);
  };

  return (
    <div>
      <div className="toolbar"><div className="toolbar-right"><button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Employee</button></div></div>
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">➕ New Employee</div><button className="title-btn close" onClick={() => setShowForm(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label className="form-label">Code</label><input className="form-input" value={form.code} onChange={e => setForm({...form, code: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Type</label><select className="form-input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option>Staff</option><option>Salesman</option><option>Karagir</option><option>Admin</option></select></div>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Commission %</label><input type="number" step="0.1" className="form-input" value={form.commission_percent || ''} onChange={e => { const v = e.target.value; setForm({...form, commission_percent: v === '' ? '' : parseFloat(v) || 0}); }} /></div>
                <div className="form-group"><label className="form-label">Salary (₹)</label><input type="number" className="form-input" value={form.salary || ''} onChange={e => { const v = e.target.value; setForm({...form, salary: v === '' ? '' : parseFloat(v) || 0}); }} /></div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit}>Save</button></div>
          </div>
        </div>
      )}
      <div className="card">
        <table>
          <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Phone</th><th>Commission</th><th>Salary</th><th>Status</th></tr></thead>
          <tbody>
            {employees.map(e => <tr key={e.id}>
              <td><strong>{e.code}</strong></td><td>{e.name}</td>
              <td><span className="badge badge-purple">{e.type}</span></td>
              <td>{e.phone || '-'}</td>
              <td>{e.commission_percent || 0}%</td>
              <td>{formatCurrency(e.salary)}</td>
              <td><span className={`badge ${e.is_active ? 'badge-success' : 'badge-danger'}`}>{e.is_active ? 'Active' : 'Inactive'}</span></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
