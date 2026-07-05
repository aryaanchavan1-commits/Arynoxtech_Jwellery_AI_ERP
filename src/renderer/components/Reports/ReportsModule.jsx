import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';

export default function ReportsModule() {
  const { setPageTitle, formatCurrency, formatWeight, dbQuery } = useContext(AppContext);
  const [tab, setTab] = useState('daybook');
  const [fromDate, setFromDate] = useState(new Date(Date.now() - 30*86400000).toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [festivalData, setFestivalData] = useState([]);
  const [festivalLoading, setFestivalLoading] = useState(false);
  const [periodSubTab, setPeriodSubTab] = useState('daily');
  const [periodicData, setPeriodicData] = useState([]);
  const [periodicLoading, setPeriodicLoading] = useState(false);
  const [showSupplierHistory, setShowSupplierHistory] = useState(null);
  const [supplierHistory, setSupplierHistory] = useState([]);

  useEffect(() => { setPageTitle('Reports'); loadReport(); }, [tab, fromDate, toDate]);
  useEffect(() => { if (tab === 'festival') loadFestivalData(); }, [tab]);
  useEffect(() => { if (tab === 'periodic') loadPeriodicData(); }, [tab, periodSubTab]);

  const loadReport = async () => {
    setLoading(true);
    try {
      let result = [];
      switch (tab) {
        case 'daybook':
          result = await dbQuery("SELECT t.*, p.name as party_name FROM transactions t LEFT JOIN parties p ON t.party_id=p.id WHERE t.date BETWEEN ? AND ? ORDER BY t.date DESC, t.created_at DESC", [fromDate, toDate]);
          break;
        case 'sales':
          result = await dbQuery("SELECT t.*, p.name as party_name FROM transactions t LEFT JOIN parties p ON t.party_id=p.id WHERE t.voucher_type IN ('Sale_Retail','Sale_Wholesale') AND t.date BETWEEN ? AND ? ORDER BY t.date DESC", [fromDate, toDate]);
          break;
        case 'purchase':
          result = await dbQuery("SELECT t.*, p.name as party_name FROM transactions t LEFT JOIN parties p ON t.party_id=p.id WHERE t.voucher_type='Purchase' AND t.date BETWEEN ? AND ? ORDER BY t.date DESC", [fromDate, toDate]);
          break;
        case 'stock':
          result = await dbQuery("SELECT i.*, c.name as category_name FROM items i LEFT JOIN categories c ON i.category_id=c.id WHERE i.status='active' ORDER BY i.name");
          break;
        case 'party':
          result = await dbQuery(`SELECT p.*,
            (SELECT COALESCE(SUM(total_amount),0) FROM transactions WHERE party_id=p.id AND voucher_type IN ('Sale_Retail','Sale_Wholesale')) as total_sales,
            (SELECT COALESCE(SUM(total_amount),0) FROM transactions WHERE party_id=p.id AND voucher_type='Purchase') as total_purchase
            FROM parties p ORDER BY p.name`);
          break;
        case 'gst':
          result = await dbQuery("SELECT * FROM transactions WHERE date BETWEEN ? AND ? ORDER BY date DESC", [fromDate, toDate]);
          break;
        case 'karagir':
          result = await dbQuery("SELECT kt.*, p.name as karagir_name, t.voucher_no, t.date FROM karagir_transactions kt JOIN transactions t ON kt.transaction_id=t.id LEFT JOIN parties p ON kt.karagir_id=p.id ORDER BY t.date DESC");
          break;
        case 'mis':
          result = await dbQuery("SELECT voucher_type, COUNT(*) as cnt, COALESCE(SUM(total_amount),0) as total FROM transactions WHERE date BETWEEN ? AND ? GROUP BY voucher_type ORDER BY total DESC", [fromDate, toDate]);
          break;
        case 'deadstock':
          result = await dbQuery("SELECT i.*, c.name as category_name, COALESCE(SUM(t.total_amount),0) as total_sold, MAX(t.date) as last_sold_date FROM items i LEFT JOIN categories c ON i.category_id=c.id LEFT JOIN sale_invoice_items si ON i.id=si.item_id LEFT JOIN transactions t ON si.transaction_id=t.id AND t.status='active' GROUP BY i.id ORDER BY i.current_qty * i.cost_price DESC");
          break;
        case 'supplier':
          result = await dbQuery("SELECT p.*, COALESCE(SUM(t.total_amount),0) as total_purchases, COUNT(t.id) as purchase_count, MAX(t.date) as last_purchase_date FROM parties p LEFT JOIN transactions t ON p.id=t.party_id AND t.voucher_type='Purchase' AND t.status='active' GROUP BY p.id ORDER BY total_purchases DESC");
          break;
      }
      setData(result);
    } catch (err) { console.error(err); setData([]); }
    setLoading(false);
  };

  const tabs = [
    { id: 'daybook', label: '📅 Day Book' },
    { id: 'sales', label: '🛍️ Sales' },
    { id: 'purchase', label: '📥 Purchase' },
    { id: 'stock', label: '💎 Stock' },
    { id: 'party', label: '👥 Party' },
    { id: 'karagir', label: '🔧 Karagir' },
    { id: 'gst', label: '📋 GST' },
    { id: 'mis', label: '📊 MIS' },
    { id: 'deadstock', label: 'Dead Stock' },
    { id: 'festival', label: 'Festival Analysis' },
    { id: 'periodic', label: 'Periodic Sales' },
    { id: 'supplier', label: 'Supplier Wise' },
  ];

  const totalAmount = data.reduce((s, r) => s + (r.total_amount || r.total_sales || r.total || 0), 0);

  const loadFestivalData = async () => {
    setFestivalLoading(true);
    const y = new Date().getFullYear();
    const e = (m,d) => `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const festivals = [
      { name:'Makar Sankranti', date:e(1,14) },
      { name:'Maha Shivaratri', date:e(2,15+(y==2025?11:y==2026?0:y==2027?-11:0)) },
      { name:'Holi', date:e(3,13+(y==2025?1:y==2026?0:-2)) },
      { name:'Gudi Padwa', date:e(3,30+(y==2025?0:y==2026?0:-1)) },
      { name:'Akshaya Tritiya', date:e(4,20+(y==2025?0:y==2026?0:-1)) },
      { name:'Eid al-Fitr', date:e(4,1+(y==2025?10:y==2026?22:-10)) },
      { name:'Raksha Bandhan', date:e(8,28+(y==2025?-1:y==2026?0:1)) },
      { name:'Ganesh Chaturthi', date:e(9,15+(y==2025?-1:y==2026?0:1)) },
      { name:'Navratri/Dussehra', date:e(10,1+(y==2025?0:y==2026?0:-1)) },
      { name:'Diwali', date:e(10,20+(y==2025?1:y==2026?0:-1)) },
      { name:'Bhai Dooj', date:e(10,22+(y==2025?1:y==2026?0:-1)) },
      { name:'Christmas', date:e(12,25) },
    ];
    const results = [];
    for (const f of festivals) {
      const d = new Date(f.date);
      const start = new Date(d); start.setDate(d.getDate() - 15);
      const end = new Date(d); end.setDate(d.getDate() + 7);
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      const rows = await dbQuery("SELECT * FROM transactions WHERE voucher_type IN ('Sale_Retail','Sale_Wholesale') AND status='active' AND date BETWEEN ? AND ?", [startStr, endStr]);
      const totalSales = rows.reduce((s, r) => s + (r.total_amount || 0), 0);
      const itemsData = await dbQuery("SELECT i.name, SUM(sii.qty) as qty FROM sale_invoice_items sii JOIN items i ON sii.item_id=i.id JOIN transactions t ON sii.transaction_id=t.id WHERE t.voucher_type IN ('Sale_Retail','Sale_Wholesale') AND t.status='active' AND t.date BETWEEN ? AND ? GROUP BY i.name ORDER BY qty DESC LIMIT 5", [startStr, endStr]);
      results.push({
        festival: f.name,
        startDate: startStr, endDate: endStr,
        totalSales,
        transactionCount: rows.length,
        avgSale: rows.length > 0 ? totalSales / rows.length : 0,
        topItems: itemsData.map(it => it.name),
      });
    }
    setFestivalData(results);
    setFestivalLoading(false);
  };

  const loadPeriodicData = async () => {
    setPeriodicLoading(true);
    let query, label;
    const now = new Date();
    switch (periodSubTab) {
      case 'daily':
        label = 'Hour';
        query = await dbQuery("SELECT strftime('%H', created_at) as period, COALESCE(SUM(total_amount),0) as total_amount, COUNT(*) as cnt FROM transactions WHERE voucher_type IN ('Sale_Retail','Sale_Wholesale') AND status='active' AND date=? GROUP BY period ORDER BY period", [now.toISOString().split('T')[0]]);
        break;
      case 'weekly': {
        const day = now.getDay();
        const mon = new Date(now); mon.setDate(now.getDate() - ((day + 6) % 7));
        const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
        const monStr = mon.toISOString().split('T')[0], sunStr = sun.toISOString().split('T')[0];
        label = 'Day';
        query = await dbQuery("SELECT strftime('%w', date) as period, COALESCE(SUM(total_amount),0) as total_amount, COUNT(*) as cnt FROM transactions WHERE voucher_type IN ('Sale_Retail','Sale_Wholesale') AND status='active' AND date BETWEEN ? AND ? GROUP BY period ORDER BY period", [monStr, sunStr]);
        const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        query = query.map(r => ({ ...r, period: dayNames[parseInt(r.period)] }));
        break;
      }
      case 'monthly':
        label = 'Week';
        query = await dbQuery("SELECT CAST(strftime('%W', date) AS INTEGER) - CAST(strftime('%W', date||'-01') AS INTEGER) + 1 as period, COALESCE(SUM(total_amount),0) as total_amount, COUNT(*) as cnt FROM transactions WHERE voucher_type IN ('Sale_Retail','Sale_Wholesale') AND status='active' AND strftime('%Y-%m', date)=strftime('%Y-%m','now') GROUP BY period ORDER BY period");
        query = query.map(r => ({ ...r, period: 'Week ' + r.period }));
        break;
      case 'yearly':
        label = 'Month';
        query = await dbQuery("SELECT strftime('%m', date) as period, COALESCE(SUM(total_amount),0) as total_amount, COUNT(*) as cnt FROM transactions WHERE voucher_type IN ('Sale_Retail','Sale_Wholesale') AND status='active' AND strftime('%Y', date)=strftime('%Y','now') GROUP BY period ORDER BY period");
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        query = query.map(r => ({ ...r, period: monthNames[parseInt(r.period) - 1] }));
        break;
      case 'custom':
        label = 'Date';
        query = await dbQuery("SELECT date as period, COALESCE(SUM(total_amount),0) as total_amount, COUNT(*) as cnt FROM transactions WHERE voucher_type IN ('Sale_Retail','Sale_Wholesale') AND status='active' AND date BETWEEN ? AND ? GROUP BY date ORDER BY date", [fromDate, toDate]);
        break;
    }
    setPeriodicData(query || []);
    setPeriodicLoading(false);
  };

  const viewSupplierHistory = async (supplier) => {
    const history = await dbQuery("SELECT t.* FROM transactions t WHERE t.party_id=? AND t.voucher_type='Purchase' AND t.status='active' ORDER BY t.date DESC", [supplier.id]);
    setSupplierHistory(history);
    setShowSupplierHistory(supplier);
  };

  return (
    <div>
      <div className="tabs" style={{ flexWrap: 'wrap' }}>{tabs.map(t => <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>

      <div className="toolbar">
        <div className="toolbar-left">
          <input type="date" className="form-input" style={{ width: 150 }} value={fromDate} onChange={e => setFromDate(e.target.value)} />
          <span className="text-muted">to</span>
          <input type="date" className="form-input" style={{ width: 150 }} value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
        <div className="toolbar-right">
          <span className="text-muted">Records: {data.length}</span>
          <button className="btn btn-secondary btn-sm" onClick={loadReport}>🔄 Refresh</button>
          <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>🖨️ Print</button>
        </div>
      </div>

      <div className="card">
        {loading ? <div className="loading-spinner" /> : (
          <div className="table-container">
            {tab === 'daybook' && (
              <table><thead><tr><th>Date</th><th>Voucher</th><th>Type</th><th>Party</th><th>Amount</th></tr></thead>
              <tbody>{data.map(r => <tr key={r.id}><td>{r.date}</td><td><strong>{r.voucher_no}</strong></td><td><span className="badge badge-info">{r.voucher_type}</span></td><td>{r.party_name || '-'}</td><td className="fw-bold">{formatCurrency(r.total_amount)}</td></tr>)}
                <tr style={{ borderTop: '2px solid #f59e0b' }}><td colSpan={4}><strong>Total</strong></td><td><strong className="text-gold">{formatCurrency(totalAmount)}</strong></td></tr>
              </tbody></table>
            )}
            {tab === 'sales' && (
              <table><thead><tr><th>Date</th><th>Invoice</th><th>Customer</th><th>Amount</th><th>Weight</th><th>Type</th></tr></thead>
              <tbody>{data.map(r => <tr key={r.id}><td>{r.date}</td><td><strong>{r.voucher_no}</strong></td><td>{r.party_name || 'Walk-in'}</td><td className="text-green fw-bold">{formatCurrency(r.total_amount)}</td><td>{formatWeight(r.gold_weight)}</td><td><span className="badge badge-gold">{r.voucher_type}</span></td></tr>)}
                <tr style={{ borderTop: '2px solid #22c55e' }}><td colSpan={3}><strong>Total</strong></td><td><strong className="text-green">{formatCurrency(totalAmount)}</strong></td><td><strong>{formatWeight(data.reduce((s, r) => s + (r.gold_weight || 0), 0))}</strong></td><td></td></tr>
              </tbody></table>
            )}
            {tab === 'stock' && (
              <table><thead><tr><th>Code</th><th>Name</th><th>Category</th><th>Metal</th><th>Purity</th><th>Weight</th><th>Qty</th><th>Price</th><th>Value</th></tr></thead>
              <tbody>{data.map(r => <tr key={r.id}><td><strong>{r.code}</strong></td><td>{r.name}</td><td>{r.category_name || '-'}</td><td><span className="badge badge-gold">{r.metal_type}</span></td><td>{r.purity}</td><td>{formatWeight(r.weight)}</td><td><span className={`badge ${(r.current_qty||0) <= (r.min_qty||0) ? 'badge-danger' : 'badge-success'}`}>{r.current_qty}</span></td><td>{formatCurrency(r.selling_price)}</td><td className="fw-bold">{formatCurrency((r.selling_price||0) * (r.current_qty||1))}</td></tr>)}</tbody></table>
            )}
            {tab === 'party' && (
              <table><thead><tr><th>Name</th><th>Type</th><th>Phone</th><th>Total Sales</th><th>Total Purchase</th><th>Balance</th></tr></thead>
              <tbody>{data.map(r => <tr key={r.id}><td><strong>{r.name}</strong></td><td><span className="badge badge-info">{r.type}</span></td><td>{r.phone || '-'}</td><td className="text-green">{formatCurrency(r.total_sales)}</td><td className="text-red">{formatCurrency(r.total_purchase)}</td><td className="fw-bold">{formatCurrency((r.total_sales||0) - (r.total_purchase||0))}</td></tr>)}</tbody></table>
            )}
            {tab === 'mis' && (
              <table><thead><tr><th>Transaction Type</th><th>Count</th><th>Total Amount</th></tr></thead>
              <tbody>{data.map((r, i) => <tr key={i}><td><span className="badge badge-info">{r.voucher_type}</span></td><td>{r.cnt}</td><td className="fw-bold">{formatCurrency(r.total)}</td></tr>)}
                <tr style={{ borderTop: '2px solid #f59e0b' }}><td><strong>Total</strong></td><td><strong>{data.reduce((s, r) => s + r.cnt, 0)}</strong></td><td><strong className="text-gold">{formatCurrency(totalAmount)}</strong></td></tr>
              </tbody></table>
            )}
            {(tab === 'purchase' || tab === 'gst' || tab === 'karagir') && (
              <table><thead><tr><th>Date</th><th>Voucher</th><th>Type</th><th>Party</th><th>Amount</th></tr></thead>
              <tbody>{data.map(r => <tr key={r.id}><td>{r.date || r.rate_date}</td><td><strong>{r.voucher_no}</strong></td><td><span className="badge badge-info">{r.voucher_type || r.type}</span></td><td>{r.party_name || r.karagir_name || '-'}</td><td className="fw-bold">{formatCurrency(r.total_amount || r.amount || 0)}</td></tr>)}</tbody></table>
            )}
            {tab === 'deadstock' && (
              <div>
                <h4 style={{marginBottom:12,color:'#f59e0b'}}>Dead Stock Report (No Sale in 90+ Days)</h4>
                <table>
                  <thead><tr><th>Code</th><th>Name</th><th>Qty</th><th>Weight</th><th>Cost Price</th><th>Total Value</th><th>Last Sold</th><th>Days</th><th>Status</th></tr></thead>
                  <tbody>{data.filter(i => {
                    if (!i.last_sold_date) return true;
                    return (Date.now() - new Date(i.last_sold_date).getTime()) / 86400000 > 90;
                  }).map(r => {
                    const days = r.last_sold_date ? Math.floor((Date.now() - new Date(r.last_sold_date).getTime()) / 86400000) : 999;
                    return <tr key={r.id} style={days > 180 ? {background:'#3b1a1a'} : {}}>
                      <td><strong>{r.code}</strong></td>
                      <td>{r.name}</td>
                      <td>{r.current_qty}</td>
                      <td>{formatWeight(r.weight)}</td>
                      <td>{formatCurrency(r.cost_price)}</td>
                      <td className="fw-bold">{formatCurrency((r.cost_price||0) * (r.current_qty||0))}</td>
                      <td>{r.last_sold_date || 'Never'}</td>
                      <td>{days >= 999 ? 'N/A' : days}</td>
                      <td>{days > 180 ? <span className="badge badge-danger">Dead Stock</span> : <span className="badge badge-warning">Slow Moving</span>}</td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
            )}
            {tab === 'festival' && (
              <div>
                <h4 style={{marginBottom:12,color:'#f59e0b'}}>Festival Sales Analysis - 2026</h4>
                {festivalLoading ? <div className="loading-spinner" /> : (
                  <div style={{display:'flex',flexDirection:'column',gap:16}}>
                    {festivalData.map((f, i) => (
                      <div key={i} className="card" style={{padding:12}}>
                        <div className="flex-between">
                          <strong style={{color:'#f59e0b',fontSize:16}}>{f.festival}</strong>
                          <span className="text-muted">{f.startDate} to {f.endDate}</span>
                        </div>
                        <div style={{display:'flex',gap:24,margin:'8px 0'}}>
                          <span>Total Sales: <strong className="text-green">{formatCurrency(f.totalSales)}</strong></span>
                          <span>Transactions: <strong>{f.transactionCount}</strong></span>
                          <span>Avg Sale: <strong>{formatCurrency(f.avgSale)}</strong></span>
                        </div>
                        {f.topItems.length > 0 && (
                          <div style={{fontSize:12,color:'#94a3b8'}}>
                            Top Items: {f.topItems.slice(0,5).map((it, idx) => <span key={idx} className="badge badge-gold" style={{marginRight:4}}>{it}</span>)}
                          </div>
                        )}
                        <div style={{display:'flex',alignItems:'center',gap:8,marginTop:8}}>
                          <div style={{flex:1,height:16,background:'#1e293b',borderRadius:8,overflow:'hidden'}}>
                            <div style={{height:'100%',width:`${Math.min(100, (f.totalSales / Math.max(...festivalData.map(x => x.totalSales || 1)) * 100))}%`,background:'#f59e0b',borderRadius:8}} />
                          </div>
                          <span style={{fontSize:11,color:'#94a3b8',width:60,textAlign:'right'}}>{((f.totalSales / Math.max(...festivalData.map(x => x.totalSales || 1)) * 100) || 0).toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {tab === 'periodic' && (
              <div>
                <h4 style={{marginBottom:12,color:'#f59e0b'}}>Periodic Sales Report</h4>
                <div className="tabs" style={{marginBottom:12}}>
                  {['daily','weekly','monthly','yearly','custom'].map(st =>
                    <button key={st} className={`tab ${periodSubTab === st ? 'active' : ''}`} onClick={() => setPeriodSubTab(st)}>
                      {st.charAt(0).toUpperCase() + st.slice(1)}
                    </button>
                  )}
                </div>
                {periodicLoading ? <div className="loading-spinner" /> : (
                  <div>
                    <table>
                      <thead><tr><th>Period</th><th>Total Sales</th><th>Transactions</th><th>Avg/Transaction</th><th>Top Category</th></tr></thead>
                      <tbody>{periodicData.map((r, i) => (
                        <tr key={i}>
                          <td><strong>{r.period}</strong></td>
                          <td className="text-green">{formatCurrency(r.total_amount)}</td>
                          <td>{r.cnt}</td>
                          <td>{formatCurrency(r.cnt > 0 ? r.total_amount / r.cnt : 0)}</td>
                          <td><span className="badge badge-info">{r.top_category || '-'}</span></td>
                        </tr>
                      ))}</tbody>
                    </table>
                    <div style={{display:'flex',alignItems:'flex-end',gap:4,marginTop:16,padding:'8px 0',minHeight:120}}>
                      {periodicData.map((r, i) => (
                        <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center'}}>
                          <span style={{fontSize:10,color:'#94a3b8'}}>{formatCurrency(r.total_amount)}</span>
                          <div style={{width:'80%',background:'#f59e0b',borderRadius:'4px 4px 0 0',height:`${Math.max(4, (r.total_amount / Math.max(...periodicData.map(x => x.total_amount || 1)) * 120))}px`,minHeight:4}} />
                          <span style={{fontSize:10,marginTop:4}}>{r.period}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {tab === 'supplier' && !showSupplierHistory && (
              <div>
                <h4 style={{marginBottom:12,color:'#f59e0b'}}>Supplier Wise Purchase Report</h4>
                <table>
                  <thead><tr><th>Code</th><th>Name</th><th>Total Purchases</th><th>Items Purchased</th><th>Last Purchase</th><th>Outstanding</th><th></th></tr></thead>
                  <tbody>{data.filter(r => r.type === 'supplier').map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.code || '-'}</strong></td>
                      <td>{r.name}</td>
                      <td className="text-red">{formatCurrency(r.total_purchases || 0)}</td>
                      <td>{r.purchase_count || 0}</td>
                      <td>{r.last_purchase_date || '-'}</td>
                      <td className="fw-bold">{formatCurrency(r.outstanding_balance || 0)}</td>
                      <td><button className="btn btn-xs btn-secondary" onClick={() => viewSupplierHistory(r)}>View History</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            {tab === 'supplier' && showSupplierHistory && (
              <div>
                <div className="flex-between" style={{marginBottom:12}}>
                  <h4 style={{color:'#f59e0b',margin:0}}>Purchase History - {showSupplierHistory.name}</h4>
                  <button className="btn btn-xs btn-secondary" onClick={() => setShowSupplierHistory(null)}>← Back</button>
                </div>
                <table>
                  <thead><tr><th>Date</th><th>Voucher</th><th>Amount</th><th>Payment</th></tr></thead>
                  <tbody>{supplierHistory.map(r => (
                    <tr key={r.id}>
                      <td>{r.date}</td>
                      <td><strong>{r.voucher_no}</strong></td>
                      <td className="text-red">{formatCurrency(r.total_amount)}</td>
                      <td><span className="badge badge-info">{r.payment_mode}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
