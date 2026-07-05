import React, { useState, useEffect, useCallback, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { AuthContext } from '../../contexts/AuthContext';

const STYLES = {
  container: {
    padding: '24px',
    color: '#e0e0e0',
    minHeight: '100vh',
    backgroundColor: '#1a1a2e',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    marginBottom: '24px',
    borderBottom: '2px solid #2d2d44',
    paddingBottom: '0',
    flexWrap: 'wrap',
  },
  tab: (active) => ({
    padding: '10px 20px',
    cursor: 'pointer',
    borderRadius: '8px 8px 0 0',
    fontWeight: 500,
    fontSize: '14px',
    border: 'none',
    backgroundColor: active ? '#2d2d44' : 'transparent',
    color: active ? '#fff' : '#888',
    transition: 'all 0.2s',
  }),
  card: {
    backgroundColor: '#22223a',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    border: '1px solid #2d2d44',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: '#22223a',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #2d2d44',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#fff',
    marginTop: '8px',
  },
  statLabel: {
    fontSize: '13px',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  th: {
    textAlign: 'left',
    padding: '12px 8px',
    borderBottom: '2px solid #2d2d44',
    color: '#888',
    fontWeight: 600,
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  td: {
    padding: '10px 8px',
    borderBottom: '1px solid #2a2a42',
    color: '#ccc',
  },
  input: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #2d2d44',
    backgroundColor: '#1e1e36',
    color: '#e0e0e0',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
  },
  select: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #2d2d44',
    backgroundColor: '#1e1e36',
    color: '#e0e0e0',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    cursor: 'pointer',
  },
  textarea: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #2d2d44',
    backgroundColor: '#1e1e36',
    color: '#e0e0e0',
    fontSize: '14px',
    width: '100%',
    minHeight: '80px',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
  },
  btn: {
    padding: '10px 24px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#4a6cf7',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnSecondary: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #2d2d44',
    backgroundColor: 'transparent',
    color: '#ccc',
    fontSize: '13px',
    cursor: 'pointer',
  },
  filterRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    color: '#aaa',
    fontWeight: 500,
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#4a6cf7',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#666',
  },
  loading: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#888',
  },
  badge: (converted) => ({
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
    backgroundColor: converted ? '#1a3a2a' : '#2a2a2a',
    color: converted ? '#4caf50' : '#888',
    border: `1px solid ${converted ? '#2e7d32' : '#3a3a3a'}`,
  }),
  error: {
    padding: '12px 16px',
    backgroundColor: '#3a1a1a',
    border: '1px solid #5a2a2a',
    borderRadius: '8px',
    color: '#ef5350',
    marginBottom: '16px',
    fontSize: '13px',
  },
  success: {
    padding: '12px 16px',
    backgroundColor: '#1a3a2a',
    border: '1px solid #2a5a3a',
    borderRadius: '8px',
    color: '#4caf50',
    marginBottom: '16px',
    fontSize: '13px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#ccc',
  },
};

function formatDate(d) {
  if (!d) return '—';
  try {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return '—'; }
}

