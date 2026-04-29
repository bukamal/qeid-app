const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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
    if (req.method === 'GET' || req.method === 'DELETE') {
      initData = req.query.initData;
    } else {
      initData = req.body?.initData;
    }
    const userId = await getUserId(initData);

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*, journal_lines(*, account:accounts(name), item:items(name), customer:customers(name), supplier:suppliers(name))')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'POST') {
      const { date, description, reference, lines } = req.body;
      if (!lines || !Array.isArray(lines) || lines.length === 0)
        return res.status(400).json({ error: 'يجب إضافة سطر مدين وسطر دائن على الأقل' });

      let totalDebit = 0, totalCredit = 0;
      for (const line of lines) {
        totalDebit += parseFloat(line.debit) || 0;
        totalCredit += parseFloat(line.credit) || 0;
        if (!line.account_id) return res.status(400).json({ error: 'يجب اختيار حساب لكل سطر' });
        if (line.item_id && parseFloat(line.quantity_change) < 0) {
          const { data: item } = await supabase
            .from('items').select('quantity, name')
            .eq('id', line.item_id).eq('user_id', userId).single();
          if (!item) return res.status(400).json({ error: 'المادة غير موجودة' });
          if (item.quantity + parseFloat(line.quantity_change) < 0)
            return res.status(400).json({ error: `المخزون غير كافٍ للمادة "${item.name}". المتاح: ${item.quantity}` });
        }
      }
      if (Math.abs(totalDebit - totalCredit) > 0.001)
        return res.status(400).json({ error: 'المبلغ المدين يجب أن يساوي المبلغ الدائن' });

      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({ user_id: userId, date, description, reference })
        .select().single();
      if (entryError) throw entryError;

      const linesToInsert = lines.map(l => ({
        entry_id: entry.id,
        account_id: l.account_id,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        item_id: l.item_id || null,
        quantity_change: parseFloat(l.quantity_change) || 0,
        customer_id: l.customer_id || null,
        supplier_id: l.supplier_id || null
      }));
      await supabase.from('journal_lines').insert(linesToInsert);

      // تحديث المخزون والعملاء والموردين
      for (const line of lines) {
        if (line.item_id && parseFloat(line.quantity_change) !== 0) {
          const qtyChange = parseFloat(line.quantity_change);
          const { data: cur } = await supabase.from('items').select('quantity').eq('id', line.item_id).eq('user_id', userId).single();
          if (cur) {
            await supabase.from('items').update({ quantity: parseFloat(cur.quantity) + qtyChange }).eq('id', line.item_id).eq('user_id', userId);
          }
        }
        if (line.customer_id) {
          const { data: cust } = await supabase.from('customers').select('balance').eq('id', line.customer_id).eq('user_id', userId).single();
          if (cust) {
            const change = (parseFloat(line.debit) || 0) - (parseFloat(line.credit) || 0);
            await supabase.from('customers').update({ balance: parseFloat(cust.balance) + change }).eq('id', line.customer_id).eq('user_id', userId);
          }
        }
        if (line.supplier_id) {
          const { data: sup } = await supabase.from('suppliers').select('balance').eq('id', line.supplier_id).eq('user_id', userId).single();
          if (sup) {
            const change = (parseFloat(line.credit) || 0) - (parseFloat(line.debit) || 0);
            await supabase.from('suppliers').update({ balance: parseFloat(sup.balance) + change }).eq('id', line.supplier_id).eq('user_id', userId);
          }
        }
      }

      return res.json(entry);
    }

    if (req.method === 'DELETE') {
      const entryId = req.query.id;
      if (!entryId) return res.status(400).json({ error: 'معرف القيد مطلوب' });

      const { data: entry, error: fetchError } = await supabase
        .from('journal_entries').select('id').eq('id', entryId).eq('user_id', userId).single();
      if (fetchError || !entry) return res.status(404).json({ error: 'القيد غير موجود' });

      const { data: lines } = await supabase
        .from('journal_lines').select('*').eq('entry_id', entryId);
      
      if (lines) {
        for (const line of lines) {
          if (line.item_id && parseFloat(line.quantity_change) !== 0) {
            const qtyChange = parseFloat(line.quantity_change);
            const { data: cur } = await supabase.from('items').select('quantity').eq('id', line.item_id).eq('user_id', userId).single();
            if (cur) {
              await supabase.from('items').update({ quantity: parseFloat(cur.quantity) - qtyChange }).eq('id', line.item_id).eq('user_id', userId);
            }
          }
          if (line.customer_id) {
            const { data: cust } = await supabase.from('customers').select('balance').eq('id', line.customer_id).eq('user_id', userId).single();
            if (cust) {
              const change = (parseFloat(line.debit) || 0) - (parseFloat(line.credit) || 0);
              await supabase.from('customers').update({ balance: parseFloat(cust.balance) - change }).eq('id', line.customer_id).eq('user_id', userId);
            }
          }
          if (line.supplier_id) {
            const { data: sup } = await supabase.from('suppliers').select('balance').eq('id', line.supplier_id).eq('user_id', userId).single();
            if (sup) {
              const change = (parseFloat(line.credit) || 0) - (parseFloat(line.debit) || 0);
              await supabase.from('suppliers').update({ balance: parseFloat(sup.balance) - change }).eq('id', line.supplier_id).eq('user_id', userId);
            }
          }
        }
      }

      await supabase.from('journal_lines').delete().eq('entry_id', entryId);
      await supabase.from('journal_entries').delete().eq('id', entryId).eq('user_id', userId);
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};
