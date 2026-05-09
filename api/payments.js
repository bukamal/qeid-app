const { createClient } = require('@supabase/supabase-js');
const { setCorsHeaders, getUserId, rateLimitMiddleware } = require('../lib/auth');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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
      // ============ معالجة السندات ============
      if (req.method === 'GET') {
        const { data, error } = await supabase
          .from('vouchers')
          .select('*, customer:customers(name), supplier:suppliers(name)')
          .eq('user_id', userId)
          .order('date', { ascending: false });
        if (error) throw error;
        return res.json(data);
      }

      if (req.method === 'POST') {
        const { type, date, amount, description, reference, customer_id, supplier_id, invoice_id } = req.body;
        if (!type || !['receipt', 'payment', 'expense'].includes(type))
          return res.status(400).json({ error: 'نوع السند غير صحيح' });
        if (!amount || parseFloat(amount) <= 0)
          return res.status(400).json({ error: 'المبلغ مطلوب' });

        const cust = safeParseEntityId(customer_id);
        const supp = safeParseEntityId(supplier_id);

        // توليد ترقيم تلقائي (يمكن نقله إلى RPC لكن نتركه هنا)
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
        const finalReference = reference || `${prefix}-${String(nextNum).padStart(4, '0')}`;

        // استدعاء الدالة الذرية لإنشاء السند
        const { data, error } = await supabase.rpc('create_voucher_full', {
          p_user_id: userId,
          p_type: type,
          p_date: date || new Date().toISOString().split('T')[0],
          p_amount: parseFloat(amount),
          p_description: description,
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

    // ============ الدفعات العادية ============
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('payments')
        .select('*, invoice:invoices(reference,type), customer:customers(name), supplier:suppliers(name)')
        .eq('user_id', userId)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return res.json(data);
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

      // دفعة قديمة غير مرتبطة بسند – تحديث ذري
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
