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
    const today = new Date().toISOString().split('T')[0];

    // --- 1. الفواتير ---
    const { data: invoices } = await supabase
      .from('invoices')
      .select('type, total, date')
      .eq('user_id', userId);

    const totalSales = invoices?.filter(inv => inv.type === 'sale')
      .reduce((s, inv) => s + parseFloat(inv.total||0), 0) || 0;
    const totalPurchases = invoices?.filter(inv => inv.type === 'purchase')
      .reduce((s, inv) => s + parseFloat(inv.total||0), 0) || 0;
    const netProfit = totalSales - totalPurchases;

    // --- 2. المدفوعات ---
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, customer_id, supplier_id, payment_date')
      .eq('user_id', userId);

    const received = payments?.filter(p => p.customer_id).reduce((s, p) => s + parseFloat(p.amount||0), 0) || 0;
    const paid = payments?.filter(p => p.supplier_id).reduce((s, p) => s + parseFloat(p.amount||0), 0) || 0;

    // فواتير نقدية
    const { data: cashInvoices } = await supabase
      .from('invoices')
      .select('total, type, date')
      .eq('user_id', userId)
      .is('customer_id', null)
      .is('supplier_id', null);

    let cashSales = 0, cashPurchases = 0;
    cashInvoices?.forEach(inv => {
      if (inv.type === 'sale') cashSales += parseFloat(inv.total||0);
      else if (inv.type === 'purchase') cashPurchases += parseFloat(inv.total||0);
    });

    const cashBalance = (received + cashSales) - (paid + cashPurchases);

    // --- 3. الذمم ---
    const { data: customers } = await supabase.from('customers').select('balance').eq('user_id', userId);
    const { data: suppliers } = await supabase.from('suppliers').select('balance').eq('user_id', userId);
    const receivables = customers?.reduce((s, c) => s + parseFloat(c.balance||0), 0) || 0;
    const payables = suppliers?.reduce((s, s2) => s + parseFloat(s2.balance||0), 0) || 0;

    // --- 4. رصيد الصندوق اليومي ---
    const { data: todayCustomerPayments } = await supabase
      .from('payments').select('amount').eq('user_id', userId).not('customer_id', 'is', null).eq('payment_date', today);
    const todayReceived = todayCustomerPayments?.reduce((s, p) => s + parseFloat(p.amount), 0) || 0;

    const { data: todaySupplierPayments } = await supabase
      .from('payments').select('amount').eq('user_id', userId).not('supplier_id', 'is', null).eq('payment_date', today);
    const todayPaid = todaySupplierPayments?.reduce((s, p) => s + parseFloat(p.amount), 0) || 0;

    const { data: todayCashInvoices } = await supabase
      .from('invoices').select('total, type').eq('user_id', userId).is('customer_id', null).is('supplier_id', null).eq('date', today);
    let todayCashSales = 0, todayCashPurchases = 0;
    todayCashInvoices?.forEach(inv => {
      if (inv.type === 'sale') todayCashSales += parseFloat(inv.total||0);
      else if (inv.type === 'purchase') todayCashPurchases += parseFloat(inv.total||0);
    });
    const dailyCashBalance = (todayReceived + todayCashSales) - (todayPaid + todayCashPurchases);

    // --- 5. بيانات المخططات الشهرية (آخر 6 أشهر) ---
    const { data: allInvoices } = await supabase
      .from('invoices')
      .select('type, total, date')
      .eq('user_id', userId);

    const { data: allPayments } = await supabase
      .from('payments')
      .select('amount, payment_date, customer_id, supplier_id')
      .eq('user_id', userId);

    const { data: allExpenses } = await supabase
      .from('expenses')
      .select('amount, expense_date')
      .eq('user_id', userId);

    const monthly = {};
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      months.push(key);
      monthly[key] = { sales: 0, purchases: 0, payments_in: 0, payments_out: 0, expenses: 0 };
    }

    allInvoices?.forEach(inv => {
      if (!inv.date) return;
      const key = inv.date.substring(0,7);
      if (monthly[key]) {
        if (inv.type === 'sale') monthly[key].sales += parseFloat(inv.total||0);
        else if (inv.type === 'purchase') monthly[key].purchases += parseFloat(inv.total||0);
      }
    });

    allPayments?.forEach(p => {
      if (!p.payment_date) return;
      const key = p.payment_date.substring(0,7);
      if (monthly[key]) {
        if (p.customer_id) monthly[key].payments_in += parseFloat(p.amount||0);
        if (p.supplier_id) monthly[key].payments_out += parseFloat(p.amount||0);
      }
    });

    allExpenses?.forEach(ex => {
      if (!ex.expense_date) return;
      const key = ex.expense_date.substring(0,7);
      if (monthly[key]) monthly[key].expenses += parseFloat(ex.amount||0);
    });

    // --- 6. بيانات الأرباح اليومية (كل الأيام) ---
    const { data: dailyInvoices } = await supabase
      .from('invoices')
      .select('type, total, date')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    const { data: dailyExpensesForChart } = await supabase
      .from('expenses')
      .select('amount, expense_date')
      .eq('user_id', userId);

    const daily = {};
    dailyInvoices?.forEach(inv => {
      if (!inv.date) return;
      const day = inv.date;
      if (!daily[day]) daily[day] = 0;
      if (inv.type === 'sale') daily[day] += parseFloat(inv.total||0);
      else if (inv.type === 'purchase') daily[day] -= parseFloat(inv.total||0);
    });
    dailyExpensesForChart?.forEach(ex => {
      if (!ex.expense_date) return;
      const day = ex.expense_date;
      if (!daily[day]) daily[day] = 0;
      daily[day] -= parseFloat(ex.amount||0);
    });

    const dates = Object.keys(daily).sort();
    const profits = dates.map(d => daily[d]);

    // --- 7. تجميع الرد ---
    res.json({
      net_profit: netProfit,
      cash_balance: cashBalance,
      receivables: receivables,
      payables: payables,
      daily_cash_balance: dailyCashBalance,
      total_sales: totalSales,
      total_purchases: totalPurchases,
      monthly: {
        labels: months,
        sales: months.map(m => monthly[m].sales),
        purchases: months.map(m => monthly[m].purchases),
        net_profit: months.map(m => monthly[m].sales - monthly[m].purchases - monthly[m].expenses),
        payments_in: months.map(m => monthly[m].payments_in),
        payments_out: months.map(m => monthly[m].payments_out),
        expenses: months.map(m => monthly[m].expenses)
      },
      daily: {
        dates: dates,
        profits: profits
      }
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};
