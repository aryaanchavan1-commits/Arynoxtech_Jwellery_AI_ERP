const { getOfflineDB } = require('./offline');
const { logger } = require('./logger');

function seedDemoData() {
  const db = getOfflineDB();
  if (!db) return { success: false, error: 'DB not initialized' };

  try {
    const existing = db.get("SELECT COUNT(*) as cnt FROM items");
    if (existing && existing.cnt > 0) {
      return { success: false, error: 'Database already has data. Clear it first if you want to reload demo data.' };
    }

    const { randomUUID } = require('crypto');
    const now = new Date().toISOString().split('T')[0];

    const categories = [
      { id: randomUUID(), name: 'Gold Chains', type: 'product' },
      { id: randomUUID(), name: 'Gold Rings', type: 'product' },
      { id: randomUUID(), name: 'Gold Bangles', type: 'product' },
      { id: randomUUID(), name: 'Gold Earrings', type: 'product' },
      { id: randomUUID(), name: 'Silver Items', type: 'product' },
      { id: randomUUID(), name: 'Diamond Sets', type: 'product' },
    ];

    const catInsert = db._raw.prepare('INSERT INTO categories (id, name, type) VALUES (?, ?, ?)');
    for (const c of categories) catInsert.run(c.id, c.name, c.type);

    const items = [
      { id: randomUUID(), code: 'GC001', name: 'Gold Chain 22K 50g', category_id: categories[0].id, metal_type: 'Gold', purity: '22K', weight: 50, selling_price: 325000, cost_price: 310000, current_qty: 5, min_qty: 2, barcode: '890123456001' },
      { id: randomUUID(), code: 'GR001', name: 'Gold Ring 22K 10g', category_id: categories[1].id, metal_type: 'Gold', purity: '22K', weight: 10, selling_price: 65000, cost_price: 62000, current_qty: 15, min_qty: 5, barcode: '890123456002' },
      { id: randomUUID(), code: 'GB001', name: 'Gold Bangles 22K 40g Pair', category_id: categories[2].id, metal_type: 'Gold', purity: '22K', weight: 40, selling_price: 260000, cost_price: 248000, current_qty: 8, min_qty: 3, barcode: '890123456003' },
      { id: randomUUID(), code: 'GE001', name: 'Gold Earrings 18K 5g', category_id: categories[3].id, metal_type: 'Gold', purity: '18K', weight: 5, selling_price: 25000, cost_price: 23500, current_qty: 20, min_qty: 10, barcode: '890123456004' },
      { id: randomUUID(), code: 'SV001', name: 'Silver Coin 100g', category_id: categories[4].id, metal_type: 'Silver', purity: '999', weight: 100, selling_price: 8500, cost_price: 7800, current_qty: 50, min_qty: 20, barcode: '890123456005' },
      { id: randomUUID(), code: 'DM001', name: 'Diamond Necklace 18K', category_id: categories[5].id, metal_type: 'Gold', purity: '18K', weight: 15, selling_price: 450000, cost_price: 400000, current_qty: 3, min_qty: 1, barcode: '890123456006' },
    ];

    const itemInsert = db._raw.prepare(`INSERT INTO items (id, code, name, category_id, metal_type, purity, weight, selling_price, cost_price, current_qty, min_qty, barcode, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))`);
    for (const i of items) itemInsert.run(i.id, i.code, i.name, i.category_id, i.metal_type, i.purity, i.weight, i.selling_price, i.cost_price, i.current_qty, i.min_qty, i.barcode);

    const parties = [
      { id: randomUUID(), code: 'C001', name: 'Rajesh Jewelers', type: 'Customer', phone: '9876543210', address: 'Mumbai, Maharashtra', gstin: '27ABCDE1234F1Z5', opening_balance: 50000 },
      { id: randomUUID(), code: 'C002', name: 'Priya Gold House', type: 'Customer', phone: '9876543211', address: 'Pune, Maharashtra', gstin: '27FGHIJ5678K2L1', opening_balance: 25000 },
      { id: randomUUID(), code: 'S001', name: 'Mumbai Bullion Co.', type: 'Supplier', phone: '9876543212', address: 'Zaveri Bazaar, Mumbai', gstin: '27MNOPQ9012R3S1', opening_balance: 0 },
      { id: randomUUID(), code: 'C003', name: 'Walk-in Customer', type: 'Customer', phone: '', address: '', gstin: '', opening_balance: 0 },
    ];

    const partyInsert = db._raw.prepare(`INSERT INTO parties (id, code, name, type, phone, address, gstin, opening_balance, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`);
    for (const p of parties) partyInsert.run(p.id, p.code, p.name, p.type, p.phone, p.address, p.gstin, p.opening_balance);

    const rates = [
      { id: randomUUID(), metal_type: 'Gold', purity: '24K', rate_per_gram: 7500, rate_date: now },
      { id: randomUUID(), metal_type: 'Gold', purity: '22K', rate_per_gram: 7200, rate_date: now },
      { id: randomUUID(), metal_type: 'Gold', purity: '18K', rate_per_gram: 5800, rate_date: now },
      { id: randomUUID(), metal_type: 'Silver', purity: '999', rate_per_gram: 85, rate_date: now },
    ];

    const rateInsert = db._raw.prepare('INSERT INTO metal_rates (id, metal_type, purity, rate_per_gram, rate_date) VALUES (?, ?, ?, ?, ?)');
    for (const r of rates) rateInsert.run(r.id, r.metal_type, r.purity, r.rate_per_gram, r.rate_date);

    const ledgers = [
      { id: randomUUID(), name: 'Cash', code: 'CASH', group_name: 'Current Assets', opening_balance: 100000 },
      { id: randomUUID(), name: 'Sales Account', code: 'SALES', group_name: 'Revenue', opening_balance: 0 },
      { id: randomUUID(), name: 'Purchase Account', code: 'PURCH', group_name: 'Expenses', opening_balance: 0 },
      { id: randomUUID(), name: 'Capital Account', code: 'CAP', group_name: 'Capital', opening_balance: 500000 },
    ];

    const ledgerInsert = db._raw.prepare('INSERT INTO ledgers (id, name, code, group_name, opening_balance) VALUES (?, ?, ?, ?, ?)');
    for (const l of ledgers) ledgerInsert.run(l.id, l.name, l.code, l.group_name, l.opening_balance);

    const employees = [
      { id: randomUUID(), code: 'E001', name: 'Amit Sharma', type: 'Salesman', phone: '9876543201', commission_percent: 1.5, salary: 25000 },
      { id: randomUUID(), code: 'E002', name: 'Sneha Patel', type: 'Accountant', phone: '9876543202', salary: 30000 },
    ];

    const empInsert = db._raw.prepare('INSERT INTO employees (id, code, name, type, phone, commission_percent, salary, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)');
    for (const e of employees) empInsert.run(e.id, e.code, e.name, e.type, e.phone, e.commission_percent || 0, e.salary || 0);

    logger.info('SEED', 'Demo data seeded successfully', { items: items.length, parties: parties.length, categories: categories.length });
    return { success: true, counts: { items: items.length, parties: parties.length, categories: categories.length, ledgers: ledgers.length, employees: employees.length } };
  } catch (err) {
    logger.error('SEED', 'Seed failed', { error: err.message });
    return { success: false, error: err.message };
  }
}

module.exports = { seedDemoData };
