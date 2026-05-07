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

      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', userId)
        .ilike('name', name.trim())
        .maybeSingle();
      if (existing) return res.status(400).json({ error: 'يوجد عميل بنفس الاسم' });

      const { data, error } = await supabase
        .from('customers')
        .insert({ user_id: userId, name: name.trim(), phone: phone || null, address: address || null, balance: 0 })
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'PUT') {
      const { id, name, phone, address } = req.body;
      if (!id) return res.status(400).json({ error: 'معرف العميل مطلوب' });

      if (name) {
        const { data: existing } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', userId)
          .ilike('name', name.trim())
          .neq('id', id)
          .maybeSingle();
        if (existing) return res.status(400).json({ error: 'يوجد عميل آخر بنفس الاسم' });
      }

      const { data, error } = await supabase
        .from('customers')
        .update({ name: name?.trim(), phone, address })
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

      const { data: invoiceCheck } = await supabase
        .from('invoices')
        .select('id')
        .eq('customer_id', customerId)
        .limit(1);
      if (invoiceCheck && invoiceCheck.length > 0) {
        return res.status(400).json({ error: 'لا يمكن حذف العميل لارتباطه بفواتير' });
      }

      const { data: paymentCheck } = await supabase
        .from('payments')
        .select('id')
        .eq('customer_id', customerId)
        .limit(1);
      if (paymentCheck && paymentCheck.length > 0) {
        return res.status(400).json({ error: 'لا يمكن حذف العميل لارتباطه بدفعات' });
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
