const { supabase } = require('../lib/supabase');
const { setCorsHeaders, getUserId, rateLimitMiddleware } = require('../lib/auth');
const { escapeHtml } = require('../lib/sanitize');

function safeParseEntityId(value) {
  if (value === null || value === undefined || value === '' || value === 'cash') return null;
  const num = parseInt(value, 10);
  return Number.isNaN(num) ? null : num;
}

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const allowed = await rateLimitMiddleware(req, res, 'payments');
  if (!allowed) return;

  try {
    let initData = req.method === 'GET' || req.method === 'DELETE' ? req.query.initData : req.body?.initData;
    const userId = await getUserId(initData);
    
    const isVoucherRequest = (req.method === 'GET' || req.method === 'DELETE')
      ? req.query.voucher === '1'
      : req.body?.voucher === true;

    if (isVoucherRequest) {
      if (req.method === 'GET') {
        const { data, error } = await supabase
          .from('vouchers')
          .select('*, customer:customers(name), supplier:suppliers(name)')
          .eq('user_id', userId)
          .order('date', { ascending: false });
        if (error) throw error;
        const safeData = data.map(v => ({
          ...v,
          description: v.description ? escapeHtml(v.description) : null,
          reference: v.reference ? escapeHtml(v.reference) : null,
          customer: v.customer ? { name: escapeHtml(v.customer.name) } : null,
          supplier: v.supplier ? { name: escapeHtml(v.supplier.name) } : null
        }));
        return res.json(safeData);
      }

      if (req.method === 'POST') {
        const { type, date, amount, description, reference, customer_id, supplier_id, invoice_id } = req.body;
        if (!type || !['receipt', 'payment', 'expense'].includes(type))
          return res.status(400).json({ error: 'نوع السند غير صحيح' });
        if (!amount || parseFloat(amount) <= 0)
          return res.status(400).json({ error: 'المبلغ مطلوب' });

        const cust = safeParseEntityId(customer_id);
        const supp = safeParseEntityId(supplier_id);

        const prefix = type === 'receipt' ? 'SC' : type === 'payment' ? 'SP' : 'SE';
        const { data: lastVoucher } = await supabase
          .from('vouchers')
          .select('reference')
          .eq('user_id', userId)
          .eq('type', type)
          .ilike('reference', prefix + '-%')
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();
        let nextNum = 1;
        if (lastVoucher?.reference) {
          const numPart = lastVoucher.reference.split('-')[1];
          const parsed = parseInt(numPart);
          if (!isNaN(parsed)) nextNum = parsed + 1;
        }
        const finalReference = reference ? escapeHtml(reference) : `${prefix}-${String(nextNum).padStart(4, '0')}`;
        const escapedDescription = description ? escapeHtml(description) : null;

        const { data, error } = await supabase.rpc('create_voucher_full', {
          p_user_id: userId,
          p_type: type,
          p_date: date || new Date().toISOString().split('T')[0],
          p_amount: parseFloat(amount),
          p_description: escapedDescription,
          p_reference: finalReference,
          p_customer_id: cust,
          p_supplier_id: supp,
          p_invoice_id: invoice_id || null
        });
        if (error) throw error;
        return res.json(data);
      }

      if (req.method === 'DELETE') {
        const voucherId = req.query.id;
        if (!voucherId) return res.status(400).json({ error: 'معرف السند مطلوب' });

        const { error } = await supabase.rpc('delete_voucher_full', {
          p_voucher_id: voucherId,
          p_user_id: userId
        });
        if (error) throw error;
        return res.json({ success: true });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Legacy payments (non-voucher)
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('payments')
        .select('*, invoice:invoices(reference,type), customer:customers(name), supplier:suppliers(name)')
        .eq('user_id', userId)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      const safeData = data.map(p => ({
        ...p,
        notes: p.notes ? escapeHtml(p.notes) : null,
        customer: p.customer ? { name: escapeHtml(p.customer.name) } : null,
        supplier: p.supplier ? { name: escapeHtml(p.supplier.name) } : null
      }));
      return res.json(safeData);
    }

    if (req.method === 'POST') {
      return res.status(405).json({ error: 'لا يمكن إضافة دفعة مباشرة. استخدم السندات.' });
    }

    if (req.method === 'DELETE') {
      const paymentId = req.query.id;
      if (!paymentId) return res.status(400).json({ error: 'معرف الدفعة مطلوب' });

      const { data: payment } = await supabase.from('payments').select('*').eq('id', paymentId).eq('user_id', userId).single();
      if (!payment) return res.status(404).json({ error: 'الدفعة غير موجودة' });

      if (payment.voucher_id) {
        return res.status(400).json({ error: 'هذه الدفعة مرتبطة بسند. لا يمكن حذفها من هنا.' });
      }

      if (payment.customer_id) {
        await supabase.rpc('update_customer_balance', { p_customer_id: payment.customer_id, p_user_id: userId, p_change: payment.amount });
      }
      if (payment.supplier_id) {
        await supabase.rpc('update_supplier_balance', { p_supplier_id: payment.supplier_id, p_user_id: userId, p_change: payment.amount });
      }

      await supabase.from('payments').delete().eq('id', paymentId).eq('user_id', userId);
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};
