import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import Autocomplete from '../Common/Autocomplete';
import NumberInput from '../../utils/NumberInput';
import FiscalYearClose from './FiscalYearClose';

export default function AccountingModule() {
  const { setPageTitle, formatCurrency, dbQuery, dbRun, addNotification } = useContext(AppContext);
  const [tab, setTab] = useState('vouchers');

  useEffect(() => { setPageTitle('Accounting'); }, []);

  const tabs = [
    { id: 'vouchers', label: '📒 Vouchers', component: VoucherSection },
    { id: 'ledgers', label: '📓 Ledgers', component: LedgerSection },
    { id: 'trial', label: '⚖️ Trial Balance', component: TrialBalance },
    { id: 'pl', label: '📈 P&L Account', component: PLAccount },
    { id: 'bs', label: '📊 Balance Sheet', component: BalanceSheet },
    { id: 'cashflow', label: '💵 Cash Flow', component: CashFlow },
    { id: 'yearclose', label: '📅 Year Close', component: FiscalYearClose },
  ];

  const ActiveTab = tabs.find(t => t.id === tab)?.component;
  return (
    <div>
      <div className="tabs">{tabs.map(t => <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>
      {ActiveTab && <ActiveTab />}
    </div>
  );
}

function VoucherSection() {
  const { dbQuery, dbRun, addNotification, formatCurrency } = useContext(AppContext);
  const [vouchers, setVouchers] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');

  const [voucher, setVoucher] = useState({ voucher_no: '', date: new Date().toISOString().split('T')[0], narration: '', voucher_type: 'Payment' });
  const [entries, setEntries] = useState([{ id: crypto.randomUUID(), ledger_id: '', debit: 0, credit: 0, narration: '' }]);

  const voucherTypes = [
    { id: 'Payment', label: '💳 Payment', color: 'danger' },
    { id: 'Receipt', label: '📥 Receipt', color: 'success' },
    { id: 'Journal', label: '📝 Journal', color: 'info' },
    { id: 'Bank_Payment', label: '🏦 Bank Payment', color: 'danger' },
    { id: 'Bank_Receipt', label: '💰 Bank Receipt', color: 'success' },
    { id: 'Contra', label: '🔄 Contra', color: 'cyan' },
  ];

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setVouchers(await dbQuery("SELECT * FROM transactions WHERE voucher_type IN ('Payment','Receipt','Journal','Bank_Payment','Bank_Receipt','Contra') ORDER BY created_at DESC LIMIT 100"));
    setLedgers(await dbQuery('SELECT * FROM ledgers ORDER BY name'));
  };

  const addEntry = () => setEntries([...entries, { id: crypto.randomUUID(), ledger_id: '', debit: 0, credit: 0, narration: '' }]);

  const updateEntry = (id, field, value) => setEntries(entries.map(e => e.id === id ? { ...e, [field]: value } : e));

  const removeEntry = (id) => { if (entries.length > 2) setEntries(entries.filter(e => e.id !== id)); };

  const saveVoucher = async () => {
    const totalDr = entries.reduce((s, e) => s + (parseFloat(e.debit) || 0), 0);
    const totalCr = entries.reduce((s, e) => s + (parseFloat(e.credit) || 0), 0);
    if (Math.abs(totalDr - totalCr) > 0.01) { addNotification('Debit != Credit', 'error'); return; }
    if (entries.length < 2) { addNotification('Need 2+ entries', 'error'); return; }

    const vNo = voucher.voucher_no || `${voucher.voucher_type}-${Date.now().toString(36).toUpperCase()}`;
    const txId = crypto.randomUUID();
    await dbRun('INSERT INTO transactions (id,voucher_no,voucher_type,date,narration,total_amount) VALUES (?,?,?,?,?,?)', [txId, vNo, voucher.voucher_type, voucher.date, voucher.narration, totalDr]);
    for (const entry of entries) {
      await dbRun('INSERT INTO transaction_entries (id,transaction_id,ledger_id,debit,credit,narration) VALUES (?,?,?,?,?,?)', [crypto.randomUUID(), txId, entry.ledger_id, entry.debit, entry.credit, entry.narration]);
    }
    addNotification(`Voucher ${vNo} created`, 'success');
    setShowForm(false);
    setEntries([{ id: crypto.randomUUID(), ledger_id: '', debit: 0, credit: 0, narration: '' }]);
    setVoucher({ voucher_no: '', date: new Date().toISOString().split('T')[0], narration: '', voucher_type: 'Payment' });
    loadData();
  };

  const filtered = vouchers.filter(v => v.voucher_no?.includes(search) || v.narration?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-left"><input className="search-input" placeholder="Search vouchers..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="toolbar-right"><button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New Voucher</button></div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">📒 New Voucher Entry</div><button className="title-btn close" onClick={() => setShowForm(false)}>✕</button></div>
            <div className="modal-body">
              <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
                {voucherTypes.map(vt => (
                  <button key={vt.id} className={`btn btn-${vt.color} btn-sm`} style={voucher.voucher_type === vt.id ? { opacity: 1 } : { opacity: 0.6 }}
                    onClick={() => setVoucher({...voucher, voucher_type: vt.id, voucher_no: vt.id.slice(0,4).toUpperCase() + '-' + Date.now().toString(36).toUpperCase()})}>
                    {vt.label}
                  </button>
                ))}
              </div>
              <div className="form-row-4 mb-4">
                <div className="form-group"><label className="form-label">Voucher No</label><input className="form-input" value={voucher.voucher_no} onChange={e => setVoucher({...voucher, voucher_no: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={voucher.date} onChange={e => setVoucher({...voucher, date: e.target.value})} /></div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Narration</label><input className="form-input" value={voucher.narration} onChange={e => setVoucher({...voucher, narration: e.target.value})} /></div>
              </div>
              <div className="flex-between mb-4"><strong>Entries (Dr = Cr)</strong><button className="btn btn-secondary btn-sm" onClick={addEntry}>+ Entry</button></div>
              <div className="table-container mb-4">
                <table><thead><tr><th>Ledger</th><th>Debit</th><th>Credit</th><th>Narration</th><th></th></tr></thead>
                <tbody>{entries.map(e => <tr key={e.id}>
                  <td><Autocomplete options={ledgers.map(l => ({value: l.id, label: l.name}))} value={e.ledger_id} onChange={v => updateEntry(e.id, 'ledger_id', v)} placeholder="Select Ledger..." creatable={false} style={{ minWidth: 160 }} /></td>
                  <td><NumberInput style={{ width: 110 }} value={e.debit} onChange={v => updateEntry(e.id, 'debit', v === '' ? 0 : parseFloat(v) || 0)} /></td>
                  <td><NumberInput style={{ width: 110 }} value={e.credit} onChange={v => updateEntry(e.id, 'credit', v === '' ? 0 : parseFloat(v) || 0)} /></td>
                  <td><input className="form-input" value={e.narration} onChange={ev => updateEntry(e.id, 'narration', ev.target.value)} /></td>
                  <td><button className="btn btn-danger btn-xs" onClick={() => removeEntry(e.id)}>✕</button></td>
                </tr>)}</tbody></table>
              </div>
              <div className="flex-end" style={{ display: 'flex', justifyContent: 'flex-end', gap: 24 }}>
                <span>Total Debit: <strong className="text-green">{formatCurrency(entries.reduce((s, e) => s + (parseFloat(e.debit)||0), 0))}</strong></span>
                <span>Total Credit: <strong className="text-red">{formatCurrency(entries.reduce((s, e) => s + (parseFloat(e.credit)||0), 0))}</strong></span>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={saveVoucher}>💾 Save Voucher</button></div>
          </div>
        </div>
      )}

      <div className="card">
        <table><thead><tr><th>Voucher No</th><th>Type</th><th>Date</th><th>Amount</th><th>Narration</th></tr></thead>
        <tbody>{filtered.map(v => <tr key={v.id}><td><strong>{v.voucher_no}</strong></td><td><span className={`badge badge-${v.voucher_type.includes('Payment') ? 'danger' : v.voucher_type.includes('Receipt') ? 'success' : 'info'}`}>{v.voucher_type}</span></td><td>{v.date}</td><td className="fw-bold">{formatCurrency(v.total_amount)}</td><td className="text-muted">{v.narration || '-'}</td></tr>)}</tbody></table>
      </div>
    </div>
  );
}

function LedgerSection() {
  const { dbQuery, dbRun, addNotification, formatCurrency } = useContext(AppContext);
  const [ledgers, setLedgers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', group_name: 'Current Assets', opening_balance: 0 });

  const groups = ['Current Assets', 'Fixed Assets', 'Current Liabilities', 'Capital Account', 'Direct Income', 'Indirect Income', 'Direct Expenses', 'Indirect Expenses', 'Bank Account', 'Cash in Hand', 'Sales Account', 'Purchase Account', 'Sundry Debtors', 'Sundry Creditors', 'Duties & Taxes', 'Investments', 'Loans & Advances', 'Provisions'];

  useEffect(() => { dbQuery('SELECT * FROM ledgers ORDER BY name').then(setLedgers); }, []);

  const addLedger = async () => {
    if (!form.name) return;
    await dbRun('INSERT INTO ledgers (id,name,code,group_name,opening_balance) VALUES (?,?,?,?,?)', [crypto.randomUUID(), form.name, form.code, form.group_name, form.opening_balance]);
    addNotification('Ledger created', 'success');
    setShowForm(false);
    dbQuery('SELECT * FROM ledgers ORDER BY name').then(setLedgers);
  };

  return (
    <div>
      <div className="toolbar"><div className="toolbar-right"><button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New Ledger</button></div></div>
      {showForm && (
        <div className="card mb-4">
          <div className="form-row-4">
            <div className="form-group"><label className="form-label">Ledger Name</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Code</label><input className="form-input" value={form.code} onChange={e => setForm({...form, code: e.target.value})} /></div>
            <div className="form-group"><label className="form-label">Group</label><select className="form-input" value={form.group_name} onChange={e => setForm({...form, group_name: e.target.value})}>{groups.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Opening Balance</label><NumberInput value={form.opening_balance} onChange={v => setForm({...form, opening_balance: v === '' ? 0 : parseFloat(v) || 0})} /></div>
          </div>
          <button className="btn btn-primary mt-2" onClick={addLedger}>Save Ledger</button>
        </div>
      )}
      <div className="card">
        <table><thead><tr><th>Name</th><th>Code</th><th>Group</th><th>Opening Balance</th></tr></thead>
        <tbody>{ledgers.map(l => <tr key={l.id}><td><strong>{l.name}</strong></td><td>{l.code || '-'}</td><td><span className="badge badge-info">{l.group_name}</span></td><td className={l.opening_balance >= 0 ? 'text-green' : 'text-red'}>{formatCurrency(l.opening_balance)}</td></tr>)}</tbody></table>
      </div>
    </div>
  );
}

function TrialBalance() {
  const { dbQuery, formatCurrency } = useContext(AppContext);
  const [tb, setTb] = useState([]);
  const [totals, setTotals] = useState({ dr: 0, cr: 0 });

  useEffect(() => {
    loadTB();
  }, []);

  const loadTB = async () => {
    const ledgers = await dbQuery('SELECT * FROM ledgers');
    const entries = await dbQuery('SELECT te.*, l.name as ledger_name, l.group_name FROM transaction_entries te JOIN ledgers l ON te.ledger_id=l.id');

    const tbData = ledgers.map(l => {
      const le = entries.filter(e => e.ledger_id === l.id);
      const debit = le.reduce((s, e) => s + (e.debit || 0), 0) + (l.opening_balance > 0 ? l.opening_balance : 0);
      const credit = le.reduce((s, e) => s + (e.credit || 0), 0) + (l.opening_balance < 0 ? Math.abs(l.opening_balance) : 0);
      const balance = debit - credit;
      return { name: l.name, group: l.group_name, debit: balance > 0 ? balance : 0, credit: balance < 0 ? Math.abs(balance) : 0 };
    });

    setTb(tbData);
    setTotals({ dr: tbData.reduce((s, l) => s + l.debit, 0), cr: tbData.reduce((s, l) => s + l.credit, 0) });
  };

  return (
    <div className="card">
      <div className="card-header"><div className="card-title">⚖️ Trial Balance</div><span className={Math.abs(totals.dr - totals.cr) < 0.01 ? 'badge badge-success' : 'badge badge-danger'}>{Math.abs(totals.dr - totals.cr) < 0.01 ? '✅ Balanced' : '❌ Unbalanced'}</span></div>
      <table><thead><tr><th>Account</th><th>Group</th><th>Debit</th><th>Credit</th></tr></thead>
      <tbody>{tb.map((l, i) => <tr key={i}><td>{l.name}</td><td><span className="badge badge-info">{l.group}</span></td><td className="text-green">{l.debit > 0 ? formatCurrency(l.debit) : '-'}</td><td className="text-red">{l.credit > 0 ? formatCurrency(l.credit) : '-'}</td></tr>)}
        <tr style={{ borderTop: '2px solid #f59e0b' }}><td><strong>Total</strong></td><td></td><td><strong className="text-green">{formatCurrency(totals.dr)}</strong></td><td><strong className="text-red">{formatCurrency(totals.cr)}</strong></td></tr>
      </tbody></table>
    </div>
  );
}

function PLAccount() {
  const { dbQuery, formatCurrency } = useContext(AppContext);
  const [pl, setPl] = useState({ income: 0, expenses: 0, profit: 0 });

  useEffect(() => {
    (async () => {
      const income = await dbQuery("SELECT COALESCE(SUM(total_amount),0) as total FROM transactions WHERE voucher_type IN ('Sale_Retail','Sale_Wholesale') AND strftime('%Y-%m',date)=strftime('%Y-%m','now')");
      const expenses = await dbQuery("SELECT COALESCE(SUM(total_amount),0) as total FROM transactions WHERE voucher_type='Purchase' AND strftime('%Y-%m',date)=strftime('%Y-%m','now')");
      setPl({ income: income[0]?.total || 0, expenses: expenses[0]?.total || 0, profit: (income[0]?.total || 0) - (expenses[0]?.total || 0) });
    })();
  }, []);

  return (
    <div className="grid-2">
      <div className="card"><div className="card-header"><div className="card-title">💰 Income</div></div><div className="stat-value text-green">{formatCurrency(pl.income)}</div><div className="stat-label">Monthly Sales</div></div>
      <div className="card"><div className="card-header"><div className="card-title">💸 Expenses</div></div><div className="stat-value text-red">{formatCurrency(pl.expenses)}</div><div className="stat-label">Monthly Purchases</div></div>
      <div className="card" style={{ gridColumn: '1/-1' }}>
        <div className="card-header"><div className="card-title">📈 Profit & Loss Summary</div></div>
        <div className="grid-3" style={{ textAlign: 'center' }}>
          <div><div className="stat-label">Income</div><div className="stat-value text-green">{formatCurrency(pl.income)}</div></div>
          <div><div className="stat-label">Expenses</div><div className="stat-value text-red">{formatCurrency(pl.expenses)}</div></div>
          <div><div className="stat-label">Net {pl.profit >= 0 ? 'Profit' : 'Loss'}</div><div className="stat-value" style={{ color: pl.profit >= 0 ? '#22c55e' : '#ef4444' }}>{formatCurrency(Math.abs(pl.profit))}</div></div>
        </div>
      </div>
    </div>
  );
}

function BalanceSheet() {
  const { dbQuery, formatCurrency } = useContext(AppContext);
  const [bs, setBs] = useState({ assets: 0, liabilities: 0, equity: 0 });

  useEffect(() => {
    (async () => {
      const ledgers = await dbQuery('SELECT * FROM ledgers');
      const entries = await dbQuery('SELECT te.*, l.name, l.group_name FROM transaction_entries te JOIN ledgers l ON te.ledger_id=l.id');
      const assetGroups = ['Current Assets', 'Fixed Assets', 'Bank Account', 'Cash in Hand', 'Sundry Debtors', 'Investments', 'Loans & Advances'];
      const liabilityGroups = ['Current Liabilities', 'Capital Account', 'Sundry Creditors', 'Duties & Taxes', 'Provisions'];

      let assets = 0, liabilities = 0;
      ledgers.forEach(l => {
        const le = entries.filter(e => e.ledger_id === l.id);
        const bal = le.reduce((s, e) => s + (e.debit || 0) - (e.credit || 0), 0) + l.opening_balance;
        if (assetGroups.includes(l.group_name)) assets += bal;
        if (liabilityGroups.includes(l.group_name)) liabilities += Math.abs(bal);
      });
      setBs({ assets, liabilities, equity: assets - liabilities });
    })();
  }, []);

  return (
    <div className="grid-2">
      <div className="card"><div className="card-header"><div className="card-title">🏢 Assets</div></div><div className="stat-value text-green">{formatCurrency(bs.assets)}</div></div>
      <div className="card"><div className="card-header"><div className="card-title">📋 Liabilities</div></div><div className="stat-value text-red">{formatCurrency(bs.liabilities)}</div></div>
      <div className="card" style={{ gridColumn: '1/-1' }}>
        <div className="card-header"><div className="card-title">📊 Balance Sheet Summary</div></div>
        <div className="grid-3" style={{ textAlign: 'center' }}>
          <div><div className="stat-label">Total Assets</div><div className="stat-value text-green">{formatCurrency(bs.assets)}</div></div>
          <div><div className="stat-label">Total Liabilities</div><div className="stat-value text-red">{formatCurrency(bs.liabilities)}</div></div>
          <div><div className="stat-label">Net Worth</div><div className="stat-value text-gold">{formatCurrency(bs.equity)}</div></div>
        </div>
      </div>
    </div>
  );
}

function CashFlow() {
  const { dbQuery, formatCurrency } = useContext(AppContext);
  const [flow, setFlow] = useState({ inflows: 0, outflows: 0, net: 0 });

  useEffect(() => {
    (async () => {
      const inflows = await dbQuery("SELECT COALESCE(SUM(total_amount),0) as total FROM transactions WHERE voucher_type IN ('Receipt','Bank_Receipt','Sale_Retail','Sale_Wholesale') AND strftime('%Y-%m',date)=strftime('%Y-%m','now')");
      const outflows = await dbQuery("SELECT COALESCE(SUM(total_amount),0) as total FROM transactions WHERE voucher_type IN ('Payment','Bank_Payment','Purchase') AND strftime('%Y-%m',date)=strftime('%Y-%m','now')");
      setFlow({ inflows: inflows[0]?.total || 0, outflows: outflows[0]?.total || 0, net: (inflows[0]?.total || 0) - (outflows[0]?.total || 0) });
    })();
  }, []);

  return (
    <div className="grid-2">
      <div className="card"><div className="card-header"><div className="card-title">📥 Inflows</div></div><div className="stat-value text-green">{formatCurrency(flow.inflows)}</div></div>
      <div className="card"><div className="card-header"><div className="card-title">📤 Outflows</div></div><div className="stat-value text-red">{formatCurrency(flow.outflows)}</div></div>
      <div className="card" style={{ gridColumn: '1/-1' }}><div className="card-header"><div className="card-title">💵 Net Cash Flow</div></div><div className="stat-value" style={{ color: flow.net >= 0 ? '#22c55e' : '#ef4444' }}>{formatCurrency(flow.net)}</div></div>
    </div>
  );
}
