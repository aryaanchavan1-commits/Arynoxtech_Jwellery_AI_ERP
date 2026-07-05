import React, { useState, useEffect, useContext, useRef } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { PrintService, DEFAULT_BARCODE_SETTINGS, BARCODE_PRESETS } from '../../utils/PrintService';
import { generateBarcodeDataURL } from '../../utils/BarcodeGenerator';
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
  const previewRef = useRef(null);

  useEffect(() => {
    setPageTitle('Barcode Designer');
    loadItems();
    loadPrinters();
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

  const toggleItem = (item) => {
    setSelectedItems(prev =>
      prev.find(i => i.id === item.id) ? prev.filter(i => i.id !== item.id) : [...prev, item]
    );
  };

  const selectAll = () => setSelectedItems([...items]);
  const clearAll = () => setSelectedItems([]);

  const generatePreview = async () => {
    const itemsWithBarcode = await Promise.all(selectedItems.map(async item => ({
      ...item,
      barcodeImg: await generateBarcodeDataURL(item.barcode || item.code || 'N/A')
    })));
    const html = PrintService.generateBarcodeHTML(itemsWithBarcode, settings);
    setPreviewHtml(html);
    setShowPreview(true);
    if (previewRef.current) previewRef.current.src = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
  };

  const printBarcodes = async () => {
    if (selectedItems.length === 0) { addNotification('Select items to print', 'error'); return; }
    setShowLayoutEditor(true);
  };

  const doPrintBarcodes = async (template) => {
    const itemsWithBarcode = await Promise.all(selectedItems.map(async item => ({
      ...item,
      barcodeImg: await generateBarcodeDataURL(item.barcode || item.code || 'N/A')
    })));
    const html = PrintService.generateBarcodeHTML(itemsWithBarcode, {
      ...settings,
      pageWidth: template.paperW || settings.pageWidth,
      pageHeight: template.paperH || settings.pageHeight,
      margin: template.marginTop || 1,
      gap: 1,
    });
    try {
      if (template.printer) {
        await window.electronAPI.printer.printSilent(html, template.printer, {
          landscape: template.orientation === 'landscape',
          margins: { marginType: 'none' },
        });
      } else {
        await window.electronAPI.printer.print(html, {
          margins: { marginType: 'none' },
          landscape: template.orientation === 'landscape',
        });
      }
      setPrintSettings(template);
      addNotification(`Printing ${selectedItems.length} barcodes`, 'success');
    } catch (e) { addNotification('Print error: ' + e.message, 'error'); }
    setShowLayoutEditor(false);
  };

  const printSingle = async (item) => {
    const barcodeImg = await generateBarcodeDataURL(item.barcode || item.code || 'N/A');
    const html = PrintService.generateBarcodeSingleHTML({ ...item, barcodeImg }, settings);
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
              </div>
              <div className="toolbar-right">
                <button className="btn btn-secondary btn-xs" onClick={selectAll}>All</button>
                <button className="btn btn-secondary btn-xs" onClick={clearAll}>Clear</button>
                <button className="btn btn-primary btn-sm" onClick={generatePreview}>Preview</button>
                <button className="btn btn-success btn-sm" onClick={printBarcodes}>🖨️ Print</button>
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
            <h4 style={{ marginBottom: 12 }}>⚙️ Sticker Settings</h4>
            <div className="form-group">
              <label className="form-label">Preset</label>
              <select className="form-input" value={`${settings.stickerWidth}x${settings.stickerHeight}_${settings.columns}c`}
                onChange={e => {
                  const preset = BARCODE_PRESETS[e.target.value];
                  if (preset) setSettings({...DEFAULT_BARCODE_SETTINGS, ...preset, columns: preset.columns});
                }}>
                <option value="">Custom</option>
                {Object.entries(BARCODE_PRESETS).map(([key, p]) => <option key={key} value={key}>{p.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Printer</label>
              <select className="form-input" value={selectedPrinter} onChange={e => setSelectedPrinter(e.target.value)}>
                {printers.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                <option value="">System Default</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Sticker Width (mm)</label>
              <input type="number" step="0.5" className="form-input" value={settings.stickerWidth}
                onChange={e => setSettings({...settings, stickerWidth: parseFloat(e.target.value) || 50})} />
            </div>
            <div className="form-group">
              <label className="form-label">Sticker Height (mm)</label>
              <input type="number" step="0.5" className="form-input" value={settings.stickerHeight}
                onChange={e => setSettings({...settings, stickerHeight: parseFloat(e.target.value) || 30})} />
            </div>
            <div className="form-group">
              <label className="form-label">Columns per Page</label>
              <select className="form-input" value={settings.columns} onChange={e => setSettings({...settings, columns: parseInt(e.target.value) || 2})}>
                <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option>
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Name Size (px)</label>
                <input type="number" className="form-input" value={settings.nameSize} onChange={e => setSettings({...settings, nameSize: parseInt(e.target.value) || 8})} />
              </div>
              <div className="form-group">
                <label className="form-label">Detail Size (px)</label>
                <input type="number" className="form-input" value={settings.detailSize} onChange={e => setSettings({...settings, detailSize: parseInt(e.target.value) || 7})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Gap (mm)</label>
                <input type="number" step="0.5" className="form-input" value={settings.gap} onChange={e => setSettings({...settings, gap: parseFloat(e.target.value) || 2})} />
              </div>
              <div className="form-group">
                <label className="form-label">Margin (mm)</label>
                <input type="number" step="0.5" className="form-input" value={settings.margin} onChange={e => setSettings({...settings, margin: parseFloat(e.target.value) || 5})} />
              </div>
            </div>
            <div className="form-group" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <label><input type="checkbox" checked={settings.border} onChange={e => setSettings({...settings, border: e.target.checked})} /> Border</label>
              <label><input type="checkbox" checked={settings.showQty} onChange={e => setSettings({...settings, showQty: e.target.checked})} /> Show Qty</label>
            </div>
            <div className="form-group">
              <label className="form-label">Page Size</label>
              <select className="form-input" value={`${settings.pageWidth}x${settings.pageHeight}`}
                onChange={e => { const [w, h] = e.target.value.split('x'); setSettings({...settings, pageWidth: parseInt(w), pageHeight: parseInt(h)}); }}>
                <option value="210x297">A4 (210x297mm)</option>
                <option value="210x140">A5 (210x140mm)</option>
                <option value="100x150">100x150mm</option>
                <option value="80x297">80x297mm (Thermal)</option>
              </select>
            </div>
            <button className="btn btn-success" style={{ width: '100%', marginTop: 8 }} onClick={printBarcodes}>
              🖨️ Print {selectedItems.length} Barcodes
            </button>
          </div>
        </div>
      </div>

      {showPreview && (
        <div className="modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📋 Barcode Preview</div>
              <button className="title-btn close" onClick={() => setShowPreview(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              <iframe ref={previewRef} style={{ width: '100%', height: '70vh', border: 'none' }} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPreview(false)}>Close</button>
              <button className="btn btn-primary" onClick={printBarcodes}>🖨️ Print</button>
            </div>
          </div>
        </div>
      )}

      {showLayoutEditor && (
        <PrintLayoutEditor
          type="barcode"
          initialSettings={{ ...printSettings, ...settings, printer: selectedPrinter }}
          onClose={() => setShowLayoutEditor(false)}
          onSave={doPrintBarcodes}
        />
      )}
    </div>
  );
}
