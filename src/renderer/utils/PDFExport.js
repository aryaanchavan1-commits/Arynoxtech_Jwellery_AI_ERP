import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export function exportInvoiceToPDF(invoice, lineItems, company = {}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text(company.companyName || 'Arynoxtech Jwellery', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(10);
  if (company.address) doc.text(company.address, pageWidth / 2, 28, { align: 'center' });
  if (company.phone) doc.text('Ph: ' + company.phone, pageWidth / 2, 34, { align: 'center' });
  if (company.gstin) doc.text('GSTIN: ' + company.gstin, pageWidth / 2, 40, { align: 'center' });

  doc.setFontSize(14);
  doc.text('TAX INVOICE', pageWidth / 2, 50, { align: 'center' });

  doc.setFontSize(10);
  doc.text('Invoice No: ' + (invoice.voucher_no || ''), 14, 60);
  doc.text('Date: ' + (invoice.date || ''), pageWidth - 14, 60, { align: 'right' });
  doc.text('Customer: ' + (invoice.party_name || 'Walk-in'), 14, 66);
  if (invoice.gstin) doc.text('GSTIN: ' + invoice.gstin, pageWidth - 14, 66, { align: 'right' });

  const tableBody = lineItems.map((item, i) => [
    i + 1,
    item.name || 'Item',
    item.purity || '',
    (item.weight || 0).toFixed(3),
    (item.qty || 1).toFixed(2),
    formatNum(item.rate || 0),
    formatNum(item.making_charges || 0),
    formatNum(item.amount || 0)
  ]);

  doc.autoTable({
    startY: 74,
    head: [['#', 'Item', 'Purity', 'Weight', 'Qty', 'Rate', 'Making', 'Amount']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [50, 50, 50], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 15, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 25, halign: 'right' },
    },
  });

  const finalY = doc.lastAutoTable.finalY + 10;
  const gstAmt = invoice.gst_amount || 0;
  const total = gstAmt > 0 ? (invoice.total_amount || 0) + gstAmt : (invoice.total_amount || 0);

  doc.setFontSize(10);
  doc.text('Total Weight: ' + (invoice.gold_weight || 0).toFixed(3) + ' g', 14, finalY);
  doc.text('Total: ' + formatNum(total), pageWidth - 14, finalY, { align: 'right' });

  if (gstAmt > 0) {
    doc.text('CGST: ' + formatNum(gstAmt / 2), pageWidth - 14, finalY + 6, { align: 'right' });
    doc.text('SGST: ' + formatNum(gstAmt / 2), pageWidth - 14, finalY + 12, { align: 'right' });
    doc.text('Total GST: ' + formatNum(gstAmt), pageWidth - 14, finalY + 18, { align: 'right' });
  }

  doc.text('Payment Mode: ' + (invoice.payment_mode || 'Cash'), 14, finalY + 30);
  doc.text('Net Amount: ' + formatNum(total), pageWidth - 14, finalY + 30, { align: 'right' });

  doc.setFontSize(8);
  doc.text('Terms & Conditions:', 14, finalY + 44);
  doc.text('1. All disputes subject to local jurisdiction.', 14, finalY + 50);
  doc.text('2. Goods once sold will not be taken back.', 14, finalY + 56);
  doc.text('3. This is a computer generated invoice.', 14, finalY + 62);

  doc.save('Invoice_' + (invoice.voucher_no || 'unknown') + '.pdf');
}

function formatNum(n) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n || 0);
}
