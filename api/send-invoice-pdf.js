const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
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

    // بناء صفحة HTML كاملة بالعربية
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>فاتورة ${invoice.reference || invoice.id}</title>
<style>
  body { font-family: 'Tajawal', sans-serif; padding: 30px; direction: rtl; }
  h2 { color: #2563eb; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th { background: #f0f0f0; }
  th, td { border: 1px solid #ccc; padding: 10px; text-align: right; }
  .total { margin-top: 20px; text-align: left; }
</style></head>
<body>
  <h2>الراجحي للمحاسبة</h2>
  <h3>فاتورة ${invoice.type === 'sale' ? 'بيع' : 'شراء'}</h3>
  <p>التاريخ: ${invoice.date} | المرجع: ${invoice.reference || '-'}</p>
  ${invoice.customer?.name ? `<p>العميل: ${invoice.customer.name}</p>` : ''}
  ${invoice.supplier?.name ? `<p>المورد: ${invoice.supplier.name}</p>` : ''}
  <table>
    <tr><th>المادة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>
    ${invoice.invoice_lines?.map(l => `<tr><td>${l.item?.name || '-'}</td><td>${l.quantity}</td><td>${l.unit_price}</td><td>${l.total}</td></tr>`).join('')}
  </table>
  <div class="total">
    <p><strong>الإجمالي: ${invoice.total}</strong></p>
    <p>المدفوع: ${paid}</p>
    <p><strong>الباقي: ${balance}</strong></p>
  </div>
  ${invoice.notes ? `<p>ملاحظات: ${invoice.notes}</p>` : ''}
</body></html>`;

    const FormData = require('form-data');
    const form = new FormData();
    form.append('chat_id', String(userId));
    form.append('document', Buffer.from(html, 'utf-8'), {
      filename: `فاتورة-${invoice.reference || invoice.id}.html`,
      contentType: 'text/html'
    });
    form.append('caption', `فاتورة ${invoice.type === 'sale' ? 'بيع' : 'شراء'} ${invoice.reference || ''}`);

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendDocument`,
      method: 'POST',
      headers: form.getHeaders()
    };

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
