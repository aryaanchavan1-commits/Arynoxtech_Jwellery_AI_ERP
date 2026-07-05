import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';

const JOB_TYPES = [
  'Casting', 'Setting', 'Polishing', 'Stone Setting',
  'Meena Work', 'Engraving', 'Hallmarking', 'Final Polish'
];

const STATUS_STYLES = {
  pending: 'badge-warning',
  in_progress: 'badge-info',
  completed: 'badge-success',
  delivered: 'badge-purple'
};

const PRIORITY_STYLES = {
  low: 'badge-cyan',
  normal: 'badge-info',
  high: 'badge-warning',
  urgent: 'badge-danger'
};

export default function JobTrackingModule() {
  const { setPageTitle } = useContext(AppContext);
  const [tab, setTab] = useState('dashboard');

  useEffect(() => { setPageTitle('Work Orders & Jobs'); }, []);

  const tabs = [
    { id: 'dashboard', label: 'Work Orders Dashboard', component: WorkOrdersDashboard },
    { id: 'new', label: 'New Work Order', component: NewWorkOrder },
    { id: 'jobs', label: 'Jobs Detail', component: JobsDetail },
    { id: 'karigar', label: 'Karigar Report', component: KarigarReport },
  ];

  const ActiveTab = tabs.find(t => t.id === tab)?.component;
  return (
    <div>
      <div className="tabs">
        {tabs.map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {ActiveTab && <ActiveTab />}
    </div>
  );
}

function WorkOrdersDashboard() {
  const { dbQuery, dbRun, formatCurrency, addNotification } = useContext(AppContext);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    const data = await dbQuery(`SELECT wo.*, p.name as customer_name, i.name as item_name, e.name as assigned_name
      FROM work_orders wo
      LEFT JOIN parties p ON wo.customer_id = p.id
      LEFT JOIN items i ON wo.item_id = i.id
      LEFT JOIN employees e ON wo.assigned_to = e.id
      ORDER BY wo.created_at DESC`);
    setOrders(data);
  };

  const updateStatus = async (id, status) => {
    await dbRun('UPDATE work_orders SET status=? WHERE id=?', [status, id]);
    addNotification(`Order status updated to ${status}`, 'success');
    loadOrders();
  };

  const deleteOrder = async (id) => {
    if (!confirm('Delete this work order? All associated jobs will be removed.')) return;
    await dbRun('DELETE FROM job_details WHERE work_order_id=?', [id]);
    await dbRun('DELETE FROM work_orders WHERE id=?', [id]);
    addNotification('Work order deleted', 'info');
    loadOrders();
  };

  const filtered = orders.filter(o =>
    o.order_no?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.item_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalCost = filtered.reduce((s, o) => s + (o.total_cost || 0), 0);

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon gold">📋</div>
          <div className="stat-content">
            <div className="stat-value">{orders.length}</div>
            <div className="stat-label">Total Orders</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div className="stat-content">
            <div className="stat-value">{orders.filter(o => o.status === 'completed').length}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan">🔄</div>
          <div className="stat-content">
            <div className="stat-value">{orders.filter(o => o.status === 'in_progress').length}</div>
            <div className="stat-label">In Progress</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon gold">💰</div>
          <div className="stat-content">
            <div className="stat-value">{formatCurrency(totalCost)}</div>
            <div className="stat-label">Total Cost</div>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <input className="search-input" placeholder="Search orders by no, customer, item..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Order No</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Item</th>
                <th>Description</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assigned To</th>
                <th>Due Date</th>
                <th>Total Cost</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11}>
                    <div className="empty-state">
                      <div className="empty-state-icon">📋</div>
                      <div className="empty-state-text">No work orders found</div>
                      <div className="empty-state-hint">Create a new work order to get started</div>
                    </div>
                  </td>
                </tr>
              )}
              {filtered.map(o => (
                <tr key={o.id}>
                  <td><strong className="text-gold">{o.order_no}</strong></td>
                  <td>{o.date?.slice(0, 10)}</td>
                  <td>{o.customer_name || '-'}</td>
                  <td>{o.item_name || '-'}</td>
                  <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.description || '-'}</td>
                  <td>
                    <select className={`badge ${STATUS_STYLES[o.status] || 'badge-info'}`}
                      value={o.status} onChange={e => updateStatus(o.id, e.target.value)}
                      style={{ border: 'none', cursor: 'pointer', fontSize: 11, padding: '2px 8px', appearance: 'auto' }}>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </td>
                  <td><span className={`badge ${PRIORITY_STYLES[o.priority] || 'badge-info'}`}>{o.priority || 'normal'}</span></td>
                  <td>{o.assigned_name || '-'}</td>
                  <td style={{ color: o.due_date && new Date(o.due_date) < new Date() && o.status !== 'delivered' ? '#ef4444' : 'inherit' }}>{o.due_date || '-'}</td>
                  <td className="fw-bold">{formatCurrency(o.total_cost)}</td>
                  <td>
                    <div className="btn-group">
                      <button className="btn btn-danger btn-xs" onClick={() => deleteOrder(o.id)} title="Delete">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function NewWorkOrder() {
  const { addNotification, dbQuery, dbRun, formatCurrency } = useContext(AppContext);
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    order_no: '', date: new Date().toISOString().split('T')[0], customer_id: '',
    item_id: '', description: '', priority: 'normal', assigned_to: '',
    due_date: '', charges: ''
  });
  const [savedOrderId, setSavedOrderId] = useState(null);
  const [savedOrderNo, setSavedOrderNo] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dbQuery("SELECT id, name FROM parties WHERE type IN ('Customer','Both') ORDER BY name"),
      dbQuery("SELECT id, name, code FROM items WHERE status='active' ORDER BY name"),
      dbQuery("SELECT id, name FROM employees WHERE is_active=1 OR is_active IS NULL ORDER BY name"),
      dbQuery("SELECT order_no FROM work_orders ORDER BY rowid DESC LIMIT 1")
    ]).then(([cust, itms, emp, last]) => {
      setCustomers(cust);
      setItems(itms);
      setEmployees(emp);
      const yr = new Date().getFullYear().toString().slice(-2);
      const lastNo = last.length > 0 ? parseInt(last[0].order_no?.split('-')[1] || '0', 10) : 0;
      const newSeq = String(lastNo + 1).padStart(4, '0');
      setForm(f => ({ ...f, order_no: `WO-${yr}${newSeq}` }));
      setLoading(false);
    });
  }, []);

  const handleSubmit = async () => {
    if (!form.customer_id || !form.item_id) {
      addNotification('Customer and Item are required', 'error');
      return;
    }
    const id = crypto.randomUUID();
    await dbRun(`INSERT INTO work_orders (id, order_no, date, customer_id, item_id, description, status, priority, assigned_to, due_date, total_cost)
      VALUES (?,?,?,?,?,?,'pending',?,?,?,?)`,
      [id, form.order_no, form.date, form.customer_id, form.item_id, form.description,
       form.priority, form.assigned_to, form.due_date, form.charges || 0]);
    addNotification(`Work Order ${form.order_no} created`, 'success');
    setSavedOrderId(id);
    setSavedOrderNo(form.order_no);
    setForm(f => ({
      ...f,
      order_no: '',
      description: '', priority: 'normal', assigned_to: '',
      due_date: '', charges: ''
    }));
    const yr = new Date().getFullYear().toString().slice(-2);
    const nextSeq = String(parseInt(form.order_no.split('-')[1] || '0', 10) + 1).padStart(4, '0');
    setForm(f => ({ ...f, order_no: `WO-${yr}${nextSeq}` }));
  };

  const resetForm = () => {
    setSavedOrderId(null);
    setSavedOrderNo('');
  };

  if (loading) return <div className="card"><div className="empty-state"><div className="empty-state-icon">⏳</div><div className="empty-state-text">Loading...</div></div></div>;

  return (
    <div>
      {!savedOrderId ? (
        <div className="card">
          <div className="section-title">New Work Order</div>
          <div className="form-row-4">
            <div className="form-group">
              <label className="form-label">Order No</label>
              <input className="form-input" value={form.order_no} disabled style={{ fontWeight: 600, color: '#f59e0b' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Customer *</label>
              <select className="form-input" value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})}>
                <option value="">Select Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Item *</label>
              <select className="form-input" value={form.item_id} onChange={e => setForm({...form, item_id: e.target.value})}>
                <option value="">Select Item</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.code})</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-input" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assigned To</label>
              <select className="form-input" value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})}>
                <option value="">Select Employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input type="date" className="form-input" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Charges (₹)</label>
              <input type="number" className="form-input" value={form.charges || ''} onChange={e => { const v = e.target.value; setForm({...form, charges: v === '' ? '' : parseFloat(v) || 0}); }} />
            </div>
          </div>
          <div className="card-footer">
            <button className="btn btn-primary" onClick={handleSubmit}>Create Work Order</button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <div className="empty-state-icon" style={{ fontSize: 64 }}>✅</div>
            <div className="empty-state-text" style={{ fontSize: 18, fontWeight: 600, color: '#22c55e' }}>Work Order Created</div>
            <div className="empty-state-text" style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b', margin: '8px 0' }}>{savedOrderNo}</div>
            <div className="empty-state-hint">You can now add jobs to this work order in the Jobs Detail tab</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={resetForm}>Create Another</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function JobsDetail() {
  const { addNotification, dbQuery, dbRun, formatCurrency, formatWeight } = useContext(AppContext);
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [jobs, setJobs] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editJob, setEditJob] = useState(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    job_type: 'Casting', description: '', assigned_to: '',
    weight_issued: '', weight_returned: '', wastage: '',
    cost: '', charges: '', started_date: '', completed_date: '', notes: ''
  });

  useEffect(() => {
    dbQuery(`SELECT wo.id, wo.order_no, p.name as customer_name FROM work_orders wo
      LEFT JOIN parties p ON wo.customer_id = p.id ORDER BY wo.created_at DESC`).then(data => {
      setOrders(data);
      setLoading(false);
    });
  }, []);

  const loadJobs = async (orderId) => {
    if (!orderId) { setJobs([]); return; }
    const data = await dbQuery(`SELECT jd.*, e.name as assigned_name FROM job_details jd
      LEFT JOIN employees e ON jd.assigned_to = e.id WHERE jd.work_order_id=? ORDER BY jd.rowid`, [orderId]);
    setJobs(data);
  };

  useEffect(() => { loadJobs(selectedOrderId); }, [selectedOrderId]);

  const handleSubmitJob = async () => {
    if (!form.job_type) { addNotification('Job type is required', 'error'); return; }
    const id = editJob?.id || crypto.randomUUID();
    const params = [
      selectedOrderId, form.job_type, form.description, 'pending', form.assigned_to,
      form.weight_issued, form.weight_returned, form.wastage, form.cost, form.charges,
      form.started_date, form.completed_date, form.notes
    ];
    if (editJob) {
      await dbRun(`UPDATE job_details SET job_type=?, description=?, assigned_to=?, weight_issued=?, weight_returned=?, wastage=?, cost=?, charges=?, started_date=?, completed_date=?, notes=? WHERE id=?`,
        [form.job_type, form.description, form.assigned_to, form.weight_issued, form.weight_returned,
         form.wastage, form.cost, form.charges, form.started_date, form.completed_date, form.notes, editJob.id]);
      addNotification('Job updated', 'success');
    } else {
      await dbRun(`INSERT INTO job_details (id, work_order_id, job_type, description, status, assigned_to, weight_issued, weight_returned, wastage, cost, charges, started_date, completed_date, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [id, ...params]);
      addNotification('Job added to work order', 'success');
    }
    setShowAddForm(false);
    setEditJob(null);
    resetJobForm();
    loadJobs(selectedOrderId);
    recalcOrderTotal();
  };

  const recalcOrderTotal = async () => {
    const total = await dbQuery('SELECT COALESCE(SUM(charges),0) as total FROM job_details WHERE work_order_id=?', [selectedOrderId]);
    if (total.length > 0) {
      await dbRun('UPDATE work_orders SET total_cost=? WHERE id=?', [total[0].total, selectedOrderId]);
    }
  };

  const resetJobForm = () => setForm({
    job_type: 'Casting', description: '', assigned_to: '',
    weight_issued: '', weight_returned: '', wastage: '',
    cost: '', charges: '', started_date: '', completed_date: '', notes: ''
  });

  const editJobHandler = (job) => {
    setEditJob(job);
    setForm({
      job_type: job.job_type, description: job.description || '', assigned_to: job.assigned_to || '',
      weight_issued: job.weight_issued || '', weight_returned: job.weight_returned || '',
      wastage: job.wastage || '', cost: job.cost || '', charges: job.charges || '',
      started_date: job.started_date || '', completed_date: job.completed_date || '', notes: job.notes || ''
    });
    setShowAddForm(true);
  };

  const updateJobStatus = async (jobId, status) => {
    const now = new Date().toISOString().split('T')[0];
    const updates = { status };
    if (status === 'in_progress') updates.started_date = now;
    if (status === 'completed') updates.completed_date = now;
    await dbRun(`UPDATE job_details SET status=?, started_date=COALESCE(started_date,?), completed_date=? WHERE id=?`,
      [status, status === 'in_progress' ? now : null, status === 'completed' ? now : null, jobId]);
    addNotification(`Job status updated to ${status}`, 'success');
    loadJobs(selectedOrderId);
  };

  const deleteJob = async (id) => {
    if (!confirm('Delete this job?')) return;
    await dbRun('DELETE FROM job_details WHERE id=?', [id]);
    addNotification('Job deleted', 'info');
    loadJobs(selectedOrderId);
    recalcOrderTotal();
  };

  if (loading) return <div className="card"><div className="empty-state"><div className="empty-state-icon">⏳</div><div className="empty-state-text">Loading orders...</div></div></div>;

  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  return (
    <div>
      <div className="card mb-4">
        <div className="form-row-4">
          <div className="form-group" style={{ gridColumn: 'span 3' }}>
            <label className="form-label">Select Work Order</label>
            <select className="form-input" value={selectedOrderId} onChange={e => setSelectedOrderId(e.target.value)}>
              <option value="">Choose a work order</option>
              {orders.map(o => (
                <option key={o.id} value={o.id}>{o.order_no} - {o.customer_name || 'N/A'}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-primary btn-block" disabled={!selectedOrderId} onClick={() => { setEditJob(null); resetJobForm(); setShowAddForm(true); }}>
              + Add Job
            </button>
          </div>
        </div>
      </div>

      {!selectedOrderId && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-text">Select a work order to view its jobs</div>
          </div>
        </div>
      )}

      {selectedOrderId && (
        <>
          {showAddForm && (
            <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
              <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-title">{editJob ? 'Edit Job' : 'Add New Job'} - {selectedOrder?.order_no}</div>
                  <button className="title-btn close" onClick={() => setShowAddForm(false)}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="section-title">Job Details</div>
                  <div className="form-row-4">
                    <div className="form-group">
                      <label className="form-label">Job Type</label>
                      <select className="form-input" value={form.job_type} onChange={e => setForm({...form, job_type: e.target.value})}>
                        {JOB_TYPES.map(jt => <option key={jt} value={jt}>{jt}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Assigned To</label>
                      <EmployeeSelect value={form.assigned_to} onChange={v => setForm({...form, assigned_to: v})} dbQuery={dbQuery} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Started Date</label>
                      <input type="date" className="form-input" value={form.started_date} onChange={e => setForm({...form, started_date: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Completed Date</label>
                      <input type="date" className="form-input" value={form.completed_date} onChange={e => setForm({...form, completed_date: e.target.value})} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea className="form-input" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                  </div>
                  <div className="section-title">Material Tracking</div>
                  <div className="form-row-4">
                    <div className="form-group">
                      <label className="form-label">Weight Issued (g)</label>
                      <input type="number" step="0.001" className="form-input" value={form.weight_issued || ''} onChange={e => { const v = e.target.value; setForm({...form, weight_issued: v === '' ? '' : parseFloat(v) || 0}); }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Weight Returned (g)</label>
                      <input type="number" step="0.001" className="form-input" value={form.weight_returned || ''} onChange={e => { const v = e.target.value; setForm({...form, weight_returned: v === '' ? '' : parseFloat(v) || 0}); }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Wastage (g)</label>
                      <input type="number" step="0.001" className="form-input" value={form.wastage || ''} onChange={e => { const v = e.target.value; setForm({...form, wastage: v === '' ? '' : parseFloat(v) || 0}); }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Cost (₹)</label>
                      <input type="number" className="form-input" value={form.cost || ''} onChange={e => { const v = e.target.value; setForm({...form, cost: v === '' ? '' : parseFloat(v) || 0}); }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Charges (₹)</label>
                      <input type="number" className="form-input" value={form.charges || ''} onChange={e => { const v = e.target.value; setForm({...form, charges: v === '' ? '' : parseFloat(v) || 0}); }} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSubmitJob}>{editJob ? 'Update Job' : 'Add Job'}</button>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <div className="card-title">Jobs for {selectedOrder?.order_no}</div>
              <span className="badge badge-info">{jobs.length} jobs</span>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Job Type</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Weight Issued</th>
                    <th>Weight Returned</th>
                    <th>Wastage</th>
                    <th>Cost</th>
                    <th>Charges</th>
                    <th>Started</th>
                    <th>Completed</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.length === 0 && (
                    <tr>
                      <td colSpan={12}>
                        <div className="empty-state">
                          <div className="empty-state-icon">🔧</div>
                          <div className="empty-state-text">No jobs added yet</div>
                          <div className="empty-state-hint">Click "Add Job" to add a job to this work order</div>
                        </div>
                      </td>
                    </tr>
                  )}
                  {jobs.map(j => (
                    <tr key={j.id}>
                      <td><span className="badge badge-gold">{j.job_type}</span></td>
                      <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.description || '-'}</td>
                      <td>
                        <select className={`badge ${STATUS_STYLES[j.status] || 'badge-warning'}`}
                          value={j.status} onChange={e => updateJobStatus(j.id, e.target.value)}
                          style={{ border: 'none', cursor: 'pointer', fontSize: 11, padding: '2px 8px', appearance: 'auto' }}>
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </td>
                      <td>{j.assigned_name || '-'}</td>
                      <td>{formatWeight(j.weight_issued)}</td>
                      <td>{formatWeight(j.weight_returned)}</td>
                      <td className={j.wastage > 0 ? 'text-red' : ''}>{formatWeight(j.wastage)}</td>
                      <td>{formatCurrency(j.cost)}</td>
                      <td className="fw-bold">{formatCurrency(j.charges)}</td>
                      <td style={{ fontSize: 11 }}>{j.started_date?.slice(0, 10) || '-'}</td>
                      <td style={{ fontSize: 11 }}>{j.completed_date?.slice(0, 10) || '-'}</td>
                      <td>
                        <div className="btn-group">
                          <button className="btn btn-secondary btn-xs" onClick={() => editJobHandler(j)} title="Edit">✏️</button>
                          <button className="btn btn-danger btn-xs" onClick={() => deleteJob(j.id)} title="Delete">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EmployeeSelect({ value, onChange, dbQuery }) {
  const [employees, setEmployees] = useState([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!loaded) {
      dbQuery("SELECT id, name FROM employees WHERE is_active=1 OR is_active IS NULL ORDER BY name").then(data => {
        setEmployees(data);
        setLoaded(true);
      });
    }
  }, [loaded]);
  return (
    <select className="form-input" value={value} onChange={e => onChange(e.target.value)}>
      <option value="">Select Employee</option>
      {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
    </select>
  );
}

function KarigarReport() {
  const { dbQuery, formatCurrency, formatWeight } = useContext(AppContext);
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    const data = await dbQuery(`SELECT
      jd.assigned_to, e.name as karigar_name,
      COUNT(jd.id) as total_jobs,
      COALESCE(SUM(jd.weight_issued), 0) as total_weight_issued,
      COALESCE(SUM(jd.weight_returned), 0) as total_weight_returned,
      COALESCE(SUM(jd.wastage), 0) as total_wastage,
      COALESCE(SUM(jd.charges), 0) as total_charges,
      COALESCE(AVG(jd.wastage), 0) as avg_wastage
      FROM job_details jd
      LEFT JOIN employees e ON jd.assigned_to = e.id
      WHERE jd.assigned_to IS NOT NULL AND jd.assigned_to != ''
      GROUP BY jd.assigned_to
      ORDER BY total_charges DESC`);
    setReport(data);
    setLoading(false);
  };

  const grandTotal = report.reduce((s, r) => ({
    weight_issued: s.weight_issued + r.total_weight_issued,
    weight_returned: s.weight_returned + r.total_weight_returned,
    wastage: s.wastage + r.total_wastage,
    charges: s.charges + r.total_charges
  }), { weight_issued: 0, weight_returned: 0, wastage: 0, charges: 0 });

  if (loading) return <div className="card"><div className="empty-state"><div className="empty-state-icon">⏳</div><div className="empty-state-text">Loading report...</div></div></div>;

  return (
    <div>
      <div className="card">
        <div className="section-title">Karigar Performance Report</div>
        {report.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-text">No karigar data available</div>
            <div className="empty-state-hint">Assign jobs to employees and track materials to see the report</div>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Karigar</th>
                  <th>Total Jobs</th>
                  <th>Weight Issued</th>
                  <th>Weight Returned</th>
                  <th>Wastage</th>
                  <th>Wastage %</th>
                  <th>Total Charges</th>
                </tr>
              </thead>
              <tbody>
                {report.map(r => {
                  const wastagePct = r.total_weight_issued > 0 ? ((r.total_wastage / r.total_weight_issued) * 100).toFixed(2) : 0;
                  return (
                    <tr key={r.assigned_to}>
                      <td><strong>{r.karigar_name || 'Unknown'}</strong></td>
                      <td><span className="badge badge-info">{r.total_jobs}</span></td>
                      <td>{formatWeight(r.total_weight_issued)}</td>
                      <td className="text-green">{formatWeight(r.total_weight_returned)}</td>
                      <td className={r.total_wastage > 0 ? 'text-red' : ''}>{formatWeight(r.total_wastage)}</td>
                      <td>
                        <span className={`badge ${parseFloat(wastagePct) > 5 ? 'badge-danger' : 'badge-success'}`}>
                          {wastagePct}%
                        </span>
                      </td>
                      <td className="fw-bold text-gold">{formatCurrency(r.total_charges)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot style={{ borderTop: '2px solid var(--border-color)' }}>
                <tr>
                  <td><strong>TOTAL</strong></td>
                  <td><strong>{report.reduce((s, r) => s + r.total_jobs, 0)}</strong></td>
                  <td><strong>{formatWeight(grandTotal.weight_issued)}</strong></td>
                  <td><strong className="text-green">{formatWeight(grandTotal.weight_returned)}</strong></td>
                  <td><strong className={grandTotal.wastage > 0 ? 'text-red' : ''}>{formatWeight(grandTotal.wastage)}</strong></td>
                  <td>
                    <strong>{grandTotal.weight_issued > 0 ? ((grandTotal.wastage / grandTotal.weight_issued) * 100).toFixed(2) : 0}%</strong>
                  </td>
                  <td><strong className="text-gold">{formatCurrency(grandTotal.charges)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
