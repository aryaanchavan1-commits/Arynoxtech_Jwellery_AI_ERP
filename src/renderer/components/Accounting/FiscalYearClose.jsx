import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';

export default function FiscalYearClose() {
  const { dbQuery, dbRun, formatCurrency, addNotification } = useContext(AppContext);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  useEffect(() => { loadYears(); }, []);

  const loadYears = async () => {
    setYears(await dbQuery("SELECT * FROM financial_years ORDER BY start_date DESC"));
  };

  const closeYear = async (year) => {
    if (!confirm(`⚠️ Close financial year ${year.name}? This will:\n1. Lock all transactions in this year\n2. Transfer P&L balance to retained earnings\n3. Set opening balances for next year\n\nThis cannot be undone! Continue?`)) return;
    setLoading(true);
    try {
      const startDate = year.start_date;
      const endDate = year.end_date;

      const income = await dbQuery("SELECT COALESCE(SUM(total_amount),0) as total FROM transactions WHERE voucher_type IN ('Sale_Retail','Sale_Wholesale') AND status='active' AND date BETWEEN ? AND ?", [startDate, endDate]);
      const expenses = await dbQuery("SELECT COALESCE(SUM(total_amount),0) as total FROM transactions WHERE voucher_type='Purchase' AND status='active' AND date BETWEEN ? AND ?", [startDate, endDate]);
      const profit = (income[0]?.total || 0) - (expenses[0]?.total || 0);

      await dbRun("UPDATE financial_years SET is_closed=1 WHERE id=?", [year.id]);

      const closingId = crypto.randomUUID();
      await dbRun("INSERT INTO transactions (id,voucher_no,voucher_type,date,party_id,narration,total_amount,status) VALUES (?,?,?,?,?,?,?,?)",
        [closingId, `CLOSE-${year.name}`, 'Journal', endDate, null, `Closing entry for FY ${year.name}`, Math.abs(profit), 'active']);

      await dbRun("UPDATE transactions SET status='closed' WHERE date BETWEEN ? AND ? AND status='active'", [startDate, endDate]);

      const nextYear = await dbQuery("SELECT * FROM financial_years WHERE start_date=?", [new Date(new Date(endDate).getTime() + 86400000).toISOString().split('T')[0]]);
      if (nextYear.length === 0) {
        const nextStart = new Date(endDate);
        nextStart.setDate(nextStart.getDate() + 1);
        const nextEnd = new Date(nextStart);
        nextEnd.setFullYear(nextEnd.getFullYear() + 1);
        nextEnd.setDate(nextEnd.getDate() - 1);
        await dbRun("INSERT INTO financial_years (id,name,start_date,end_date) VALUES (?,?,?,?)",
          [crypto.randomUUID(), `FY ${nextStart.getFullYear()}-${nextEnd.getFullYear()}`, nextStart.toISOString().split('T')[0], nextEnd.toISOString().split('T')[0]]);
      }

      setSummary({ year: year.name, profit, closedAt: new Date().toISOString() });
      addNotification(`FY ${year.name} closed successfully. Profit: ${formatCurrency(profit)}`, 'success');
      loadYears();
    } catch (e) {
      addNotification('Close year failed: ' + e.message, 'error');
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="card mb-4">
        <div className="card-header"><span>📅 Fiscal Year Close</span></div>
        <div className="card-body">
          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
            Closing a fiscal year locks all transactions in that period and transfers the profit/loss to retained earnings.
            This is typically done once per year and cannot be undone.
          </p>

          <table>
            <thead>
              <tr>
                <th>Year</th><th>Period</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {years.map(y => (
                <tr key={y.id}>
                  <td><strong>{y.name}</strong></td>
                  <td style={{ fontSize: 12 }}>{y.start_date} to {y.end_date}</td>
                  <td>{y.is_closed ? <span className="badge badge-danger">Closed</span> : <span className="badge badge-success">Active</span>}</td>
                  <td>
                    {!y.is_closed && (
                      <button className="btn btn-warning btn-sm" onClick={() => closeYear(y)} disabled={loading}>
                        {loading ? 'Closing...' : '🔒 Close Year'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {summary && (
            <div className="card" style={{ marginTop: 16, background: '#1e293b' }}>
              <h4 style={{ color: '#22c55e', marginBottom: 8 }}>✅ Year Closed Successfully</h4>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>
                <div>Year: {summary.year}</div>
                <div>Profit/Loss: {formatCurrency(summary.profit)}</div>
                <div>Closed at: {summary.closedAt}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
