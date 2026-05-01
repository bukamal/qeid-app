const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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
        .from('payments')
        .select('*, invoice:invoices(reference,type), customer:customers(name), supplier:suppliers(name)')
        .eq('user_id', userId)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'POST') {
      const { invoice_id, customer_id, supplier_id, amount, payment_date, notes } = req.body;
      if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'المبلغ مطلوب' });

      // التحقق من عدم تجاوز رصيد الفاتورة (إذا كانت محددة)
      if (invoice_id) {
        const { data: invoice, error: invErr } = await supabase
          .from('invoices')
          .select('total')
          .eq('id', invoice_id)
          .single();
        if (invErr || !invoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });

        const { data: existingPayments, error: payErr } = await supabase
          .from('payments')
          .select('amount')
          .eq('invoice_id', invoice_id);
        if (payErr) throw payErr;

        const paidSoFar = existingPayments?.reduce((s, p) => s + parseFloat(p.amount), 0) || 0;
        const newAmount = parseFloat(amount);
        if (paidSoFar + newAmount > invoice.total) {
          return res.status(400).json({ error: 'المبلغ المدفوع يتجاوز قيمة الفاتورة' });
        }
      }

      const { data, error } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          invoice_id: invoice_id || null,
          customer_id: customer_id || null,
          supplier_id: supplier_id || null,
          amount: parseFloat(amount),
          payment_date: payment_date || new Date().toISOString().split('T')[0],
          notes: notes || null
        })
        .select()
        .single();
      if (error) throw error;

      // تحديث رصيد العميل أو المورد
      if (customer_id) {
        const { data: cust } = await supabase.from('customers').select('balance').eq('id', customer_id).single();
        if (cust) await supabase.from('customers').update({ balance: cust.balance - parseFloat(amount) }).eq('id', customer_id);
      }
      if (supplier_id) {
        const { data: supp } = await supabase.from('suppliers').select('balance').eq('id', supplier_id).single();
        if (supp) await supabase.from('suppliers').update({ balance: supp.balance - parseFloat(amount) }).eq('id', supplier_id);
      }
      return res.json(data);
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'معرف الدفعة مطلوب' });

      const { data: payment, error: fetchErr } = await supabase
        .from('payments')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
      if (fetchErr || !payment) return res.status(404).json({ error: 'الدفعة غير موجودة' });

      // عكس تأثير الدفعة على الرصيد
      if (payment.customer_id) {
        const { data: cust } = await supabase.from('customers').select('balance').eq('id', payment.customer_id).single();
        if (cust) await supabase.from('customers').update({ balance: cust.balance + parseFloat(payment.amount) }).eq('id', payment.customer_id);
      }
      if (payment.supplier_id) {
        const { data: supp } = await supabase.from('suppliers').select('balance').eq('id', payment.supplier_id).single();
        if (supp) await supabase.from('suppliers').update({ balance: supp.balance + parseFloat(payment.amount) }).eq('id', payment.supplier_id);
      }

      await supabase.from('payments').delete().eq('id', id).eq('user_id', userId);
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};
