export async function sendInvoiceEmail(invoiceHtml, recipientEmail, subject, body) {
  try {
    const result = await window.electronAPI.email.send({
      to: recipientEmail,
      subject: subject || 'Invoice from Arynoxtech Jwellery',
      html: invoiceHtml,
      text: body || 'Please find your invoice attached.',
    });
    return result;
  } catch (e) {
    return { success: false, error: e.message };
  }
}
