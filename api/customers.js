const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
    if (req.method === 'GET') {
      initData = req.query.initData;
    } else {
      initData = req.body?.initData;
    }
    const userId = await getUserId(initData);

    if (req.method === 'GET') {
      // جلب العملاء مع رصيدهم الفعلي (مجموع حركاتهم)
      const { data: customers, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (error) throw error;

      // لكل عميل، نحسب رصيده من journal_lines المرتبطة به
      for (let cust of customers) {
        const { data: lines } = await supabase
          .from('journal_lines')
          .select('debit, credit')
          .eq('customer_id', cust.id);

        const totalDebit = lines?.reduce((sum, l) => sum + parseFloat(l.debit), 0) || 0;
        const totalCredit = lines?.reduce((sum, l) => sum + parseFloat(l.credit), 0) || 0;
        cust.balance = totalDebit - totalCredit; // مدين يزيد الرصيد، دائن ينقص
      }

      return res.json(customers);
    } else if (req.method === 'POST') {
      const { name, phone, address } = req.body;
      if (!name) return res.status(400).json({ error: 'اسم العميل مطلوب' });

      const { data, error } = await supabase
        .from('customers')
        .insert({
          user_id: userId,
          name,
          phone: phone || null,
          address: address || null,
          balance: 0
        })
        .select()
        .single();

      if (error) throw error;
      return res.json(data);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};
