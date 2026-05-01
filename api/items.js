const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function verifyTelegramData(initData) {
  if (!initData) return false;
  const BOT_TOKEN = process.env.BOT_TOKEN;
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

  try {
    let initData = req.method === 'GET' || req.method === 'DELETE' ? req.query.initData : req.body?.initData;
    const userId = await getUserId(initData);

    if (req.method === 'GET') {
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('*, category:categories(name)')
        .eq('user_id', userId)
        .order('name');
      if (itemsError) throw itemsError;

      const { data: invoiceLines, error: linesError } = await supabase
        .from('invoice_lines')
        .select('item_id, quantity, invoice:invoices!inner(type)')
        .eq('invoice.user_id', userId)
        .not('item_id', 'is', null);
      if (linesError) throw linesError;

      const qtyMap = {};
      for (const line of invoiceLines) {
        const { item_id, quantity, invoice } = line;
        if (!item_id) continue;
        if (!qtyMap[item_id]) qtyMap[item_id] = { purchase: 0, sale: 0 };
        if (invoice.type === 'purchase') qtyMap[item_id].purchase += parseFloat(quantity) || 0;
        else if (invoice.type === 'sale') qtyMap[item_id].sale += parseFloat(quantity) || 0;
      }

      const enrichedItems = items.map(item => {
        const q = qtyMap[item.id] || { purchase: 0, sale: 0 };
        const available = q.purchase - q.sale;
        const totalValue = available * (parseFloat(item.purchase_price) || 0);
        return {
          ...item,
          purchase_qty: q.purchase,
          sale_qty: q.sale,
          available: available,
          total_value: totalValue
        };
      });

      return res.json(enrichedItems);
    }

    if (req.method === 'POST') {
      const { name, category_id, item_type, purchase_price, selling_price, quantity, item_units } = req.body;
      if (!name) return res.status(400).json({ error: 'اسم المادة مطلوب' });
      const { data, error } = await supabase
        .from('items')
        .insert({
          user_id: userId,
          name: name.trim(),
          category_id: category_id || null,
          item_type: item_type || 'مخزون',
          purchase_price: parseFloat(purchase_price) || 0,
          selling_price: parseFloat(selling_price) || 0,
          quantity: parseFloat(quantity) || 0
        })
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'PUT') {
      const { id, name, category_id, item_type, purchase_price, selling_price, quantity, item_units } = req.body;
      if (!id) return res.status(400).json({ error: 'معرف المادة مطلوب' });
      const { data, error } = await supabase
        .from('items')
        .update({
          name: name?.trim(),
          category_id: category_id || null,
          item_type,
          purchase_price: parseFloat(purchase_price) || 0,
          selling_price: parseFloat(selling_price) || 0,
          quantity: parseFloat(quantity) || 0
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'معرف المادة مطلوب' });
      await supabase.from('item_units').delete().eq('item_id', id);
      const { error } = await supabase.from('items').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};
