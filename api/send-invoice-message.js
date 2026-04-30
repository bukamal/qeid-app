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

    // بناء نص HTML للفاتورة
    const linesHtml = invoice.invoice_lines?.map(l => `
      <tr>
        <td>${l.item?.name || '-'}</td>
        <td>${l.quantity}</td>
        <td>${l.unit_price}</td>
        <td>${l.total}</td>
      </tr>
    `).join('') || '';

    const html = `
<b>🧾 فاتورة ${invoice.type === 'sale' ? 'بيع' : 'شراء'}</b>
📅 <b>التاريخ:</b> ${invoice.date}
🔖 <b>المرجع:</b> ${invoice.reference || '-'}
--------------------
${invoice.customer?.name ? `👤 <b>العميل:</b> ${invoice.customer.name}\n` : ''}
${invoice.supplier?.name ? `🏭 <b>المورد:</b> ${invoice.supplier.name}\n` : ''}
<pre>
┌──────────────────────────────────────┐
│   <b>المادة</b>        الكمية   السعر    الإجمالي   │
├──────────────────────────────────────┤
${invoice.invoice_lines?.map(l => `│ ${(l.item?.name||'-').padEnd(12)} ${String(l.quantity).padStart(5)} ${String(l.unit_price).padStart(8)} ${String(l.total).padStart(10)} │`).join('\n')}
└──────────────────────────────────────┘
</pre>
💰 <b>الإجمالي:</b> ${invoice.total}
💵 <b>المدفوع:</b> ${paid}
📌 <b>الباقي:</b> <b>${balance}</b>
${invoice.notes ? `\n📝 <b>ملاحظات:</b> ${invoice.notes}` : ''}
    `.trim();

    // إرسال الرسالة عبر Telegram Bot API
    const data = JSON.stringify({
      chat_id: userId,
      text: html,
      parse_mode: 'HTML'
    });

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const tgReq = https.request(options, (tgRes) => {
      let body = '';
      tgRes.on('data', chunk => body += chunk);
      tgRes.on('end', () => {
        const json = JSON.parse(body);
        if (!json.ok) return res.status(500).json({ error: json.description });
        res.json({ success: true });
      });
    });
    tgReq.on('error', (e) => res.status(500).json({ error: e.message }));
    tgReq.write(data);
    tgReq.end();
  } catch (err) {
    console.error(err);
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};
