import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import Autocomplete, { PURITY_OPTIONS } from '../Common/Autocomplete';
import NumberInput from '../../utils/NumberInput';

export default function KaragirModule() {
  const { setPageTitle, formatCurrency, formatWeight, dbQuery, dbRun, addNotification } = useContext(AppContext);
  const [tab, setTab] = useState('nave');

  useEffect(() => { setPageTitle('Karagir Management'); }, []);

  const tabs = [
    { id: 'nave', label: '📤 Nave (Issue)', component: NaveSection },
    { id: 'jama', label: '📥 Jama (Receive)', component: JamaSection },
    { id: 'pending', label: '⏳ Pending', component: PendingSection },
    { id: 'report', label: '📊 Report', component: KaragirReport },
  ];

  const ActiveTab = tabs.find(t => t.id === tab)?.component;
  return (
    <div>
      <div className="tabs">{tabs.map(t => <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>
      {ActiveTab && <ActiveTab />}
    </div>
  );
}

function NaveSection() {
  const { addNotification, dbQuery, dbRun, formatCurrency, formatWeight } = useContext(AppContext);
  const [karagirs, setKaragirs] = useState([]);
  const [items, setItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({ karagir_id: '', date: new Date().toISOString().split('T')[0], gold_given: '', purity: '22K', stone_weight: '', expected_weight: '', making_charges: '', due_date: '', description: '' });

  useEffect(() => {
    dbQuery("SELECT * FROM parties WHERE type='Karagir' ORDER BY name").then(setKaragirs);
    dbQuery("SELECT * FROM items WHERE status='active' ORDER BY name").then(setItems);
    loadTransactions();
  }, []);

  const loadTransactions = () => {
    dbQuery(`SELECT kt.*, p.name as karagir_name FROM karagir_transactions kt LEFT JOIN parties p ON kt.karagir_id=p.id WHERE kt.type='Nave' ORDER BY kt.rowid DESC LIMIT 50`).then(setTransactions);
  };

  const submitNave = async () => {
    if (!form.karagir_id) { addNotification('Select karagir', 'error'); return; }
    const txId = crypto.randomUUID();
    await dbRun('INSERT INTO transactions (id,voucher_no,voucher_type,date,party_id,total_amount) VALUES (?,?,?,?,?,?)',
      [txId, 'NAVE-' + Date.now().toString(36).toUpperCase(), 'Karagir_Nave', form.date, form.karagir_id, form.making_charges]);
    await dbRun('INSERT INTO karagir_transactions (id,transaction_id,karagir_id,type,gold_given_weight,stone_given_weight,making_charges,due_date,status) VALUES (?,?,?,?,?,?,?,?,"pending")',
      [crypto.randomUUID(), txId, form.karagir_id, 'Nave', form.gold_given, form.stone_weight, form.making_charges, form.due_date]);
    addNotification('Nave issued to karagir', 'success');
    setForm({ karagir_id: '', date: new Date().toISOString().split('T')[0], gold_given: '', purity: '22K', stone_weight: '', expected_weight: '', making_charges: '', due_date: '', description: '' });
    loadTransactions();
  };

  return (
    <div>
      <div className="card mb-4">
        <div className="section-title">📤 Issue Gold to Karagir (Nave)</div>
        <div className="form-row-4">
          <div className="form-group"><label className="form-label">Karagir</label><Autocomplete options={karagirs.map(k => ({value: k.id, label: k.name}))} value={form.karagir_id} onChange={v => setForm({...form, karagir_id: v})} placeholder="Select Karagir" style={{ width: '100%' }} /></div>
          <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
          <div className="form-group"><label className="form-label">Gold Given (g)</label><NumberInput value={form.gold_given || ''} onChange={v => setForm({...form, gold_given: v})} placeholder="0" /></div>
          <div className="form-group"><label className="form-label">Purity</label><Autocomplete options={PURITY_OPTIONS} value={form.purity} onChange={v => setForm({...form, purity: v})} style={{ width: '100%' }} placeholder="Purity" creatable /></div>
          <div className="form-group"><label className="form-label">Stone Given (g)</label><NumberInput value={form.stone_weight || ''} onChange={v => setForm({...form, stone_weight: v})} placeholder="0" /></div>
          <div className="form-group"><label className="form-label">Expected Weight (g)</label><NumberInput value={form.expected_weight || ''} onChange={v => setForm({...form, expected_weight: v})} placeholder="0" /></div>
          <div className="form-group"><label className="form-label">Making Charges (₹)</label><NumberInput value={form.making_charges || ''} onChange={v => setForm({...form, making_charges: v})} placeholder="0" /></div>
          <div className="form-group"><label className="form-label">Due Date</label><input type="date" className="form-input" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} /></div>
        </div>
        <button className="btn btn-primary mt-2" onClick={submitNave}>📤 Issue Nave</button>
      </div>

      <div className="card">
        <table><thead><tr><th>Date</th><th>Karagir</th><th>Gold Given</th><th>Stone</th><th>Making Charges</th><th>Due Date</th><th>Status</th></tr></thead>
        <tbody>{transactions.map(t => <tr key={t.id}><td>{t.created_at?.slice(0,10)}</td><td><strong>{t.karagir_name}</strong></td><td>{formatWeight(t.gold_given_weight)}</td><td>{formatWeight(t.stone_given_weight)}</td><td>{formatCurrency(t.making_charges)}</td><td>{t.due_date || '-'}</td><td><span className="badge badge-warning">{t.status}</span></td></tr>)}</tbody></table>
      </div>
    </div>
  );
}

function JamaSection() {
  const { addNotification, dbQuery, dbRun, formatCurrency, formatWeight } = useContext(AppContext);
  const [karagirs, setKaragirs] = useState([]);
  const [naveItems, setNaveItems] = useState([]);
  const [form, setForm] = useState({ karagir_id: '', nave_id: '', date: new Date().toISOString().split('T')[0], gold_received: '', wastage: '', making_charges: '', amount: '' });

  useEffect(() => {
    dbQuery("SELECT * FROM parties WHERE type='Karagir' ORDER BY name").then(setKaragirs);
  }, []);

  const loadNaveItems = async (karagirId) => {
    if (!karagirId) return;
    setNaveItems(await dbQuery("SELECT kt.* FROM karagir_transactions kt WHERE kt.karagir_id=? AND kt.type='Nave' AND kt.status='pending'", [karagirId]));
  };

  const submitJama = async () => {
    if (!form.karagir_id) { addNotification('Select karagir', 'error'); return; }
    const txId = crypto.randomUUID();
    await dbRun('INSERT INTO transactions (id,voucher_no,voucher_type,date,party_id,total_amount) VALUES (?,?,?,?,?,?)',
      [txId, 'JAMA-' + Date.now().toString(36).toUpperCase(), 'Karagir_Jama', form.date, form.karagir_id, form.amount]);
    await dbRun('INSERT INTO karagir_transactions (id,transaction_id,karagir_id,type,gold_received_weight,wastage_weight,making_charges,amount,status) VALUES (?,?,?,?,?,?,?,?,"completed")',
      [crypto.randomUUID(), txId, form.karagir_id, 'Jama', form.gold_received, form.wastage, form.making_charges, form.amount]);
    if (form.nave_id) {
      await dbRun("UPDATE karagir_transactions SET status='completed' WHERE id=?", [form.nave_id]);
    }
    addNotification('Jama received from karagir', 'success');
  };

  return (
    <div className="card">
      <div className="section-title">📥 Receive from Karagir (Jama)</div>
      <div className="form-row-4">
        <div className="form-group"><label className="form-label">Karagir</label><Autocomplete options={karagirs.map(k => ({value: k.id, label: k.name}))} value={form.karagir_id} onChange={v => { setForm({...form, karagir_id: v}); loadNaveItems(v); }} placeholder="Select" style={{ width: '100%' }} /></div>
        <div className="form-group"><label className="form-label">Reference Nave</label><Autocomplete options={naveItems.map(n => ({value: n.id, label: `${n.id?.slice(0, 8)} (Given: ${formatWeight(n.gold_given_weight)})`}))} value={form.nave_id} onChange={v => setForm({...form, nave_id: v})} placeholder="Direct Receipt" style={{ width: '100%' }} /></div>
        <div className="form-group"><label className="form-label">Gold Received (g)</label><NumberInput value={form.gold_received || ''} onChange={v => setForm({...form, gold_received: v})} placeholder="0" /></div>
        <div className="form-group"><label className="form-label">Wastage (g)</label><NumberInput value={form.wastage || ''} onChange={v => setForm({...form, wastage: v})} placeholder="0" /></div>
        <div className="form-group"><label className="form-label">Making Charges (₹)</label><NumberInput value={form.making_charges || ''} onChange={v => setForm({...form, making_charges: v})} placeholder="0" /></div>
        <div className="form-group"><label className="form-label">Amount (₹)</label><NumberInput value={form.amount || ''} onChange={v => setForm({...form, amount: v})} placeholder="0" /></div>
      </div>
      <button className="btn btn-success mt-2" onClick={submitJama}>📥 Receive Jama</button>
    </div>
  );
}

function PendingSection() {
  const { dbQuery, formatCurrency, formatWeight } = useContext(AppContext);
  const [pending, setPending] = useState([]);
  useEffect(() => {
    dbQuery(`SELECT kt.*, p.name as karagir_name FROM karagir_transactions kt LEFT JOIN parties p ON kt.karagir_id=p.id WHERE kt.status='pending' ORDER BY kt.due_date ASC`).then(setPending);
  }, []);
  return (
    <div className="card">
      <table><thead><tr><th>Karagir</th><th>Type</th><th>Gold Given</th><th>Gold Received</th><th>Making Charges</th><th>Due Date</th><th>Status</th></tr></thead>
      <tbody>{pending.map(p => <tr key={p.id}><td><strong>{p.karagir_name}</strong></td><td><span className="badge badge-info">{p.type}</span></td><td>{formatWeight(p.gold_given_weight)}</td><td>{formatWeight(p.gold_received_weight)}</td><td>{formatCurrency(p.making_charges)}</td><td style={{ color: p.due_date && new Date(p.due_date) < new Date() ? '#ef4444' : 'inherit' }}>{p.due_date || '-'}</td><td><span className="badge badge-warning">Pending</span></td></tr>)}</tbody></table>
    </div>
  );
}

function KaragirReport() {
  const { dbQuery, formatCurrency, formatWeight } = useContext(AppContext);
  const [data, setData] = useState([]);
  useEffect(() => {
    dbQuery(`SELECT kt.*, p.name as karagir_name, t.voucher_no, t.date FROM karagir_transactions kt JOIN transactions t ON kt.transaction_id=t.id LEFT JOIN parties p ON kt.karagir_id=p.id ORDER BY t.date DESC`).then(setData);
  }, []);
  return (
    <div className="card">
      <table><thead><tr><th>Date</th><th>Karagir</th><th>Type</th><th>Gold Given</th><th>Gold Received</th><th>Wastage</th><th>Making Charges</th><th>Amount</th><th>Status</th></tr></thead>
      <tbody>{data.map(r => <tr key={r.id}><td>{r.date}</td><td><strong>{r.karagir_name}</strong></td><td><span className={`badge ${r.type === 'Nave' ? 'badge-info' : 'badge-success'}`}>{r.type}</span></td><td>{formatWeight(r.gold_given_weight)}</td><td>{formatWeight(r.gold_received_weight)}</td><td>{formatWeight(r.wastage_weight)}</td><td>{formatCurrency(r.making_charges)}</td><td>{formatCurrency(r.amount)}</td><td><span className={`badge ${r.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>{r.status}</span></td></tr>)}</tbody></table>
    </div>
  );
}
