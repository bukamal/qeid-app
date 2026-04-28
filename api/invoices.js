const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function verifyTelegramData(initData) {
  if (!initData) return false;
  const BOT_TOKEN = process.env.BOT_TOKEN;
  const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');
  const pairs = Array.from(params.entries());
  pairs.sort((a, b) => a[0].localeCompare(b[0]));
  const dataCheckString = pairs.map(([k, v]) => `${k}=${v}`).join('\n');
  const computedHash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  return computedHash === hash;
}

async function getUserId(initData) {
  if (!initData || !verifyTelegramData(initData)) throw new Error('Unauthorized');
  const params = new URLSearchParams(initData);
  const user = JSON.parse(params.get('user'));
  return user.id;
}

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let initData;
    if (req.method === 'GET') {
      initData = req.query.initData;
    } else {
      initData = req.body?.initData;
    }
    const userId = await getUserId(initData);

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, customer:customers(name), supplier:suppliers(name), invoice_lines(*, item:items(name))')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;
      return res.json(data);
    } 
    else if (req.method === 'POST') {
      const { type, customer_id, supplier_id, date, reference, notes, lines } = req.body;
      if (!type || !['sale', 'purchase'].includes(type))
        return res.status(400).json({ error: 'نوع الفاتورة غير صحيح' });
      if (!lines || !Array.isArray(lines) || lines.length === 0)
        return res.status(400).json({ error: 'يجب إضافة بند واحد على الأقل' });

      // حساب الإجمالي
      let total = 0;
      for (const line of lines) {
        total += parseFloat(line.total) || 0;
      }

      // إنشاء الفاتورة
      const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .insert({
          user_id: userId,
          type,
          customer_id: customer_id || null,
          supplier_id: supplier_id || null,
          date: date || new Date().toISOString().split('T')[0],
          reference,
          notes,
          total,
          status: 'posted'
        })
        .select()
        .single();
      if (invError) throw invError;

      // إدراج البنود
      const linesToInsert = lines.map(l => ({
        invoice_id: invoice.id,
        item_id: l.item_id || null,
        description: l.description,
        quantity: parseFloat(l.quantity) || 0,
        unit_price: parseFloat(l.unit_price) || 0,
        total: parseFloat(l.total) || 0
      }));
      const { error: linesError } = await supabase
        .from('invoice_lines')
        .insert(linesToInsert);
      if (linesError) throw linesError;

      // --- إنشاء قيد محاسبي تلقائي للفواتير المرحلة ---
      // نبحث عن الحسابات المناسبة (المبيعات، المشتريات، العميل، المورد، إلخ)
      async function getAccountId(name) {
        const { data } = await supabase
          .from('accounts')
          .select('id')
          .eq('user_id', userId)
          .eq('name', name)
          .maybeSingle();
        return data?.id;
      }

      const debitLines = [];
      const creditLines = [];

      if (type === 'sale' && customer_id) {
        // بيع آجل: مدين العميل (ذمم مدينة) ، دائن المبيعات
        const salesAccountId = await getAccountId('المبيعات');
        const custAccountId = await getAccountId('ذمم مدينة - عملاء');
        if (salesAccountId && custAccountId) {
          debitLines.push({ account_id: custAccountId, debit: total, credit: 0, customer_id });
          creditLines.push({ account_id: salesAccountId, debit: 0, credit: total });
        }
      } else if (type === 'purchase' && supplier_id) {
        // شراء آجل: مدين المشتريات (أو المخزون)، دائن المورد (ذمم دائنة)
        const purchaseAccountId = await getAccountId('المشتريات');
        const suppAccountId = await getAccountId('ذمم دائنة - موردين');
        if (purchaseAccountId && suppAccountId) {
          debitLines.push({ account_id: purchaseAccountId, debit: total, credit: 0 });
          creditLines.push({ account_id: suppAccountId, debit: 0, credit: total, supplier_id });
        }
      }

      if (debitLines.length > 0 && creditLines.length > 0) {
        const entryLines = [...debitLines, ...creditLines];
        const { data: entry } = await supabase
          .from('journal_entries')
          .insert({
            user_id: userId,
            date: invoice.date,
            description: `فاتورة ${type === 'sale' ? 'بيع' : 'شراء'} ${reference || ''}`,
            reference: `فاتورة-${invoice.id}`
          })
          .select()
          .single();

        const finalLines = entryLines.map(l => ({
          entry_id: entry.id,
          account_id: l.account_id,
          debit: l.debit || 0,
          credit: l.credit || 0,
          customer_id: l.customer_id || null,
          supplier_id: l.supplier_id || null
        }));
        await supabase.from('journal_lines').insert(finalLines);
      }

      return res.json(invoice);
    } 
    else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};
