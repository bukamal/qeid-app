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
        .from('items').select('*, category:categories(name)')
        .eq('user_id', userId).order('name');
      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'POST') {
      const { name, category_id, item_type, purchase_price, selling_price, quantity } = req.body;
      if (!name) return res.status(400).json({ error: 'اسم المادة مطلوب' });
      const { data, error } = await supabase
        .from('items').insert({
          user_id: userId, name, category_id: category_id || null,
          item_type: item_type || 'مخزون',
          purchase_price: purchase_price || 0,
          selling_price: selling_price || 0,
          quantity: quantity || 0
        }).select().single();
      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'PUT') {
      const { id, name, category_id, item_type, purchase_price, selling_price, quantity } = req.body;
      if (!id) return res.status(400).json({ error: 'معرف المادة مطلوب' });
      const { data, error } = await supabase
        .from('items').update({
          name, category_id: category_id || null,
          item_type, purchase_price, selling_price, quantity
        }).eq('id', id).eq('user_id', userId).select().single();
      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'DELETE') {
      const itemId = req.query.id;
      if (!itemId) return res.status(400).json({ error: 'معرف المادة مطلوب' });
      const { error } = await supabase
        .from('items').delete().eq('id', itemId).eq('user_id', userId);
      if (error) throw error;
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};
