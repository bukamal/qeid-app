const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
        .from('payments')
        .select('*, invoice:invoices(reference, type), customer:customers(name), supplier:suppliers(name)')
        .eq('user_id', userId)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'POST') {
      const { invoice_id, customer_id, supplier_id, amount, payment_date, notes } = req.body;
      if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'المبلغ مطلوب' });
      const { data, error } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          invoice_id: invoice_id || null,
          customer_id: customer_id || null,
          supplier_id: supplier_id || null,
          amount: parseFloat(amount),
          payment_date: payment_date || new Date().toISOString().split('T')[0],
          notes
        })
        .select()
        .single();
      if (error) throw error;

      // تحديث رصيد العميل أو المورد (إن وجد)
      if (customer_id) {
        const { data: cust } = await supabase.from('customers').select('balance').eq('id', customer_id).eq('user_id', userId).single();
        if (cust) {
          // الدفعة تقلل رصيد العميل (دائن للعميل)
          await supabase.from('customers').update({ balance: parseFloat(cust.balance) - parseFloat(amount) }).eq('id', customer_id).eq('user_id', userId);
        }
      }
      if (supplier_id) {
        const { data: sup } = await supabase.from('suppliers').select('balance').eq('id', supplier_id).eq('user_id', userId).single();
        if (sup) {
          // الدفعة تقلل الالتزام للمورد (مدين للمورد)
          await supabase.from('suppliers').update({ balance: parseFloat(sup.balance) - parseFloat(amount) }).eq('id', supplier_id).eq('user_id', userId);
        }
      }

      return res.json(data);
    }

    if (req.method === 'DELETE') {
      const paymentId = req.query.id;
      if (!paymentId) return res.status(400).json({ error: 'معرف الدفعة مطلوب' });
      const { data: payment, error: fetchError } = await supabase
        .from('payments').select('*').eq('id', paymentId).eq('user_id', userId).single();
      if (fetchError || !payment) return res.status(404).json({ error: 'الدفعة غير موجودة' });

      // عكس تأثير الدفعة على الأرصدة
      if (payment.customer_id) {
        const { data: cust } = await supabase.from('customers').select('balance').eq('id', payment.customer_id).eq('user_id', userId).single();
        if (cust) {
          await supabase.from('customers').update({ balance: parseFloat(cust.balance) + parseFloat(payment.amount) }).eq('id', payment.customer_id).eq('user_id', userId);
        }
      }
      if (payment.supplier_id) {
        const { data: sup } = await supabase.from('suppliers').select('balance').eq('id', payment.supplier_id).eq('user_id', userId).single();
        if (sup) {
          await supabase.from('suppliers').update({ balance: parseFloat(sup.balance) + parseFloat(payment.amount) }).eq('id', payment.supplier_id).eq('user_id', userId);
        }
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
