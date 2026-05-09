const { supabase } = require('../lib/supabase');
const { setCorsHeaders, getUserId, rateLimitMiddleware } = require('../lib/auth');
const { escapeHtml } = require('../lib/sanitize');

// ===================== دوال مساعدة محسنة باستخدام account_balances =====================
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
  // محاولة قراءة من جدول الأرصدة أولاً
  let total = await getBalanceFromTable('receivables', null, asOfDate);
  if (total !== 0) return total;
  // fallback للحساب المباشر
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

// ===================== نهاية الدوال المساعدة =====================

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const allowed = await rateLimitMiddleware(req, res, 'default');
  if (!allowed) return;

  try {
    const initData = req.query.initData;
    const userId = await getUserId(initData);
    const reportType = req.query.type;
    const asOfDate = req.query.as_of_date || new Date().toISOString().split('T')[0];

    // ===================== ميزان المراجعة (محسن) =====================
    if (reportType === 'trial_balance') {
      const cash = await getBalanceFromTable('cash', null, asOfDate);
      const receivables = await getTotalCustomerBalance(userId, asOfDate);
      const payables = await getTotalSupplierBalance(userId, asOfDate);
      const sales = await getBalanceFromTable('sales', null, asOfDate);
      const purchases = await getBalanceFromTable('purchases', null, asOfDate);
      const expenses = await getBalanceFromTable('expenses', null, asOfDate);
      const totalAssets = cash + receivables;
      const totalLiabilities = payables;
      const equity = totalAssets - totalLiabilities - expenses;
      const result = [
        { name: 'الصندوق', type: 'asset', total_debit: cash > 0 ? cash : 0, total_credit: cash < 0 ? -cash : 0, balance: cash },
        { name: 'ذمم مدينة (عملاء)', type: 'asset', total_debit: receivables, total_credit: 0, balance: receivables },
        { name: 'ذمم دائنة (موردين)', type: 'liability', total_debit: 0, total_credit: payables, balance: payables },
        { name: 'المبيعات', type: 'income', total_debit: 0, total_credit: sales, balance: sales },
        { name: 'المشتريات', type: 'expense', total_debit: purchases, total_credit: 0, balance: purchases },
        { name: 'مصاريف عامة', type: 'expense', total_debit: expenses, total_credit: 0, balance: expenses },
        { name: 'رأس المال', type: 'equity', total_debit: equity < 0 ? -equity : 0, total_credit: equity > 0 ? equity : 0, balance: equity }
      ];
      return res.json(result);
    }

    // ===================== قائمة الدخل (محسنة) =====================
    if (reportType === 'income_statement') {
      const totalIncome = await getBalanceFromTable('sales', null, asOfDate);
      // تكلفة المبيعات – تحسين: يمكن إضافة جدول خاص، هنا نستخدم المشتريات كبديل مبسط
      const totalCostOfSales = await getBalanceFromTable('purchases', null, asOfDate);
      const totalGeneralExp = await getBalanceFromTable('expenses', null, asOfDate);
      const totalExpenses = totalCostOfSales + totalGeneralExp;
      const netProfit = totalIncome - totalExpenses;
      return res.json({
        income: [{ name: 'المبيعات', balance: totalIncome }],
        total_income: totalIncome,
        expenses: [
          { name: 'تكلفة المبيعات', balance: totalCostOfSales },
          { name: 'مصاريف عامة', balance: totalGeneralExp }
        ],
        total_expenses: totalExpenses,
        net_profit: netProfit
      });
    }

    // ===================== الميزانية العمومية (محسنة) =====================
    if (reportType === 'balance_sheet') {
      const cash = await getBalanceFromTable('cash', null, asOfDate);
      const receivables = await getTotalCustomerBalance(userId, asOfDate);
      const payables = await getTotalSupplierBalance(userId, asOfDate);
      const expenses = await getBalanceFromTable('expenses', null, asOfDate);
      const totalAssets = cash + receivables;
      const totalLiabilities = payables;
      const equity = totalAssets - totalLiabilities - expenses;
      return res.json({
        assets: [{ name: 'الصندوق', balance: cash }, { name: 'ذمم مدينة', balance: receivables }],
        total_assets: totalAssets,
        liabilities: [{ name: 'ذمم دائنة', balance: payables }],
        total_liabilities: payables,
        equity: [{ name: 'رأس المال', balance: equity }],
        total_equity: equity
      });
    }

    // ===================== الأستاذ العام =====================
    if (reportType === 'account_ledger') {
      const accountId = req.query.account_id;
      if (!accountId) return res.status(400).json({ error: 'account_id مطلوب' });
      const { data: accounts } = await supabase.from('accounts').select('id, name, type').eq('user_id', userId);
      const allAccounts = accounts || [];
      const account = allAccounts.find(a => a.id == accountId);
      if (!account) return res.json([]);
      const accountName = account.name;
      let lines = [];

      // الصندوق
      if (accountName === 'الصندوق') {
        // الدفعات
        const { data: customerPayments } = await supabase.from('payments').select('amount, payment_date, notes, customer_id, customer:customers(name)').eq('user_id', userId).not('customer_id', 'is', null).order('payment_date', { ascending: true });
        customerPayments?.forEach(p => { lines.push({ date: p.payment_date, description: `دفعة من ${p.customer?.name || ''}`, debit: p.amount, credit: 0 }); });
        const { data: supplierPayments } = await supabase.from('payments').select('amount, payment_date, notes, supplier_id, supplier:suppliers(name)').eq('user_id', userId).not('supplier_id', 'is', null).order('payment_date', { ascending: true });
        supplierPayments?.forEach(p => { lines.push({ date: p.payment_date, description: `دفعة إلى ${p.supplier?.name || ''}`, debit: 0, credit: p.amount }); });
        // الفواتير النقدية
        const { data: cashInvoices } = await supabase.from('invoices').select('date, reference, total, type').eq('user_id', userId).is('customer_id', null).is('supplier_id', null).order('date', { ascending: true });
        cashInvoices?.forEach(inv => { if (inv.type === 'sale') lines.push({ date: inv.date, description: `فاتورة بيع نقدي ${inv.reference || ''}`, debit: inv.total, credit: 0 }); else if (inv.type === 'purchase') lines.push({ date: inv.date, description: `فاتورة شراء نقدي ${inv.reference || ''}`, debit: 0, credit: inv.total }); });
        // السندات
        const { data: vouchers } = await supabase.from('vouchers').select('type, amount, date, description, reference, customer_id, supplier_id, customer:customers(name), supplier:suppliers(name)').eq('user_id', userId).order('date', { ascending: true });
        vouchers?.forEach(v => {
          const entityName = v.customer?.name || v.supplier?.name || '';
          const desc = `${v.type === 'receipt' ? 'سند قبض' : v.type === 'payment' ? 'سند صرف' : 'سند مصروف'} ${v.reference || ''} ${entityName ? '- ' + entityName : ''} - ${v.description || ''}`;
          if (v.type === 'receipt') lines.push({ date: v.date, description: desc, debit: v.amount, credit: 0 });
          else lines.push({ date: v.date, description: desc, debit: 0, credit: v.amount });
        });
      }
      else if (accountName === 'المبيعات') {
        const { data: sales } = await supabase.from('invoices').select('date, reference, total').eq('user_id', userId).eq('type', 'sale').order('date', { ascending: true });
        sales?.forEach(inv => { lines.push({ date: inv.date, description: `فاتورة بيع ${inv.reference || ''}`, debit: 0, credit: inv.total }); });
      }
      else if (accountName === 'المشتريات') {
        const { data: purchases } = await supabase.from('invoices').select('date, reference, total').eq('user_id', userId).eq('type', 'purchase').order('date', { ascending: true });
        purchases?.forEach(inv => { lines.push({ date: inv.date, description: `فاتورة شراء ${inv.reference || ''}`, debit: inv.total, credit: 0 }); });
      }
      else if (accountName === 'مصاريف عامة') {
        const { data: expenses } = await supabase.from('expenses').select('amount, expense_date, description').eq('user_id', userId).order('expense_date', { ascending: true });
        expenses?.forEach(ex => { lines.push({ date: ex.expense_date, description: ex.description || 'مصروف', debit: ex.amount, credit: 0 }); });
        const { data: seVouchers } = await supabase.from('vouchers').select('amount, date, description, reference').eq('user_id', userId).eq('type', 'expense').order('date', { ascending: true });
        seVouchers?.forEach(v => { lines.push({ date: v.date, description: `سند مصروف ${v.reference || ''} - ${v.description || ''}`, debit: v.amount, credit: 0 }); });
      }
      else if (accountName === 'المخزون') {
        const { data: purchaseInvoices } = await supabase.from('invoices').select('id, date').eq('user_id', userId).eq('type', 'purchase').order('date', { ascending: true });
        if (purchaseInvoices?.length) {
          const purchaseIds = purchaseInvoices.map(inv => inv.id);
          const { data: purchaseLines } = await supabase.from('invoice_lines').select('quantity, item:items(name, average_cost), invoice_id').in('invoice_id', purchaseIds).order('invoice_id', { ascending: true });
          purchaseLines?.forEach(line => {
            const inv = purchaseInvoices.find(i => i.id === line.invoice_id);
            const qty = parseFloat(line.quantity) || 0;
            const price = parseFloat(line.item?.average_cost) || 0;
            lines.push({ date: inv?.date, description: `شراء ${line.item?.name || 'مادة'} (${qty} × ${price})`, debit: qty * price, credit: 0 });
          });
        }
        const { data: saleInvoices } = await supabase.from('invoices').select('id, date').eq('user_id', userId).eq('type', 'sale').order('date', { ascending: true });
        if (saleInvoices?.length) {
          const saleIds = saleInvoices.map(inv => inv.id);
          const { data: saleLines } = await supabase.from('invoice_lines').select('quantity, cost_amount, item:items(name, average_cost), invoice_id').in('invoice_id', saleIds).order('invoice_id', { ascending: true });
          saleLines?.forEach(line => {
            const inv = saleInvoices.find(i => i.id === line.invoice_id);
            const cost = parseFloat(line.cost_amount) || 0;
            lines.push({ date: inv?.date, description: `بيع ${line.item?.name || 'مادة'}`, debit: 0, credit: cost });
          });
        }
      }
      else if (accountName === 'رأس المال') {
        const { data: allInvoices } = await supabase.from('invoices').select('type, total, date').eq('user_id', userId).order('date', { ascending: true });
        const monthlyProfit = {};
        allInvoices?.forEach(inv => {
          if (!inv.date) return;
          const key = inv.date.substring(0,7);
          if (!monthlyProfit[key]) monthlyProfit[key] = 0;
          if (inv.type === 'sale') monthlyProfit[key] += parseFloat(inv.total||0);
          else if (inv.type === 'purchase') monthlyProfit[key] -= parseFloat(inv.total||0);
        });
        const { data: expensesForCapital } = await supabase.from('expenses').select('amount, expense_date').eq('user_id', userId);
        expensesForCapital?.forEach(ex => {
          if (!ex.expense_date) return;
          const key = ex.expense_date.substring(0,7);
          if (!monthlyProfit[key]) monthlyProfit[key] = 0;
          monthlyProfit[key] -= parseFloat(ex.amount||0);
        });
        const months = Object.keys(monthlyProfit).sort();
        months.forEach(month => {
          const profit = monthlyProfit[month];
          if (profit === 0) return;
          lines.push({
            date: `${month}-01`,
            description: profit > 0 ? 'زيادة رأس المال (أرباح)' : 'نقص رأس المال (خسائر)',
            debit: profit < 0 ? -profit : 0,
            credit: profit > 0 ? profit : 0
          });
        });
      }
      else if (accountName === 'ذمم مدينة - عملاء' || accountName === 'ذمم مدينة') {
        const { data: custInvoices } = await supabase.from('invoices').select('date, reference, total, customer_id, customer:customers(name)').eq('user_id', userId).eq('type', 'sale').not('customer_id', 'is', null).order('date', { ascending: true });
        custInvoices?.forEach(inv => { lines.push({ date: inv.date, description: `فاتورة ${inv.customer?.name || ''} ${inv.reference || ''}`, debit: inv.total, credit: 0 }); });
        const { data: custPayments } = await supabase.from('payments').select('amount, payment_date, notes, customer_id, customer:customers(name)').eq('user_id', userId).not('customer_id', 'is', null).order('payment_date', { ascending: true });
        custPayments?.forEach(p => { lines.push({ date: p.payment_date, description: `دفعة من ${p.customer?.name || ''}`, debit: 0, credit: p.amount }); });
        const { data: receiptVouchers } = await supabase.from('vouchers').select('amount, date, description, reference, customer_id, customer:customers(name)').eq('user_id', userId).eq('type', 'receipt').not('customer_id', 'is', null).order('date', { ascending: true });
        receiptVouchers?.forEach(v => { lines.push({ date: v.date, description: `سند قبض ${v.reference || ''} من ${v.customer?.name || ''} - ${v.description || ''}`, debit: 0, credit: v.amount }); });
      }
      else if (accountName === 'ذمم دائنة - موردين' || accountName === 'ذمم دائنة') {
        const { data: suppInvoices } = await supabase.from('invoices').select('date, reference, total, supplier_id, supplier:suppliers(name)').eq('user_id', userId).eq('type', 'purchase').not('supplier_id', 'is', null).order('date', { ascending: true });
        suppInvoices?.forEach(inv => { lines.push({ date: inv.date, description: `فاتورة ${inv.supplier?.name || ''} ${inv.reference || ''}`, debit: 0, credit: inv.total }); });
        const { data: suppPayments } = await supabase.from('payments').select('amount, payment_date, notes, supplier_id, supplier:suppliers(name)').eq('user_id', userId).not('supplier_id', 'is', null).order('payment_date', { ascending: true });
        suppPayments?.forEach(p => { lines.push({ date: p.payment_date, description: `دفعة إلى ${p.supplier?.name || ''}`, debit: p.amount, credit: 0 }); });
        const { data: paymentVouchers } = await supabase.from('vouchers').select('amount, date, description, reference, supplier_id, supplier:suppliers(name)').eq('user_id', userId).eq('type', 'payment').not('supplier_id', 'is', null).order('date', { ascending: true });
        paymentVouchers?.forEach(v => { lines.push({ date: v.date, description: `سند صرف ${v.reference || ''} إلى ${v.supplier?.name || ''} - ${v.description || ''}`, debit: v.amount, credit: 0 }); });
      }

      lines.sort((a, b) => a.date.localeCompare(b.date) || (a.description || '').localeCompare(b.description || ''));
      let runningBalance = 0;
      lines.forEach(l => { runningBalance += (l.debit || 0) - (l.credit || 0); l.balance = runningBalance; });
      return res.json(lines);
    }

    // ===================== كشف حساب عميل (محسن) =====================
    if (reportType === 'customer_statement') {
      const customerId = req.query.customer_id;
      if (!customerId) return res.status(400).json({ error: 'customer_id مطلوب' });
      const { data: invoices } = await supabase.from('invoices').select('id, date, reference, total, type').eq('user_id', userId).eq('customer_id', customerId);
      const { data: payments } = await supabase.from('payments').select('amount, payment_date, notes').eq('user_id', userId).eq('customer_id', customerId);
      const { data: vouchers } = await supabase.from('vouchers').select('amount, date, description, reference').eq('user_id', userId).eq('customer_id', customerId).eq('type', 'receipt');
      let lines = [];
      invoices?.forEach(inv => { lines.push({ date: inv.date, description: `فاتورة ${inv.type === 'sale' ? 'بيع' : 'شراء'} ${inv.reference || ''}`, debit: inv.type === 'sale' ? inv.total : 0, credit: inv.type === 'purchase' ? inv.total : 0, balance: 0 }); });
      payments?.forEach(p => { lines.push({ date: p.payment_date, description: `دفعة ${p.notes || ''}`, debit: 0, credit: p.amount, balance: 0 }); });
      vouchers?.forEach(v => { lines.push({ date: v.date, description: `سند قبض ${v.reference || ''} ${v.description || ''}`, debit: 0, credit: v.amount, balance: 0 }); });
      lines.sort((a, b) => a.date.localeCompare(b.date));
      let running = 0;
      lines.forEach(l => { running += l.debit - l.credit; l.balance = running; });
      return res.json(lines);
    }

    // ===================== كشف حساب مورد (محسن) =====================
    if (reportType === 'supplier_statement') {
      const supplierId = req.query.supplier_id;
      if (!supplierId) return res.status(400).json({ error: 'supplier_id مطلوب' });
      const { data: invoices } = await supabase.from('invoices').select('id, date, reference, total, type').eq('user_id', userId).eq('supplier_id', supplierId);
      const { data: payments } = await supabase.from('payments').select('amount, payment_date, notes').eq('user_id', userId).eq('supplier_id', supplierId);
      const { data: vouchers } = await supabase.from('vouchers').select('amount, date, description, reference').eq('user_id', userId).eq('supplier_id', supplierId).eq('type', 'payment');
      let lines = [];
      invoices?.forEach(inv => { lines.push({ date: inv.date, description: `فاتورة ${inv.type === 'sale' ? 'بيع' : 'شراء'} ${inv.reference || ''}`, debit: inv.type === 'purchase' ? 0 : inv.total, credit: inv.type === 'purchase' ? inv.total : 0, balance: 0 }); });
      payments?.forEach(p => { lines.push({ date: p.payment_date, description: `دفعة ${p.notes || ''}`, debit: p.amount, credit: 0, balance: 0 }); });
      vouchers?.forEach(v => { lines.push({ date: v.date, description: `سند صرف ${v.reference || ''} ${v.description || ''}`, debit: v.amount, credit: 0, balance: 0 }); });
      lines.sort((a, b) => a.date.localeCompare(b.date));
      let running = 0;
      lines.forEach(l => { running += l.credit - l.debit; l.balance = running; });
      return res.json(lines);
    }

    // ===================== ملخص شهري (يبقى محسناً باستخدام الأرصدة) =====================
    if (reportType === 'monthly_summary') {
      const { data: invoices } = await supabase.from('invoices').select('id, type, total, date').eq('user_id', userId);
      const { data: expenses } = await supabase.from('expenses').select('amount, expense_date').eq('user_id', userId);
      const saleInvoices = invoices?.filter(inv => inv.type === 'sale') || [];
      let costByInvoice = {};
      if (saleInvoices.length) {
        const saleIds = saleInvoices.map(inv => inv.id);
        const { data: saleLines } = await supabase.from('invoice_lines').select('invoice_id, cost_amount').in('invoice_id', saleIds);
        saleLines?.forEach(line => { costByInvoice[line.invoice_id] = (costByInvoice[line.invoice_id] || 0) + (parseFloat(line.cost_amount) || 0); });
      }
      const monthly = {};
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        months.push(key); monthly[key] = { sales: 0, purchases: 0, cost_of_sales: 0, expenses: 0 };
      }
      invoices?.forEach(inv => {
        if (!inv.date) return;
        const key = inv.date.substring(0,7);
        if (monthly[key]) {
          if (inv.type === 'sale') {
            monthly[key].sales += parseFloat(inv.total||0);
            monthly[key].cost_of_sales += costByInvoice[inv.id] || 0;
          } else if (inv.type === 'purchase') {
            monthly[key].purchases += parseFloat(inv.total||0);
          }
        }
      });
      expenses?.forEach(ex => {
        if (!ex.expense_date) return;
        const key = ex.expense_date.substring(0,7);
        if (monthly[key]) monthly[key].expenses += parseFloat(ex.amount||0);
      });
      return res.json({
        labels: months,
        sales: months.map(m => monthly[m].sales),
        purchases: months.map(m => monthly[m].purchases),
        net_profit: months.map(m => monthly[m].sales - monthly[m].cost_of_sales - monthly[m].expenses),
        expenses: months.map(m => monthly[m].expenses)
      });
    }

    // ===================== ربح يومي (محسن باستخدام cost_amount) =====================
    if (reportType === 'daily_profit') {
      const { data: invoices } = await supabase.from('invoices').select('id, type, total, date').eq('user_id', userId).order('date', { ascending: true });
      const { data: expenses } = await supabase.from('expenses').select('amount, expense_date').eq('user_id', userId);
      const saleInvoices = invoices?.filter(inv => inv.type === 'sale') || [];
      let costByInvoice = {};
      if (saleInvoices.length) {
        const saleIds = saleInvoices.map(inv => inv.id);
        const { data: saleLines } = await supabase.from('invoice_lines').select('invoice_id, cost_amount').in('invoice_id', saleIds);
        saleLines?.forEach(line => { costByInvoice[line.invoice_id] = (costByInvoice[line.invoice_id] || 0) + (parseFloat(line.cost_amount) || 0); });
      }
      const daily = {};
      invoices?.forEach(inv => {
        if (!inv.date) return;
        const day = inv.date;
        if (!daily[day]) daily[day] = 0;
        if (inv.type === 'sale') {
          const cost = costByInvoice[inv.id] || 0;
          daily[day] += parseFloat(inv.total || 0) - cost;
        }
      });
      expenses?.forEach(ex => {
        if (!ex.expense_date) return;
        const day = ex.expense_date;
        if (!daily[day]) daily[day] = 0;
        daily[day] -= parseFloat(ex.amount || 0);
      });
      const dates = Object.keys(daily).sort();
      return res.json({ dates, profits: dates.map(d => daily[d]) });
    }

    return res.status(400).json({ error: 'نوع تقرير غير معروف' });
  } catch (err) {
    console.error('Reports error:', err);
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};
