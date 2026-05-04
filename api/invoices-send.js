const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const https = require('https');
const FormData = require('form-data');

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
  const pairs = Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const dataCheckString = pairs.map(([k, v]) => `${k}=${v}`).join('\n');
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

    // جلب الفاتورة مع كل التفاصيل
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(name, phone, address),
        supplier:suppliers(name, phone, address),
        invoice_lines(
          *,
          item:items(name, code),
          unit:units(name, abbreviation)
        )
      `)
      .eq('id', invoiceId)
      .eq('user_id', userId)
      .single();

    if (invError || !invoice) {
      console.error('Invoice fetch error:', invError);
      return res.status(404).json({ error: 'الفاتورة غير موجودة' });
    }

    // جلب الدفعات
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, payment_date, notes')
      .eq('invoice_id', invoiceId);

    const paid = payments?.reduce((s, p) => s + parseFloat(p.amount), 0) || 0;
    const balance = invoice.total - paid;
    const typeLabel = invoice.type === 'sale' ? 'فاتورة بيع' : 'فاتورة شراء';
    const entity = invoice.customer || invoice.supplier;
    const entityLabel = invoice.type === 'sale' ? 'العميل' : 'المورد';
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

    // إنشاء HTML للفاتورة
    const htmlContent = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=80mm, initial-scale=1">
<title>${typeLabel} - ${invoice.reference || invoice.id}</title>
<style>
@page { size: 80mm auto; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { 
  width: 80mm; 
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 11px; 
  line-height: 1.5; 
  padding: 4mm;
  color: #1a1a2e;
  background: #fff;
}
.header { text-align: center; padding: 8px 0 12px; border-bottom: 2px solid #4f46e5; margin-bottom: 12px; }
.logo-text { font-size: 20px; font-weight: 900; color: #4f46e5; letter-spacing: 1px; }
.logo-sub { font-size: 9px; color: #64748b; margin-top: 2px; letter-spacing: 2px; }
.invoice-type {
  display: inline-block;
  background: ${invoice.type === 'sale' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #f59e0b, #d97706)'};
  color: white; padding: 3px 14px; border-radius: 20px;
  font-size: 11px; font-weight: 800; margin-top: 8px;
}
.info-box { background: #f8fafc; border-radius: 8px; padding: 10px; margin-bottom: 10px; border: 1px solid #e2e8f0; }
.info-row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 10px; }
.info-label { color: #64748b; font-weight: 600; }
.info-value { color: #1e293b; font-weight: 700; }
.entity-name { font-size: 12px; font-weight: 800; color: #4f46e5; text-align: center; margin: 6px 0; padding: 4px; background: #e0e7ff; border-radius: 6px; }
.divider { border: none; border-top: 1px dashed #cbd5e1; margin: 10px 0; }
.divider-thick { border: none; border-top: 2px solid #4f46e5; margin: 8px 0; }
.items-table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 8px 0; }
.items-table th { background: #4f46e5; color: white; font-size: 9px; font-weight: 700; padding: 6px 4px; text-align: center; }
.items-table th:first-child { border-radius: 0 6px 0 0; text-align: right; padding-right: 8px; }
.items-table th:last-child { border-radius: 6px 0 0 0; }
.items-table td { padding: 6px 4px; border-bottom: 1px solid #e2e8f0; font-size: 10px; text-align: center; }
.items-table td:first-child { text-align: right; padding-right: 8px; font-weight: 700; }
.items-table tr:nth-child(even) { background: #f8fafc; }
.items-table .num { font-family: 'Courier New', monospace; font-weight: 700; }
.totals-box { background: #f1f5f9; border-radius: 10px; padding: 12px; margin: 10px 0; }
.total-row { display: flex; justify-content: space-between; align-items: center; margin: 5px 0; }
.total-label { font-size: 11px; color: #475569; font-weight: 600; }
.total-value { font-family: 'Courier New', monospace; font-weight: 800; font-size: 12px; }
.grand-total { font-size: 16px; color: #4f46e5; font-weight: 900; }
.balance-due { color: ${balance > 0 ? '#dc2626' : '#059669'}; font-size: 14px; }
.paid-badge { display: inline-block; background: #dcfce7; color: #166534; padding: 2px 10px; border-radius: 12px; font-size: 9px; font-weight: 700; }
.unpaid-badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 2px 10px; border-radius: 12px; font-size: 9px; font-weight: 700; }
.payments-section { margin: 8px 0; padding: 8px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0; }
.payments-title { font-size: 10px; font-weight: 800; color: #166534; margin-bottom: 6px; text-align: center; }
.payment-row { display: flex; justify-content: space-between; font-size: 9px; margin: 3px 0; color: #166534; }
.barcode { text-align: center; margin: 8px 0; font-family: 'Libre Barcode 39', monospace; font-size: 24px; color: #1a1a2e; letter-spacing: 2px; }
.invoice-id { font-size: 8px; color: #94a3b8; text-align: center; margin-top: 2px; }
.cut-line { border: none; border-top: 2px dotted #cbd5e1; margin: 12px 0 8px; }
.footer { text-align: center; margin-top: 12px; padding-top: 10px; border-top: 2px solid #e2e8f0; }
.footer-text { font-size: 9px; color: #64748b; margin: 2px 0; }
.footer-brand { font-size: 11px; font-weight: 800; color: #4f46e5; margin-top: 6px; }
.contact-info { font-size: 8px; color: #94a3b8; margin-top: 4px; }
</style>
</head>
<body>
<div class="header">
  <div class="logo-text">الراجحي للمحاسبة</div>
  <div class="logo-sub">ALRAJEHI ACCOUNTING</div>
  <div class="invoice-type">${typeLabel}</div>
</div>
<div class="info-box">
  <div class="info-row"><span class="info-label">رقم الفاتورة:</span><span class="info-value">#${invoice.reference || invoice.id}</span></div>
  <div class="info-row"><span class="info-label">التاريخ:</span><span class="info-value">${invoice.date} ${timeStr}</span></div>
  <div class="info-row"><span class="info-label">الحالة:</span><span class="info-value">${balance <= 0 ? '<span class="paid-badge">✓ مدفوعة</span>' : '<span class="unpaid-badge">⏳ غير مدفوعة</span>'}</span></div>
</div>
${entity ? `
<div class="info-box" style="background: #e0e7ff; border-color: #c7d2fe;">
  <div class="info-label" style="text-align: center; color: #4f46e5;">${entityLabel}</div>
  <div class="entity-name">${entity.name}</div>
  ${entity.phone ? `<div class="info-row"><span class="info-label">الهاتف:</span><span class="info-value">${entity.phone}</span></div>` : ''}
