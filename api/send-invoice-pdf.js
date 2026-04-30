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

    // تصميم عمودي مكبر
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>فاتورة ${invoice.reference || invoice.id}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
  body {
    font-family: 'Tajawal', sans-serif;
    background: #f0f4f8;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    margin: 0;
    direction: rtl;
  }
  .invoice-box {
    max-width: 700px;
    width: 95%;
    background: white;
    padding: 40px;
    border-radius: 16px;
    box-shadow: 0 8px 20px rgba(0,0,0,0.08);
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  .header {
    text-align: center;
    border-bottom: 3px solid #2563eb;
    padding-bottom: 20px;
  }
  h2 { color: #2563eb; font-size: 36px; margin: 0; }
  h3 { font-size: 22px; margin: 10px 0 0; color: #333; }
  .info {
    font-size: 18px;
    line-height: 2;
    background: #f9fafb;
    border-radius: 10px;
    padding: 16px;
  }
  .items {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .item-row {
    display: flex;
    flex-direction: column;
    background: #f9fafb;
    border-radius: 10px;
    padding: 16px;
    border-right: 4px solid #2563eb;
  }
  .item-header {
    font-weight: bold;
    font-size: 20px;
    color: #1e293b;
    margin-bottom: 8px;
  }
  .item-details {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 18px;
    color: #475569;
  }
  .item-details span { display: inline-flex; align-items: center; gap: 6px; }
  .item-total {
    font-size: 20px;
    font-weight: bold;
    color: #2563eb;
    margin-top: 8px;
    text-align: left;
  }
  .summary {
    border-top: 3px solid #2563eb;
    padding-top: 20px;
    font-size: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: flex-end;
  }
  .balance { color: #ef4444; font-weight: bold; font-size: 24px; }
  .notes {
    background: #fff7ed;
    border-radius: 8px;
    padding: 16px;
    font-size: 18px;
    color: #9a3412;
  }
  @media print {
    body { background: white; }
    .invoice-box { box-shadow: none; }
  }
</style></head>
<body>
  <div class="invoice-box">
    <div class="header">
      <h2>الراجحي للمحاسبة</h2>
      <h3>فاتورة ${invoice.type === 'sale' ? 'بيع' : 'شراء'}</h3>
    </div>
    <div class="info">
      <p>📅 التاريخ: ${invoice.date}</p>
      <p>🔖 المرجع: ${invoice.reference || '-'}</p>
      ${invoice.customer?.name ? `<p>👤 العميل: ${invoice.customer.name}</p>` : ''}
      ${invoice.supplier?.name ? `<p>🏭 المورد: ${invoice.supplier.name}</p>` : ''}
    </div>
    <div class="items">
      ${invoice.invoice_lines?.map(l => `
        <div class="item-row">
          <div class="item-header">${l.item?.name || '-'}</div>
          <div class="item-details">
            <span>📦 الكمية: ${l.quantity}</span>
            <span>💵 السعر: ${l.unit_price}</span>
          </div>
          <div class="item-total">الإجمالي: ${l.total}</div>
        </div>
      `).join('')}
    </div>
    <div class="summary">
      <p><strong>الإجمالي الكلي:</strong> ${invoice.total}</p>
      <p><strong>المدفوع:</strong> ${paid}</p>
      <p class="balance"><strong>الباقي:</strong> ${balance}</p>
    </div>
    ${invoice.notes ? `<div class="notes">📝 ملاحظات: ${invoice.notes}</div>` : ''}
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
