const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const https = require('https');
const nodeHtmlToImage = require('node-html-to-image');

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

    // HTML مُحسَّن للطابعات الحرارية (عرض 80mm = 302px بـ 96 DPI)
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 302px;
    font-family: 'Tajawal', 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.4;
    padding: 8px;
    background: white;
    color: #1a1a1a;
  }
  .header { text-align: center; margin-bottom: 8px; }
  .shop-name { font-size: 20px; font-weight: 900; color: #2563eb; margin-bottom: 2px; }
  .invoice-type { font-size: 14px; font-weight: 700; }
  .divider { border-top: 2px dashed #333; margin: 6px 0; }
  .info-row { display: flex; justify-content: space-between; margin: 2px 0; }
  .info-label { color: #666; }
  .info-value { font-weight: 700; }
  .items-table { width: 100%; margin: 4px 0; }
  .items-table th { text-align: right; font-size: 11px; color: #666; border-bottom: 1px solid #ddd; padding-bottom: 2px; }
  .items-table td { padding: 3px 0; vertical-align: top; }
  .item-name { font-weight: 700; max-width: 120px; word-wrap: break-word; }
  .item-qty { text-align: center; }
  .item-price { text-align: left; }
  .item-total { text-align: left; font-weight: 700; }
  .totals { margin-top: 6px; }
  .total-row { display: flex; justify-content: space-between; margin: 3px 0; }
  .grand-total { font-size: 16px; font-weight: 900; color: #2563eb; }
  .balance-due { font-size: 14px; font-weight: 700; color: #dc2626; }
  .footer { text-align: center; margin-top: 10px; font-size: 11px; color: #666; }
  .qr-placeholder { width: 80px; height: 80px; background: #f0f0f0; margin: 8px auto; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #999; }
</style>
</head>
<body>
  <div class="header">
    <div class="shop-name">الراجحي للمحاسبة</div>
    <div class="invoice-type">فاتورة ${invoice.type === 'sale' ? 'بيع' : 'شراء'}</div>
  </div>
  
  <div class="divider"></div>
  
  <div class="info-row"><span class="info-label">التاريخ:</span><span class="info-value">${invoice.date}</span></div>
  <div class="info-row"><span class="info-label">المرجع:</span><span class="info-value">${invoice.reference || '-'}</span></div>
  ${invoice.customer?.name ? `<div class="info-row"><span class="info-label">العميل:</span><span class="info-value">${invoice.customer.name}</span></div>` : ''}
  ${invoice.supplier?.name ? `<div class="info-row"><span class="info-label">المورد:</span><span class="info-value">${invoice.supplier.name}</span></div>` : ''}
  
  <div class="divider"></div>
  
  <table class="items-table">
    <tr><th style="width:40%">الصنف</th><th style="width:15%">الكمية</th><th style="width:20%">السعر</th><th style="width:25%">المجموع</th></tr>
    ${invoice.invoice_lines?.map(l => {
      const unitName = l.unit?.name || l.unit?.abbreviation || '';
      return `<tr>
        <td class="item-name">${l.item?.name || '-'}</td>
        <td class="item-qty">${l.quantity} <span style="font-size:9px;color:#666">${unitName}</span></td>
        <td class="item-price">${parseFloat(l.unit_price).toFixed(2)}</td>
        <td class="item-total">${parseFloat(l.total).toFixed(2)}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="4" style="text-align:center;color:#999">لا توجد بنود</td></tr>'}
  </table>
  
  <div class="divider"></div>
  
  <div class="totals">
    <div class="total-row"><span>الإجمالي الكلي:</span><span class="grand-total">${parseFloat(invoice.total).toFixed(2)} ر.س</span></div>
    <div class="total-row"><span>المدفوع:</span><span>${paid.toFixed(2)} ر.س</span></div>
    <div class="total-row"><span>المتبقي:</span><span class="balance-due">${balance.toFixed(2)} ر.س</span></div>
  </div>
  
  <div class="divider"></div>
  
  <div class="footer">
    <div>شكراً لتعاملكم</div>
    <div style="margin-top:4px;">للدعم: @bukamal1991</div>
  </div>
</body>
</html>`;

    // تحويل HTML إلى صورة PNG
    const image = await nodeHtmlToImage({
      html: html,
      type: 'png',
      quality: 100,
      puppeteerArgs: {
        defaultViewport: { width: 302, height: 1 }, // height auto
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    // إرسال الصورة عبر Telegram Bot API
    const FormData = require('form-data');
    const form = new FormData();
    form.append('chat_id', String(userId));
    form.append('photo', image, {
      filename: `فاتورة-${invoice.reference || invoice.id}.png`,
      contentType: 'image/png'
    });
    form.append('caption', `🧾 فاتورة ${invoice.type === 'sale' ? 'بيع' : 'شراء'} ${invoice.reference || ''}\n💰 الإجمالي: ${parseFloat(invoice.total).toFixed(2)} ر.س\n📅 ${invoice.date}`);

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendPhoto`,
      method: 'POST',
      headers: form.getHeaders()
    };

    const tgReq = https.request(options, (tgRes) => {
      let data = '';
      tgRes.on('data', chunk => data += chunk);
      tgRes.on('end', () => {
        const json = JSON.parse(data);
        if (!json.ok) return res.status(500).json({ error: json.description });
        res.json({ success: true, message: 'تم إرسال الفاتورة كصورة' });
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

