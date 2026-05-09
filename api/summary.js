const { supabase } = require('../lib/supabase');
const { setCorsHeaders, getUserId, rateLimitMiddleware } = require('../lib/auth');

// ========== دوال مساعدة لقراءة الأرصدة من جدول account_balances ==========
async function getBalanceFromTable(accountType, entityId = null, asOfDate = null) {
  const date = asOfDate || new Date().toISOString().split('T')[0];
  let query = supabase
    .from('account_balances')
    .select('balance')
    .eq('account_type', accountType)
    .eq('as_of_date', date);
  if (entityId !== null && entityId !== undefined) {
    query = query.eq('entity_id', entityId);
  } else {
    query = query.is('entity_id', null);
  }
  const { data, error } = await query.maybeSingle();
  if (error) {
    console.warn(`getBalanceFromTable error: ${error.message}`);
    return 0;
  }
  return data ? parseFloat(data.balance) : 0;
}

async function getTotalCustomerBalance(userId, asOfDate) {
  let total = await getBalanceFromTable('receivables', null, asOfDate);
  if (total !== 0) return total;
  const { data: customers } = await supabase
    .from('customers')
    .select('balance')
    .eq('user_id', userId);
  return customers?.reduce((s, c) => s + parseFloat(c.balance), 0) || 0;
}

