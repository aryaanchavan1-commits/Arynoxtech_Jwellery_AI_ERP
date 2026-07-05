const SEQUENCE_CONFIG = {
  'Sale_Retail': { prefix: 'SALE', pad: 4 },
  'Sale_Wholesale': { prefix: 'WS', pad: 4 },
  'Purchase': { prefix: 'PUR', pad: 4 },
  'Order': { prefix: 'ORD', pad: 4 },
  'Estimate': { prefix: 'EST', pad: 4 },
  'Repairing': { prefix: 'REP', pad: 4 },
  'Payment': { prefix: 'PAY', pad: 4 },
  'Receipt': { prefix: 'REC', pad: 4 },
  'Journal': { prefix: 'JRN', pad: 4 },
  'Contra': { prefix: 'CON', pad: 4 },
  'Karagir_Nave': { prefix: 'NAV', pad: 4 },
  'Karagir_Jama': { prefix: 'JAM', pad: 4 },
};

export const VoucherHelper = {
  async getNextNumber(dbRun, dbQuery, voucherType) {
    const config = SEQUENCE_CONFIG[voucherType];
    if (!config) return voucherType + '-' + Date.now().toString(36).toUpperCase();

    const fiscalYear = new Date().getFullYear().toString();
    let seq = await dbQuery("SELECT * FROM voucher_sequences WHERE voucher_type=? AND fiscal_year=?", [voucherType, fiscalYear]);

    if (seq.length === 0) {
      const maxExisting = await dbQuery("SELECT voucher_no FROM transactions WHERE voucher_type=? AND voucher_no LIKE ? ORDER BY voucher_no DESC LIMIT 1",
        [voucherType, config.prefix + '-%']);
      let startNum = 0;
      if (maxExisting.length > 0) {
        const parts = maxExisting[0].voucher_no.split('-');
        startNum = parseInt(parts[parts.length - 1]) || 0;
      }
      const id = crypto.randomUUID();
      await dbRun("INSERT INTO voucher_sequences (id, voucher_type, prefix, last_number, fiscal_year) VALUES (?,?,?,?,?)",
        [id, voucherType, config.prefix, startNum, fiscalYear]);
      seq = [{ id, last_number: startNum }];
    }

    const nextNum = (seq[0].last_number || 0) + 1;
    await dbRun("UPDATE voucher_sequences SET last_number=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", [nextNum, seq[0].id]);

    const year = fiscalYear.slice(2);
    const padded = String(nextNum).padStart(config.pad, '0');
    return `${config.prefix}-${year}${padded}`;
  },

  async resetNumberForDeleted(dbRun, dbQuery, voucherNo, voucherType) {
    const config = SEQUENCE_CONFIG[voucherType];
    if (!config) return;
    const fiscalYear = new Date().getFullYear().toString();
    const seq = await dbQuery("SELECT * FROM voucher_sequences WHERE voucher_type=? AND fiscal_year=?", [voucherType, fiscalYear]);
    if (seq.length > 0) {
      const parts = voucherNo.split('-');
      const num = parseInt(parts[parts.length - 1]);
      if (num && num === seq[0].last_number) {
        await dbRun("UPDATE voucher_sequences SET last_number=last_number-1, updated_at=CURRENT_TIMESTAMP WHERE id=?", [seq[0].id]);
      }
    }
  }
};
