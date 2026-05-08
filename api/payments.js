const { createClient } = require('@supabase/supabase-js');
const { setCorsHeaders, getUserId, rateLimitMiddleware } = require('../lib/auth');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function updateCustomerBalance(customerId, userId, change) {
  const { data: cur } = await supabase.from('customers').select('balance').eq('id', customerId).eq('user_id', userId).single();
  if (cur) {
    const newBalance = parseFloat(cur.balance || 0) + change;
    await supabase.from('customers').update({ balance: newBalance }).eq('id', customerId).eq('user_id', userId);
  }
}

async function updateSupplierBalance(supplierId, userId, change) {
  const { data: cur } = await supabase.from('suppliers').select('balance').eq('id', supplierId).eq('user_id', userId).single();
  if (cur) {
    const newBalance = parseFloat(cur.balance || 0) + change;
    await supabase.from('suppliers').update({ balance: newBalance }).eq('id', supplierId).eq('user_id', userId);
  }
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

        const amt = parseFloat(amount);
        const cust = parseInt(customer_id) || null;
        const supp = parseInt(supplier_id) || null;

        // التحقق من تطابق الفاتورة مع العميل/المورد
        if (invoice_id && cust) {
          const { data: inv } = await supabase.from('invoices').select('customer_id').eq('id', invoice_id).single();
          if (inv && inv.customer_id !== cust) {
            return res.status(400).json({ error: 'الفاتورة المختارة لا تخص هذا العميل' });
          }
        }
        if (invoice_id && supp) {
          const { data: inv } = await supabase.from('invoices').select('supplier_id').eq('id', invoice_id).single();
          if (inv && inv.supplier_id !== supp) {
            return res.status(400).json({ error: 'الفاتورة المختارة لا تخص هذا المورد' });
          }
        }

        // توليد ترقيم تلقائي إذا لم يقدم reference
        let finalReference = reference;
        if (!finalReference) {
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
          if (lastVoucher && lastVoucher.reference) {
            const numPart = lastVoucher.reference.split('-')[1];
            const parsed = parseInt(numPart);
            if (!isNaN(parsed)) nextNum = parsed + 1;
          }
          finalReference = `${prefix}-${String(nextNum).padStart(4, '0')}`;
        }

        const { data: voucher, error } = await supabase
          .from('vouchers')
          .insert({
            user_id: userId,
            type,
            date: date || new Date().toISOString().split('T')[0],
            amount: amt,
            description,
            reference: finalReference,
            customer_id: cust,
            supplier_id: supp,
            invoice_id: invoice_id || null
          })
          .select()
          .single();
        if (error) throw error;

        if (type === 'receipt' && cust) {
          await supabase.from('payments').insert({
            user_id: userId,
            customer_id: cust,
            amount: amt,
            payment_date: voucher.date,
            notes: `سند قبض ${voucher.reference} - ${description || ''}`,
            invoice_id: invoice_id || null,
            voucher_id: voucher.id
          });
          await updateCustomerBalance(cust, userId, -amt);
        } else if (type === 'payment' && supp) {
          await supabase.from('payments').insert({
            user_id: userId,
            supplier_id: supp,
            amount: amt,
            payment_date: voucher.date,
            notes: `سند صرف ${voucher.reference} - ${description || ''}`,
            invoice_id: invoice_id || null,
            voucher_id: voucher.id
          });
          await updateSupplierBalance(supp, userId, -amt);
        } else if (type === 'expense') {
          await supabase.from('expenses').insert({
            user_id: userId,
            amount: amt,
            expense_date: voucher.date,
            description: `سند مصروف ${voucher.reference} - ${description || ''}`,
            voucher_id: voucher.id
          });
        }

        return res.json(voucher);
      }

      if (req.method === 'DELETE') {
        const voucherId = req.query.id;
        if (!voucherId) return res.status(400).json({ error: 'معرف السند مطلوب' });

        const { data: voucher, error: fetchErr } = await supabase
          .from('vouchers')
          .select('*')
          .eq('id', voucherId)
          .eq('user_id', userId)
          .single();
        if (fetchErr || !voucher) return res.status(404).json({ error: 'السند غير موجود' });

        // حذف آمن مع تفادي تعديل الرصيد إن لم توجد دفعة
        if (voucher.type === 'receipt' && voucher.customer_id) {
          const { data: pmts } = await supabase.from('payments').select('id').eq('voucher_id', voucherId);
          if (pmts && pmts.length > 0) {
            for (let p of pmts) await supabase.from('payments').delete().eq('id', p.id);
            await updateCustomerBalance(voucher.customer_id, userId, voucher.amount);
          }
          // إذا لم توجد دفعات، لا نعدل الرصيد (تم عكسه مسبقاً)
        } else if (voucher.type === 'payment' && voucher.supplier_id) {
          const { data: pmts } = await supabase.from('payments').select('id').eq('voucher_id', voucherId);
          if (pmts && pmts.length > 0) {
            for (let p of pmts) await supabase.from('payments').delete().eq('id', p.id);
            await updateSupplierBalance(voucher.supplier_id, userId, voucher.amount);
          }
        } else if (voucher.type === 'expense') {
          await supabase.from('expenses').delete().eq('voucher_id', voucherId);
        }

        await supabase.from('vouchers').delete().eq('id', voucherId).eq('user_id', userId);
        return res.json({ success: true });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ============ قسم الدفعات العادية (غير السندات) ============
    // تم إبقاؤها للقراءة والمراجعة فقط - تعطيل الإضافة والحذف المباشر

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('payments')
        .select('*, invoice:invoices(reference,type), customer:customers(name), supplier:suppliers(name)')
        .eq('user_id', userId)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return res.json(data);
    }

    // منع الإضافة المباشرة من الواجهة القديمة (تم إخفاؤها)
    if (req.method === 'POST') {
      return res.status(405).json({ error: 'لا يمكن إضافة دفعة مباشرة. استخدم السندات.' });
    }

    // منع الحذف المباشر للدفعات المرتبطة بسند، والسماح بحذف الدفعات غير المرتبطة مع تحذير (اختياري)
    if (req.method === 'DELETE') {
      const paymentId = req.query.id;
      if (!paymentId) return res.status(400).json({ error: 'معرف الدفعة مطلوب' });

      const { data: payment, error: fetchError } = await supabase.from('payments').select('*').eq('id', paymentId).eq('user_id', userId).single();
      if (fetchError || !payment) return res.status(404).json({ error: 'الدفعة غير موجودة' });

      if (payment.voucher_id) {
        return res.status(400).json({ error: 'هذه الدفعة مرتبطة بسند. لا يمكن حذفها من هنا. احذف السند أولاً.' });
      }

      // دفعة غير مرتبطة بسند (قد تكون من فاتورة مباشرة أو قديمة) نسمح بحذفها مع عكس الرصيد
      if (payment.customer_id) await updateCustomerBalance(payment.customer_id, userId, parseFloat(payment.amount));
      if (payment.supplier_id) await updateSupplierBalance(payment.supplier_id, userId, parseFloat(payment.amount));

      await supabase.from('payments').delete().eq('id', paymentId).eq('user_id', userId);
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};
