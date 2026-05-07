const { createClient } = require('@supabase/supabase-js');
const { setCorsHeaders, getUserId } = require('../lib/auth');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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
      .select('id, type, total, date')
      .eq('user_id', userId);

    const totalSales = invoices?.filter(inv => inv.type === 'sale')
      .reduce((s, inv) => s + parseFloat(inv.total || 0), 0) || 0;
    const totalPurchases = invoices?.filter(inv => inv.type === 'purchase')
      .reduce((s, inv) => s + parseFloat(inv.total || 0), 0) || 0;

    // --- 2. حساب تكلفة المبيعات (من فواتير البيع فقط) ---
    const saleInvoices = invoices?.filter(inv => inv.type === 'sale') || [];
    let costOfSales = 0;
    if (saleInvoices.length > 0) {
      const saleIds = saleInvoices.map(inv => inv.id);
      const { data: saleLines } = await supabase
        .from('invoice_lines')
        .select('quantity, quantity_in_base, item:items(purchase_price)')
        .in('invoice_id', saleIds);
      if (saleLines) {
        for (const line of saleLines) {
          const qtyBase = parseFloat(line.quantity_in_base ?? line.quantity ?? 0);
          const purchasePrice = parseFloat(line.item?.purchase_price || 0);
          costOfSales += qtyBase * purchasePrice;
        }
      }
    }

    // --- 3. المصاريف العامة ---
    const { data: expensesData } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', userId);
    const totalGeneralExpenses = expensesData?.reduce((s, ex) => s + parseFloat(ex.amount), 0) || 0;

    // صافي الربح = المبيعات - تكلفة المبيعات - المصاريف العامة
    const netProfit = totalSales - costOfSales - totalGeneralExpenses;

    // --- 4. المدفوعات ---
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, customer_id, supplier_id, payment_date')
      .eq('user_id', userId);

    const received = payments?.filter(p => p.customer_id)
      .reduce((s, p) => s + parseFloat(p.amount || 0), 0) || 0;
    const paid = payments?.filter(p => p.supplier_id)
      .reduce((s, p) => s + parseFloat(p.amount || 0), 0) || 0;

    // فواتير نقدية
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

    const cashBalance = (received + cashSales) - (paid + cashPurchases);

    // --- 5. الذمم ---
    const { data: customers } = await supabase.from('customers').select('balance').eq('user_id', userId);
    const { data: suppliers } = await supabase.from('suppliers').select('balance').eq('user_id', userId);
    const receivables = customers?.reduce((s, c) => s + parseFloat(c.balance || 0), 0) || 0;
    const payables = suppliers?.reduce((s, s2) => s + parseFloat(s2.balance || 0), 0) || 0;

    // --- 6. رصيد الصندوق اليومي (كما هو) ---
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

    // --- 7. بيانات المخططات الشهرية (آخر 6 أشهر) ---
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
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push(key);
      monthly[key] = { sales: 0, purchases: 0, payments_in: 0, payments_out: 0, expenses: 0 };
    }

    allInvoices?.forEach(inv => {
      if (!inv.date) return;
      const key = inv.date.substring(0, 7);
      if (monthly[key]) {
        if (inv.type === 'sale') monthly[key].sales += parseFloat(inv.total || 0);
        else if (inv.type === 'purchase') monthly[key].purchases += parseFloat(inv.total || 0);
      }
    });

    allPayments?.forEach(p => {
      if (!p.payment_date) return;
      const key = p.payment_date.substring(0, 7);
      if (monthly[key]) {
        if (p.customer_id) monthly[key].payments_in += parseFloat(p.amount || 0);
        if (p.supplier_id) monthly[key].payments_out += parseFloat(p.amount || 0);
      }
    });

    allExpenses?.forEach(ex => {
      if (!ex.expense_date) return;
      const key = ex.expense_date.substring(0, 7);
      if (monthly[key]) monthly[key].expenses += parseFloat(ex.amount || 0);
    });

    // --- 8. بيانات الأرباح اليومية (صافي الربح اليومي الحقيقي) ---
    const { data: dailyInvoices } = await supabase
      .from('invoices')
      .select('id, type, total, date')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    const { data: dailyExpensesForChart } = await supabase
      .from('expenses')
      .select('amount, expense_date')
      .eq('user_id', userId);

    // تجميع تكلفة المبيعات اليومية (سنحسبها من السطور)
    const { data: allSaleLines } = await supabase
      .from('invoice_lines')
      .select('quantity, quantity_in_base, invoice_id, item:items(purchase_price)')
      .in('invoice_id', saleInvoices.map(inv => inv.id));

    const costByInvoice = {};
    if (allSaleLines) {
      for (const line of allSaleLines) {
        const qtyBase = parseFloat(line.quantity_in_base ?? line.quantity ?? 0);
        const price = parseFloat(line.item?.purchase_price || 0);
        costByInvoice[line.invoice_id] = (costByInvoice[line.invoice_id] || 0) + (qtyBase * price);
      }
    }

    const dailyProfitMap = {};
    dailyInvoices?.forEach(inv => {
      if (!inv.date) return;
      const day = inv.date;
      if (!dailyProfitMap[day]) dailyProfitMap[day] = 0;
      if (inv.type === 'sale') {
        const cost = costByInvoice[inv.id] || 0;
        dailyProfitMap[day] += parseFloat(inv.total || 0) - cost;
      } else if (inv.type === 'purchase') {
        // المشتريات لا تؤثر على صافي الربح اليومي مباشرة، لكن سنطرحها فقط إذا كانت مشتريات نقدية؟ 
        // في المحاسبة، صافي الربح يتأثر فقط بتكلفة البضاعة المباعة، وليس المشتريات.
        // لذلك لا نطرح المشتريات هنا.
      }
    });

    dailyExpensesForChart?.forEach(ex => {
      if (!ex.expense_date) return;
      const day = ex.expense_date;
      if (!dailyProfitMap[day]) dailyProfitMap[day] = 0;
      dailyProfitMap[day] -= parseFloat(ex.amount || 0);
    });

    const dates = Object.keys(dailyProfitMap).sort();
    const profits = dates.map(d => dailyProfitMap[d]);

    // --- 9. تجميع الرد ---
    res.json({
      net_profit: netProfit,
      cash_balance: cashBalance,
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
        net_profit: months.map(m => {
          // للأسفل، لا يمكن حساب تكلفة المبيعات الشهرية بسهولة هنا، نترك صافي شهري بسيط = المبيعات - المشتريات - المصاريف
          return monthly[m].sales - monthly[m].purchases - monthly[m].expenses;
        }),
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
