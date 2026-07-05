import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { PrintService, generateA4ReceiptHTML } from '../../utils/PrintService';
import PrintLayoutEditor from './PrintLayoutEditor';

export default function BillsList() {
  const { dbQuery, formatCurrency, formatWeight, addNotification } = useContext(AppContext);
  const [bills, setBills] = useState([]);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState(new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showPrintSetup, setShowPrintSetup] = useState(false);
  const [showLayoutEditor, setShowLayoutEditor] = useState(false);
  const [printTarget, setPrintTarget] = useState(null);
  const [printSettings, setPrintSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [layoutType, setLayoutType] = useState('bill');

  useEffect(() => { loadBills(); }, [fromDate, toDate, statusFilter, typeFilter]);

  const loadBills = async () => {
    setLoading(true);
    let sql = "SELECT t.*, p.name as party_name FROM transactions t LEFT JOIN parties p ON t.party_id=p.id WHERE t.date BETWEEN ? AND ?";
    const params = [fromDate, toDate];
    if (statusFilter !== 'all') { sql += " AND t.status=?"; params.push(statusFilter); }
    if (typeFilter !== 'all') { sql += " AND t.voucher_type=?"; params.push(typeFilter); }
    sql += " ORDER BY t.date DESC, t.created_at DESC LIMIT 500";
    setBills(await dbQuery(sql, params));
    setLoading(false);
  };

  const handlePrint = async (bill) => {
    setPrintTarget(bill);
    setShowLayoutEditor(true);
    setLayoutType('bill');
  };

  const doPrint = async (template) => {
    if (!printTarget) return;
    const bill = printTarget;
    const itemsList = await dbQuery(
      "SELECT sii.*, i.name, i.code FROM sale_invoice_items sii LEFT JOIN items i ON sii.item_id=i.id WHERE sii.transaction_id=?", [bill.id]
    );
    const company = await window.electronAPI.config.get();
    const party = bill.party_id ? await dbQuery("SELECT * FROM parties WHERE id=?", [bill.party_id]) : [];
    const isGstInvoice = !!party[0]?.gstin;
    const paperW = template.paperW || 210;
    const paperH = template.paperH || 297;
    const isSmall = paperW <= 80;

    let html;
    if (isSmall) {
      html = PrintService.generateReceiptHTML({
        ...bill, party_name: bill.party_name || 'Walk-in', gstin: party[0]?.gstin || '',
        paperWidth: paperW, paperHeight: paperH,
        marginTop: template.marginTop, marginBottom: template.marginBottom,
        marginLeft: template.marginLeft, marginRight: template.marginRight,
      }, itemsList.map(i => ({ ...i, name: i.name || i.code || 'Item' })), company, isGstInvoice);
    } else {
      html = generateA4ReceiptHTML({
        ...bill, party_name: bill.party_name || 'Walk-in', gstin: party[0]?.gstin || '',
        paperWidth: paperW, paperHeight: paperH,
        marginTop: template.marginTop, marginBottom: template.marginBottom,
        marginLeft: template.marginLeft, marginRight: template.marginRight,
      }, itemsList.map(i => ({ ...i, name: i.name || i.code || 'Item' })), company, isGstInvoice);
    }

    try {
      if (template.printer) {
        await window.electronAPI.printer.printSilent(html, template.printer, {
          margins: { marginType: 'none' },
          landscape: template.orientation === 'landscape',
        });
      } else {
        await window.electronAPI.printer.print(html, {
          margins: { marginType: 'none' },
          landscape: template.orientation === 'landscape',
        });
      }
      addNotification('Printed successfully', 'success');
    } catch (e) { addNotification('Print error: ' + e.message, 'error'); }
    setShowLayoutEditor(false);
    setPrintTarget(null);
  };

  const filtered = bills.filter(b =>
    b.voucher_no?.toLowerCase().includes(search.toLowerCase()) ||
    b.party_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = filtered.reduce((s, b) => s + (b.total_amount || 0), 0);

  return (
    <div>
      <div className="card mb-4">
        <div className="form-row-4">
          <div className="form-group">
            <label className="form-label">From Date</label>
            <input type="date" className="form-input" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">To Date</label>
            <input type="date" className="form-input" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              <option value="Sale_Retail">Retail Sale</option>
              <option value="Sale_Wholesale">Wholesale</option>
              <option value="Purchase">Purchase</option>
              <option value="Estimate">Estimate</option>
              <option value="Order">Order</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <input className="search-input" placeholder="Search by voucher or customer..." value={search} onChange={e => setSearch(e.target.value)} />
          <span style={{ color: '#94a3b8', fontSize: 12 }}>{filtered.length} bills | Total: {formatCurrency(totalAmount)}</span>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-secondary btn-sm" onClick={loadBills}>🔄 Refresh</button>
        </div>
      </div>

      <div className="card">
        {loading ? <div className="loading-spinner" /> : (
          <div className="table-container" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            <table>
              <thead>
                <tr>
                  <th>Voucher</th><th>Date</th><th>Type</th><th>Customer</th>
                  <th>Amount</th><th>Weight</th><th>Payment</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={9}><div className="empty-state"><div className="empty-state-icon">📄</div><div className="empty-state-text">No bills found</div></div></td></tr>
                )}
                {filtered.map(b => (
                  <tr key={b.id} className={b.status === 'cancelled' ? 'cancelled-row' : ''}>
                    <td><strong>{b.voucher_no}</strong></td>
                    <td>{b.date}</td>
                    <td><span className="badge badge-info">{b.voucher_type?.replace('_', ' ')}</span></td>
                    <td>{b.party_name || 'Walk-in'}</td>
                    <td className={`fw-bold ${b.status === 'cancelled' ? 'text-muted' : 'text-green'}`}>{formatCurrency(b.total_amount)}</td>
                    <td>{formatWeight(b.gold_weight)}</td>
                    <td><span className="badge" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>{b.payment_mode || '-'}</span></td>
                    <td>{b.status === 'cancelled' ? <span className="badge badge-danger">Cancelled</span> : <span className="badge badge-success">Active</span>}</td>
                    <td>
                      <button className="btn btn-xs btn-secondary" onClick={() => handlePrint(b)} title="Print with layout editor">🖨️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showLayoutEditor && (
        <PrintLayoutEditor
          type="bill"
          initialSettings={printSettings}
          onClose={() => { setShowLayoutEditor(false); setPrintTarget(null); }}
          onSave={doPrint}
        />
      )}
    </div>
  );
}
