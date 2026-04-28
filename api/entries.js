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
        .from('journal_entries')
        .select('*, journal_lines(*, account:accounts(name), item:items(name))')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      if (error) throw error;
      return res.json(data);
    } else if (req.method === 'POST') {
      const { date, description, reference, lines } = req.body;
      if (!lines || !Array.isArray(lines) || lines.length === 0)
        return res.status(400).json({ error: 'يجب إضافة سطر مدين وسطر دائن على الأقل' });

      // حساب مجموع المدين والدائن
      let totalDebit = 0, totalCredit = 0;
      for (const line of lines) {
        totalDebit += parseFloat(line.debit) || 0;
        totalCredit += parseFloat(line.credit) || 0;
        if (!line.account_id) return res.status(400).json({ error: 'يجب اختيار حساب لكل سطر' });
        
        // إذا وُجد item_id، تحقق من الكمية المتاحة إذا كان التأثير سالبًا (بيع)
        if (line.item_id) {
          const qtyChange = parseFloat(line.quantity_change) || 0;
          if (qtyChange < 0) {
            // بيع – تحقق من الرصيد
            const { data: item } = await supabase
              .from('items')
              .select('quantity, name')
              .eq('id', line.item_id)
              .eq('user_id', userId)
              .single();
            if (!item) return res.status(400).json({ error: 'المادة غير موجودة' });
            if (item.quantity + qtyChange < 0) {  // qtyChange بالسالب
              return res.status(400).json({ error: `المخزون غير كافٍ للمادة "${item.name}". المتاح: ${item.quantity}` });
            }
          }
        }
      }
      if (Math.abs(totalDebit - totalCredit) > 0.001) {
        return res.status(400).json({ error: 'مجموع المبالغ المدينة يجب أن يساوي مجموع المبالغ الدائنة' });
      }

      // إنشاء رأس القيد
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({ user_id: userId, date, description, reference })
        .select()
        .single();
      if (entryError) throw entryError;

      // إدراج السطور
      const linesToInsert = lines.map(l => ({
        entry_id: entry.id,
        account_id: l.account_id,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        item_id: l.item_id || null,
        quantity_change: parseFloat(l.quantity_change) || 0
      }));
      const { error: linesError } = await supabase.from('journal_lines').insert(linesToInsert);
      if (linesError) throw linesError;

      // تحديث كميات المواد بعد الحفظ
      for (const line of lines) {
        if (line.item_id && parseFloat(line.quantity_change) !== 0) {
          const qtyChange = parseFloat(line.quantity_change);
          // جلب الكمية الحالية
          const { data: currentItem } = await supabase
            .from('items')
            .select('quantity')
            .eq('id', line.item_id)
            .eq('user_id', userId)
            .single();
          if (currentItem) {
            const newQty = parseFloat(currentItem.quantity) + qtyChange;
            await supabase
              .from('items')
              .update({ quantity: newQty })
              .eq('id', line.item_id)
              .eq('user_id', userId);
          }
        }
      }

      return res.json(entry);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};
