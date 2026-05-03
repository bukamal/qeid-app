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
      .select('*, customer:customers(name), supplier:suppliers(name), invoice_lines(*, item:items(name), unit:units(name))')
      .eq('id', invoiceId)
      .eq('user_id', userId)
      .single();
    if (invError || !invoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });

    const { data: payments } = await supabase.from('payments').select('amount').eq('invoice_id', invoiceId);
    const paid = payments?.reduce((s, p) => s + parseFloat(p.amount), 0) || 0;
    const balance = invoice.total - paid;

    // HTML نظيف للطباعة — يُرسل كملف مرفق
    const htmlContent = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=80mm, initial-scale=1">
<title>فاتورة ${invoice.reference || invoice.id}</title>
<style>
@page { size: 80mm auto; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 80mm; font-family: system-ui, -apple-system, sans-serif; font-size: 12px; line-height: 1.4; padding: 4mm; }
.center { text-align: center; }
.bold { font-weight: 900; }
.line { border-top: 1px dashed #000; margin: 3mm 0; }
table { width: 100%; border-collapse: collapse; }
td, th { padding: 2px 0; text-align: right; }
th { font-size: 10px; color: #555; border-bottom: 1px solid #999; }
.num { font-family: 'Courier New', monospace; text-align: left; }
.total { font-size: 14px; font-weight: 900; color: #2563eb; }
</style>
</head>
<body>
<div class="center bold" style="font-size:18px">الراجحي للمحاسبة</div>
<div class="center">فاتورة ${invoice.type === 'sale' ? 'بيع' : 'شراء'}</div>
<div class="line"></div>
<div>التاريخ: ${invoice.date}</div>
<div>المرجع: ${invoice.reference || '-'}</div>
${invoice.customer?.name ? `<div>العميل: ${invoice.customer.name}</div>` : ''}
<div class="line"></div>
<table>
<tr><th style="width:40%">الصنف</th><th style="width:15%">الكمية</th><th style="width:22%">السعر</th><th style="width:23%">المجموع</th></tr>
${invoice.invoice_lines?.map(l => `
<tr>
<td class="bold">${(l.item?.name || '-').substring(0, 12)}</td>
<td>${l.quantity} <span style="font-size:9px">${l.unit?.name || ''}</span></td>
<td class="num">${parseFloat(l.unit_price).toFixed(2)}</td>
<td class="num">${parseFloat(l.total).toFixed(2)}</td>
</tr>
`).join('') || ''}
</table>
<div class="line"></div>
<div class="total">الإجمالي: ${parseFloat(invoice.total).toFixed(2)} ر.س</div>
<div>المدفوع: ${paid.toFixed(2)} ر.س</div>
<div class="bold">الباقي: ${balance.toFixed(2)} ر.س</div>
<div class="line"></div>
<div class="center" style="font-size:10px;color:#555">شكراً لتعاملكم<br>للدعم: @bukamal1991</div>
</body>
</html>`;

    const FormData = require('form-data');
    const form = new FormData();
    form.append('chat_id', String(userId));
    form.append('document', Buffer.from(htmlContent, 'utf-8'), {
      filename: `فاتورة-${invoice.reference || invoice.id}.html`,
      contentType: 'text/html; charset=utf-8'
    });
    form.append('caption', `🧾 فاتورة ${invoice.type === 'sale' ? 'بيع' : 'شراء'} ${invoice.reference || ''}\n💰 الإجمالي: ${parseFloat(invoice.total).toFixed(2)} ر.س`);

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
        try {
          const json = JSON.parse(data);
          if (!json.ok) {
            console.error('Telegram error:', json);
            return res.status(500).json({ error: json.description });
          }
          res.json({ success: true });
        } catch (e) {
          res.status(500).json({ error: 'رد غير صالح من Telegram' });
        }
      });
    });

    tgReq.on('error', (e) => {
      console.error('Network error:', e);
      res.status(500).json({ error: e.message });
    });

    form.pipe(tgReq);

  } catch (err) {
    console.error('Server error:', err);
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};

