const { createClient } = require('@supabase/supabase-js');
const { setCorsHeaders, getUserId } = require('../lib/auth');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let initData = req.method === 'GET' || req.method === 'DELETE' ? req.query.initData : req.body?.initData;
    const userId = await getUserId(initData);

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', userId)
        .order('name');
      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'POST') {
      const { name, phone, address } = req.body;
      if (!name) return res.status(400).json({ error: 'اسم العميل مطلوب' });
      const { data, error } = await supabase
        .from('customers')
        .insert({ user_id: userId, name, phone: phone || null, address: address || null, balance: 0 })
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'PUT') {
      const { id, name, phone, address } = req.body;
      if (!id) return res.status(400).json({ error: 'معرف العميل مطلوب' });
      const { data, error } = await supabase
        .from('customers')
        .update({ name, phone, address })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'DELETE') {
      const customerId = req.query.id;
      if (!customerId) return res.status(400).json({ error: 'معرف العميل مطلوب' });

      const { data: invCheck, error: checkError } = await supabase
        .from('invoices')
        .select('id')
        .eq('customer_id', customerId)
        .limit(1);
      if (checkError) throw checkError;
      if (invCheck && invCheck.length > 0) {
        return res.status(400).json({ error: 'لا يمكن حذف العميل لارتباطه بفواتير' });
      }

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)
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
