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

// إنشاء نص ESC/POS للطابعات الحرارية
function generateThermalReceipt(invoice, paid, balance) {
  const ESC = '\x1B';
  const GS = '\x1D';
  
  let r = '';
  r += ESC + '@';                    // Reset printer
  r += ESC + 'a' + '\x01';           // Center align
  r += ESC + '!' + '\x30';           // Double height + width + bold
  r += 'الراجحي للمحاسبة\n';
  r += ESC + '!' + '\x10';           // Double width
  r += (invoice.type === 'sale' ? 'فاتورة بيع' : 'فاتورة شراء') + '\n';
  r += ESC + '!' + '\x00';           // Normal
  r += ESC + 'a' + '\x00';           // Left align
  
  r += '------------------------\n';
  r += `التاريخ: ${invoice.date}\n`;
  r += `المرجع: ${invoice.reference || '-'}\n`;
  if (invoice.customer?.name) r += `العميل: ${invoice.customer.name}\n`;
  if (invoice.supplier?.name) r += `المورد: ${invoice.supplier.name}\n`;
  r += '------------------------\n';
  
  // Items header
  r += ESC + '!' + '\x08';           // Bold
  r += 'الصنف        العدد  السعر  المجموع\n';
  r += ESC + '!' + '\x00';           // Normal
  
  for (const l of (invoice.invoice_lines || [])) {
    const name = (l.item?.name || '-').substring(0, 12).padEnd(12);
    const qty = String(l.quantity).padStart(3);
    const price = String(parseFloat(l.unit_price).toFixed(2)).padStart(6);
    const total = String(parseFloat(l.total).toFixed(2)).padStart(7);
    r += `${name} ${qty} ${price} ${total}\n`;
  }
  
  r += '------------------------\n';
  
  // Totals with emphasis
  r += ESC + '!' + '\x20';           // Double height
  r += `الإجمالي: ${parseFloat(invoice.total).toFixed(2)}\n`;
  r += ESC + '!' + '\x00';           // Normal
  r += `المدفوع:  ${paid.toFixed(2)}\n`;
  r += ESC + '!' + '\x08';           // Bold
  r += `الباقي:   ${balance.toFixed(2)}\n`;
  r += ESC + '!' + '\x00';           // Normal
  
  r += '------------------------\n';
  r += ESC + 'a' + '\x01';           // Center
  r += 'شكراً لتعاملكم\n';
  r += 'للدعم: @bukamal1991\n';
  r += '\n\n\n';                      // Feed 3 lines
  r += GS + 'V' + '\x41' + '\x03';   // Partial cut + 3mm feed
  
  return r;
}

// إنشاء HTML بسيط للعرض (بدون Puppeteer)
function generateSimpleHtml(invoice, paid, balance) {
  const items = invoice.invoice_lines || [];
  return `<!DOCTYPE html>
<html dir="rtl">
<head><meta charset="UTF-8"><title>فاتورة</title>
<style>
body { width: 80mm; font-family: 'Courier New', monospace; font-size: 12px; padding: 4mm; }
.center { text-align: center; }
.bold { font-weight: bold; }
.line { border-top: 1px dashed #000; margin: 2mm 0; }
table { width: 100%; }
td { padding: 1px 0; }
.right { text-align: left; }
</style>
</head>
<body>
  <div class="center bold" style="font-size:16px">الراجحي للمحاسبة</div>
  <div class="center">فاتورة ${invoice.type === 'sale' ? 'بيع' : 'شراء'}</div>
  <div class="line"></div>
  <div>التاريخ: ${invoice.date}</div>
  <div>المرجع: ${invoice.reference || '-'}</div>
  ${invoice.customer?.name ? `<div>العميل: ${invoice.customer.name}</div>` : ''}
  <div class="line"></div>
  <table>
    <tr class="bold"><td>الصنف</td><td class="right">الكمية</td><td class="right">السعر</td><td class="right">المجموع</td></tr>
    ${items.map(l => `<tr><td>${(l.item?.name || '-').substring(0, 10)}</td><td class="right">${l.quantity}</td><td class="right">${parseFloat(l.unit_price).toFixed(2)}</td><td class="right">${parseFloat(l.total).toFixed(2)}</td></tr>`).join('')}
  </table>
  <div class="line"></div>
  <div class="bold">الإجمالي: ${parseFloat(invoice.total).toFixed(2)}</div>
  <div>المدفوع: ${paid.toFixed(2)}</div>
  <div class="bold">الباقي: ${balance.toFixed(2)}</div>
  <div class="line"></div>
  <div class="center">شكراً لتعاملكم</div>
</body>
</html>`;
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

    const FormData = require('form-data');
    const form = new FormData();

    // الخيار 1: إرسال نص ESC/POS للطابعات الحرارية
    const receipt = generateThermalReceipt(invoice, paid, balance);
    form.append('chat_id', String(userId));
    form.append('document', Buffer.from(receipt, 'utf-8'), {
      filename: `فاتورة-${invoice.reference || invoice.id}.txt`,
      contentType: 'text/plain'
    });

    // الخيار 2: إرسال HTML بسيط (مُعلق - يمكن تفعيله بدلاً من النص)
    /*
    const html = generateSimpleHtml(invoice, paid, balance);
    form.append('document', Buffer.from(html, 'utf-8'), {
      filename: `فاتورة-${invoice.reference || invoice.id}.html`,
      contentType: 'text/html'
    });
    */

    form.append('caption', `🧾 فاتورة ${invoice.type === 'sale' ? 'بيع' : 'شراء'} ${invoice.reference || ''}\n💰 الإجمالي: ${parseFloat(invoice.total).toFixed(2)} ر.س\n📅 ${invoice.date}`);

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
            console.error('Telegram API error:', json);
            return res.status(500).json({ error: json.description || 'فشل إرسال Telegram' });
          }
          res.json({ success: true, message: 'تم إرسال الفاتورة' });
        } catch (e) {
          res.status(500).json({ error: 'رد غير صالح من Telegram' });
        }
      });
    });

    tgReq.on('error', (e) => {
      console.error('Request error:', e);
      res.status(500).json({ error: e.message });
    });

    form.pipe(tgReq);

  } catch (err) {
    console.error('Server error:', err);
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};

