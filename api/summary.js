const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function verifyTelegramData(initData) {
  if (!initData) return false;
  const BOT_TOKEN = process.env.BOT_TOKEN;
  const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');
  const pairs = Array.from(params.entries()).sort((a,b) => a[0].localeCompare(b[0]));
  const dataCheckString = pairs.map(([k,v]) => `${k}=${v}`).join('\n');
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
    const initData = req.query.initData;
    const userId = await getUserId(initData);

    // 1. صافي الربح
    const { data: invoices } = await supabase
      .from('invoices')
      .select('type, total')
      .eq('user_id', userId);

    const totalSales = invoices?.filter(inv => inv.type === 'sale')
      .reduce((s, inv) => s + parseFloat(inv.total||0), 0) || 0;
    const totalPurchases = invoices?.filter(inv => inv.type === 'purchase')
      .reduce((s, inv) => s + parseFloat(inv.total||0), 0) || 0;
    const netProfit = totalSales - totalPurchases;

    // 2. رصيد الصندوق
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, customer_id, supplier_id')
      .eq('user_id', userId);

    const received = payments?.filter(p => p.customer_id)
      .reduce((s, p) => s + parseFloat(p.amount||0), 0) || 0;
    const paid = payments?.filter(p => p.supplier_id)
      .reduce((s, p) => s + parseFloat(p.amount||0), 0) || 0;

    const { data: cashInvoices } = await supabase
      .from('invoices')
      .select('total, type')
      .eq('user_id', userId)
      .is('customer_id', null)
      .is('supplier_id', null);

    let cashSales = 0, cashPurchases = 0;
    cashInvoices?.forEach(inv => {
      if (inv.type === 'sale') cashSales += parseFloat(inv.total||0);
      else if (inv.type === 'purchase') cashPurchases += parseFloat(inv.total||0);
    });

    const cashBalance = (received + cashSales) - (paid + cashPurchases);

    // 3. الذمم المدينة
    const { data: customers } = await supabase
      .from('customers')
      .select('balance')
      .eq('user_id', userId);
    const receivables = customers?.reduce((s, c) => s + parseFloat(c.balance||0), 0) || 0;

    // 4. الذمم الدائنة
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('balance')
      .eq('user_id', userId);
    const payables = suppliers?.reduce((s, s2) => s + parseFloat(s2.balance||0), 0) || 0;

    res.json({
      net_profit: netProfit,
      cash_balance: cashBalance,
      receivables: receivables,
      payables: payables
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};
