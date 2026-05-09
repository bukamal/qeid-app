const { supabase } = require('../lib/supabase');
const { setCorsHeaders, getUserId, rateLimitMiddleware } = require('../lib/auth');
const { escapeHtml } = require('../lib/sanitize');

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const allowed = await rateLimitMiddleware(req, res, 'suppliers');
  if (!allowed) return;

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
      const safeData = data.map(s => ({ ...s, name: escapeHtml(s.name), phone: s.phone ? escapeHtml(s.phone) : null, address: s.address ? escapeHtml(s.address) : null }));
      return res.json(safeData);
    }

    if (req.method === 'POST') {
      const { name, phone, address } = req.body;
      if (!name) return res.status(400).json({ error: 'اسم المورد مطلوب' });

      const trimmedName = name.trim();
      const escapedName = escapeHtml(trimmedName);
      const escapedPhone = phone ? escapeHtml(phone) : null;
      const escapedAddress = address ? escapeHtml(address) : null;

      const { data: existing } = await supabase
        .from('suppliers')
        .select('id')
        .eq('user_id', userId)
        .ilike('name', trimmedName)
        .maybeSingle();
      if (existing) return res.status(400).json({ error: 'يوجد مورد بنفس الاسم' });

      const { data, error } = await supabase
        .from('suppliers')
        .insert({ user_id: userId, name: escapedName, phone: escapedPhone, address: escapedAddress, balance: 0 })
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'PUT') {
      const { id, name, phone, address } = req.body;
      if (!id) return res.status(400).json({ error: 'معرف المورد مطلوب' });

      if (name) {
        const trimmedName = name.trim();
        const { data: existing } = await supabase
          .from('suppliers')
          .select('id')
          .eq('user_id', userId)
          .ilike('name', trimmedName)
          .neq('id', id)
          .maybeSingle();
        if (existing) return res.status(400).json({ error: 'يوجد مورد آخر بنفس الاسم' });
      }

      const updates = {};
      if (name) updates.name = escapeHtml(name.trim());
      if (phone !== undefined) updates.phone = phone ? escapeHtml(phone) : null;
      if (address !== undefined) updates.address = address ? escapeHtml(address) : null;

      const { data, error } = await supabase
        .from('suppliers')
        .update(updates)
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

      const { data: invoiceCheck } = await supabase
        .from('invoices')
        .select('id')
        .eq('supplier_id', supplierId)
        .limit(1);
      if (invoiceCheck && invoiceCheck.length > 0) {
        return res.status(400).json({ error: 'لا يمكن حذف المورد لارتباطه بفواتير' });
      }

      const { data: paymentCheck } = await supabase
        .from('payments')
        .select('id')
        .eq('supplier_id', supplierId)
        .limit(1);
      if (paymentCheck && paymentCheck.length > 0) {
        return res.status(400).json({ error: 'لا يمكن حذف المورد لارتباطه بدفعات' });
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
