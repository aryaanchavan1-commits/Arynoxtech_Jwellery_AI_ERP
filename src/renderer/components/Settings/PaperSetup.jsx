import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { detectPaperCorners, drawCorners, getPaperDimensions } from '../../utils/EdgeDetection';

const PROFILE_TYPES = [
  { value: 'barcode', label: 'Barcode Sticker' },
  { value: 'bill_a4', label: 'A4 Bill' },
  { value: 'bill_thermal', label: 'Thermal Bill' },
  { value: 'custom', label: 'Custom' },
];

export default function PaperSetup() {
  const { setPageTitle, dbQuery, dbRun, addNotification } = useContext(AppContext);
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

  const loadProfiles = useCallback(async () => {
    const data = await dbQuery('SELECT * FROM paper_profiles ORDER BY created_at DESC');
    setProfiles(data);
  }, [dbQuery]);

  const loadPrinters = useCallback(async () => {
    try {
      const list = await window.electronAPI.printer.list();
      setPrinters(list || []);
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

  const handleMouseDown = (e, idx) => {
    setDragging(idx);
  };

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

  const handleMouseUp = () => {
    setDragging(null);
  };

  const resetCapture = () => {
    setCaptured(null);
    setCorners(null);
    const canvas = overlayCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const saveProfile = async () => {
    if (!profileName.trim()) { addNotification('Enter a profile name', 'error'); return; }
    if (!corners) { addNotification('Capture and detect a paper first', 'error'); return; }
    const canvas = captureCanvasRef.current;
    if (!canvas) return;
    const dims = getPaperDimensions(corners);
    if (!dims) { addNotification('Could not calculate dimensions', 'error'); return; }
    const refWidth = 210;
    const refHeight = 297;
    const widthMm = (dims.widthPx / canvas.width) * refWidth;
    const heightMm = (dims.heightPx / canvas.height) * refHeight;

    if (profileType === 'barcode') {
      const labelWidth = widthMm / 3;
      const labelHeight = heightMm / 10;
      if (labelWidth < 15 || labelHeight < 10) {
        addNotification('Detected area too small for barcode labels', 'warning');
      }
    }

    try {
      await dbRun(`INSERT INTO paper_profiles (id,name,type,width,height,margin_top,margin_right,margin_bottom,margin_left) VALUES (?,?,?,?,?,?,?,?,?)`,
        [crypto.randomUUID(), profileName.trim(), profileType, parseFloat(widthMm.toFixed(2)), parseFloat(heightMm.toFixed(2)), 0, 0, 0, 0]);
      addNotification(`Profile "${profileName}" saved (${widthMm.toFixed(1)}x${heightMm.toFixed(1)} mm)`, 'success');
      setProfileName('');
      loadProfiles();
    } catch (err) {
      addNotification(err.message, 'error');
    }
  };

  const deleteProfile = async (id) => {
    await dbRun('DELETE FROM paper_profiles WHERE id=?', [id]);
    loadProfiles();
  };

  const setDefaultProfile = async (id) => {
    await dbRun('UPDATE paper_profiles SET is_default=0');
    await dbRun('UPDATE paper_profiles SET is_default=1 WHERE id=?', [id]);
    loadProfiles();
  };

  const applyProfile = (profile) => {
    setProfileName(profile.name);
    setProfileType(profile.type);
  };

  return (
    <div onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} style={{ userSelect: dragging !== null ? 'none' : undefined }}>
      <div className="tabs">
        {[
          { id: 'scanner', label: 'Paper Scanner' },
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
                {!cameraActive && (
                  <canvas ref={captureCanvasRef} style={{ width: '100%', display: 'block', background: '#0a0f1e' }} />
                )}
                {detecting && <div className="loading-spinner" />}
              </div>
            </div>
            <div className="card">
              <div className="card-header"><div className="card-title">Edge Detection Overlay</div>{corners && <span className="badge badge-success">Detected</span>}</div>
              <div style={{ position: 'relative', minHeight: 360, background: '#0a0f1e', borderRadius: 8, overflow: 'hidden' }}>
                <canvas ref={overlayCanvasRef} style={{ width: '100%', display: 'block' }} />
                {!captured && <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Capture a paper to see edge detection</div>}
                {corners && corners.map((c, i) => (
                  <div key={i}
                    onMouseDown={e => handleMouseDown(e, i)}
                    style={{
                      position: 'absolute', width: 16, height: 16, borderRadius: '50%',
                      background: '#ff4444', border: '2px solid white', cursor: 'grab',
                      left: `${(c.x / (captureCanvasRef.current?.width || 1)) * 100}%`,
                      top: `${(c.y / (captureCanvasRef.current?.height || 1)) * 100}%`,
                      transform: 'translate(-50%, -50%)', zIndex: 10,
                      boxShadow: '0 0 8px rgba(255,0,0,0.5)',
                    }}
                  />
                ))}
              </div>
              {corners && (() => {
                const dims = getPaperDimensions(corners);
                const canvas = captureCanvasRef.current;
                if (!dims || !canvas) return null;
                const refWidth = 210;
                const refHeight = 297;
                const w = (dims.widthPx / canvas.width) * refWidth;
                const h = (dims.heightPx / canvas.height) * refHeight;
                return <div style={{ marginTop: 8, fontSize: 13, color: '#94a3b8' }}>Paper: <strong style={{ color: '#f59e0b' }}>{w.toFixed(1)} x {h.toFixed(1)} mm</strong> (drag corners to adjust)</div>;
              })()}
            </div>
          </div>

          {captured && (
            <div className="card mt-2">
              <div className="card-header"><div className="card-title">Save Paper Profile</div></div>
              <div className="form-row-4">
                <div className="form-group"><label className="form-label">Profile Name</label><input type="text" className="form-input" value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="e.g. 3x8 Barcode" /></div>
                <div className="form-group"><label className="form-label">Paper Type</label><select className="form-input" value={profileType} onChange={e => setProfileType(e.target.value)}>{PROFILE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button className="btn btn-primary btn-sm" onClick={saveProfile} disabled={!corners || !profileName.trim()}>Save Profile</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'printers' && (
        <div className="card">
          <div className="card-header"><div className="card-title">Detected Printers</div><button className="btn btn-sm btn-secondary" onClick={loadPrinters}>Refresh</button></div>
          {printers.length === 0 ? <div className="empty-state-text">No printers detected</div> : (
            <table>
              <thead><tr><th>#</th><th>Printer Name</th><th>Status</th><th>Default</th></tr></thead>
              <tbody>{printers.map((p, i) => (
                <tr key={p.name || i}>
                  <td>{i + 1}</td>
                  <td><strong>{p.displayName || p.name}</strong></td>
                  <td><span className={`badge ${p.status === 0 || p.status === 3 ? 'badge-success' : 'badge-warning'}`}>{p.status === 0 ? 'Ready' : p.status === 3 ? 'Idle' : 'Offline'}</span></td>
                  <td>{p.isDefault ? <span className="badge badge-info">Default</span> : '-'}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
          <div style={{ marginTop: 12, fontSize: 13, color: '#64748b' }}>
            Printers detected by your system. Select a default printer in OS settings.
            Barcode and bill printing will use your default printer unless specified in the print dialog.
          </div>
        </div>
      )}

      {tab === 'profiles' && (
        <div className="card">
          <div className="card-header"><div className="card-title">Saved Paper Profiles</div></div>
          {profiles.length === 0 ? <div className="empty-state-text">No saved profiles. Use the scanner to create one.</div> : (
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
        </div>
      )}
    </div>
  );
}
