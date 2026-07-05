import React, { useState, useEffect } from 'react';

const PAPER_SIZES = [
  { label: 'Thermal 80mm (Receipt)', width: 80, height: 297 },
  { label: 'Thermal 58mm (Receipt)', width: 58, height: 297 },
  { label: 'A4', width: 210, height: 297 },
  { label: 'A5', width: 148, height: 210 },
  { label: 'A6', width: 105, height: 148 },
  { label: 'Letter', width: 216, height: 279 },
  { label: 'Custom', width: 0, height: 0 },
];

export default function PrintSetupModal({ onClose, onPrint, defaultSettings, title = 'Print Setup' }) {
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [paperSize, setPaperSize] = useState(defaultSettings?.paperSize || PAPER_SIZES[0]);
  const [customWidth, setCustomWidth] = useState(defaultSettings?.customWidth || 80);
  const [customHeight, setCustomHeight] = useState(defaultSettings?.customHeight || 297);
  const [orientation, setOrientation] = useState('portrait');
  const [margins, setMargins] = useState(defaultSettings?.margins || 'none');
  const [copies, setCopies] = useState(1);
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  useEffect(() => {
    window.electronAPI.printer.list().then(list => {
      setPrinters(list || []);
      if (list?.length) setSelectedPrinter(defaultSettings?.printer || list[0].name);
    }).catch(() => {});
  }, []);

  const handlePaperTypeChange = (e) => {
    const selected = PAPER_SIZES.find(p => p.label === e.target.value);
    if (selected) {
      setPaperSize(selected);
      if (selected.label === 'Custom') {
        setCustomWidth(defaultSettings?.customWidth || 80);
        setCustomHeight(defaultSettings?.customHeight || 297);
      }
    }
  };

  const getWidth = () => paperSize.label === 'Custom' ? customWidth : paperSize.width;
  const getHeight = () => paperSize.label === 'Custom' ? customHeight : paperSize.height;

  const handlePrint = () => {
    onPrint({
      printer: selectedPrinter,
      paperWidth: getWidth(),
      paperHeight: getHeight(),
      orientation,
      margins,
      copies,
      saveTemplate,
      templateName
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="title-btn close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Printer</label>
            <select className="form-input" value={selectedPrinter} onChange={e => setSelectedPrinter(e.target.value)}>
              {printers.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              <option value="">System Default</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Paper Size</label>
            <select className="form-input" value={paperSize.label} onChange={handlePaperTypeChange}>
              {PAPER_SIZES.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
            </select>
          </div>

          {paperSize.label === 'Custom' && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Width (mm)</label>
                <input type="number" step="0.5" className="form-input" value={customWidth}
                  onChange={e => setCustomWidth(parseFloat(e.target.value) || 50)} />
              </div>
              <div className="form-group">
                <label className="form-label">Height (mm)</label>
                <input type="number" step="0.5" className="form-input" value={customHeight}
                  onChange={e => setCustomHeight(parseFloat(e.target.value) || 50)} />
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Orientation</label>
              <select className="form-input" value={orientation} onChange={e => setOrientation(e.target.value)}>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Copies</label>
              <input type="number" min="1" max="99" className="form-input" value={copies}
                onChange={e => setCopies(parseInt(e.target.value) || 1)} />
            </div>
            <div className="form-group">
              <label className="form-label">Margins</label>
              <select className="form-input" value={margins} onChange={e => setMargins(e.target.value)}>
                <option value="none">None</option>
                <option value="default">Default</option>
                <option value="minimum">Minimum</option>
              </select>
            </div>
          </div>

          <div style={{
            background: '#0f172a', borderRadius: 8, padding: 16, marginTop: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 100
          }}>
            <div style={{
              width: Math.min(200, getWidth() * 2), height: Math.min(300, getHeight() * 2),
              border: '2px solid #f59e0b', borderRadius: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: '#94a3b8', background: '#1e293b'
            }}>
              {getWidth()} x {getHeight()} mm
            </div>
          </div>

          <div style={{ marginTop: 12, borderTop: '1px solid #334155', paddingTop: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={saveTemplate} onChange={e => setSaveTemplate(e.target.checked)} />
              Save as template
            </label>
            {saveTemplate && (
              <input className="form-input" style={{ marginTop: 8 }} placeholder="Template name (e.g., Barcode 50x30)"
                value={templateName} onChange={e => setTemplateName(e.target.value)} />
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handlePrint}>🖨️ Print</button>
        </div>
      </div>
    </div>
  );
}
