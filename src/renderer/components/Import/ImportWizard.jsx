import React, { useState, useContext, useRef } from 'react';
import { AppContext } from '../../contexts/AppContext';
import * as XLSX from 'xlsx';

const TABLE_SCHEMAS = {
  items: {
    columns: ['name', 'code', 'barcode', 'category', 'purity', 'weight', 'selling_price', 'cost_price', 'current_qty', 'min_qty', 'metal_type', 'making_charges', 'stone_weight', 'gst_rate'],
    tableName: 'items',
    label: 'Items'
  },
  parties: {
    columns: ['name', 'phone', 'address', 'gstin', 'type', 'opening_balance'],
    tableName: 'parties',
    label: 'Parties / Customers'
  },
  transactions: {
    columns: ['voucher_no', 'date', 'party_name', 'voucher_type', 'total_amount', 'payment_mode', 'status'],
    tableName: 'transactions',
    label: 'Transactions'
  }
};

function detectTable(headers) {
  const h = headers.map(x => x?.toLowerCase().trim());
  let best = null;
  let bestScore = 0;
  for (const [key, schema] of Object.entries(TABLE_SCHEMAS)) {
    let score = 0;
    for (const col of schema.columns) {
      if (h.includes(col)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      best = key;
    }
  }
  return best;
}

function parseFileData(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (json.length === 0) return { headers: [], rows: [] };
  const headers = Object.keys(json[0]);
  const rows = json.map(row => {
    const obj = {};
    headers.forEach(h => {
      obj[h.trim()] = row[h]?.toString().trim() || '';
    });
    return obj;
  });
  return { headers, rows };
}

function mapColumns(headers, detectedTable) {
  if (!detectedTable) return {};
  const schema = TABLE_SCHEMAS[detectedTable];
  const map = {};
  headers.forEach(h => {
    const key = h.toLowerCase().trim();
    if (schema.columns.includes(key)) {
      map[h] = key;
    }
  });
  return map;
}

const BATCH_SIZE = 50;

export default function ImportWizard() {
  const { setPageTitle, addNotification, dbRun } = useContext(AppContext);
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [detectedTable, setDetectedTable] = useState(null);
  const [columnMap, setColumnMap] = useState({});
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const fileRef = useRef();

  React.useEffect(() => {
    setPageTitle('Data Import Wizard');
  }, []);

  const handleFilePick = async () => {
    const result = await window.electronAPI.dialog.open({
      filters: [
        { name: 'Excel Files', extensions: ['xlsx', 'xls', 'csv'] }
      ],
      properties: ['openFile']
    });
    if (result.canceled || !result.filePaths?.[0]) return;
    const path = result.filePaths[0];
    setFileName(path.split('\\').pop() || path.split('/').pop());
    try {
      const response = await fetch(`file://${path}`);
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      const data = new Uint8Array(buffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const { headers, rows } = parseFileData(workbook);
      if (rows.length === 0) {
        addNotification('File is empty', 'error');
        return;
      }
      const detected = detectTable(headers);
      setDetectedTable(detected);
      const map = mapColumns(headers, detected);
      setColumnMap(map);
      setPreviewData({ headers, rows });
      setStep(2);
    } catch (e) {
      addNotification('Error reading file: ' + e.message, 'error');
    }
  };

  const handleLegacyFileInput = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const { headers, rows } = parseFileData(workbook);
        if (rows.length === 0) {
          addNotification('File is empty', 'error');
          return;
        }
        const detected = detectTable(headers);
        setDetectedTable(detected);
        const map = mapColumns(headers, detected);
        setColumnMap(map);
        setPreviewData({ headers, rows });
        setStep(2);
      } catch (err) {
        addNotification('Error parsing file: ' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const startImport = async () => {
    if (!detectedTable || !previewData) return;
    setImporting(true);
    setProgress({ current: 0, total: previewData.rows.length });
    const schema = TABLE_SCHEMAS[detectedTable];
    const cols = Object.values(columnMap).filter(Boolean);
    if (cols.length === 0) {
      addNotification('No columns matched', 'error');
      setImporting(false);
      return;
    }
    const placeholders = cols.map(() => '?').join(', ');
    const sql = `INSERT OR IGNORE INTO ${schema.tableName} (${cols.join(', ')}) VALUES (${placeholders})`;

    let imported = 0;
    let skipped = 0;
    let failed = 0;
    const errors = [];

    for (let i = 0; i < previewData.rows.length; i += BATCH_SIZE) {
      const batch = previewData.rows.slice(i, i + BATCH_SIZE);
      for (const row of batch) {
        try {
          const params = cols.map(c => row[c] || row[c] === 0 ? row[c] : null);
          const result = await dbRun(sql, params);
          if (result?.changes > 0) imported++;
          else skipped++;
        } catch (err) {
          failed++;
          if (errors.length < 10) errors.push({ row: i + errors.length + 1, error: err.message });
        }
        setProgress({ current: imported + skipped + failed, total: previewData.rows.length });
      }
    }

    setResults({ imported, skipped, failed, errors, total: previewData.rows.length });
    setStep(3);
    setImporting(false);
    addNotification(`Import complete: ${imported} records imported`, imported > 0 ? 'success' : 'info');
  };

  return (
    <div className="card" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="card-header">
        <div className="card-title">📥 Data Import Wizard</div>
        {step > 1 && step < 3 && (
          <button className="btn btn-secondary btn-sm" onClick={() => { setStep(1); setPreviewData(null); setResults(null); setFileName(''); setDetectedTable(null); }}>
            ← Back
          </button>
        )}
      </div>

      {step === 1 && (
        <div>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>
            <h3 style={{ marginBottom: 8 }}>Upload CSV or Excel File</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>
              Supported formats: .xlsx, .xls, .csv
            </p>
            <button className="btn btn-primary" onClick={handleFilePick}>
              📁 Browse Files
            </button>
            <div style={{ margin: '16px 0', color: 'var(--text-muted)', fontSize: 12 }}>or</div>
            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              📄 Select from computer
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleLegacyFileInput} />
            </label>
            {fileName && (
              <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-primary)', borderRadius: 8 }}>
                📎 {fileName}
              </div>
            )}
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <h4 style={{ marginBottom: 12 }}>📋 Supported Import Types</h4>
            <div className="grid-3" style={{ fontSize: 13 }}>
              {Object.values(TABLE_SCHEMAS).map(s => (
                <div key={s.tableName} style={{ padding: 12, background: 'var(--bg-primary)', borderRadius: 8 }}>
                  <strong style={{ color: 'var(--accent-gold)' }}>{s.label}</strong>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>{s.columns.join(', ')}</div>
                </div>
              ))}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 12 }}>
              Headers are auto-detected. Columns not matching the schema will be ignored.
            </p>
          </div>
        </div>
      )}

      {step === 2 && previewData && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="flex-between">
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Detected Table: </span>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>
                  {detectedTable ? TABLE_SCHEMAS[detectedTable]?.label : '⚠️ Unknown'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Records: </span>
                <strong>{previewData.rows.length}</strong>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h4 style={{ marginBottom: 8 }}>Column Mapping</h4>
            <div className="grid-3">
              {previewData.headers.map(h => (
                <div key={h} style={{ padding: '6px 10px', background: 'var(--bg-primary)', borderRadius: 6, fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>📄 {h}</span>
                  <span style={{ margin: '0 6px', color: 'var(--text-muted)' }}>→</span>
                  <span style={{ color: columnMap[h] ? 'var(--accent-green)' : 'var(--accent-orange)' }}>
                    {columnMap[h] || 'ignored'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h4 style={{ marginBottom: 8 }}>Preview ({Math.min(previewData.rows.length, 10)} of {previewData.rows.length})</h4>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    {previewData.headers.filter(h => columnMap[h]).map(h => (
                      <th key={h}>{columnMap[h]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.rows.slice(0, 10).map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                      {previewData.headers.filter(h => columnMap[h]).map(h => (
                        <td key={h}>{row[h]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card-footer">
            <button className="btn btn-secondary" onClick={() => { setStep(1); setPreviewData(null); setResults(null); }}>Cancel</button>
            <button className="btn btn-primary" onClick={startImport} disabled={importing || !detectedTable}>
              {importing ? '⏳ Importing...' : '🚀 Start Import'}
            </button>
          </div>
        </div>
      )}

      {(step === 2 || step === 3) && importing && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 12 }}>⏳ Import Progress</h4>
          <div className="progress-bar" style={{
            width: '100%', height: 24, background: 'var(--bg-primary)', borderRadius: 12,
            overflow: 'hidden', position: 'relative'
          }}>
            <div style={{
              width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--accent-gold), var(--accent-gold-dark))',
              borderRadius: 12,
              transition: 'width 0.3s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600, color: '#0b1120',
              minWidth: progress.current > 0 ? 'fit-content' : 0,
              padding: '0 8px'
            }}>
              {progress.current > 0 && `${progress.current} / ${progress.total}`}
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
            Processing record {progress.current} of {progress.total}...
          </div>
        </div>
      )}

      {step === 3 && results && (
        <div>
          <div className="card" style={{ marginBottom: 16, textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>
              {results.imported > 0 ? '✅' : results.failed > 0 ? '⚠️' : 'ℹ️'}
            </div>
            <h3 style={{ marginBottom: 8 }}>Import Complete</h3>
            <div className="stats-grid" style={{ marginTop: 20 }}>
              <div className="stat-card">
                <div className="stat-content" style={{ textAlign: 'center' }}>
                  <div className="stat-value" style={{ color: 'var(--accent-green)' }}>{results.imported}</div>
                  <div className="stat-label">Imported</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-content" style={{ textAlign: 'center' }}>
                  <div className="stat-value" style={{ color: 'var(--accent-orange)' }}>{results.skipped}</div>
                  <div className="stat-label">Skipped</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-content" style={{ textAlign: 'center' }}>
                  <div className="stat-value" style={{ color: 'var(--accent-red)' }}>{results.failed}</div>
                  <div className="stat-label">Failed</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-content" style={{ textAlign: 'center' }}>
                  <div className="stat-value">{results.total}</div>
                  <div className="stat-label">Total Records</div>
                </div>
              </div>
            </div>
          </div>

          {results.errors.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 8, color: 'var(--accent-red)' }}>Errors ({results.errors.length})</h4>
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>Row</th><th>Error</th></tr>
                  </thead>
                  <tbody>
                    {results.errors.map((e, i) => (
                      <tr key={i}><td>{e.row}</td><td style={{ color: 'var(--accent-red)' }}>{e.error}</td></tr>
                    ))}
                    {results.errors.length >= 10 && <tr><td colSpan={2} style={{ color: 'var(--text-muted)', textAlign: 'center' }}>... and more</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="card-footer">
            <button className="btn btn-primary" onClick={() => { setStep(1); setPreviewData(null); setResults(null); setFileName(''); setDetectedTable(null); }}>
              📥 Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
