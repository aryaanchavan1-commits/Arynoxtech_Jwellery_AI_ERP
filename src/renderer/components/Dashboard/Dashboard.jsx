import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';

export default function Dashboard() {
  const { setPageTitle, formatCurrency, formatWeight, dbQuery } = useContext(AppContext);
  const [stats, setStats] = useState({});
  const [recentTxns, setRecentTxns] = useState([]);
  const [goldRate, setGoldRate] = useState(0);
  const [lowStock, setLowStock] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [todaySummary, setTodaySummary] = useState(null);

  useEffect(() => {
    setPageTitle('Dashboard');
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    const items = await dbQuery('SELECT COUNT(*) as cnt, COALESCE(SUM(weight),0) as wt, COALESCE(SUM(weight*selling_price),0) as val FROM items WHERE status="active"');
    const parties = await dbQuery("SELECT type, COUNT(*) as cnt FROM parties GROUP BY type");
    const customers = parties.find(p => p.type === 'Customer')?.cnt || 0;
    const suppliers = parties.find(p => p.type === 'Supplier')?.cnt || 0;
    const karagirs = parties.find(p => p.type === 'Karagir')?.cnt || 0;

    const todaySales = await dbQuery("SELECT COALESCE(SUM(total_amount),0) as total, COUNT(*) as cnt FROM transactions WHERE voucher_type IN ('Sale_Retail','Sale_Wholesale') AND date = date('now')");
    const monthSales = await dbQuery("SELECT COALESCE(SUM(total_amount),0) as total FROM transactions WHERE voucher_type IN ('Sale_Retail','Sale_Wholesale') AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')");
    const monthPurchase = await dbQuery("SELECT COALESCE(SUM(total_amount),0) as total FROM transactions WHERE voucher_type='Purchase' AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')");

    const goldRates = await dbQuery('SELECT rate_per_gram FROM metal_rates WHERE metal_type="Gold" AND purity="24K" ORDER BY rate_date DESC LIMIT 1');
    const latestTransactions = await dbQuery("SELECT t.*, p.name as party_name FROM transactions t LEFT JOIN parties p ON t.party_id = p.id ORDER BY t.created_at DESC LIMIT 5");
    const lowStockItems = await dbQuery("SELECT * FROM items WHERE current_qty <= min_qty AND min_qty > 0 ORDER BY current_qty ASC LIMIT 5");

    const last6Months = await dbQuery(`
      SELECT strftime('%Y-%m', date) as month,
        SUM(CASE WHEN voucher_type IN ('Sale_Retail','Sale_Wholesale') THEN total_amount ELSE 0 END) as sales,
        SUM(CASE WHEN voucher_type='Purchase' THEN total_amount ELSE 0 END) as purchases
      FROM transactions
      WHERE date >= date('now', '-6 months')
      GROUP BY month ORDER BY month
    `);

    const pendingKaragir = await dbQuery("SELECT COUNT(*) as cnt FROM karagir_transactions WHERE status='pending'");

    setStats({
      totalItems: items[0]?.cnt || 0,
      totalWeight: items[0]?.wt || 0,
      stockValue: items[0]?.val || 0,
      customers, suppliers, karagirs,
      todaySales: todaySales[0]?.total || 0,
      todayInvoices: todaySales[0]?.cnt || 0,
      monthSales: monthSales[0]?.total || 0,
      monthPurchase: monthPurchase[0]?.total || 0,
      pendingKaragir: pendingKaragir[0]?.cnt || 0,
    });

    setGoldRate(goldRates[0]?.rate_per_gram || 0);
    setRecentTxns(latestTransactions);
    setLowStock(lowStockItems);
    setMonthlyData(last6Months);
    setTodaySummary(todaySales[0]);
  };

  const monthlySalesTotal = monthlyData.reduce((s, m) => s + (m.sales || 0), 0);

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon gold">💎</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalItems}</div>
            <div className="stat-label">Total Items</div>
            <div className="stat-change up">{formatWeight(stats.totalWeight)} gold</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">💰</div>
          <div className="stat-content">
            <div className="stat-value">{formatCurrency(stats.stockValue)}</div>
            <div className="stat-label">Stock Value</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">📊</div>
          <div className="stat-content">
            <div className="stat-value">{formatCurrency(stats.todaySales)}</div>
            <div className="stat-label">Today's Sales</div>
            <div className="stat-change up">{stats.todayInvoices} invoices</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">📈</div>
          <div className="stat-content">
            <div className="stat-value">{formatCurrency(stats.monthSales)}</div>
            <div className="stat-label">Monthly Sales</div>
            <div className="stat-change up">vs Purchase: {formatCurrency(stats.monthPurchase)}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan">🏅</div>
          <div className="stat-content">
            <div className="rate-display" style={{ padding: 0 }}>
              <div className="rate-value">₹{goldRate.toLocaleString('en-IN')}</div>
              <div className="rate-label">Gold 24K / 10g</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">🔄</div>
          <div className="stat-content">
            <div className="stat-value">{stats.pendingKaragir}</div>
            <div className="stat-label">Pending Karagir</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pink">👥</div>
          <div className="stat-content">
            <div className="stat-value">{stats.customers}</div>
            <div className="stat-label">Customers</div>
            <div className="stat-change">{stats.suppliers} Suppliers · {stats.karagirs} Karagirs</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">⚠️</div>
          <div className="stat-content">
            <div className="stat-value">{lowStock.length}</div>
            <div className="stat-label">Low Stock Alerts</div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">📋 Recent Transactions</div>
            <span className="badge badge-info">Today: {formatCurrency(stats.todaySales)}</span>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>Voucher</th><th>Type</th><th>Party</th><th>Amount</th><th>Date</th></tr></thead>
              <tbody>
                {recentTxns.length === 0 && <tr><td colSpan={5}><div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-text">No transactions yet</div></div></td></tr>}
                {recentTxns.map(t => (
                  <tr key={t.id}>
                    <td><strong>{t.voucher_no}</strong></td>
                    <td><span className="badge badge-info">{t.voucher_type}</span></td>
                    <td>{t.party_name || '-'}</td>
                    <td className="fw-bold">{formatCurrency(t.total_amount)}</td>
                    <td className="text-muted">{t.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">⚠️ Low Stock Alerts</div>
            <button className="btn btn-secondary btn-sm">View All Stock</button>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>Item</th><th>Code</th><th>Current</th><th>Min</th><th>Status</th></tr></thead>
              <tbody>
                {lowStock.length === 0 && <tr><td colSpan={5}><div className="empty-state"><div className="empty-state-icon">✅</div><div className="empty-state-text">All stock levels healthy</div></div></td></tr>}
                {lowStock.map(item => (
                  <tr key={item.id}>
                    <td>{item.name}</td><td>{item.code}</td>
                    <td className="text-red fw-bold">{formatWeight(item.current_qty)}</td>
                    <td>{formatWeight(item.min_qty)}</td>
                    <td><span className="badge badge-danger">⚠️ Low</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {monthlyData.length > 0 && (
        <div className="card mt-4">
          <div className="card-header">
            <div className="card-title">📈 Monthly Performance (Last 6 Months)</div>
            <span className="text-muted">Total Sales: {formatCurrency(monthlySalesTotal)}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${monthlyData.length}, 1fr)`, gap: 12, padding: '16px 0', minHeight: 150, alignItems: 'end' }}>
            {monthlyData.map((m, i) => {
              const maxVal = Math.max(...monthlyData.map(x => Math.max(x.sales || 0, x.purchases || 0)), 1);
              const salesH = ((m.sales || 0) / maxVal) * 120;
              const purchH = ((m.purchases || 0) / maxVal) * 120;
              return (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center', alignItems: 'flex-end', height: 130 }}>
                    <div style={{ width: '40%', background: 'linear-gradient(180deg, #f59e0b, #d97706)', borderRadius: '4px 4px 0 0', height: Math.max(salesH, 4), transition: 'height 0.5s', minHeight: 4 }} title={`Sales: ${formatCurrency(m.sales)}`} />
                    <div style={{ width: '40%', background: 'linear-gradient(180deg, #3b82f6, #1d4ed8)', borderRadius: '4px 4px 0 0', height: Math.max(purchH, 4), transition: 'height 0.5s', minHeight: 4 }} title={`Purchase: ${formatCurrency(m.purchases)}`} />
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 8 }}>{m.month?.slice(5)}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 12, color: '#94a3b8' }}>
            <span><span style={{ color: '#f59e0b' }}>●</span> Sales</span>
            <span><span style={{ color: '#3b82f6' }}>●</span> Purchases</span>
          </div>
        </div>
      )}
    </div>
  );
}
