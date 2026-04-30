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

    // تنسيق مناسب لطابعة حرارية 80 مم
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>فاتورة ${invoice.reference || invoice.id}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
  body {
    font-family: 'Tajawal', sans-serif;
    width: 72mm;
    margin: 0 auto;
    padding: 2mm;
    font-size: 12px;
    background: white;
  }
  .header { text-align: center; margin-bottom: 4mm; }
  h2 { font-size: 16px; margin: 0; }
  h3 { font-size: 14px; margin: 2mm 0; }
  p { margin: 1mm 0; }
  table { width: 100%; border-collapse: collapse; margin: 3mm 0; }
  th, td { border: 1px dashed #000; padding: 2mm; text-align: right; font-size: 11px; }
  th { background: #eee; }
  .total { text-align: left; margin-top: 3mm; font-weight: bold; }
  .note { font-style: italic; margin-top: 2mm; }
</style></head>
<body>
  <div class="header">
    <h2>الراجحي للمحاسبة</h2>
    <h3>فاتورة ${invoice.type === 'sale' ? 'بيع' : 'شراء'}</h3>
  </div>
  <p>التاريخ: ${invoice.date} | المرجع: ${invoice.reference || '-'}</p>
  ${invoice.customer?.name ? `<p>العميل: ${invoice.customer.name}</p>` : ''}
  ${invoice.supplier?.name ? `<p>المورد: ${invoice.supplier.name}</p>` : ''}
  <table>
    <tr><th>المادة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>
    ${invoice.invoice_lines?.map(l => `<tr><td>${l.item?.name || '-'}</td><td>${l.quantity}</td><td>${l.unit_price}</td><td>${l.total}</td></tr>`).join('')}
  </table>
  <div class="total">
    <p>الإجمالي: ${invoice.total}</p>
    <p>المدفوع: ${paid}</p>
    <p>الباقي: ${balance}</p>
  </div>
  ${invoice.notes ? `<p class="note">ملاحظات: ${invoice.notes}</p>` : ''}
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
