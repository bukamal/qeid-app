const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
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

// دوال مساعدة لتحديث الأرصدة
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

      const { data, error } = await supabase.from('payments').insert({
        user_id: userId,
        invoice_id: invoice_id || null,
        customer_id: customer_id || null,
        supplier_id: supplier_id || null,
        amount: parseFloat(amount),
        payment_date: payment_date || new Date().toISOString().split('T')[0],
        notes
      }).select().single();
      if (error) throw error;

      if (customer_id) {
        await updateCustomerBalance(customer_id, userId, -parseFloat(amount));
      }
      if (supplier_id) {
        await updateSupplierBalance(supplier_id, userId, -parseFloat(amount));
      }

      return res.json(data);
    }

    if (req.method === 'DELETE') {
      const paymentId = req.query.id;
      if (!paymentId) return res.status(400).json({ error: 'معرف الدفعة مطلوب' });

      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .eq('user_id', userId)
        .single();
      if (fetchError || !payment) return res.status(404).json({ error: 'الدفعة غير موجودة' });

      // عكس أثر الدفعة
      if (payment.customer_id) {
        await updateCustomerBalance(payment.customer_id, userId, parseFloat(payment.amount));
      }
      if (payment.supplier_id) {
        await updateSupplierBalance(payment.supplier_id, userId, parseFloat(payment.amount));
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
