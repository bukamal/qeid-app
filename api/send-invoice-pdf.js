const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const FormData = require('form-data');
const fetch = require('node-fetch');

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

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    let y = 800;
    page.drawText('الراجحي للمحاسبة', { x: 50, y, size: 20, font });
    y -= 30; page.drawText(`فاتورة ${invoice.type === 'sale' ? 'بيع' : 'شراء'}`, { x: 50, y, size: 14, font });
    y -= 20; page.drawText(`التاريخ: ${invoice.date}`, { x: 50, y, size: 12, font });
    y -= 16; page.drawText(`المرجع: ${invoice.reference || '-'}`, { x: 50, y, size: 12, font });
    if (invoice.customer?.name) { y -= 16; page.drawText(`العميل: ${invoice.customer.name}`, { x: 50, y, size: 12, font }); }
    if (invoice.supplier?.name) { y -= 16; page.drawText(`المورد: ${invoice.supplier.name}`, { x: 50, y, size: 12, font }); }
    y -= 25;
    page.drawText('المادة', { x: 50, y, size: 11, font });
    page.drawText('الكمية', { x: 250, y, size: 11, font });
    page.drawText('السعر', { x: 350, y, size: 11, font });
    page.drawText('الإجمالي', { x: 450, y, size: 11, font });
    y -= 14; page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, color: rgb(0,0,0) });
    invoice.invoice_lines?.forEach(line => {
      y -= 14;
      page.drawText(line.item?.name || '-', { x: 50, y, size: 10, font });
      page.drawText(String(line.quantity), { x: 250, y, size: 10, font });
      page.drawText(String(line.unit_price), { x: 350, y, size: 10, font });
      page.drawText(String(line.total), { x: 450, y, size: 10, font });
    });
    y -= 20; page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, color: rgb(0,0,0) });
    y -= 20; page.drawText(`الإجمالي: ${invoice.total}`, { x: 400, y, size: 12, font, maxWidth: 150 });
    y -= 16; page.drawText(`المدفوع: ${paid}`, { x: 400, y, size: 12, font, maxWidth: 150 });
    y -= 16; page.drawText(`الباقي: ${balance}`, { x: 400, y, size: 12, font, maxWidth: 150 });
    if (invoice.notes) { y -= 20; page.drawText(`ملاحظات: ${invoice.notes}`, { x: 50, y, size: 11, font, maxWidth: 500 }); }

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    const form = new FormData();
    form.append('chat_id', String(userId));
    form.append('document', pdfBuffer, { filename: `فاتورة-${invoice.reference || invoice.id}.pdf`, contentType: 'application/pdf' });
    form.append('caption', `فاتورة ${invoice.type === 'sale' ? 'بيع' : 'شراء'} ${invoice.reference || ''}`);

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    const json = await response.json();
    if (!json.ok) throw new Error(json.description || 'فشل إرسال الملف');
    res.json({ success: true, message: 'تم إرسال الفاتورة PDF عبر البوت' });
  } catch (err) {
    console.error(err);
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};
