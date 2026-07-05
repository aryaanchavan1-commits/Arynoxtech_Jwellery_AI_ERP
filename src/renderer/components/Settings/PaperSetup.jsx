import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { detectPaperCorners, drawCorners, getPaperDimensions } from '../../utils/EdgeDetection';

const PROFILE_TYPES = [
  { value: 'barcode', label: 'Barcode Sticker' },
  { value: 'bill_a4', label: 'A4 Bill' },
  { value: 'bill_thermal', label: 'Thermal Bill' },
  { value: 'custom', label: 'Custom' },
];

const PAPER_SIZES = [
  { value: 'A4', label: 'A4 (210×297mm)', w: 210, h: 297 },
  { value: 'A5', label: 'A5 (148×210mm)', w: 148, h: 210 },
  { value: 'A6', label: 'A6 (105×148mm)', w: 105, h: 148 },
  { value: 'A7', label: 'A7 (74×105mm)', w: 74, h: 105 },
  { value: 'Letter', label: 'Letter (216×279mm)', w: 216, h: 279 },
  { value: 'Legal', label: 'Legal (216×356mm)', w: 216, h: 356 },
  { value: 'Custom', label: 'Custom', w: 0, h: 0 },
];

const STICKER_PRESETS = [
  { value: '3x8', label: '3 cols × 8 rows (24/页)', cols: 3, rows: 8 },
  { value: '2x5', label: '2 cols × 5 rows (10/页)', cols: 2, rows: 5 },
  { value: '3x10', label: '3 cols × 10 rows (30/页)', cols: 3, rows: 10 },
  { value: '2x4', label: '2 cols × 4 rows (8/页)', cols: 2, rows: 4 },
  { value: '4x6', label: '4 cols × 6 rows (24/页)', cols: 4, rows: 6 },
  { value: '5x7', label: '5 cols × 7 rows (35/页)', cols: 5, rows: 7 },
  { value: 'custom', label: 'Custom', cols: 0, rows: 0 },
];

