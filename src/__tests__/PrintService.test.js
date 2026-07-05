import { PrintService, generateA4ReceiptHTML } from '../renderer/utils/PrintService';

describe('PrintService', () => {
  test('generateReceiptHTML produces HTML string', () => {
    const invoice = { voucher_no: 'SALE-260001', total_amount: 1000, date: '2026-01-15' };
    const items = [{ name: 'Gold Ring', weight: 10, qty: 1, rate: 1000, amount: 1000 }];
    const result = PrintService.generateReceiptHTML(invoice, items, {}, false);
    expect(result).toContain('SALE-260001');
    expect(result).toContain('Gold Ring');
    expect(result).toContain('1,000');
    expect(result).toContain('</html>');
  });

  test('generateA4ReceiptHTML produces full page HTML', () => {
    const invoice = { voucher_no: 'SALE-260001', total_amount: 1000, date: '2026-01-15' };
    const items = [{ name: 'Gold Ring', weight: 10, qty: 1, rate: 1000, amount: 1000 }];
    const result = generateA4ReceiptHTML(invoice, items, {}, false);
    expect(result).toContain('SALE-260001');
    expect(result).toContain('</html>');
  });

  test('generateReceiptHTML shows GST section when isGst=true', () => {
    const invoice = { voucher_no: 'SALE-260001', total_amount: 1000, gst_amount: 50, date: '2026-01-15' };
    const items = [{ name: 'Gold Ring', weight: 10, qty: 1, rate: 1000, amount: 1000 }];
    const result = PrintService.generateReceiptHTML(invoice, items, {}, true);
    expect(result).toContain('CGST');
    expect(result).toContain('SGST');
    expect(result).toContain('25');
  });

  test('generateBarcodeHTML creates sticker grid', () => {
    const items = [{ barcode: '123456', selling_price: 500 }];
    const settings = { stickerWidth: 66, stickerHeight: 10, columns: 1, gap: 1 };
    const result = PrintService.generateBarcodeHTML(items, settings);
    expect(result).toContain('123456');
    expect(result).toContain('sticker-grid');
  });
});