async function getTotalSupplierBalance(userId, asOfDate) {
  let total = await getBalanceFromTable('payables', null, asOfDate);
  if (total !== 0) return total;
  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('balance')
    .eq('user_id', userId);
  return suppliers?.reduce((s, s2) => s + parseFloat(s2.balance), 0) || 0;
}
// ========== نهاية الدوال المساعدة ==========

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const allowed = await rateLimitMiddleware(req, res, 'default');
  if (!allowed) return;

  try {
    const initData = req.query.initData;
    const userId = await getUserId(initData);
    const asOfDate = req.query.as_of_date || new Date().toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    // استخدام الأرصدة المخزنة مسبقاً (محسنة)
    const cashBalance = await getBalanceFromTable('cash', null, asOfDate);
    const receivables = await getTotalCustomerBalance(userId, asOfDate);
    const payables = await getTotalSupplierBalance(userId, asOfDate);
    const totalSales = await getBalanceFromTable('sales', null, asOfDate);
    const totalPurchases = await getBalanceFromTable('purchases', null, asOfDate);
    const totalGeneralExpenses = await getBalanceFromTable('expenses', null, asOfDate);
    
    // تكلفة المبيعات: نستخدم المشتريات كتقريب بسيط، يمكن تحسينها لاحقاً
    const costOfSales = totalPurchases;
    const netProfit = totalSales - costOfSales - totalGeneralExpenses;

    // البيانات اليومية (لا تزال بحاجة لجمع مباشر لأنها محدودة النطاق)
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, customer_id, supplier_id, payment_date')
      .eq('user_id', userId);
    const received = payments?.filter(p => p.customer_id)
      .reduce((s, p) => s + parseFloat(p.amount || 0), 0) || 0;
    const paid = payments?.filter(p => p.supplier_id)
      .reduce((s, p) => s + parseFloat(p.amount || 0), 0) || 0;

    const { data: cashInvoices } = await supabase
      .from('invoices')
      .select('total, type, date')
      .eq('user_id', userId)
      .is('customer_id', null)
      .is('supplier_id', null);
    let cashSales = 0, cashPurchases = 0;
    cashInvoices?.forEach(inv => {
      if (inv.type === 'sale') cashSales += parseFloat(inv.total || 0);
      else if (inv.type === 'purchase') cashPurchases += parseFloat(inv.total || 0);
    });
    const cashBalanceFromFlow = (received + cashSales) - (paid + cashPurchases);

    // اليومي (لللوحة)
    const { data: todayCustomerPayments } = await supabase
      .from('payments').select('amount').eq('user_id', userId).not('customer_id', 'is', null).eq('payment_date', today);
    const todayReceived = todayCustomerPayments?.reduce((s, p) => s + parseFloat(p.amount), 0) || 0;
    const { data: todaySupplierPayments } = await supabase
      .from('payments').select('amount').eq('user_id', userId).not('supplier_id', 'is', null).eq('payment_date', today);
    const todayPaid = todaySupplierPayments?.reduce((s, p) => s + parseFloat(p.amount), 0) || 0;
    const { data: todayCashInvoices } = await supabase
      .from('invoices').select('total, type').eq('user_id', userId)
      .is('customer_id', null).is('supplier_id', null).eq('date', today);
    let todayCashSales = 0, todayCashPurchases = 0;
    todayCashInvoices?.forEach(inv => {
      if (inv.type === 'sale') todayCashSales += parseFloat(inv.total || 0);
      else if (inv.type === 'purchase') todayCashPurchases += parseFloat(inv.total || 0);
    });
    const dailyCashBalance = (todayReceived + todayCashSales) - (todayPaid + todayCashPurchases);

    // البيانات الشهرية (محسنة باستخدام الأرصدة إن أمكن، لكن نبقي الحساب المباشر للتفاصيل)
    // للحصول على أرباح شهرية فعلية، نستخدم نفس منطق reports.js
    const { data: allInvoices } = await supabase
      .from('invoices')
      .select('id, type, total, date')
      .eq('user_id', userId);
    const { data: allExpenses } = await supabase
      .from('expenses')
      .select('amount, expense_date')
      .eq('user_id', userId);

    const saleInvoices = allInvoices?.filter(inv => inv.type === 'sale') || [];
    let costByInvoice = {};
    if (saleInvoices.length) {
      const saleIds = saleInvoices.map(inv => inv.id);
      const { data: saleLines } = await supabase
        .from('invoice_lines')
        .select('invoice_id, cost_amount')
        .in('invoice_id', saleIds);
      saleLines?.forEach(line => {
        costByInvoice[line.invoice_id] = (costByInvoice[line.invoice_id] || 0) + (parseFloat(line.cost_amount) || 0);
      });
    }

    const monthly = {};
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push(key);
      monthly[key] = { sales: 0, purchases: 0, cost_of_sales: 0, expenses: 0 };
    }

    allInvoices?.forEach(inv => {
      if (!inv.date) return;
      const key = inv.date.substring(0, 7);
      if (monthly[key]) {
        if (inv.type === 'sale') {
          monthly[key].sales += parseFloat(inv.total || 0);
          monthly[key].cost_of_sales += costByInvoice[inv.id] || 0;
        } else if (inv.type === 'purchase') {
          monthly[key].purchases += parseFloat(inv.total || 0);
        }
      }
    });

    allExpenses?.forEach(ex => {
      if (!ex.expense_date) return;
      const key = ex.expense_date.substring(0, 7);
      if (monthly[key]) monthly[key].expenses += parseFloat(ex.amount || 0);
    });

    // الأرباح اليومية
    const dailyProfitMap = {};
    allInvoices?.forEach(inv => {
      if (!inv.date) return;
      const day = inv.date;
      if (!dailyProfitMap[day]) dailyProfitMap[day] = 0;
      if (inv.type === 'sale') {
        const cost = costByInvoice[inv.id] || 0;
        dailyProfitMap[day] += parseFloat(inv.total || 0) - cost;
      }
    });
    allExpenses?.forEach(ex => {
      if (!ex.expense_date) return;
      const day = ex.expense_date;
      if (!dailyProfitMap[day]) dailyProfitMap[day] = 0;
      dailyProfitMap[day] -= parseFloat(ex.amount || 0);
    });
    const dailyDates = Object.keys(dailyProfitMap).sort();
    const dailyProfits = dailyDates.map(d => dailyProfitMap[d]);

    res.json({
      net_profit: netProfit,
      cash_balance: cashBalanceFromFlow, // نفضل الحساب المباشر للصندوق لأنه أكثر دقة
      receivables: receivables,
      payables: payables,
      daily_cash_balance: dailyCashBalance,
      total_sales: totalSales,
      total_purchases: totalPurchases,
      cost_of_sales: costOfSales,
      total_expenses: totalGeneralExpenses,
      monthly: {
        labels: months,
        sales: months.map(m => monthly[m].sales),
        purchases: months.map(m => monthly[m].purchases),
        net_profit: months.map(m => monthly[m].sales - monthly[m].cost_of_sales - monthly[m].expenses),
        expenses: months.map(m => monthly[m].expenses),
        payments_in: months.map(() => 0), // يمكن إضافتها لاحقاً
        payments_out: months.map(() => 0)
      },
      daily: {
        dates: dailyDates,
        profits: dailyProfits
      }
    });
  } catch (err) {
    console.error('Summary error:', err);
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};
