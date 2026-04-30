const PDFDocument = require('pdfkit');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const FormData = require('form-data');
const https = require('https');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BOT_TOKEN = process.env.BOT_TOKEN;

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function verifyTelegramData(initData) {
  if (!initData) return false;
  const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');
  const pairs = Array.from(params.entries()).sort((a,b) => a[0].localeCompare(b[0]));
  const dataCheckString = pairs.map(([k,v]) => `${k}=${v}`).join('\n');
  return crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex') === hash;
}

async function getUserId(initData) {
  if (!initData || !verifyTelegramData(initData)) throw new Error('Unauthorized');
  return JSON.parse(new URLSearchParams(initData).get('user')).id;
}

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { invoiceId, initData } = req.body;
    if (!invoiceId) return res.status(400).json({ error: 'معرف الفاتورة مطلوب' });
    const userId = await getUserId(initData);

    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .select('*, customer:customers(name), supplier:suppliers(name), invoice_lines(*, item:items(name))')
      .eq('id', invoiceId)
      .eq('user_id', userId)
      .single();
    if (invError || !invoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });

    const { data: payments } = await supabase.from('payments').select('amount').eq('invoice_id', invoiceId);
    const paid = payments?.reduce((s, p) => s + parseFloat(p.amount), 0) || 0;
    const balance = invoice.total - paid;

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    const pdfPromise = new Promise(resolve => { doc.on('end', () => resolve(Buffer.concat(chunks))); });

    // ترويسة بالإنجليزية
    doc.fontSize(20).text('Alrajhi Accounting', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Invoice ${invoice.type === 'sale' ? 'Sale' : 'Purchase'}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Date: ${invoice.date}`, { align: 'center' });
    doc.text(`Ref: ${invoice.reference || '-'}`, { align: 'center' });
    if (invoice.customer?.name) doc.text(`Customer: ${invoice.customer.name}`);
    if (invoice.supplier?.name) doc.text(`Supplier: ${invoice.supplier.name}`);
    doc.moveDown();

    // جدول البنود
    const tableTop = doc.y;
    doc.fontSize(11).text('Item', 50, tableTop);
    doc.text('Qty', 250, tableTop);
    doc.text('Price', 350, tableTop);
    doc.text('Total', 450, tableTop);
    doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
    doc.moveDown(0.5);

    invoice.invoice_lines?.forEach(line => {
      doc.text(line.item?.name || '-', 50, doc.y);
      doc.text(String(line.quantity), 250, doc.y);
      doc.text(String(line.unit_price), 350, doc.y);
      doc.text(String(line.total), 450, doc.y);
      doc.moveDown(0.3);
    });

    doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Total: ${invoice.total}`, 250, doc.y, { align: 'left' });
    doc.text(`Paid: ${paid}`, 250, doc.y + 16, { align: 'left' });
    doc.text(`Balance: ${balance}`, 250, doc.y + 32, { align: 'left' });
    if (invoice.notes) {
      doc.moveDown();
      doc.text(`Notes: ${invoice.notes}`);
    }

    doc.end();
    const pdfBuffer = await pdfPromise;

    // إرسال عبر البوت
    const form = new FormData();
    form.append('chat_id', String(userId));
    form.append('document', pdfBuffer, {
      filename: `invoice-${invoice.reference || invoice.id}.pdf`,
      contentType: 'application/pdf'
    });
    form.append('caption', `Invoice ${invoice.type === 'sale' ? 'Sale' : 'Purchase'} ${invoice.reference || ''}`);

    const options = { hostname: 'api.telegram.org', path: `/bot${BOT_TOKEN}/sendDocument`, method: 'POST', headers: form.getHeaders() };
    const tgReq = https.request(options, (tgRes) => {
      let data = '';
      tgRes.on('data', chunk => data += chunk);
      tgRes.on('end', () => {
        const json = JSON.parse(data);
        if (!json.ok) return res.status(500).json({ error: json.description });
        res.json({ success: true });
      });
    });
    tgReq.on('error', (e) => res.status(500).json({ error: e.message }));
    form.pipe(tgReq);
  } catch (err) {
    console.error(err);
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};
