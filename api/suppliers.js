const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
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
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('user_id', userId)
        .order('name');
      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'POST') {
      const { name, phone, address } = req.body;
      if (!name) return res.status(400).json({ error: 'اسم المورد مطلوب' });
      const { data, error } = await supabase
        .from('suppliers')
        .insert({ user_id: userId, name, phone: phone || null, address: address || null, balance: 0 })
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'PUT') {
      const { id, name, phone, address } = req.body;
      if (!id) return res.status(400).json({ error: 'معرف المورد مطلوب' });
      const { data, error } = await supabase
        .from('suppliers')
        .update({ name, phone, address })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'DELETE') {
      const supplierId = req.query.id;
      if (!supplierId) return res.status(400).json({ error: 'معرف المورد مطلوب' });

      // منع حذف المورد إذا كانت له فواتير
      const { data: invCheck, error: checkError } = await supabase
        .from('invoices')
        .select('id')
        .eq('supplier_id', supplierId)
        .limit(1);
      if (checkError) throw checkError;
      if (invCheck && invCheck.length > 0) {
        return res.status(400).json({ error: 'لا يمكن حذف المورد لارتباطه بفواتير' });
      }

      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierId)
        .eq('user_id', userId);
      if (error) throw error;
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};
