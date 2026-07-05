const { getOfflineDB } = require('./offline');

const AUDIT_TABLES = [
  'items', 'parties', 'transactions', 'sale_invoice_items', 'transaction_entries',
  'karagir_transactions', 'metal_rates', 'categories', 'ledgers', 'employees',
  'gold_saving_schemes', 'scheme_installments', 'girvi_pledges',
  'girvi_interest_history', 'girvi_receipts', 'work_orders', 'work_order_jobs',
  'quotations', 'customer_visits', 'alerts', 'user_permissions', 'barcodes',
  'trays', 'payment_schedule', 'huid_history', 'users', 'companies'
];

function logAudit(tableName, action, recordId, sql, params) {
  if (!AUDIT_TABLES.includes(tableName)) return;
  const db = getOfflineDB();
  if (!db) return;
  try {
    const id = require('crypto').randomUUID();
    db._raw.prepare(
      `INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, old_value, new_value, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).run(id, 'system', `${action}_${tableName}`, tableName, recordId || null, sql.slice(0, 500), JSON.stringify(params).slice(0, 1000));
  } catch(e) {}
}

module.exports = { logAudit };
