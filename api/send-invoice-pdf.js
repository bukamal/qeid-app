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

    // تصميم HTML مركزي وأنيق
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>فاتورة ${invoice.reference || invoice.id}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
  body {
    font-family: 'Tajawal', sans-serif;
    background: #f5f5f5;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    margin: 0;
    direction: rtl;
  }
  .invoice-box {
    max-width: 600px;
    width: 90%;
    background: white;
    padding: 30px;
    border-radius: 12px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  }
  .header {
    text-align: center;
    margin-bottom: 20px;
    border-bottom: 2px solid #2563eb;
    padding-bottom: 15px;
  }
  h2 { color: #2563eb; font-size: 28px; margin: 0; }
  h3 { font-size: 18px; margin: 10px 0 0; color: #333; }
  .info { margin: 15px 0; font-size: 15px; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th { background: #2563eb; color: white; padding: 10px; font-size: 14px; }
  td { padding: 10px; border-bottom: 1px solid #ddd; font-size: 14px; text-align: right; }
  .total-section {
    text-align: left;
    margin-top: 20px;
    padding-top: 15px;
    border-top: 2px solid #2563eb;
    font-size: 16px;
  }
  .total-section p { margin: 5px 0; }
  .balance { color: #ef4444; font-weight: bold; }
  .notes { margin-top: 15px; font-style: italic; color: #555; }
  @media print {
    body { background: white; }
    .invoice-box { box-shadow: none; margin: 0; padding: 0; }
  }
</style></head>
<body>
  <div class="invoice-box">
    <div class="header">
      <h2>الراجحي للمحاسبة</h2>
      <h3>فاتورة ${invoice.type === 'sale' ? 'بيع' : 'شراء'}</h3>
    </div>
    <div class="info">
      <p>التاريخ: ${invoice.date} | المرجع: ${invoice.reference || '-'}</p>
      ${invoice.customer?.name ? `<p>العميل: ${invoice.customer.name}</p>` : ''}
      ${invoice.supplier?.name ? `<p>المورد: ${invoice.supplier.name}</p>` : ''}
    </div>
    <table>
      <thead>
        <tr><th>المادة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>
      </thead>
      <tbody>
        ${invoice.invoice_lines?.map(l => `<tr><td>${l.item?.name || '-'}</td><td>${l.quantity}</td><td>${l.unit_price}</td><td>${l.total}</td></tr>`).join('')}
      </tbody>
    </table>
    <div class="total-section">
      <p><strong>الإجمالي:</strong> ${invoice.total}</p>
      <p><strong>المدفوع:</strong> ${paid}</p>
      <p class="balance"><strong>الباقي:</strong> ${balance}</p>
    </div>
    ${invoice.notes ? `<p class="notes">ملاحظات: ${invoice.notes}</p>` : ''}
  </div>
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