</div>
` : ''}
<hr class="divider">
<table class="items-table">
  <thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr></thead>
  <tbody>
    ${invoice.invoice_lines?.map(l => `
    <tr>
      <td>
        <div style="font-weight: 800;">${(l.item?.name || '-').substring(0, 15)}</div>
        ${l.item?.code ? `<div style="font-size: 8px; color: #94a3b8;">كود: ${l.item.code}</div>` : ''}
      </td>
      <td class="num">${l.quantity} <span style="font-size: 8px; color: #64748b;">${l.unit?.abbreviation || l.unit?.name || ''}</span></td>
      <td class="num">${parseFloat(l.unit_price).toFixed(2)}</td>
      <td class="num" style="color: #4f46e5; font-weight: 900;">${parseFloat(l.total).toFixed(2)}</td>
    </tr>
    `).join('') || '<tr><td colspan="4" style="text-align: center; color: #94a3b8;">لا يوجد بنود</td></tr>'}
  </tbody>
</table>
<hr class="divider-thick">
<div class="totals-box">
  <div class="total-row"><span class="total-label">إجمالي البنود:</span><span class="total-value">${parseFloat(invoice.total).toFixed(2)} ر.س</span></div>
  ${paid > 0 ? `<div class="total-row"><span class="total-label">المدفوع:</span><span class="total-value" style="color: #059669;">${paid.toFixed(2)} ر.س</span></div>` : ''}
  ${balance > 0 ? `<div class="total-row"><span class="total-label">المتبقي:</span><span class="total-value balance-due">${balance.toFixed(2)} ر.س</span></div>` : ''}
  <hr class="divider" style="margin: 8px 0;">
  <div class="total-row"><span class="total-label" style="font-size: 13px;">الإجمالي النهائي:</span><span class="total-value grand-total">${parseFloat(invoice.total).toFixed(2)} ر.س</span></div>
</div>
${payments && payments.length > 0 ? `
<div class="payments-section">
  <div class="payments-title">سجل الدفعات</div>
  ${payments.map(p => `
  <div class="payment-row"><span>${p.payment_date}</span><span style="font-weight: 800;">${parseFloat(p.amount).toFixed(2)} ر.س</span></div>
  `).join('')}
</div>
` : ''}
<div class="barcode">*${invoice.id}*</div>
<div class="invoice-id">INV-${String(invoice.id).padStart(6, '0')}</div>
<hr class="cut-line">
<div class="footer">
  <div class="footer-text">شكراً لتعاملكم معنا</div>
  <div class="footer-text">Thank you for your business</div>
  <div class="footer-brand">الراجحي للمحاسبة</div>
  <div class="contact-info">للدعم: @bukamal1991 | الراجحي للمحاسبة</div>
</div>
</body>
</html>`;

    // إرسال الملف عبر Telegram Bot API
    const form = new FormData();
    form.append('chat_id', String(userId));
    form.append('document', Buffer.from(htmlContent, 'utf-8'), {
      filename: `فاتورة-${invoice.reference || invoice.id}.html`,
      contentType: 'text/html; charset=utf-8'
    });
    form.append('caption', `🧾 ${typeLabel} ${invoice.reference || ''}\n💰 الإجمالي: ${parseFloat(invoice.total).toFixed(2)} ر.س${balance > 0 ? `\n⚠️ متبقي: ${balance.toFixed(2)} ر.س` : '\n✅ مدفوعة بالكامل'}`);

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

