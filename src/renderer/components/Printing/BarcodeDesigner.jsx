import React, { useState, useEffect, useContext, useRef } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { PrintService, DEFAULT_BARCODE_SETTINGS } from '../../utils/PrintService';
import { generateBarcodeSVG } from '../../utils/BarcodeGenerator';
import PrintLayoutEditor from './PrintLayoutEditor';

export default function BarcodeDesigner() {
  const { setPageTitle, dbQuery, addNotification } = useContext(AppContext);
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_BARCODE_SETTINGS);
  const [previewHtml, setPreviewHtml] = useState('');
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showLayoutEditor, setShowLayoutEditor] = useState(false);
  const [printSettings, setPrintSettings] = useState({});
  const [search, setSearch] = useState('');
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState('');
  const [rows, setRows] = useState(8);
  const [cols, setCols] = useState(3);
  const previewRef = useRef(null);

  useEffect(() => {
    setPageTitle('Barcode Designer');
    loadItems();
    loadPrinters();
    loadProfiles();
  }, []);

  const loadItems = async () => {
    setItems(await dbQuery("SELECT i.*, c.name as category_name FROM items i LEFT JOIN categories c ON i.category_id=c.id WHERE i.status='active' ORDER BY i.name"));
  };

  const loadPrinters = async () => {
    try {
      const list = await window.electronAPI.printer.list();
      setPrinters(list || []);
      if (list && list.length > 0) setSelectedPrinter(list[0].name);
    } catch (e) { console.error(e); }
  };

  const loadProfiles = async () => {
    const data = await dbQuery('SELECT * FROM paper_profiles WHERE type="barcode" ORDER BY is_default DESC, created_at DESC');
    setProfiles(data);
    const def = data.find(p => p.is_default);
    if (def) applyProfile(def);
  };

  const applyProfile = (p) => {
    setSelectedProfile(p.id);
    const margin = p.margin_top || 3;
    const gap = 2;
    const cols = Math.floor((p.width - 2 * margin) / 25);
    const rows = Math.floor((p.height - 2 * margin) / 12);
    const c = Math.max(1, Math.min(10, cols));
    const r = Math.max(1, Math.min(30, rows));
    setCols(c);
    setRows(r);
    setSettings(prev => ({
      ...prev,
      pageWidth: p.width,
      pageHeight: p.height,
      margin: margin,
      gap: gap,
      columns: c,
      stickerWidth: (p.width - 2 * margin - (c - 1) * gap) / c,
      stickerHeight: (p.height - 2 * margin - (r - 1) * gap) / r,
    }));
  };

  const toggleItem = (item) => {
    setSelectedItems(prev =>
      prev.find(i => i.id === item.id) ? prev.filter(i => i.id !== item.id) : [...prev, item]
    );
  };

  const selectAll = () => setSelectedItems([...items]);
  const clearAll = () => setSelectedItems([]);

  const stickersPerPage = cols * rows;
  const totalPages = selectedItems.length > 0 ? Math.ceil(selectedItems.length / stickersPerPage) : 0;

  const generatePreview = async () => {
    if (selectedItems.length === 0) { addNotification('Select items to print', 'error'); return; }
    const pagesHtml = [];
    for (let page = 0; page < totalPages; page++) {
      const pageItems = selectedItems.slice(page * stickersPerPage, (page + 1) * stickersPerPage);
      const itemsWithBarcode = await Promise.all(pageItems.map(async item => ({
        ...item,
        barcodeSvg: generateBarcodeSVG(item.barcode || item.code || 'N/A')
      })));
      pagesHtml.push(PrintService.generateBarcodeHTML(itemsWithBarcode, { ...settings, columns: cols, rows: rows }));
    }
    const combined = pagesHtml.join('<div style="page-break-after:always"></div>');
    setPreviewHtml(combined);
    setShowPreview(true);
    if (previewRef.current) previewRef.current.src = 'data:text/html;charset=utf-8,' + encodeURIComponent(combined);
  };

  const printBarcodes = async () => {
    if (selectedItems.length === 0) { addNotification('Select items to print', 'error'); return; }
    setShowLayoutEditor(true);
  };

  const doPrintBarcodes = async (template) => {
    const pagesHtml = [];
    for (let page = 0; page < totalPages; page++) {
      const pageItems = selectedItems.slice(page * stickersPerPage, (page + 1) * stickersPerPage);
      const itemsWithBarcode = await Promise.all(pageItems.map(async item => ({
        ...item,
        barcodeSvg: generateBarcodeSVG(item.barcode || item.code || 'N/A')
      })));
      pagesHtml.push(PrintService.generateBarcodeHTML(itemsWithBarcode, {
        ...settings, columns: cols, rows: rows,
        pageWidth: template.paperW || settings.pageWidth,
        pageHeight: template.paperH || settings.pageHeight,
        margin: template.marginTop || settings.margin || 3,
        gap: settings.gap || 2,
      }));
    }
    const fullHtml = pagesHtml.join('<div style="page-break-after:always"></div>');
    try {
      if (template.printer) {
        await window.electronAPI.printer.printSilent(fullHtml, template.printer, {
          landscape: template.orientation === 'landscape',
          margins: { marginType: 'none' },
        });
      } else if (selectedPrinter) {
        await window.electronAPI.printer.printSilent(fullHtml, selectedPrinter, {
          margins: { marginType: 'none' },
        });
      } else {
        await window.electronAPI.printer.print(fullHtml, {
          margins: { marginType: 'none' },
        });
      }
      setPrintSettings(template);
      addNotification(`Printing ${selectedItems.length} barcodes on ${totalPages} page(s)`, 'success');
    } catch (e) { addNotification('Print error: ' + e.message, 'error'); }
    setShowLayoutEditor(false);
  };

  const printSingle = async (item) => {
    const barcodeSvg = generateBarcodeSVG(item.barcode || item.code || 'N/A');
    const html = PrintService.generateBarcodeSingleHTML({ ...item, barcodeSvg }, settings);
    try {
      if (selectedPrinter) {
        await window.electronAPI.printer.printSilent(html, selectedPrinter, { landscape: false });
      } else {
        await window.electronAPI.printer.print(html, { landscape: false });
      }
      addNotification(`Barcode printed for ${item.name}`, 'success');
    } catch (e) {
      addNotification('Print error: ' + e.message, 'error');
    }
  };

  const filtered = items.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()) || i.code?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="settings-grid" style={{ gridTemplateColumns: '1fr 300px', gap: 16 }}>
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="toolbar" style={{ marginBottom: 8 }}>
              <div className="toolbar-left">
                <input className="search-input" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
                <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 8 }}>{selectedItems.length} selected</span>
                {selectedItems.length > 0 && <span style={{ color: '#22c55e', fontSize: 12, marginLeft: 8 }}>{totalPages} page(s) · {stickersPerPage}/page</span>}
              </div>
              <div className="toolbar-right">
                <button className="btn btn-secondary btn-xs" onClick={selectAll}>All</button>
                <button className="btn btn-secondary btn-xs" onClick={clearAll}>Clear</button>
                <button className="btn btn-primary btn-sm" onClick={generatePreview}>Preview</button>
                <button className="btn btn-success btn-sm" onClick={printBarcodes}>🖨️ Print All ({totalPages}p)</button>
              </div>
            </div>
            <div className="table-container" style={{ maxHeight: 400 }}>
              <table>
                <thead><tr><th style={{ width: 30 }}></th><th>Code</th><th>Name</th><th>Weight</th><th>Price</th><th>Barcode</th><th></th></tr></thead>
                <tbody>
                  {filtered.map(item => (
                    <tr key={item.id} className={selectedItems.find(i => i.id === item.id) ? 'selected-row' : ''}>
                      <td><input type="checkbox" checked={!!selectedItems.find(i => i.id === item.id)} onChange={() => toggleItem(item)} /></td>
                      <td><strong>{item.code}</strong></td>
                      <td>{item.name}</td>
                      <td>{(item.weight || 0).toFixed(3)}g</td>
                      <td>₹{(item.selling_price || 0).toFixed(2)}</td>
                      <td style={{ fontSize: 10 }}>{item.barcode || item.code || '-'}</td>
                      <td><button className="btn btn-xs btn-secondary" onClick={() => printSingle(item)} title="Print single">🖨️</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <div className="card" style={{ position: 'sticky', top: 0 }}>
            <h4 style={{ marginBottom: 12 }}>⚙️ Barcode Settings</h4>

            <div className="form-group">
              <label className="form-label">Paper Profile</label>
              <select className="form-input" value={selectedProfile} onChange={e => { const p = profiles.find(x => x.id === e.target.value); if (p) applyProfile(p); }}>
                <option value="">Manual Setup</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.name} ({p.width}x{p.height})</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Printer</label>
              <select className="form-input" value={selectedPrinter} onChange={e => setSelectedPrinter(e.target.value)}>
                {printers.map(p => <option key={p.name} value={p.name}>{p.displayName || p.name}</option>)}
                <option value="">System Default</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Columns</label>
                <input type="number" min="1" max="10" className="form-input" value={cols} onChange={e => setCols(parseInt(e.target.value) || 1)} />
              </div>
              <div className="form-group">
                <label className="form-label">Rows</label>
                <input type="number" min="1" max="30" className="form-input" value={rows} onChange={e => setRows(parseInt(e.target.value) || 1)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Sticker Size</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#94a3b8' }}>
                <input type="number" step="0.5" className="form-input" style={{ width: '50%' }} value={settings.stickerWidth}
                  onChange={e => setSettings({...settings, stickerWidth: parseFloat(e.target.value) || 25})} /> ×
                <input type="number" step="0.5" className="form-input" style={{ width: '50%' }} value={settings.stickerHeight}
                  onChange={e => setSettings({...settings, stickerHeight: parseFloat(e.target.value) || 10})} /> mm
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Gap (mm)</label>
                <input type="number" step="0.5" className="form-input" value={settings.gap || 2}
                  onChange={e => setSettings({...settings, gap: parseFloat(e.target.value) || 2})} />
              </div>
              <div className="form-group">
                <label className="form-label">Margin (mm)</label>
                <input type="number" step="0.5" className="form-input" value={settings.margin || 3}
                  onChange={e => setSettings({...settings, margin: parseFloat(e.target.value) || 3})} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Name Size (px)</label>
                <input type="number" className="form-input" value={settings.nameSize || 6} onChange={e => setSettings({...settings, nameSize: parseInt(e.target.value) || 6})} />
              </div>
              <div className="form-group">
                <label className="form-label">Detail Size (px)</label>
                <input type="number" className="form-input" value={settings.detailSize || 5} onChange={e => setSettings({...settings, detailSize: parseInt(e.target.value) || 5})} />
              </div>
            </div>

            <div className="form-group" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <label><input type="checkbox" checked={settings.border} onChange={e => setSettings({...settings, border: e.target.checked})} /> Border</label>
              <label><input type="checkbox" checked={settings.showQty} onChange={e => setSettings({...settings, showQty: e.target.checked})} /> Show Qty</label>
            </div>

            {selectedItems.length > 0 && (
              <div className="stats-grid" style={{ marginTop: 8, gridTemplateColumns: '1fr 1fr' }}>
                <div className="stat-card" style={{ padding: '6px 8px' }}><div className="stat-value" style={{ fontSize: 16 }}>{selectedItems.length}</div><div className="stat-label" style={{ fontSize: 10 }}>Items</div></div>
                <div className="stat-card" style={{ padding: '6px 8px' }}><div className="stat-value" style={{ fontSize: 16 }}>{totalPages}</div><div className="stat-label" style={{ fontSize: 10 }}>Pages</div></div>
              </div>
            )}

            <button className="btn btn-success" style={{ width: '100%', marginTop: 8 }} onClick={printBarcodes} disabled={selectedItems.length === 0}>
              🖨️ Print {selectedItems.length} Barcodes
            </button>
          </div>
        </div>
      </div>

      {showPreview && (
        <div className="modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📋 Barcode Preview ({totalPages} page(s))</div>
              <button className="title-btn close" onClick={() => setShowPreview(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              <iframe ref={previewRef} style={{ width: '100%', height: '70vh', border: 'none' }} />
            </div>
            <div className="modal-footer">
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{stickersPerPage} stickers/page · {totalPages} page(s)</span>
              <button className="btn btn-secondary" onClick={() => setShowPreview(false)}>Close</button>
              <button className="btn btn-primary" onClick={printBarcodes}>🖨️ Print</button>
            </div>
          </div>
        </div>
      )}

      {showLayoutEditor && (
        <PrintLayoutEditor
          type="barcode"
          initialSettings={{ ...printSettings, ...settings, printer: selectedPrinter, paperW: settings.pageWidth, paperH: settings.pageHeight }}
          onClose={() => setShowLayoutEditor(false)}
          onSave={doPrintBarcodes}
        />
      )}
    </div>
  );
}
