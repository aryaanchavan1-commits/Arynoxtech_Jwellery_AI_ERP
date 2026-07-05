import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';

export default function GoldRatesModule() {
  const { setPageTitle, formatCurrency, dbQuery, dbRun, addNotification } = useContext(AppContext);
  const [rates, setRates] = useState([]);
  const [todayRate, setTodayRate] = useState({ gold24k: 0, gold22k: 0, gold18k: 0, silver: 0 });
  const [form, setForm] = useState({ metal_type: 'Gold', purity: '24K', rate_per_gram: 0, rate_date: new Date().toISOString().split('T')[0] });
  const [tab, setTab] = useState('rates');

  useEffect(() => {
    setPageTitle('Gold Rates');
    loadRates();
  }, []);

  const loadRates = async () => {
    const allRates = await dbQuery('SELECT * FROM metal_rates ORDER BY rate_date DESC, metal_type LIMIT 50');
    setRates(allRates);
    const today = await dbQuery("SELECT metal_type, purity, rate_per_gram FROM metal_rates WHERE rate_date = date('now')");
    const gr = { gold24k: 0, gold22k: 0, gold18k: 0, silver: 0 };
    today.forEach(r => {
      if (r.metal_type === 'Gold' && r.purity === '24K') gr.gold24k = r.rate_per_gram;
      if (r.metal_type === 'Gold' && r.purity === '22K') gr.gold22k = r.rate_per_gram;
      if (r.metal_type === 'Gold' && r.purity === '18K') gr.gold18k = r.rate_per_gram;
      if (r.metal_type === 'Silver') gr.silver = r.rate_per_gram;
    });
    setTodayRate(gr);
  };

  const submitRate = async () => {
    await dbRun('INSERT INTO metal_rates (id, metal_type, purity, rate_per_gram, rate_date) VALUES (?,?,?,?,?)',
      [crypto.randomUUID(), form.metal_type, form.purity, form.rate_per_gram, form.rate_date]);
    addNotification(`${form.metal_type} ${form.purity} rate updated`, 'success');
    loadRates();
  };

  const setAllRates = async () => {
    if (todayRate.gold24k) {
      await dbRun('INSERT INTO metal_rates (id,metal_type,purity,rate_per_gram,rate_date) VALUES (?,?,?,?,?)',
        [crypto.randomUUID(),'Gold','24K',todayRate.gold24k, form.rate_date]);
      await dbRun('INSERT INTO metal_rates (id,metal_type,purity,rate_per_gram,rate_date) VALUES (?,?,?,?,?)',
        [crypto.randomUUID(),'Gold','22K',todayRate.gold22k || Math.round(todayRate.gold24k * 0.916), form.rate_date]);
      await dbRun('INSERT INTO metal_rates (id,metal_type,purity,rate_per_gram,rate_date) VALUES (?,?,?,?,?)',
        [crypto.randomUUID(),'Gold','18K',todayRate.gold18k || Math.round(todayRate.gold24k * 0.75), form.rate_date]);
      if (todayRate.silver) {
        await dbRun('INSERT INTO metal_rates (id,metal_type,purity,rate_per_gram,rate_date) VALUES (?,?,?,?,?)',
          [crypto.randomUUID(),'Silver','999',todayRate.silver, form.rate_date]);
      }
      addNotification('All rates updated for today', 'success');
      loadRates();
    }
  };

  const goldRates = rates.filter(r => r.metal_type === 'Gold');
  const silverRates = rates.filter(r => r.metal_type === 'Silver');

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon gold">🥇</div><div className="stat-content"><div className="rate-display" style={{ padding: 0 }}><div className="rate-value">₹{todayRate.gold24k.toLocaleString('en-IN')}</div><div className="rate-label">Gold 24K / 10g</div></div></div></div>
        <div className="stat-card"><div className="stat-icon gold">🥈</div><div className="stat-content"><div className="rate-display" style={{ padding: 0 }}><div className="rate-value">₹{todayRate.gold22k.toLocaleString('en-IN')}</div><div className="rate-label">Gold 22K / 10g</div></div></div></div>
        <div className="stat-card"><div className="stat-icon gold">🥉</div><div className="stat-content"><div className="rate-display" style={{ padding: 0 }}><div className="rate-value">₹{todayRate.gold18k.toLocaleString('en-IN')}</div><div className="rate-label">Gold 18K / 10g</div></div></div></div>
        <div className="stat-card"><div className="stat-icon cyan">🔘</div><div className="stat-content"><div className="rate-display" style={{ padding: 0 }}><div className="rate-value">₹{todayRate.silver.toLocaleString('en-IN')}</div><div className="rate-label">Silver / kg</div></div></div></div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'rates' ? 'active' : ''}`} onClick={() => setTab('rates')}>Set Rates</button>
        <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>Rate History</button>
        <button className={`tab ${tab === 'graph' ? 'active' : ''}`} onClick={() => setTab('graph')}>Rate Graph</button>
      </div>

      {tab === 'rates' && (
        <div className="card">
          <div className="section-title">📅 Set Daily Rates</div>
          <div className="form-row-4 mb-4">
            <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={form.rate_date} onChange={e => setForm({...form, rate_date: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Gold 24K (₹/g)</label><input type="number" className="form-input" value={todayRate.gold24k} onChange={e => setTodayRate({...todayRate, gold24k: parseFloat(e.target.value) || 0})} /></div>
            <div className="form-group"><label className="form-label">Gold 22K (₹/g)</label><input type="number" className="form-input" value={todayRate.gold22k} onChange={e => setTodayRate({...todayRate, gold22k: parseFloat(e.target.value) || 0})} /></div>
            <div className="form-group"><label className="form-label">Gold 18K (₹/g)</label><input type="number" className="form-input" value={todayRate.gold18k} onChange={e => setTodayRate({...todayRate, gold18k: parseFloat(e.target.value) || 0})} /></div>
            <div className="form-group"><label className="form-label">Silver (₹/kg)</label><input type="number" className="form-input" value={todayRate.silver} onChange={e => setTodayRate({...todayRate, silver: parseFloat(e.target.value) || 0})} /></div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary btn-block" onClick={setAllRates}>💾 Set All Rates</button>
            </div>
          </div>

          <div className="section-title">➕ Individual Rate Entry</div>
          <div className="form-row-4">
            <div className="form-group"><label className="form-label">Metal</label><select className="form-input" value={form.metal_type} onChange={e => setForm({...form, metal_type: e.target.value})}><option>Gold</option><option>Silver</option><option>Platinum</option></select></div>
            <div className="form-group"><label className="form-label">Purity</label><select className="form-input" value={form.purity} onChange={e => setForm({...form, purity: e.target.value})}><option>24K</option><option>22K</option><option>18K</option><option>916</option><option>999</option></select></div>
            <div className="form-group"><label className="form-label">Rate per Gram</label><input type="number" className="form-input" value={form.rate_per_gram} onChange={e => setForm({...form, rate_per_gram: parseFloat(e.target.value) || 0})} /></div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-secondary btn-block" onClick={submitRate}>➕ Add Rate</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          <div className="table-container">
            <table>
              <thead><tr><th>Date</th><th>Metal</th><th>Purity</th><th>Rate/g</th><th>Rate/10g</th><th>Rate/oz</th></tr></thead>
              <tbody>
                {rates.map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.rate_date}</strong></td>
                    <td><span className="badge badge-gold">{r.metal_type}</span></td>
                    <td>{r.purity}</td>
                    <td className="fw-bold text-gold">{formatCurrency(r.rate_per_gram)}</td>
                    <td>{formatCurrency((r.rate_per_gram || 0) * 10)}</td>
                    <td className="text-muted">{formatCurrency((r.rate_per_gram || 0) * 31.1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'graph' && (
        <div className="card">
          <div className="section-title">📈 Gold Rate Trend (Last 30 Days)</div>
          <div style={{ padding: '20px 0', minHeight: 250 }}>
            {(() => {
              const last30 = goldRates.filter(r => r.purity === '24K').slice(0, 30).reverse();
              if (last30.length < 2) return <div className="empty-state"><div className="empty-state-icon">📈</div><div className="empty-state-text">Need more rate data for graph</div></div>;
              const maxRate = Math.max(...last30.map(r => r.rate_per_gram), 1);
              const minRate = Math.min(...last30.map(r => r.rate_per_gram), 0);
              const range = maxRate - minRate || 1;
              const barWidth = Math.max(10, Math.min(40, 600 / last30.length));
              return (
                <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 220, padding: '0 10px', overflowX: 'auto' }}>
                  {last30.map((r, i) => {
                    const h = ((r.rate_per_gram - minRate) / range) * 180 + 20;
                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: barWidth }}>
                        <div style={{ fontSize: 9, color: '#f59e0b', marginBottom: 2 }}>₹{r.rate_per_gram}</div>
                        <div style={{ width: barWidth - 4, height, background: 'linear-gradient(180deg, #f59e0b, #d97706)', borderRadius: '3px 3px 0 0', transition: 'height 0.3s', cursor: 'pointer' }} title={`${r.rate_date}: ₹${r.rate_per_gram}`} />
                        <div style={{ fontSize: 8, color: '#64748b', marginTop: 4, transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>{r.rate_date?.slice(5)}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
