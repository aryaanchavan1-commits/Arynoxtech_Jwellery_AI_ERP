import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import Autocomplete from '../Common/Autocomplete';
import NumberInput from '../../utils/NumberInput';

export default function StockManagement() {
  const { setPageTitle, formatCurrency, formatWeight, dbQuery, dbRun, addNotification } = useContext(AppContext);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    code: '', name: '', category_id: '', metal_type: 'Gold', purity: '22K',
    weight: 0, stone_weight: 0, making_charges: 0, wastage_percent: 0,
    cost_price: 0, selling_price: 0, tray_no: '', shelf_no: '', location: '',
    current_qty: 0, min_qty: 0, barcode: ''
  });
  const [tab, setTab] = useState('items');

  useEffect(() => {
    setPageTitle('Stock Management');
    loadData();
  }, []);

  const loadData = async () => {
    const itemData = await dbQuery(`
      SELECT i.*, c.name as category_name
      FROM items i LEFT JOIN categories c ON i.category_id = c.id
      ORDER BY i.updated_at DESC
    `);
    setItems(itemData);
    const catData = await dbQuery('SELECT * FROM categories ORDER BY name');
    setCategories(catData);
  };

  const handleSubmit = async () => {
    if (!form.code || !form.name) {
      addNotification('Code and Name are required', 'error');
      return;
    }
    const id = editItem?.id || crypto.randomUUID();
    const sql = editItem
      ? `UPDATE items SET code=?, name=?, category_id=?, metal_type=?, purity=?, weight=?, stone_weight=?, making_charges=?, wastage_percent=?, cost_price=?, selling_price=?, tray_no=?, shelf_no=?, location=?, current_qty=?, min_qty=?, barcode=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
      : `INSERT INTO items (id,code,name,category_id,metal_type,purity,weight,stone_weight,making_charges,wastage_percent,cost_price,selling_price,tray_no,shelf_no,location,current_qty,min_qty,barcode) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    const params = [form.code, form.name, form.category_id, form.metal_type, form.purity,
      form.weight, form.stone_weight, form.making_charges, form.wastage_percent,
      form.cost_price, form.selling_price, form.tray_no, form.shelf_no, form.location,
      form.current_qty, form.min_qty, form.barcode];
    if (editItem) params.push(editItem.id);
    else params.unshift(id);

    await dbRun(sql, editItem ? params : [id, ...params]);
    addNotification(editItem ? 'Item updated' : 'Item created', 'success');
    setShowForm(false);
    setEditItem(null);
    resetForm();
    loadData();
  };

  const resetForm = () => {
    setForm({
      code: '', name: '', category_id: '', metal_type: 'Gold', purity: '22K',
      weight: 0, stone_weight: 0, making_charges: 0, wastage_percent: 0,
      cost_price: 0, selling_price: 0, tray_no: '', shelf_no: '', location: '',
      current_qty: 0, min_qty: 0, barcode: ''
    });
  };

  const editHandler = (item) => {
    setEditItem(item);
    setForm({
      code: item.code, name: item.name, category_id: item.category_id || '',
      metal_type: item.metal_type, purity: item.purity, weight: item.weight,
      stone_weight: item.stone_weight, making_charges: item.making_charges,
      wastage_percent: item.wastage_percent, cost_price: item.cost_price,
      selling_price: item.selling_price, tray_no: item.tray_no || '',
      shelf_no: item.shelf_no || '', location: item.location || '',
      current_qty: item.current_qty, min_qty: item.min_qty, barcode: item.barcode || ''
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
    i.name?.toLowerCase().includes(search.toLowerCase()) ||
    i.code?.toLowerCase().includes(search.toLowerCase()) ||
    i.barcode?.includes(search)
  );

  const barcodeTab = () => (
    <div>
      <div className="toolbar">
        <div className="toolbar-left">
          <button className="btn btn-primary" onClick={() => {
            const id = crypto.randomUUID();
            const bc = 'BC' + Date.now().toString(36).toUpperCase();
            setForm(prev => ({ ...prev, barcode: bc }));
            addNotification(`Barcode generated: ${bc}`, 'info');
          }}>Generate Barcode</button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="tabs">
        <button className={`tab ${tab === 'items' ? 'active' : ''}`} onClick={() => setTab('items')}>Items</button>
        <button className={`tab ${tab === 'categories' ? 'active' : ''}`} onClick={() => setTab('categories')}>Categories</button>
        <button className={`tab ${tab === 'trays' ? 'active' : ''}`} onClick={() => setTab('trays')}>Trays/Shelves</button>
        <button className={`tab ${tab === 'barcodes' ? 'active' : ''}`} onClick={() => setTab('barcodes')}>Barcodes</button>
      </div>

      {tab === 'items' && (
        <div>
          <div className="toolbar">
            <div className="toolbar-left">
              <input className="search-input" placeholder="Search items by name, code, barcode..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="toolbar-right">
              <button className="btn btn-primary" onClick={() => { setEditItem(null); resetForm(); setShowForm(true); }}>+ Add Item</button>
            </div>
          </div>

          {showForm && (
            <div className="modal-overlay" onClick={() => setShowForm(false)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-title">{editItem ? 'Edit Item' : 'New Item'}</div>
                  <button className="title-btn close" onClick={() => setShowForm(false)}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Item Code *</label>
                      <input className="form-input" value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Item Name *</label>
                      <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Category</label>
                    <Autocomplete
                      options={categories.map(c => ({value: c.id, label: c.name}))}
                      value={form.category_id}
                      onChange={v => setForm({...form, category_id: v})}
                      placeholder="Select Category"
                    />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Metal Type</label>
                      <select className="form-input" value={form.metal_type} onChange={e => setForm({...form, metal_type: e.target.value})}>
                        <option>Gold</option><option>Silver</option><option>Platinum</option><option>Diamond</option><option>Stone</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Purity</label>
                      <select className="form-input" value={form.purity} onChange={e => setForm({...form, purity: e.target.value})}>
                        <option>24K</option><option>22K</option><option>18K</option><option>14K</option><option>916</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Weight (g)</label>
                      <NumberInput step="0.001" value={form.weight} onChange={v => setForm({...form, weight: v})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Stone Weight (g)</label>
                      <NumberInput step="0.001" value={form.stone_weight} onChange={v => setForm({...form, stone_weight: v})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Making Charges</label>
                      <NumberInput value={form.making_charges} onChange={v => setForm({...form, making_charges: v})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Wastage %</label>
                      <NumberInput step="0.1" value={form.wastage_percent} onChange={v => setForm({...form, wastage_percent: v})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Cost Price</label>
                      <NumberInput value={form.cost_price} onChange={v => setForm({...form, cost_price: v})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Selling Price</label>
                      <NumberInput value={form.selling_price} onChange={v => setForm({...form, selling_price: v})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tray No</label>
                      <input className="form-input" value={form.tray_no} onChange={e => setForm({...form, tray_no: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Shelf No</label>
                      <input className="form-input" value={form.shelf_no} onChange={e => setForm({...form, shelf_no: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Current Qty</label>
                      <NumberInput step="0.001" value={form.current_qty} onChange={v => setForm({...form, current_qty: v})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Min Qty (Alert)</label>
                      <NumberInput step="0.001" value={form.min_qty} onChange={v => setForm({...form, min_qty: v})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Barcode</label>
                      <input className="form-input" value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Location</label>
                      <input className="form-input" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                    </div>
                  </div>
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
                <thead>
                  <tr>
                    <th>Code</th><th>Name</th><th>Metal</th><th>Purity</th>
                    <th>Weight</th><th>Stone</th><th>Net Wt</th>
                    <th>Price</th><th>Tray</th><th>Qty</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => (
                    <tr key={item.id}>
                      <td><strong>{item.code}</strong></td>
                      <td>{item.name}</td>
                      <td>{item.metal_type}</td>
                      <td>{item.purity}</td>
                      <td>{formatWeight(item.weight)}</td>
                      <td>{formatWeight(item.stone_weight)}</td>
                      <td>{formatWeight((item.weight || 0) - (item.stone_weight || 0))}</td>
                      <td>{formatCurrency(item.selling_price)}</td>
                      <td>{item.tray_no || '-'}</td>
                      <td>
                        <span className={`badge ${(item.current_qty || 0) <= (item.min_qty || 0) ? 'badge-danger' : 'badge-success'}`}>
                          {item.current_qty || 0}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => editHandler(item)} style={{ marginRight: 4 }}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteHandler(item.id)}>Del</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'categories' && <CategoryManager dbQuery={dbQuery} dbRun={dbRun} addNotification={addNotification} />}
      {tab === 'trays' && <TrayManager dbQuery={dbQuery} dbRun={dbRun} addNotification={addNotification} />}
      {tab === 'barcodes' && barcodeTab()}
    </div>
  );
}

function CategoryManager({ dbQuery, dbRun, addNotification }) {
  const [cats, setCats] = useState([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('Ornament');

  useEffect(() => { loadCats(); }, []);
  const loadCats = async () => {
    const d = await dbQuery('SELECT * FROM categories ORDER BY name');
    setCats(d);
  };
  const addCat = async () => {
    if (!name) return;
    await dbRun('INSERT INTO categories (id, name, type) VALUES (?, ?, ?)', [crypto.randomUUID(), name, type]);
    setName('');
    addNotification('Category added', 'success');
    loadCats();
  };
  const delCat = async (id) => {
    await dbRun('DELETE FROM categories WHERE id=?', [id]);
    loadCats();
  };
  return (
    <div className="card">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input className="form-input" placeholder="Category name" value={name} onChange={e => setName(e.target.value)} style={{ flex: 1 }} />
        <select className="form-input" value={type} onChange={e => setType(e.target.value)} style={{ width: 150 }}>
          <option>Ornament</option><option>Stone</option><option>Raw Material</option><option>Other</option>
        </select>
        <button className="btn btn-primary" onClick={addCat}>Add</button>
      </div>
      <table>
        <thead><tr><th>Name</th><th>Type</th><th>Actions</th></tr></thead>
        <tbody>
          {cats.map(c => (
            <tr key={c.id}><td>{c.name}</td><td>{c.type}</td><td><button className="btn btn-danger btn-sm" onClick={() => delCat(c.id)}>Del</button></td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrayManager({ dbQuery, dbRun, addNotification }) {
  const [trays, setTrays] = useState([]);
  const [form, setForm] = useState({ name: '', shelf_no: '', location: '', capacity: 0 });
  useEffect(() => { loadTrays(); }, []);
  const loadTrays = async () => {
    const d = await dbQuery('SELECT * FROM trays ORDER BY name');
    setTrays(d);
  };
  const addTray = async () => {
    if (!form.name) return;
    await dbRun('INSERT INTO trays (id, name, shelf_no, location, capacity) VALUES (?, ?, ?, ?, ?)',
      [crypto.randomUUID(), form.name, form.shelf_no, form.location, form.capacity]);
    setForm({ name: '', shelf_no: '', location: '', capacity: 0 });
    addNotification('Tray added', 'success');
    loadTrays();
  };
  const delTray = async (id) => {
    await dbRun('DELETE FROM trays WHERE id=?', [id]);
    loadTrays();
  };
  return (
    <div className="card">
      <div className="grid-4" style={{ marginBottom: 16 }}>
        <input className="form-input" placeholder="Tray name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        <input className="form-input" placeholder="Shelf No" value={form.shelf_no} onChange={e => setForm({...form, shelf_no: e.target.value})} />
        <input className="form-input" placeholder="Location" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
        <button className="btn btn-primary" onClick={addTray}>Add Tray</button>
      </div>
      <table>
        <thead><tr><th>Name</th><th>Shelf</th><th>Location</th><th>Capacity</th><th>Count</th><th>Actions</th></tr></thead>
        <tbody>
          {trays.map(t => (
            <tr key={t.id}><td>{t.name}</td><td>{t.shelf_no}</td><td>{t.location}</td><td>{t.capacity}</td><td>{t.current_count}</td><td><button className="btn btn-danger btn-sm" onClick={() => delTray(t.id)}>Del</button></td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
