import React, { useState, useEffect, useRef, useCallback } from 'react';

const PAPER_TYPES = [
  { label: 'A4', width: 210, height: 297 },
  { label: 'A5', width: 148, height: 210 },
  { label: 'A6', width: 105, height: 148 },
  { label: 'Letter', width: 216, height: 279 },
  { label: 'Legal', width: 216, height: 356 },
  { label: 'Thermal 80mm', width: 80, height: 297 },
  { label: 'Thermal 58mm', width: 58, height: 297 },
  { label: 'Sticker 66x10', width: 66, height: 10 },
  { label: 'Sticker 50x30', width: 50, height: 30 },
  { label: 'Sticker 100x50', width: 100, height: 50 },
  { label: 'Custom', width: 0, height: 0 },
];

const STORAGE_KEY = 'print_templates';

function loadTemplates() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}

function saveTemplates(templates) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export default function PrintLayoutEditor({ type = 'barcode', onSave, onClose, initialSettings }) {
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState(initialSettings?.printer || '');
  const [paperType, setPaperType] = useState(initialSettings?.paperType || PAPER_TYPES[0]);
  const [customW, setCustomW] = useState(initialSettings?.customW || 66);
  const [customH, setCustomH] = useState(initialSettings?.customH || 10);
  const [marginTop, setMarginTop] = useState(initialSettings?.marginTop || 2);
  const [marginBottom, setMarginBottom] = useState(initialSettings?.marginBottom || 2);
  const [marginLeft, setMarginLeft] = useState(initialSettings?.marginLeft || 2);
  const [marginRight, setMarginRight] = useState(initialSettings?.marginRight || 2);
  const [orientation, setOrientation] = useState(initialSettings?.orientation || 'portrait');
  const [scale, setScale] = useState(0.5);
  const [templates, setTemplates] = useState(loadTemplates());
  const [templateName, setTemplateName] = useState(initialSettings?.templateName || '');
  const [savedMsg, setSavedMsg] = useState('');
  const canvasRef = useRef(null);
  const isDragging = useRef(null);
  const dragStart = useRef(null);

  const paperW = paperType.label === 'Custom' ? customW : paperType.width;
  const paperH = paperType.label === 'Custom' ? customH : paperType.height;
  const dispW = paperW * scale;
  const dispH = paperH * scale;

  useEffect(() => {
    window.electronAPI.printer.list().then(list => {
      setPrinters(list || []);
      if (list?.length && !selectedPrinter) setSelectedPrinter(list[0].name);
    }).catch(() => {});
  }, []);

  const handlePaperChange = (e) => {
    const p = PAPER_TYPES.find(pt => pt.label === e.target.value);
    if (p) setPaperType(p);
  };

  const handleMouseDown = (edge) => (e) => {
    e.preventDefault();
    isDragging.current = edge;
    dragStart.current = { x: e.clientX, y: e.clientY, mt: marginTop, mb: marginBottom, ml: marginLeft, mr: marginRight };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      const dx = (e.clientX - dragStart.current.x) / scale;
      const dy = (e.clientY - dragStart.current.y) / scale;
      const edge = isDragging.current;
      if (edge === 'top') setMarginTop(Math.max(0, dragStart.current.mt + dy));
      else if (edge === 'bottom') setMarginBottom(Math.max(0, dragStart.current.mb - dy));
      else if (edge === 'left') setMarginLeft(Math.max(0, dragStart.current.ml + dx));
      else if (edge === 'right') setMarginRight(Math.max(0, dragStart.current.mr - dx));
    };
    const handleMouseUp = () => { isDragging.current = null; };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
  }, [scale, marginTop, marginBottom, marginLeft, marginRight]);

  const saveTemplate = () => {
    const name = templateName || `${type}_${paperType.label}`;
    const template = {
      printer: selectedPrinter, paperType, customW, customH,
      marginTop, marginBottom, marginLeft, marginRight, orientation,
      paperW, paperH, type, name
    };
    const all = { ...templates, [name]: template };
    setTemplates(all);
    saveTemplates(all);
    setSavedMsg('Template saved!');
    setTimeout(() => setSavedMsg(''), 2000);
    if (onSave) onSave(template);
  };

  const loadTemplate = (name) => {
    const t = templates[name];
    if (!t) return;
    setSelectedPrinter(t.printer || '');
    setPaperType(t.paperType || PAPER_TYPES[0]);
    setCustomW(t.customW || 66);
    setCustomH(t.customH || 10);
    setMarginTop(t.marginTop ?? 2);
    setMarginBottom(t.marginBottom ?? 2);
    setMarginLeft(t.marginLeft ?? 2);
    setMarginRight(t.marginRight ?? 2);
    setOrientation(t.orientation || 'portrait');
    setTemplateName(name);
  };

  const deleteTemplate = (name) => {
    const all = { ...templates };
    delete all[name];
    setTemplates(all);
    saveTemplates(all);
  };

  const contentWidth = paperW - marginLeft - marginRight;
  const contentHeight = paperH - marginTop - marginBottom;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" style={{ maxWidth: 900 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">✂️ Print Layout Editor - {type === 'barcode' ? 'Barcode Sticker' : 'Bill/Receipt'}</div>
          <button className="title-btn close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div className="form-group">
                <label className="form-label">Printer</label>
                <select className="form-input" value={selectedPrinter} onChange={e => setSelectedPrinter(e.target.value)}>
                  {printers.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                  <option value="">System Default</option>
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Paper Size</label>
                  <select className="form-input" value={paperType.label} onChange={handlePaperChange}>
                    {PAPER_TYPES.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Orientation</label>
                  <select className="form-input" value={orientation} onChange={e => setOrientation(e.target.value)}>
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>
              </div>
              {paperType.label === 'Custom' && (
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Width (mm)</label><input type="number" step="0.5" className="form-input" value={customW} onChange={e => setCustomW(parseFloat(e.target.value) || 10)} /></div>
                  <div className="form-group"><label className="form-label">Height (mm)</label><input type="number" step="0.5" className="form-input" value={customH} onChange={e => setCustomH(parseFloat(e.target.value) || 10)} /></div>
                </div>
              )}

              <div style={{ borderTop: '1px solid #334155', paddingTop: 12, marginTop: 12 }}>
                <h5 style={{ marginBottom: 8, fontSize: 12, color: '#94a3b8' }}>Margins (mm)</h5>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Top</label><input type="number" step="0.5" className="form-input" value={marginTop} onChange={e => setMarginTop(Math.max(0, parseFloat(e.target.value) || 0))} /></div>
                  <div className="form-group"><label className="form-label">Bottom</label><input type="number" step="0.5" className="form-input" value={marginBottom} onChange={e => setMarginBottom(Math.max(0, parseFloat(e.target.value) || 0))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Left</label><input type="number" step="0.5" className="form-input" value={marginLeft} onChange={e => setMarginLeft(Math.max(0, parseFloat(e.target.value) || 0))} /></div>
                  <div className="form-group"><label className="form-label">Right</label><input type="number" step="0.5" className="form-input" value={marginRight} onChange={e => setMarginRight(Math.max(0, parseFloat(e.target.value) || 0))} /></div>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  Content area: {contentWidth.toFixed(1)} x {contentHeight.toFixed(1)} mm
                </div>
              </div>

              <div style={{ borderTop: '1px solid #334155', paddingTop: 12, marginTop: 12 }}>
                <h5 style={{ marginBottom: 8, fontSize: 12, color: '#94a3b8' }}>Templates</h5>
                <div className="form-row">
                  <input className="form-input" placeholder="Template name..." value={templateName} onChange={e => setTemplateName(e.target.value)} />
                  <button className="btn btn-primary btn-sm" onClick={saveTemplate}>💾 Save</button>
                </div>
                {Object.keys(templates).length > 0 && (
                  <div style={{ marginTop: 8, maxHeight: 140, overflowY: 'auto' }}>
                    {Object.entries(templates).map(([name, t]) => (
                      <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', fontSize: 12, borderBottom: '1px solid #0f172a', cursor: 'pointer' }}
                        onClick={() => loadTemplate(name)}>
                        <span>{name} <span style={{ color: '#64748b' }}>({t.paperW}x{t.paperH})</span></span>
                        <button className="btn btn-xs btn-danger" onClick={(e) => { e.stopPropagation(); deleteTemplate(name); }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>Preview (drag edges to crop):</span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <button className="btn btn-xs btn-secondary" onClick={() => setScale(s => Math.max(0.2, s - 0.1))}>−</button>
                  <span style={{ fontSize: 11, color: '#94a3b8', width: 30, textAlign: 'center' }}>{Math.round(scale * 100)}%</span>
                  <button className="btn btn-xs btn-secondary" onClick={() => setScale(s => Math.min(2, s + 0.1))}>+</button>
                </div>
              </div>
              <div style={{
                background: '#0f172a', borderRadius: 8, padding: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: 400, position: 'relative', overflow: 'hidden'
              }}>
                <div style={{
                  width: dispW, height: dispH,
                  background: '#fff', position: 'relative',
                  borderRadius: 1, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  transition: 'width 0.1s, height 0.1s'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: marginTop * scale, left: marginLeft * scale,
                    width: contentWidth * scale, height: contentHeight * scale,
                    background: 'rgba(245,158,11,0.06)',
                    border: '1px dashed rgba(245,158,11,0.3)',
                    pointerEvents: 'none'
                  }} />

                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    height: 4, cursor: 'ns-resize', zIndex: 10
                  }} onMouseDown={handleMouseDown('top')} />
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: 4, cursor: 'ns-resize', zIndex: 10
                  }} onMouseDown={handleMouseDown('bottom')} />
                  <div style={{
                    position: 'absolute', top: 0, bottom: 0, left: 0,
                    width: 4, cursor: 'ew-resize', zIndex: 10
                  }} onMouseDown={handleMouseDown('left')} />
                  <div style={{
                    position: 'absolute', top: 0, bottom: 0, right: 0,
                    width: 4, cursor: 'ew-resize', zIndex: 10
                  }} onMouseDown={handleMouseDown('right')} />

                  {type === 'barcode' ? (
                    <div style={{
                      position: 'absolute',
                      top: marginTop * scale, left: marginLeft * scale,
                      width: contentWidth * scale, height: contentHeight * scale,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      fontSize: Math.max(4, contentHeight * scale * 0.08),
                      color: '#333', overflow: 'hidden'
                    }}>
                      <div style={{ fontWeight: 'bold' }}>██████████████</div>
                      <div style={{ fontSize: '70%' }}>Item Barcode</div>
                      <div style={{ fontSize: '60%' }}>₹ 1,234</div>
                    </div>
                  ) : (
                    <div style={{
                      position: 'absolute',
                      top: marginTop * scale, left: marginLeft * scale,
                      width: contentWidth * scale, height: contentHeight * scale,
                      display: 'flex', flexDirection: 'column',
                      fontSize: Math.max(5, contentHeight * scale * 0.04),
                      color: '#333', overflow: 'hidden', padding: '1%'
                    }}>
                      <div style={{ fontWeight: 'bold', fontSize: '90%', textAlign: 'center' }}>Your Shop Name</div>
                      <div style={{ fontSize: '60%', textAlign: 'center' }}>Address | GST: 27XXXXX</div>
                      <div style={{ borderTop: '1px dashed #999', margin: '2% 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '60%' }}>
                        <span>Invoice: SALE-260001</span><span>Date: 05-Jul-2026</span>
                      </div>
                      <div style={{ borderTop: '1px solid #ccc', margin: '2% 0' }} />
                      <div style={{ fontSize: '55%' }}>1. Gold Ring 22K 12.500g ₹45,000</div>
                      <div style={{ fontSize: '55%' }}>2. Gold Chain 22K 25.000g ₹85,000</div>
                      <div style={{ borderTop: '1px dashed #999', margin: '2% 0' }} />
                      <div style={{ fontWeight: 'bold', fontSize: '70%', textAlign: 'right' }}>Total: ₹1,30,000</div>
                    </div>
                  )}

                  <div style={{
                    position: 'absolute', bottom: 2, right: 4,
                    fontSize: 6, color: '#999', background: 'rgba(255,255,255,0.8)', padding: '0 2px'
                  }}>
                    {paperW}×{paperH}mm
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          {savedMsg && <span style={{ color: '#22c55e', fontSize: 13, marginRight: 'auto' }}>✅ {savedMsg}</span>}
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={saveTemplate}>💾 Save Template</button>
        </div>
      </div>
    </div>
  );
}
