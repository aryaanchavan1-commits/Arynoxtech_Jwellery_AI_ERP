(function() {
  let db = null;
  let rawDb = null;

  function wrapDatabase(raw) {
    return {
      _raw: raw,
      run(sql, params = []) {
        try {
          if (params.length > 0) {
            const stmt = raw.prepare(sql);
            stmt.bind(params);
            stmt.step();
            stmt.free();
          } else {
            raw.run(sql);
          }
          return { changes: raw.getRowsModified() };
        } catch (err) {
          console.error('SQL run error:', sql.slice(0, 80), err.message);
          return { changes: 0 };
        }
      },
      get(sql, params = []) {
        try {
          const stmt = raw.prepare(sql);
          if (params.length > 0) stmt.bind(params);
          if (stmt.step()) {
            const result = stmt.getAsObject();
            stmt.free();
            return result;
          }
          stmt.free();
          return null;
        } catch (err) {
          console.error('SQL get error:', err.message);
          return null;
        }
      },
      all(sql, params = []) {
        try {
          const stmt = raw.prepare(sql);
          if (params.length > 0) stmt.bind(params);
          const results = [];
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return results;
        } catch (err) {
          console.error('SQL all error:', err.message);
          return [];
        }
      },
      exec(sql) {
        try {
          raw.exec(sql);
          return { changes: raw.getRowsModified() };
        } catch (err) {
          console.error('SQL exec error:', err.message);
          return { changes: 0 };
        }
      },
      export() { return raw.export(); },
      getRowsModified() { return raw.getRowsModified(); }
    };
  }

  function saveToIndexedDB() {
    if (!db) return;
    try {
      const data = db.export();
      const buf = new Uint8Array(data);
      const req = indexedDB.open('JwelleryDB', 1);
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains('dbstore'))
          d.createObjectStore('dbstore');
      };
      req.onsuccess = (e) => {
        const d = e.target.result;
        const tx = d.transaction('dbstore', 'readwrite');
        tx.objectStore('dbstore').put(buf, 'database');
        tx.oncomplete = () => d.close();
      };
      req.onerror = () => {};
    } catch (err) {
      console.error('Failed to save DB:', err.message);
    }
  }

  async function initDB() {
    try {
      if (typeof initSqlJs === 'undefined') {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/sql.js@1.11.0/dist/sql-wasm.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      const SQL = await initSqlJs({
        locateFile: file => `https://cdn.jsdelivr.net/npm/sql.js@1.11.0/dist/${file}`
      });

      let buffer = null;
      try {
        const req = await new Promise((resolve, reject) => {
          const r = indexedDB.open('JwelleryDB', 1);
          r.onupgradeneeded = (e) => {
            const d = e.target.result;
            if (!d.objectStoreNames.contains('dbstore'))
              d.createObjectStore('dbstore');
          };
          r.onsuccess = (e) => resolve(e.target.result);
          r.onerror = (e) => reject(e);
        });
        const tx = req.transaction('dbstore', 'readonly');
        const stored = await new Promise((resolve, reject) => {
          const get = tx.objectStore('dbstore').get('database');
          get.onsuccess = () => resolve(get.result);
          get.onerror = () => reject(get.error);
        });
        if (stored) buffer = stored;
      } catch (e) {}

      rawDb = new SQL.Database(buffer);
      rawDb.run('PRAGMA foreign_keys = ON');
      rawDb.run('PRAGMA journal_mode = MEMORY');
      db = wrapDatabase(rawDb);

      setInterval(saveToIndexedDB, 10000);

      const tables = [
        `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL, display_name TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS companies (id TEXT PRIMARY KEY, name TEXT NOT NULL, gstin TEXT, address TEXT, phone TEXT, email TEXT, is_black_account INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS metal_rates (id TEXT PRIMARY KEY, metal_type TEXT NOT NULL, purity TEXT NOT NULL, rate_24k REAL, rate_22k REAL, rate_18k REAL, rate_per_gram REAL NOT NULL, rate_date DATE NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, parent_id TEXT, type TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, category_id TEXT, metal_type TEXT, purity TEXT, weight REAL, stone_weight REAL, net_weight REAL, making_charges REAL DEFAULT 0, wastage_percent REAL DEFAULT 0, cost_price REAL, selling_price REAL, barcode TEXT UNIQUE, tray_no TEXT, shelf_no TEXT, location TEXT, current_qty REAL DEFAULT 0, min_qty REAL DEFAULT 0, is_tagged INTEGER DEFAULT 1, status TEXT DEFAULT 'active', is_black_account INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS parties (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL, gstin TEXT, phone TEXT, email TEXT, address TEXT, opening_balance REAL DEFAULT 0, credit_limit REAL DEFAULT 0, is_black_account INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS ledgers (id TEXT PRIMARY KEY, name TEXT NOT NULL, code TEXT UNIQUE, group_name TEXT NOT NULL, opening_balance REAL DEFAULT 0, is_black_account INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, voucher_no TEXT NOT NULL, voucher_type TEXT NOT NULL, date DATE NOT NULL, party_id TEXT, narration TEXT, total_amount REAL DEFAULT 0, gold_weight REAL DEFAULT 0, payment_mode TEXT DEFAULT 'Cash', is_black_account INTEGER DEFAULT 0, status TEXT DEFAULT 'active', created_by TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS transaction_entries (id TEXT PRIMARY KEY, transaction_id TEXT NOT NULL, ledger_id TEXT, item_id TEXT, party_id TEXT, debit REAL DEFAULT 0, credit REAL DEFAULT 0, weight REAL, qty REAL DEFAULT 0, rate REAL DEFAULT 0, amount REAL DEFAULT 0, narration TEXT)`,
        `CREATE TABLE IF NOT EXISTS sale_invoice_items (id TEXT PRIMARY KEY, transaction_id TEXT NOT NULL, item_id TEXT NOT NULL, barcode TEXT, weight REAL, stone_weight REAL, net_weight REAL, purity TEXT, rate REAL, making_charges REAL, wastage_charges REAL, discount REAL DEFAULT 0, amount REAL, old_exchange_weight REAL DEFAULT 0, old_exchange_value REAL DEFAULT 0)`,
        `CREATE TABLE IF NOT EXISTS karagir_transactions (id TEXT PRIMARY KEY, transaction_id TEXT NOT NULL, karagir_id TEXT NOT NULL, type TEXT NOT NULL, gold_given_weight REAL DEFAULT 0, gold_received_weight REAL DEFAULT 0, stone_given_weight REAL DEFAULT 0, stone_received_weight REAL DEFAULT 0, wastage_weight REAL DEFAULT 0, making_charges REAL DEFAULT 0, amount REAL DEFAULT 0, status TEXT DEFAULT 'pending', due_date DATE)`,
        `CREATE TABLE IF NOT EXISTS payment_schedule (id TEXT PRIMARY KEY, transaction_id TEXT NOT NULL, due_date DATE NOT NULL, amount REAL NOT NULL, paid_amount REAL DEFAULT 0, balance REAL DEFAULT 0, status TEXT DEFAULT 'pending')`,
        `CREATE TABLE IF NOT EXISTS financial_years (id TEXT PRIMARY KEY, name TEXT NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL, is_closed INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, user_id TEXT, action TEXT NOT NULL, entity_type TEXT, entity_id TEXT, old_value TEXT, new_value TEXT, ip_address TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS barcodes (id TEXT PRIMARY KEY, item_id TEXT NOT NULL, barcode TEXT UNIQUE NOT NULL, is_printed INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS trays (id TEXT PRIMARY KEY, name TEXT NOT NULL, shelf_no TEXT, location TEXT, capacity INTEGER, current_count INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS employees (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, type TEXT, phone TEXT, email TEXT, commission_percent REAL DEFAULT 0, salary REAL DEFAULT 0, is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS gold_saving_schemes (id TEXT PRIMARY KEY, customer_id TEXT NOT NULL, scheme_name TEXT NOT NULL, monthly_amount REAL NOT NULL, total_months INTEGER NOT NULL, start_date DATE NOT NULL, end_date DATE, total_paid REAL DEFAULT 0, maturity_amount REAL, status TEXT DEFAULT 'active')`,
        `CREATE TABLE IF NOT EXISTS scheme_installments (id TEXT PRIMARY KEY, scheme_id TEXT NOT NULL, installment_no INTEGER NOT NULL, due_date DATE NOT NULL, paid_date DATE, amount REAL NOT NULL, paid_amount REAL DEFAULT 0, status TEXT DEFAULT 'pending')`,
        `CREATE TABLE IF NOT EXISTS voucher_sequences (id TEXT PRIMARY KEY, voucher_type TEXT NOT NULL UNIQUE, prefix TEXT NOT NULL, last_number INTEGER DEFAULT 0, fiscal_year TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
      ];
      const indexes = [
        `CREATE INDEX IF NOT EXISTS idx_items_code ON items(code)`,
        `CREATE INDEX IF NOT EXISTS idx_items_barcode ON items(barcode)`,
        `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)`,
        `CREATE INDEX IF NOT EXISTS idx_transactions_voucher ON transactions(voucher_type)`,
        `CREATE INDEX IF NOT EXISTS idx_parties_type ON parties(type)`
      ];
      const migrations = [
        `ALTER TABLE transactions ADD COLUMN payment_mode TEXT DEFAULT 'Cash'`,
      ];

      for (const sql of migrations) { try { db.run(sql); } catch (e) {} }
      for (const sql of tables) { try { db.run(sql); } catch (e) {} }
      for (const sql of indexes) { try { db.run(sql); } catch (e) {} }

      console.log('Web Demo: Database initialized successfully');
    } catch (err) {
      console.error('Web Demo: DB init error:', err);
    }
    return db;
  }

  window.__webDemoReady = initDB();

  window.electronAPI = {
    db: {
      all: async (sql, params) => {
        if (!db) await window.__webDemoReady;
        return db.all(sql, params);
      },
      get: async (sql, params) => {
        if (!db) await window.__webDemoReady;
        return db.get(sql, params);
      },
      run: async (sql, params) => {
        if (!db) await window.__webDemoReady;
        return db.run(sql, params);
      },
      exec: async (sql) => {
        if (!db) await window.__webDemoReady;
        return db.exec(sql);
      }
    },
    printer: {
      list: async () => [],
      print: async (html, opts) => {
        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); }
        return { success: true };
      },
      printSilent: async (html) => {
        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); }
        return { success: true };
      }
    },
    config: {
      get: async () => JSON.parse(localStorage.getItem('app_config') || '{}'),
      set: async (cfg) => { localStorage.setItem('app_config', JSON.stringify(cfg)); return { success: true }; }
    },
    app: {
      close: () => {}, minimize: () => {}, maximize: () => {}
    },
    dialog: {
      save: async () => ({ canceled: true }),
      open: async () => ({ canceled: true })
    },
    backup: {
      create: async () => ({ success: false }),
      restore: async () => ({ success: false })
    },
    ai: {
      chat: async () => ({ success: false, error: 'AI not available in web demo' }),
      models: async () => []
    },
    barcode: {
      preview: async () => ({ success: true })
    }
  };
})();