function formatDateTime(d) {
  if (!d) return '—';
  try {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

function SortIcon({ active, dir }) {
  if (!active) return <span style={{ color: '#555', marginLeft: 4 }}>↕</span>;
  return <span style={{ color: '#4a6cf7', marginLeft: 4 }}>{dir === 'asc' ? '↑' : '↓'}</span>;
}

function useSort(initialKey = null) {
  const [sortKey, setSortKey] = useState(initialKey);
  const [sortDir, setSortDir] = useState('asc');
  const toggle = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };
  const apply = (data) => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (va == null) va = '';
      if (vb == null) vb = '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  };
  return { sortKey, sortDir, toggle, apply };
}

// ============ TAB 1: Dashboard ============
function Dashboard({ dbQuery, formatCurrency }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [todayVisits, setTodayVisits] = useState(0);
  const [todayCustomers, setTodayCustomers] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);
  const [todaySales, setTodaySales] = useState(0);
  const [topCustomers, setTopCustomers] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const { sortKey, sortDir, toggle, apply } = useSort('total_visits');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const [visitsToday, customersToday, conv, salesToday, topCust, trend] = await Promise.all([
          dbQuery('SELECT COUNT(*) as c FROM customer_visits WHERE date(date) = ?', [today]),
          dbQuery('SELECT COUNT(DISTINCT customer_id) as c FROM customer_visits WHERE date(date) = ?', [today]),
          dbQuery(`SELECT CAST(SUM(CASE WHEN converted = 1 THEN 1 ELSE 0 END) AS REAL) / NULLIF(COUNT(*), 0) * 100 as rate FROM customer_visits WHERE date(date) = ?`, [today]),
          dbQuery('SELECT COALESCE(SUM(sale_amount), 0) as total FROM customer_visits WHERE date(date) = ? AND converted = 1', [today]),
          dbQuery(`SELECT c.name, c.id, COUNT(v.id) as total_visits, MAX(v.date) as last_visit,
            COALESCE(SUM(v.sale_amount), 0) as total_sales,
            CAST(SUM(CASE WHEN v.converted = 1 THEN 1 ELSE 0 END) AS REAL) / NULLIF(COUNT(v.id), 0) * 100 as conv_rate
            FROM customer_visits v JOIN parties c ON v.customer_id = c.id
            GROUP BY v.customer_id ORDER BY total_visits DESC LIMIT 10`, []),
          dbQuery(`SELECT date(date) as day, COUNT(*) as visits FROM customer_visits
            WHERE date >= ? GROUP BY date(date) ORDER BY day ASC`, [thirtyDaysAgo]),
        ]);

      setTodayVisits(visitsToday[0]?.c || 0);
      setTodayCustomers(customersToday[0]?.c || 0);
      setConversionRate(conv[0]?.rate ? Math.round(conv[0].rate * 10) / 10 : 0);
      setTodaySales(salesToday[0]?.total || 0);
      setTopCustomers(topCust || []);
      setTrendData(trend || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dbQuery]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div style={STYLES.loading}>Loading dashboard...</div>;
  if (error) return <div style={STYLES.error}>{error}</div>;

  const sortedCustomers = apply(topCustomers);

  return (
    <div>
      <div style={STYLES.statsGrid}>
        <div style={STYLES.statCard}>
          <div style={STYLES.statLabel}>Visits Today</div>
          <div style={STYLES.statValue}>{todayVisits}</div>
        </div>
        <div style={STYLES.statCard}>
          <div style={STYLES.statLabel}>Customers Visited</div>
          <div style={STYLES.statValue}>{todayCustomers}</div>
        </div>
        <div style={STYLES.statCard}>
          <div style={STYLES.statLabel}>Conversion Rate</div>
          <div style={{ ...STYLES.statValue, color: conversionRate > 50 ? '#4caf50' : '#ff9800' }}>{conversionRate}%</div>
        </div>
        <div style={STYLES.statCard}>
          <div style={STYLES.statLabel}>Sales from Visits</div>
          <div style={STYLES.statValue}>{formatCurrency ? formatCurrency(todaySales) : '₹' + todaySales.toLocaleString()}</div>
        </div>
      </div>

      <div style={STYLES.card}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>Most Visited Customers (Top 10)</h3>
        {sortedCustomers.length === 0 ? (
          <div style={STYLES.emptyState}>No visit data yet</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={STYLES.table}>
              <thead>
                <tr>
                  <th style={STYLES.th}>#</th>
                  <th style={STYLES.th} onClick={() => toggle('name')}>Customer <SortIcon active={sortKey === 'name'} dir={sortDir} /></th>
                  <th style={STYLES.th} onClick={() => toggle('total_visits')}>Visits <SortIcon active={sortKey === 'total_visits'} dir={sortDir} /></th>
                  <th style={STYLES.th} onClick={() => toggle('last_visit')}>Last Visit <SortIcon active={sortKey === 'last_visit'} dir={sortDir} /></th>
                  <th style={STYLES.th} onClick={() => toggle('total_sales')}>Total Sales <SortIcon active={sortKey === 'total_sales'} dir={sortDir} /></th>
                  <th style={STYLES.th} onClick={() => toggle('conv_rate')}>Conv % <SortIcon active={sortKey === 'conv_rate'} dir={sortDir} /></th>
                </tr>
              </thead>
              <tbody>
                {sortedCustomers.map((c, i) => (
                  <tr key={c.id}>
                    <td style={STYLES.td}>{i + 1}</td>
                    <td style={{ ...STYLES.td, color: '#fff', fontWeight: 500 }}>{c.name}</td>
                    <td style={STYLES.td}>{c.total_visits}</td>
                    <td style={STYLES.td}>{formatDate(c.last_visit)}</td>
                    <td style={STYLES.td}>{formatCurrency ? formatCurrency(c.total_sales) : '₹' + Number(c.total_sales).toLocaleString()}</td>
                    <td style={STYLES.td}>{Math.round(c.conv_rate * 10) / 10}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={STYLES.card}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>Visit Trend — Last 30 Days</h3>
        {trendData.length === 0 ? (
          <div style={STYLES.emptyState}>No visit data for last 30 days</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={STYLES.table}>
              <thead>
                <tr>
                  <th style={STYLES.th}>Date</th>
                  <th style={STYLES.th}>Visits</th>
                  <th style={STYLES.th}>Bar</th>
                </tr>
              </thead>
              <tbody>
                {trendData.map((row) => {
                  const maxVisits = Math.max(...trendData.map(r => r.visits), 1);
                  const pct = (row.visits / maxVisits) * 100;
                  return (
                    <tr key={row.day}>
                      <td style={STYLES.td}>{formatDate(row.day)}</td>
                      <td style={STYLES.td}>{row.visits}</td>
                      <td style={STYLES.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ height: '20px', width: `${Math.max(pct, 2)}%`, backgroundColor: '#4a6cf7', borderRadius: '4px', minWidth: '4px' }} />
                          <span style={{ fontSize: '11px', color: '#888' }}>{Math.round(pct)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ TAB 2: Visit Log ============
function VisitLog({ dbQuery, formatCurrency }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visits, setVisits] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const { sortKey, sortDir, toggle, apply } = useSort('date');

  const loadVisits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let sql = `SELECT v.*, c.name FROM customer_visits v JOIN parties c ON v.customer_id = c.id WHERE 1=1`;
      const params = [];

      if (dateFrom) { sql += ` AND date(v.date) >= ?`; params.push(dateFrom); }
      if (dateTo) { sql += ` AND date(v.date) <= ?`; params.push(dateTo); }
      if (customerFilter) { sql += ` AND v.customer_id = ?`; params.push(customerFilter); }
      if (search) { sql += ` AND c.name LIKE ?`; params.push(`%${search}%`); }

      sql += ` ORDER BY v.date DESC`;

      const [data, custs] = await Promise.all([
        dbQuery(sql, params),
        dbQuery('SELECT id, name FROM parties ORDER BY name ASC', []),
      ]);
      setVisits(data || []);
      setCustomers(custs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dbQuery, dateFrom, dateTo, customerFilter, search]);

  useEffect(() => { loadVisits(); }, [loadVisits]);

  const sortedVisits = apply(visits);
  const totalVisits = visits.length;
  const totalSaleAmount = visits.reduce((sum, v) => sum + (v.converted ? Number(v.sale_amount || 0) : 0), 0);

  return (
    <div>
      <div style={STYLES.card}>
        <div style={STYLES.filterRow}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <input style={STYLES.input} type="text" placeholder="Search by customer name..." value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ minWidth: 160 }}>
            <input style={STYLES.input} type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div style={{ minWidth: 160 }}>
            <input style={STYLES.input} type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div style={{ minWidth: 200 }}>
            <select style={STYLES.select} value={customerFilter} onChange={e => setCustomerFilter(e.target.value)}>
              <option value="">All Customers</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button style={STYLES.btnSecondary} onClick={loadVisits}>Refresh</button>
        </div>

        <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', fontSize: '14px' }}>
          <span>Total Visits: <strong style={{ color: '#fff' }}>{totalVisits}</strong></span>
          <span>Total Sale Amount: <strong style={{ color: '#4caf50' }}>{formatCurrency ? formatCurrency(totalSaleAmount) : '₹' + totalSaleAmount.toLocaleString()}</strong></span>
        </div>

        {error && <div style={STYLES.error}>{error}</div>}

        {loading ? (
          <div style={STYLES.loading}>Loading visits...</div>
        ) : sortedVisits.length === 0 ? (
          <div style={STYLES.emptyState}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
            <div>No visits found</div>
            <div style={{ fontSize: '13px', marginTop: '8px', color: '#555' }}>Try adjusting your filters or create a new visit</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={STYLES.table}>
              <thead>
                <tr>
                  <th style={STYLES.th} onClick={() => toggle('date')}>Date <SortIcon active={sortKey === 'date'} dir={sortDir} /></th>
                  <th style={STYLES.th} onClick={() => toggle('name')}>Customer <SortIcon active={sortKey === 'name'} dir={sortDir} /></th>
                  <th style={STYLES.th} onClick={() => toggle('visit_type')}>Type <SortIcon active={sortKey === 'visit_type'} dir={sortDir} /></th>
                  <th style={STYLES.th} onClick={() => toggle('purpose')}>Purpose <SortIcon active={sortKey === 'purpose'} dir={sortDir} /></th>
                  <th style={STYLES.th} onClick={() => toggle('converted')}>Converted <SortIcon active={sortKey === 'converted'} dir={sortDir} /></th>
                  <th style={STYLES.th} onClick={() => toggle('sale_amount')}>Sale Amount <SortIcon active={sortKey === 'sale_amount'} dir={sortDir} /></th>
                  <th style={STYLES.th}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {sortedVisits.map(v => (
                  <tr key={v.id}>
                    <td style={STYLES.td}>{formatDate(v.date)}</td>
                    <td style={{ ...STYLES.td, color: '#fff', fontWeight: 500 }}>{v.name}</td>
                    <td style={STYLES.td}>
                      <span style={{ textTransform: 'capitalize' }}>{v.visit_type?.replace('_', ' ')}</span>
                    </td>
                    <td style={STYLES.td}>{v.purpose || '—'}</td>
                    <td style={STYLES.td}>
                      <span style={STYLES.badge(v.converted)}>{v.converted ? 'Yes' : 'No'}</span>
                    </td>
                    <td style={{ ...STYLES.td, color: v.converted ? '#4caf50' : '#888' }}>
                      {v.converted ? (formatCurrency ? formatCurrency(v.sale_amount) : '₹' + Number(v.sale_amount || 0).toLocaleString()) : '—'}
                    </td>
                    <td style={{ ...STYLES.td, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ TAB 3: New Visit ============
function NewVisit({ dbRun, addNotification }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({
    customer_id: '',
    visit_date: new Date().toISOString().split('T')[0],
    visit_type: 'walk_in',
    purpose: '',
    notes: '',
    referred_item: '',
    converted: false,
    sale_amount: '',
  });

  useEffect(() => { 
    const load = async () => {
      try { const data = await window.electronAPI?.db?.all('SELECT id, name FROM parties ORDER BY name ASC'); setCustomers(data || []); } catch(e) {}
    };
    load();
  }, []);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_id) { setError('Please select a customer'); return; }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await dbRun(
        `INSERT INTO customer_visits (customer_id, date, visit_type, purpose, notes, referred_item, converted, sale_amount, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          form.customer_id,
          form.visit_date,
          form.visit_type,
          form.purpose,
          form.notes,
          form.referred_item,
          form.converted ? 1 : 0,
          form.converted ? Number(form.sale_amount || 0) : 0,
          'current_user',
        ]
      );
      setSuccess('Visit recorded successfully!');
      setForm({
        customer_id: '',
        visit_date: new Date().toISOString().split('T')[0],
        visit_type: 'walk_in',
        purpose: '',
        notes: '',
        referred_item: '',
        converted: false,
        sale_amount: '',
      });
      if (addNotification) addNotification('Visit recorded successfully', 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={STYLES.card}>
        <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600 }}>Record New Visit</h3>

        {error && <div style={STYLES.error}>{error}</div>}
        {success && <div style={STYLES.success}>{success}</div>}

        <form onSubmit={handleSubmit}>
          <div style={STYLES.formGroup}>
            <label style={STYLES.label}>Customer *</label>
            <select style={STYLES.select} value={form.customer_id}
              onChange={e => handleChange('customer_id', e.target.value)}>
              <option value="">Select a customer...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={STYLES.formGroup}>
              <label style={STYLES.label}>Date</label>
              <input style={STYLES.input} type="date" value={form.visit_date}
                onChange={e => handleChange('visit_date', e.target.value)} />
            </div>
            <div style={STYLES.formGroup}>
              <label style={STYLES.label}>Visit Type</label>
              <select style={STYLES.select} value={form.visit_type}
                onChange={e => handleChange('visit_type', e.target.value)}>
                <option value="walk_in">Walk In</option>
                <option value="appointment">Appointment</option>
                <option value="call">Call</option>
              </select>
            </div>
          </div>

          <div style={STYLES.formGroup}>
            <label style={STYLES.label}>Purpose</label>
            <input style={STYLES.input} type="text" placeholder="e.g. Browse rings, inquire about gold rate..."
              value={form.purpose} onChange={e => handleChange('purpose', e.target.value)} />
          </div>

          <div style={STYLES.formGroup}>
            <label style={STYLES.label}>Referred Item</label>
            <input style={STYLES.input} type="text" placeholder="e.g. Gold Necklace, Diamond Ring..."
              value={form.referred_item} onChange={e => handleChange('referred_item', e.target.value)} />
          </div>

          <div style={STYLES.formGroup}>
            <label style={STYLES.label}>Notes</label>
            <textarea style={STYLES.textarea} placeholder="Additional notes about the visit..."
              value={form.notes} onChange={e => handleChange('notes', e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'center' }}>
            <div style={STYLES.formGroup}>
              <label style={STYLES.checkboxLabel}>
                <input style={STYLES.checkbox} type="checkbox" checked={form.converted}
                  onChange={e => handleChange('converted', e.target.checked)} />
                Converted to Sale
              </label>
            </div>
            {form.converted && (
              <div style={STYLES.formGroup}>
                <label style={STYLES.label}>Sale Amount (₹)</label>
                <input style={STYLES.input} type="number" min="0" step="0.01" placeholder="0.00"
                  value={form.sale_amount} onChange={e => handleChange('sale_amount', e.target.value)} />
              </div>
            )}
          </div>

          <button type="submit" style={{ ...STYLES.btn, marginTop: '8px', opacity: loading ? 0.6 : 1 }} disabled={loading}>
            {loading ? 'Saving...' : 'Save Visit'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============ TAB 4: Customer 360 ============
function Customer360({ dbQuery, formatCurrency }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [customerData, setCustomerData] = useState(null);
  const [visits, setVisits] = useState([]);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await dbQuery('SELECT id, name, phone, email, address FROM parties ORDER BY name ASC');
        setCustomers(data || []);
      } catch (err) { setError(err.message); }
    })();
  }, [dbQuery]);

  const loadCustomer = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [cust, vis, txns] = await Promise.all([
          dbQuery('SELECT id, name, phone, email, address FROM parties WHERE id = ?', [id]),
          dbQuery(`SELECT v.*, c.name FROM customer_visits v JOIN parties c ON v.customer_id = c.id
            WHERE v.customer_id = ? ORDER BY v.date DESC`, [id]),
          dbQuery(`SELECT t.*, c.name FROM transactions t JOIN parties c ON t.party_id = c.id
            WHERE t.party_id = ? ORDER BY t.date DESC LIMIT 50`, [id]),
        ]);

      setCustomerData(cust[0] || null);
      setVisits(vis || []);
      setTransactions(txns || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dbQuery]);

  useEffect(() => {
    if (selectedId) loadCustomer(selectedId);
    else { setCustomerData(null); setVisits([]); setTransactions([]); }
  }, [selectedId, loadCustomer]);

  const totalVisits = visits.length;
  const firstVisit = visits.length > 0 ? visits[visits.length - 1].date : null; // oldest is last in DESC
  const lastVisit = visits.length > 0 ? visits[0].date : null;
  const totalPurchase = transactions.reduce((sum, t) => sum + (Number(t.total_amount) || 0), 0);
  const avgPerVisit = totalVisits > 0 ? totalPurchase / totalVisits : 0;

  return (
    <div>
      <div style={{ ...STYLES.card, marginBottom: '20px' }}>
        <label style={STYLES.label}>Select Customer</label>
        <select style={STYLES.select} value={selectedId} onChange={e => setSelectedId(e.target.value)}>
          <option value="">Choose a customer...</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
        </select>
      </div>

      {error && <div style={STYLES.error}>{error}</div>}

      {loading && <div style={STYLES.loading}>Loading customer data...</div>}

      {!selectedId && !loading && (
        <div style={STYLES.emptyState}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
          <div>Select a customer to view 360° details</div>
        </div>
      )}

      {customerData && !loading && (
        <>
          <div style={STYLES.statsGrid}>
            <div style={STYLES.statCard}>
              <div style={STYLES.statLabel}>Customer</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginTop: '4px' }}>{customerData.name}</div>
              {customerData.phone && <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>📞 {customerData.phone}</div>}
              {customerData.email && <div style={{ fontSize: '13px', color: '#888' }}>✉ {customerData.email}</div>}
              {customerData.address && (
                <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
                  📍 {customerData.address}
                </div>
              )}
            </div>
            <div style={STYLES.statCard}>
              <div style={STYLES.statLabel}>Total Visits</div>
              <div style={STYLES.statValue}>{totalVisits}</div>
            </div>
            <div style={STYLES.statCard}>
              <div style={STYLES.statLabel}>Avg per Visit</div>
              <div style={STYLES.statValue}>{formatCurrency ? formatCurrency(avgPerVisit) : '₹' + avgPerVisit.toLocaleString()}</div>
            </div>
            <div style={STYLES.statCard}>
              <div style={STYLES.statLabel}>Total Purchase</div>
              <div style={{ ...STYLES.statValue, color: '#4caf50' }}>{formatCurrency ? formatCurrency(totalPurchase) : '₹' + totalPurchase.toLocaleString()}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={STYLES.statCard}>
              <div style={STYLES.statLabel}>First Visit</div>
              <div style={{ fontSize: '16px', color: '#fff', marginTop: '4px' }}>{formatDate(firstVisit)}</div>
            </div>
            <div style={STYLES.statCard}>
              <div style={STYLES.statLabel}>Last Visit</div>
              <div style={{ fontSize: '16px', color: '#fff', marginTop: '4px' }}>{formatDate(lastVisit)}</div>
            </div>
          </div>

          <div style={STYLES.card}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>Recent Visits Timeline</h3>
            {visits.length === 0 ? (
              <div style={STYLES.emptyState}>No visits recorded</div>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {visits.slice(0, 20).map((v, i) => (
                  <div key={v.id} style={{
                    display: 'flex', gap: '16px', padding: '12px 0',
                    borderBottom: i < Math.min(visits.length, 20) - 1 ? '1px solid #2a2a42' : 'none',
                  }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      backgroundColor: v.converted ? '#1a3a2a' : '#2a2a2a',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '16px', flexShrink: 0,
                    }}>{v.converted ? '✓' : '○'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#fff', fontWeight: 500 }}>{formatDate(v.date)}</span>
                        <span style={{ fontSize: '12px', color: '#888', textTransform: 'capitalize' }}>{v.visit_type?.replace('_', ' ')}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#aaa', marginTop: '4px' }}>{v.purpose || 'No purpose'}</div>
                      {v.converted && <div style={{ fontSize: '13px', color: '#4caf50', marginTop: '2px' }}>
                        Sale: {formatCurrency ? formatCurrency(v.sale_amount) : '₹' + Number(v.sale_amount || 0).toLocaleString()}
                      </div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={STYLES.card}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>Purchase History</h3>
            {transactions.length === 0 ? (
              <div style={STYLES.emptyState}>No transactions found</div>
            ) : (
              <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
                <table style={STYLES.table}>
                  <thead>
                    <tr>
                      <th style={STYLES.th}>Date</th>
                      <th style={STYLES.th}>Type</th>
                      <th style={STYLES.th}>Amount</th>
                      <th style={STYLES.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => (
                      <tr key={t.id}>
                        <td style={STYLES.td}>{formatDate(t.date)}</td>
                        <td style={STYLES.td}>{t.voucher_type || '—'}</td>
                        <td style={{ ...STYLES.td, color: '#4caf50', fontWeight: 500 }}>
                          {formatCurrency ? formatCurrency(t.total_amount) : '₹' + Number(t.total_amount || 0).toLocaleString()}
                        </td>
                        <td style={STYLES.td}>
                          <span style={STYLES.badge(t.status === 'completed')}>
                            {t.status || 'pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ============ MAIN COMPONENT ============
export default function CRMModule() {
  const [activeTab, setActiveTab] = useState(0);
  const appCtx = useContext(AppContext);
  const authCtx = useContext(AuthContext);

  const dbQuery = appCtx?.dbQuery || window.electronAPI?.db?.all || (async () => []);
  const dbRun = appCtx?.dbRun || window.electronAPI?.db?.run || (async () => {});
  const addNotification = appCtx?.addNotification || (() => {});
  const formatCurrency = appCtx?.formatCurrency;

  const tabs = ['Dashboard', 'Visit Log', 'New Visit', 'Customer 360'];

  return (
    <div style={STYLES.container}>
      <div style={{ marginBottom: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#fff' }}>Customer Relationship Management</h2>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#888' }}>Track and manage customer visits and interactions</p>
      </div>

      <div style={STYLES.tabs}>
        {tabs.map((tab, i) => (
          <button key={tab} style={STYLES.tab(activeTab === i)} onClick={() => setActiveTab(i)}>
            {tab}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 0 && <Dashboard dbQuery={dbQuery} formatCurrency={formatCurrency} />}
        {activeTab === 1 && <VisitLog dbQuery={dbQuery} formatCurrency={formatCurrency} />}
        {activeTab === 2 && <NewVisit dbRun={dbRun} addNotification={addNotification} />}
        {activeTab === 3 && <Customer360 dbQuery={dbQuery} formatCurrency={formatCurrency} />}
      </div>
    </div>
  );
}
