const { getOfflineDB } = require('./offline');

function initSchema() {
  const db = getOfflineDB();
  if (!db) return;

  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      display_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      gstin TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      is_black_account INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS metal_rates (
      id TEXT PRIMARY KEY,
      metal_type TEXT NOT NULL,
      purity TEXT NOT NULL,
      rate_24k REAL,
      rate_22k REAL,
      rate_18k REAL,
      rate_per_gram REAL NOT NULL,
      rate_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT,
      type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category_id TEXT,
      metal_type TEXT,
      purity TEXT,
      weight REAL,
      stone_weight REAL,
      net_weight REAL,
      making_charges REAL DEFAULT 0,
      wastage_percent REAL DEFAULT 0,
      cost_price REAL,
      selling_price REAL,
      barcode TEXT UNIQUE,
      image_path TEXT,
      tray_no TEXT,
      shelf_no TEXT,
      location TEXT,
      current_qty REAL DEFAULT 0,
      min_qty REAL DEFAULT 0,
      is_tagged INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS parties (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      gstin TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      opening_balance REAL DEFAULT 0,
      credit_limit REAL DEFAULT 0,
      is_black_account INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS ledgers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE,
      group_name TEXT NOT NULL,
      opening_balance REAL DEFAULT 0,
      is_black_account INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      voucher_no TEXT NOT NULL,
      voucher_type TEXT NOT NULL,
      date DATE NOT NULL,
      party_id TEXT,
      narration TEXT,
      total_amount REAL DEFAULT 0,
      gold_weight REAL DEFAULT 0,
      payment_mode TEXT DEFAULT 'Cash',
      is_black_account INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS transaction_entries (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      ledger_id TEXT,
      item_id TEXT,
      party_id TEXT,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0,
      weight REAL,
      qty REAL DEFAULT 0,
      rate REAL DEFAULT 0,
      amount REAL DEFAULT 0,
      narration TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS sale_invoice_items (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      barcode TEXT,
      weight REAL,
      stone_weight REAL,
      net_weight REAL,
      purity TEXT,
      rate REAL,
      making_charges REAL,
      wastage_charges REAL,
      discount REAL DEFAULT 0,
      amount REAL,
      old_exchange_weight REAL DEFAULT 0,
      old_exchange_value REAL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS karagir_transactions (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      karagir_id TEXT NOT NULL,
      type TEXT NOT NULL,
      gold_given_weight REAL DEFAULT 0,
      gold_received_weight REAL DEFAULT 0,
      stone_given_weight REAL DEFAULT 0,
      stone_received_weight REAL DEFAULT 0,
      wastage_weight REAL DEFAULT 0,
      making_charges REAL DEFAULT 0,
      amount REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      due_date DATE
    )`,
    `CREATE TABLE IF NOT EXISTS payment_schedule (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      due_date DATE NOT NULL,
      amount REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      status TEXT DEFAULT 'pending'
    )`,
    `CREATE TABLE IF NOT EXISTS financial_years (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      is_closed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      old_value TEXT,
      new_value TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS barcodes (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      barcode TEXT UNIQUE NOT NULL,
      is_printed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS trays (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      shelf_no TEXT,
      location TEXT,
      capacity INTEGER,
      current_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT,
      phone TEXT,
      email TEXT,
      commission_percent REAL DEFAULT 0,
      salary REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS gold_saving_schemes (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      scheme_name TEXT NOT NULL,
      monthly_amount REAL NOT NULL,
      total_months INTEGER NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE,
      total_paid REAL DEFAULT 0,
      maturity_amount REAL,
      status TEXT DEFAULT 'active'
    )`,
    `CREATE TABLE IF NOT EXISTS scheme_installments (
      id TEXT PRIMARY KEY,
      scheme_id TEXT NOT NULL,
      installment_no INTEGER NOT NULL,
      due_date DATE NOT NULL,
      paid_date DATE,
      amount REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'pending'
    )`,
    `CREATE TABLE IF NOT EXISTS voucher_sequences (
      id TEXT PRIMARY KEY,
      voucher_type TEXT NOT NULL UNIQUE,
      prefix TEXT NOT NULL,
      last_number INTEGER DEFAULT 0,
      fiscal_year TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS hsn_codes (
      id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, description TEXT,
      gst_rate REAL NOT NULL, igst REAL DEFAULT 0, cgst REAL DEFAULT 0, sgst REAL DEFAULT 0, cess REAL DEFAULT 0,
      category_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS girvi_pledges (
      id TEXT PRIMARY KEY, pledge_no TEXT UNIQUE NOT NULL, customer_id TEXT NOT NULL,
      date DATE NOT NULL, item_description TEXT, weight REAL, purity TEXT,
      huids TEXT, loan_amount REAL NOT NULL, interest_rate REAL NOT NULL,
      interest_type TEXT DEFAULT 'simple', calendar_type TEXT DEFAULT 'english',
      valuation REAL, valuation_per_gram REAL, maturity_date DATE,
      status TEXT DEFAULT 'active', interest_received REAL DEFAULT 0,
      total_interest REAL DEFAULT 0, last_interest_date DATE,
      created_by TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS girvi_interest_history (
      id TEXT PRIMARY KEY, pledge_id TEXT NOT NULL,
      date DATE NOT NULL, amount REAL NOT NULL,
      type TEXT DEFAULT 'accrued', notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS girvi_receipts (
      id TEXT PRIMARY KEY, pledge_id TEXT NOT NULL,
      receipt_no TEXT UNIQUE NOT NULL, date DATE NOT NULL,
      amount REAL NOT NULL, type TEXT NOT NULL, notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS work_orders (
      id TEXT PRIMARY KEY, order_no TEXT UNIQUE NOT NULL,
      date DATE NOT NULL, customer_id TEXT, item_id TEXT,
      description TEXT, status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'normal', total_cost REAL DEFAULT 0,
      charges REAL DEFAULT 0, assigned_to TEXT,
      due_date DATE, completed_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS work_order_jobs (
      id TEXT PRIMARY KEY, work_order_id TEXT NOT NULL,
      job_type TEXT NOT NULL, description TEXT, status TEXT DEFAULT 'pending',
      assigned_to TEXT, material_issued TEXT, material_returned TEXT,
      weight_issued REAL DEFAULT 0, weight_returned REAL DEFAULT 0,
      wastage REAL DEFAULT 0, cost REAL DEFAULT 0, charges REAL DEFAULT 0,
      started_date DATE, completed_date DATE, notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS quotations (
      id TEXT PRIMARY KEY, quotation_no TEXT UNIQUE NOT NULL,
      date DATE NOT NULL, valid_until DATE,
      customer_id TEXT, customer_name TEXT, customer_phone TEXT,
      notes TEXT, items TEXT, total_amount REAL DEFAULT 0,
      gold_rate REAL DEFAULT 0, status TEXT DEFAULT 'active',
      created_by TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS customer_visits (
      id TEXT PRIMARY KEY, customer_id TEXT NOT NULL,
      visit_date DATE NOT NULL, visit_type TEXT DEFAULT 'walk_in',
      purpose TEXT, notes TEXT, referred_item TEXT,
      converted INTEGER DEFAULT 0, sale_amount REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY, alert_type TEXT NOT NULL,
      entity_type TEXT, entity_id TEXT, message TEXT,
      severity TEXT DEFAULT 'info', is_read INTEGER DEFAULT 0,
      created_by TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS user_permissions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
      module TEXT NOT NULL, can_view INTEGER DEFAULT 0,
      can_create INTEGER DEFAULT 0, can_edit INTEGER DEFAULT 0,
      can_delete INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS huid_history (
      id TEXT PRIMARY KEY, huid TEXT NOT NULL,
      pledge_id TEXT, action TEXT NOT NULL,
      date DATE NOT NULL, notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      action TEXT NOT NULL,
      data TEXT,
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced_at DATETIME
    )`,
    `CREATE INDEX IF NOT EXISTS idx_items_code ON items(code)`,
    `CREATE INDEX IF NOT EXISTS idx_items_barcode ON items(barcode)`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_voucher ON transactions(voucher_type)`,
    `CREATE INDEX IF NOT EXISTS idx_parties_type ON parties(type)`,
    `CREATE INDEX IF NOT EXISTS idx_girvi_customer ON girvi_pledges(customer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_girvi_status ON girvi_pledges(status)`,
    `CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status)`,
    `CREATE INDEX IF NOT EXISTS idx_visits_customer ON customer_visits(customer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_visits_date ON customer_visits(visit_date)`,
    `CREATE INDEX IF NOT EXISTS idx_alerts_read ON alerts(is_read)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id)`
  ];

  const migrations = [
    `ALTER TABLE transactions ADD COLUMN payment_mode TEXT DEFAULT 'Cash'`,
    `ALTER TABLE categories ADD COLUMN labour_charge REAL DEFAULT 0`,
    `ALTER TABLE categories ADD COLUMN wastage_percent REAL DEFAULT 0`,
    `ALTER TABLE transactions ADD COLUMN gst_amount REAL DEFAULT 0`,
    `ALTER TABLE transactions ADD COLUMN gst_rate REAL DEFAULT 0`,
    `ALTER TABLE transactions ADD COLUMN hsn_code TEXT`,
    `ALTER TABLE items ADD COLUMN hsn_code TEXT`,
    `ALTER TABLE items ADD COLUMN gst_rate REAL DEFAULT 0`,
  ];

  for (const sql of migrations) {
    try { db.run(sql); } catch (e) { /* column may already exist */ }
  }

  for (const sql of tables) {
    try {
      db.run(sql);
    } catch (err) {
      console.error('Schema init error:', err.message);
    }
  }

  console.log('Database schema initialized successfully');
}

module.exports = { initSchema };