export default function PaperSetup() {
  const { setPageTitle, dbQuery, dbRun, addNotification, formatCurrency } = useContext(AppContext);
  const videoRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [captured, setCaptured] = useState(null);
  const [corners, setCorners] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [profileType, setProfileType] = useState('barcode');
  const [profiles, setProfiles] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [dragging, setDragging] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [tab, setTab] = useState('scanner');

  const [paperSize, setPaperSize] = useState('A4');
  const [customW, setCustomW] = useState(100);
  const [customH, setCustomH] = useState(150);
  const [stickerCols, setStickerCols] = useState(3);
  const [stickerRows, setStickerRows] = useState(8);
  const [stickerPreset, setStickerPreset] = useState('3x8');
  const [margin, setMargin] = useState(3);
  const [gap, setGap] = useState(2);
  const [stickerW, setStickerW] = useState(0);
  const [stickerH, setStickerH] = useState(0);
  const [totalStickers, setTotalStickers] = useState(0);
  const [selectedPrinter, setSelectedPrinter] = useState('');

  const loadProfiles = useCallback(async () => {
    const data = await dbQuery('SELECT * FROM paper_profiles ORDER BY created_at DESC');
    setProfiles(data);
  }, [dbQuery]);

  const loadPrinters = useCallback(async () => {
    try {
      const list = await window.electronAPI.printer.list();
      setPrinters(list || []);
      if (list?.length) setSelectedPrinter(list[0].name);
    } catch { setPrinters([]); }
  }, []);

  useEffect(() => {
    setPageTitle('Paper Setup & Detection');
    loadProfiles();
    loadPrinters();
    navigator.mediaDevices?.enumerateDevices().then(devices => {
      setCameras(devices.filter(d => d.kind === 'videoinput'));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    recalcStickers();
  }, [paperSize, customW, customH, stickerCols, stickerRows, margin, gap]);

  const getPaperDim = () => {
    const p = PAPER_SIZES.find(s => s.value === paperSize);
    if (!p) return { w: 100, h: 100 };
    if (paperSize === 'Custom') return { w: customW || 100, h: customH || 100 };
    return { w: p.w, h: p.h };
  };

  const usePreset = (preset) => {
    setStickerPreset(preset.value);
    if (preset.value !== 'custom') {
      setStickerCols(preset.cols);
      setStickerRows(preset.rows);
    }
  };

  const recalcStickers = () => {
    const { w, h } = getPaperDim();
    const availW = w - margin * 2;
    const availH = h - margin * 2;
    const cw = (availW - (gap * (stickerCols - 1))) / stickerCols;
    const ch = (availH - (gap * (stickerRows - 1))) / stickerRows;
    setStickerW(cw > 0 ? parseFloat(cw.toFixed(1)) : 0);
    setStickerH(ch > 0 ? parseFloat(ch.toFixed(1)) : 0);
    setTotalStickers(stickerCols * stickerRows);
  };

  const handlePresetChange = (preset) => {
    usePreset(preset);
  };

  const startCamera = async (deviceId) => {
    stopCamera();
    try {
      const constraints = { video: { deviceId: deviceId ? { exact: deviceId } : undefined, width: { ideal: 1280 }, height: { ideal: 720 } } };
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
      setCameraActive(true);
    } catch (err) {
      addNotification('Camera access denied: ' + err.message, 'error');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleCameraSelect = (deviceId) => {
    setSelectedCamera(deviceId);
    startCamera(deviceId);
  };

  const captureFrame = () => {
    if (!videoRef.current || !captureCanvasRef.current) return;
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCaptured({ width: canvas.width, height: canvas.height });
    detectEdges();
    stopCamera();
  };

  const detectEdges = () => {
    const canvas = captureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setDetecting(true);
    try {
      const result = detectPaperCorners(imageData.data, canvas.width, canvas.height);
      if (result) {
        setCorners(result);
        drawOverlay(result);
      } else {
        addNotification('Could not detect paper edges. Adjust lighting or position.', 'warning');
        setCorners(null);
      }
    } catch (err) {
      addNotification('Edge detection error: ' + err.message, 'error');
      setCorners(null);
    }
    setDetecting(false);
  };

  const drawOverlay = (c) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const src = captureCanvasRef.current;
    canvas.width = src.width;
    canvas.height = src.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (c) drawCorners(ctx, c, canvas.width, canvas.height);
  };

  const handleMouseDown = (e, idx) => { setDragging(idx); };
  const handleMouseMove = (e) => {
    if (dragging === null || !corners) return;
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const newCorners = [...corners];
    newCorners[dragging] = { x: Math.max(0, Math.min(canvas.width, x)), y: Math.max(0, Math.min(canvas.height, y)) };
    setCorners(newCorners);
    drawOverlay(newCorners);
  };
  const handleMouseUp = () => { setDragging(null); };

  const resetCapture = () => {
    setCaptured(null);
    setCorners(null);
    const canvas = overlayCanvasRef.current;
    if (canvas) { const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); }
  };

  const saveProfile = async () => {
    if (!profileName.trim()) { addNotification('Enter a profile name', 'error'); return; }
    const { w, h } = getPaperDim();
    try {
      await dbRun(`INSERT INTO paper_profiles (id,name,type,width,height,margin_top,margin_right,margin_bottom,margin_left,dpi,is_default) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [crypto.randomUUID(), profileName.trim(), profileType, w, h, margin, margin, margin, margin, 300, 0]);
      addNotification(`Profile "${profileName}" saved (${w}x${h} mm, ${stickerCols}×${stickerRows} stickers)`, 'success');
      setProfileName('');
      loadProfiles();
    } catch (err) { addNotification(err.message, 'error'); }
  };

  const deleteProfile = async (id) => { await dbRun('DELETE FROM paper_profiles WHERE id=?', [id]); loadProfiles(); };

  const setDefaultProfile = async (id) => {
    await dbRun('UPDATE paper_profiles SET is_default=0');
    await dbRun('UPDATE paper_profiles SET is_default=1 WHERE id=?', [id]);
    loadProfiles();
  };

  const applyProfile = (profile) => {
    setProfileName(profile.name);
    setProfileType(profile.type);
    setMargin(profile.margin_top || 3);
  };

  return (
    <div onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} style={{ userSelect: dragging !== null ? 'none' : undefined }}>
      <div className="tabs">
        {[
          { id: 'scanner', label: 'Paper Scanner' },
          { id: 'layout', label: 'Sticker Layout' },
          { id: 'printers', label: 'Printers' },
          { id: 'profiles', label: 'Saved Profiles' },
        ].map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === 'scanner' && (
        <div>
          <div className="card mb-4">
            <div className="card-header"><div className="card-title">Camera & Paper Detection</div></div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Select Camera</label>
                <select className="form-input" value={selectedCamera} onChange={e => handleCameraSelect(e.target.value)}>
                  <option value="">{cameras.length > 0 ? 'Select a camera...' : 'No cameras found'}</option>
                  {cameras.map(c => <option key={c.deviceId} value={c.deviceId}>{c.label || `Camera ${c.deviceId.slice(0, 8)}`}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                {!cameraActive && captured && <button className="btn btn-primary btn-sm" onClick={() => { resetCapture(); startCamera(selectedCamera); }}>Retake</button>}
                {cameraActive && <button className="btn btn-success btn-sm" onClick={captureFrame}>Capture & Detect</button>}
                {cameraActive && <button className="btn btn-secondary btn-sm" onClick={stopCamera}>Stop Camera</button>}
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-header"><div className="card-title">{cameraActive ? 'Live Feed' : captured ? 'Captured Image' : 'Camera Off'}</div></div>
              <div style={{ position: 'relative', minHeight: 360, background: '#0a0f1e', borderRadius: 8, overflow: 'hidden' }}>
                {cameraActive && <video ref={videoRef} autoPlay playsInline style={{ width: '100%', display: 'block' }} />}
                {!cameraActive && <canvas ref={captureCanvasRef} style={{ width: '100%', display: 'block', background: '#0a0f1e' }} />}
                {detecting && <div className="loading-spinner" />}
              </div>
            </div>
            <div className="card">
              <div className="card-header"><div className="card-title">Edge Detection Overlay</div>{corners && <span className="badge badge-success">Detected</span>}</div>
              <div style={{ position: 'relative', minHeight: 360, background: '#0a0f1e', borderRadius: 8, overflow: 'hidden' }}>
                <canvas ref={overlayCanvasRef} style={{ width: '100%', display: 'block' }} />
                {!captured && <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Capture a paper to see edge detection</div>}
                {corners && corners.map((c, i) => (
                  <div key={i} onMouseDown={e => handleMouseDown(e, i)}
                    style={{ position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: '#ff4444', border: '2px solid white', cursor: 'grab',
                      left: `${(c.x / (captureCanvasRef.current?.width || 1)) * 100}%`,
                      top: `${(c.y / (captureCanvasRef.current?.height || 1)) * 100}%`,
                      transform: 'translate(-50%, -50%)', zIndex: 10, boxShadow: '0 0 8px rgba(255,0,0,0.5)' }}
                  />
                ))}
              </div>
              {corners && (() => {
                const dims = getPaperDimensions(corners);
                const canvas = captureCanvasRef.current;
                if (!dims || !canvas) return null;
                const refW = 210, refH = 297;
                const w = (dims.widthPx / canvas.width) * refW;
                const h = (dims.heightPx / canvas.height) * refH;
                return <div style={{ marginTop: 8, fontSize: 13, color: '#94a3b8' }}>Detected: <strong style={{ color: '#f59e0b' }}>{w.toFixed(1)} x {h.toFixed(1)} mm</strong> (drag corners to adjust)</div>;
              })()}
            </div>
          </div>

          {captured && (
            <div className="card mt-2">
              <div className="card-header"><div className="card-title">Save Paper Profile</div></div>
              <div className="form-row-4">
                <div className="form-group"><label className="form-label">Profile Name</label><input type="text" className="form-input" value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="e.g. A6 Barcode 3x8" /></div>
                <div className="form-group"><label className="form-label">Paper Type</label><select className="form-input" value={profileType} onChange={e => setProfileType(e.target.value)}>{PROFILE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button className="btn btn-primary btn-sm" onClick={saveProfile} disabled={!corners || !profileName.trim()}>Save Profile</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'layout' && (
        <div>
          <div className="card mb-4">
            <div className="card-header"><div className="card-title">Paper Size</div></div>
            <div className="form-row-4">
              <div className="form-group"><label className="form-label">Paper Size</label>
                <select className="form-input" value={paperSize} onChange={e => setPaperSize(e.target.value)}>
                  {PAPER_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              {paperSize === 'Custom' && (
                <>
                  <div className="form-group"><label className="form-label">Width (mm)</label><input type="number" className="form-input" value={customW} onChange={e => setCustomW(parseFloat(e.target.value) || 0)} /></div>
                  <div className="form-group"><label className="form-label">Height (mm)</label><input type="number" className="form-input" value={customH} onChange={e => setCustomH(parseFloat(e.target.value) || 0)} /></div>
                </>
              )}
              <div className="form-group"><label className="form-label">Margin (mm)</label><input type="number" className="form-input" value={margin} onChange={e => setMargin(parseFloat(e.target.value) || 0)} /></div>
              <div className="form-group"><label className="form-label">Gap (mm)</label><input type="number" className="form-input" value={gap} onChange={e => setGap(parseFloat(e.target.value) || 0)} /></div>
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-header"><div className="card-title">Sticker Grid</div></div>
            <div className="form-row-4">
              <div className="form-group"><label className="form-label">Layout Preset</label>
                <select className="form-input" value={stickerPreset} onChange={e => { const p = STICKER_PRESETS.find(s => s.value === e.target.value); if (p) handlePresetChange(p); }}>
                  {STICKER_PRESETS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Columns</label><input type="number" min="1" max="10" className="form-input" value={stickerCols} onChange={e => { setStickerCols(parseInt(e.target.value) || 1); setStickerPreset('custom'); }} /></div>
              <div className="form-group"><label className="form-label">Rows</label><input type="number" min="1" max="20" className="form-input" value={stickerRows} onChange={e => { setStickerRows(parseInt(e.target.value) || 1); setStickerPreset('custom'); }} /></div>
            </div>

            {stickerW > 0 && stickerH > 0 && (
              <div className="stats-grid" style={{ marginTop: 12 }}>
                <div className="stat-card"><div className="stat-icon gold">📐</div><div className="stat-content"><div className="stat-value">{stickerW} × {stickerH} mm</div><div className="stat-label">Each Sticker Size</div></div></div>
                <div className="stat-card"><div className="stat-icon blue">🔢</div><div className="stat-content"><div className="stat-value">{totalStickers}</div><div className="stat-label">Stickers per Page</div></div></div>
                <div className="stat-card"><div className="stat-icon green">📄</div><div className="stat-content"><div className="stat-value">{stickerCols} × {stickerRows}</div><div className="stat-label">Grid (Cols × Rows)</div></div></div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Visual Preview</div></div>
            <div style={{ position: 'relative', background: '#0a0f1e', borderRadius: 8, padding: 16, minHeight: 200 }}>
              <svg viewBox={`0 0 ${(stickerCols * (stickerW + gap)) + gap} ${(stickerRows * (stickerH + gap)) + gap}`}
                style={{ width: '100%', maxHeight: 400, background: '#0f172a', borderRadius: 4 }}>
                <rect x="0" y="0" width="100%" height="100%" fill="#0f172a" />
                {Array.from({ length: stickerRows }).map((_, r) =>
                  Array.from({ length: stickerCols }).map((_, c) => (
                    <rect key={`${r}-${c}`}
                      x={(gap / 2) + c * (stickerW + gap)}
                      y={(gap / 2) + r * (stickerH + gap)}
                      width={stickerW}
                      height={stickerH}
                      fill="#1e293b" stroke="#334155" strokeWidth={0.5} rx={1}
                    />
                  ))
                )}
              </svg>
            </div>
          </div>
        </div>
      )}

      {tab === 'printers' && (
        <div className="card">
          <div className="card-header"><div className="card-title">Detected Printers</div><button className="btn btn-sm btn-secondary" onClick={loadPrinters}>Refresh</button></div>
          {printers.length === 0 ? <div className="empty-state-text">No printers detected</div> : (
            <table>
              <thead><tr><th>#</th><th>Printer Name</th><th>Status</th><th>Default</th><th>Select</th></tr></thead>
              <tbody>{printers.map((p, i) => (
                <tr key={p.name || i} style={{ background: selectedPrinter === p.name ? 'rgba(245,158,11,0.08)' : undefined }}>
                  <td>{i + 1}</td>
                  <td><strong>{p.displayName || p.name}</strong></td>
                  <td><span className={`badge ${p.status === 0 || p.status === 3 ? 'badge-success' : 'badge-warning'}`}>{p.status === 0 ? 'Ready' : p.status === 3 ? 'Idle' : 'Offline'}</span></td>
                  <td>{p.isDefault ? <span className="badge badge-info">Default</span> : '-'}</td>
                  <td><button className={`btn btn-xs ${selectedPrinter === p.name ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSelectedPrinter(p.name)}>{selectedPrinter === p.name ? 'Selected' : 'Select'}</button></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'profiles' && (
        <div className="card">
          <div className="card-header"><div className="card-title">Saved Paper Profiles</div></div>
          {profiles.length === 0 ? <div className="empty-state-text">No saved profiles. Use the scanner or layout tab to create one.</div> : (
            <table>
              <thead><tr><th>Name</th><th>Type</th><th>Size (mm)</th><th>Default</th><th>Actions</th></tr></thead>
              <tbody>{profiles.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong></td>
                  <td><span className="badge badge-info">{p.type}</span></td>
                  <td>{p.width} x {p.height}</td>
                  <td>{p.is_default ? <span className="badge badge-success">Default</span> : <button className="btn btn-xs btn-secondary" onClick={() => setDefaultProfile(p.id)}>Set Default</button>}</td>
                  <td>
                    <button className="btn btn-xs btn-secondary" onClick={() => applyProfile(p)} style={{ marginRight: 4 }}>Apply</button>
                    <button className="btn btn-xs btn-danger" onClick={() => deleteProfile(p.id)}>Delete</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
          <div style={{ marginTop: 12, padding: 12, background: 'rgba(245,158,11,0.06)', borderRadius: 8, fontSize: 13, color: '#94a3b8' }}>
            <strong>Tip:</strong> Go to <strong>Barcode Designer</strong> to batch-print barcodes using a paper profile. In the designer, you can select items, choose a profile, and print all barcodes across multiple pages.
          </div>
        </div>
      )}
    </div>
  );
}
