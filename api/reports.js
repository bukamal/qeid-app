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
    const reportType = req.query.type;

    if (reportType === 'trial_balance') {
      const { data: salesInvoices } = await supabase.from('invoices').select('total').eq('user_id', userId).eq('type', 'sale');
      const totalSales = salesInvoices?.reduce((s, inv) => s + parseFloat(inv.total), 0) || 0;
      const { data: purchaseInvoices } = await supabase.from('invoices').select('total').eq('user_id', userId).eq('type', 'purchase');
      const totalPurchases = purchaseInvoices?.reduce((s, inv) => s + parseFloat(inv.total), 0) || 0;

      const { data: paymentsIn } = await supabase.from('payments').select('amount').eq('user_id', userId).not('customer_id', 'is', null);
      const totalPaymentsIn = paymentsIn?.reduce((s, p) => s + parseFloat(p.amount), 0) || 0;

      const { data: paymentsOut } = await supabase.from('payments').select('amount').eq('user_id', userId).not('supplier_id', 'is', null);
      const totalPaymentsOut = paymentsOut?.reduce((s, p) => s + parseFloat(p.amount), 0) || 0;

      // فواتير نقدية (بدون عميل أو مورد) -> دخل مباشر للصندوق
      const { data: cashInvoices } = await supabase.from('invoices').select('total, type').eq('user_id', userId).is('customer_id', null).is('supplier_id', null);
      let cashIncome = 0, cashExpense = 0;
      cashInvoices?.forEach(inv => {
        if (inv.type === 'sale') cashIncome += parseFloat(inv.total||0);
        else if (inv.type === 'purchase') cashExpense += parseFloat(inv.total||0);
      });

      const totalReceived = totalPaymentsIn + cashIncome;
      const totalPaid = totalPaymentsOut + cashExpense;
      const cashBalance = totalReceived - totalPaid;

      const { data: customers } = await supabase.from('customers').select('name, balance').eq('user_id', userId);
      const { data: suppliers } = await supabase.from('suppliers').select('name, balance').eq('user_id', userId);
      const totalCustomerBalance = customers?.reduce((s, c) => s + parseFloat(c.balance), 0) || 0;
      const totalSupplierBalance = suppliers?.reduce((s, s2) => s + parseFloat(s2.balance), 0) || 0;
      const totalAssets = cashBalance + totalCustomerBalance;
      const totalLiabilities = totalSupplierBalance;
      const equity = totalAssets - totalLiabilities;

      const result = [
        { name: 'الصندوق', type: 'asset', total_debit: totalReceived, total_credit: totalPaid, balance: cashBalance },
        { name: 'ذمم مدينة (عملاء)', type: 'asset', total_debit: totalCustomerBalance, total_credit: 0, balance: totalCustomerBalance },
        { name: 'ذمم دائنة (موردين)', type: 'liability', total_debit: 0, total_credit: totalSupplierBalance, balance: totalSupplierBalance },
        { name: 'المبيعات', type: 'income', total_debit: 0, total_credit: totalSales, balance: totalSales },
        { name: 'المشتريات', type: 'expense', total_debit: totalPurchases, total_credit: 0, balance: totalPurchases },
        { name: 'رأس المال', type: 'equity', total_debit: 0, total_credit: equity, balance: equity }
      ];
      return res.json(result);
    }

    if (reportType === 'income_statement') {
      const { data: sales } = await supabase.from('invoices').select('id, total').eq('user_id', userId).eq('type', 'sale');
      const totalIncome = sales?.reduce((s, inv) => s + parseFloat(inv.total), 0) || 0;
      let totalCostOfSales = 0;
      if (sales && sales.length > 0) {
        const saleIds = sales.map(inv => inv.id);
        const { data: lines } = await supabase.from('invoice_lines').select('quantity, item:items(purchase_price)').in('invoice_id', saleIds);
        if (lines) {
          for (const line of lines) {
            totalCostOfSales += (parseFloat(line.quantity) || 0) * (parseFloat(line.item?.purchase_price) || 0);
          }
        }
      }
      const netProfit = totalIncome - totalCostOfSales;
      return res.json({
        income: [{ name: 'المبيعات', balance: totalIncome }],
        total_income: totalIncome,
        expenses: [{ name: 'تكلفة المبيعات', balance: totalCostOfSales }],
        total_expenses: totalCostOfSales,
        net_profit: netProfit
      });
    }

    if (reportType === 'balance_sheet') {
      const { data: paymentsIn } = await supabase.from('payments').select('amount').eq('user_id', userId).not('customer_id', 'is', null);
      const { data: paymentsOut } = await supabase.from('payments').select('amount').eq('user_id', userId).not('supplier_id', 'is', null);
      const totalPaymentsIn = paymentsIn?.reduce((s, p) => s + parseFloat(p.amount), 0) || 0;
      const totalPaymentsOut = paymentsOut?.reduce((s, p) => s + parseFloat(p.amount), 0) || 0;

      const { data: cashInvoices } = await supabase.from('invoices').select('total, type').eq('user_id', userId).is('customer_id', null).is('supplier_id', null);
      let cashIncome = 0, cashExpense = 0;
      cashInvoices?.forEach(inv => {
        if (inv.type === 'sale') cashIncome += parseFloat(inv.total||0);
        else if (inv.type === 'purchase') cashExpense += parseFloat(inv.total||0);
      });
      const cash = totalPaymentsIn + cashIncome - totalPaymentsOut - cashExpense;

      const { data: customers } = await supabase.from('customers').select('balance').eq('user_id', userId);
      const { data: suppliers } = await supabase.from('suppliers').select('balance').eq('user_id', userId);
      const receivables = customers?.reduce((s, c) => s + parseFloat(c.balance), 0) || 0;
      const payables = suppliers?.reduce((s, s2) => s + parseFloat(s2.balance), 0) || 0;
      const totalAssets = cash + receivables;
      const equity = totalAssets - payables;

      return res.json({
        assets: [{ name: 'الصندوق', balance: cash }, { name: 'ذمم مدينة', balance: receivables }],
        total_assets: totalAssets,
        liabilities: [{ name: 'ذمم دائنة', balance: payables }],
        total_liabilities: payables,
        equity: [{ name: 'رأس المال', balance: equity }],
        total_equity: equity
      });
    }

    if (reportType === 'account_ledger') {
      const accountId = req.query.account_id;
      if (!accountId) return res.status(400).json({ error: 'account_id مطلوب' });
      const { data: accounts } = await supabase.from('accounts').select('id, name, type').eq('user_id', userId);
      const allAccounts = accounts || [];
      const account = allAccounts.find(a => a.id == accountId);
      if (!account) return res.json([]);
      const accountName = account.name;
      let lines = [];

      if (accountName === 'الصندوق') {
        const { data: customerPayments } = await supabase.from('payments').select('amount, payment_date, notes, customer_id, customer:customers(name)').eq('user_id', userId).not('customer_id', 'is', null).order('payment_date', { ascending: true });
        customerPayments?.forEach(p => { lines.push({ date: p.payment_date, description: `دفعة من ${p.customer?.name || ''}`, debit: p.amount, credit: 0 }); });
        const { data: supplierPayments } = await supabase.from('payments').select('amount, payment_date, notes, supplier_id, supplier:suppliers(name)').eq('user_id', userId).not('supplier_id', 'is', null).order('payment_date', { ascending: true });
        supplierPayments?.forEach(p => { lines.push({ date: p.payment_date, description: `دفعة إلى ${p.supplier?.name || ''}`, debit: 0, credit: p.amount }); });
        const { data: cashInvoices } = await supabase.from('invoices').select('date, reference, total, type').eq('user_id', userId).is('customer_id', null).is('supplier_id', null).order('date', { ascending: true });
        cashInvoices?.forEach(inv => {
          if (inv.type === 'sale') lines.push({ date: inv.date, description: `فاتورة بيع نقدي ${inv.reference || ''}`, debit: inv.total, credit: 0 });
          else if (inv.type === 'purchase') lines.push({ date: inv.date, description: `فاتورة شراء نقدي ${inv.reference || ''}`, debit: 0, credit: inv.total });
        });
      } else if (accountName === 'المبيعات') {
        const { data: sales } = await supabase.from('invoices').select('date, reference, total').eq('user_id', userId).eq('type', 'sale').order('date', { ascending: true });
        sales?.forEach(inv => { lines.push({ date: inv.date, description: `فاتورة بيع ${inv.reference || ''}`, debit: 0, credit: inv.total }); });
      } else if (accountName === 'المشتريات') {
        const { data: purchases } = await supabase.from('invoices').select('date, reference, total').eq('user_id', userId).eq('type', 'purchase').order('date', { ascending: true });
        purchases?.forEach(inv => { lines.push({ date: inv.date, description: `فاتورة شراء ${inv.reference || ''}`, debit: inv.total, credit: 0 }); });
      } else if (accountName === 'ذمم مدينة - عملاء' || accountName === 'ذمم مدينة') {
        const { data: custInvoices } = await supabase.from('invoices').select('date, reference, total, customer_id, customer:customers(name)').eq('user_id', userId).eq('type', 'sale').not('customer_id', 'is', null).order('date', { ascending: true });
        custInvoices?.forEach(inv => { lines.push({ date: inv.date, description: `فاتورة ${inv.customer?.name || ''} ${inv.reference || ''}`, debit: inv.total, credit: 0 }); });
        const { data: custPayments } = await supabase.from('payments').select('amount, payment_date, notes, customer_id, customer:customers(name)').eq('user_id', userId).not('customer_id', 'is', null).order('payment_date', { ascending: true });
        custPayments?.forEach(p => { lines.push({ date: p.payment_date, description: `دفعة من ${p.customer?.name || ''}`, debit: 0, credit: p.amount }); });
      } else if (accountName === 'ذمم دائنة - موردين' || accountName === 'ذمم دائنة') {
        const { data: suppInvoices } = await supabase.from('invoices').select('date, reference, total, supplier_id, supplier:suppliers(name)').eq('user_id', userId).eq('type', 'purchase').not('supplier_id', 'is', null).order('date', { ascending: true });
        suppInvoices?.forEach(inv => { lines.push({ date: inv.date, description: `فاتورة ${inv.supplier?.name || ''} ${inv.reference || ''}`, debit: 0, credit: inv.total }); });
        const { data: suppPayments } = await supabase.from('payments').select('amount, payment_date, notes, supplier_id, supplier:suppliers(name)').eq('user_id', userId).not('supplier_id', 'is', null).order('payment_date', { ascending: true });
        suppPayments?.forEach(p => { lines.push({ date: p.payment_date, description: `دفعة إلى ${p.supplier?.name || ''}`, debit: p.amount, credit: 0 }); });
      }

      lines.sort((a, b) => a.date.localeCompare(b.date) || (a.description || '').localeCompare(b.description || ''));
      let runningBalance = 0;
      lines.forEach(l => { runningBalance += (l.debit || 0) - (l.credit || 0); l.balance = runningBalance; });
      return res.json(lines);
    }

    if (reportType === 'customer_statement') {
      const customerId = req.query.customer_id;
      if (!customerId) return res.status(400).json({ error: 'customer_id مطلوب' });
      const { data: invoices } = await supabase.from('invoices').select('id, date, reference, total, type').eq('user_id', userId).eq('customer_id', customerId);
      const { data: payments } = await supabase.from('payments').select('amount, payment_date, notes').eq('user_id', userId).eq('customer_id', customerId);
      let lines = [];
      invoices?.forEach(inv => { lines.push({ date: inv.date, description: `فاتورة ${inv.type === 'sale' ? 'بيع' : 'شراء'} ${inv.reference || ''}`, debit: inv.type === 'sale' ? inv.total : 0, credit: inv.type === 'purchase' ? inv.total : 0, balance: 0 }); });
      payments?.forEach(p => { lines.push({ date: p.payment_date, description: `دفعة ${p.notes || ''}`, debit: 0, credit: p.amount, balance: 0 }); });
      lines.sort((a, b) => a.date.localeCompare(b.date));
      let running = 0;
      lines.forEach(l => { running += l.debit - l.credit; l.balance = running; });
      return res.json(lines);
    }

    if (reportType === 'supplier_statement') {
      const supplierId = req.query.supplier_id;
      if (!supplierId) return res.status(400).json({ error: 'supplier_id مطلوب' });
      const { data: invoices } = await supabase.from('invoices').select('id, date, reference, total, type').eq('user_id', userId).eq('supplier_id', supplierId);
      const { data: payments } = await supabase.from('payments').select('amount, payment_date, notes').eq('user_id', userId).eq('supplier_id', supplierId);
      let lines = [];
      invoices?.forEach(inv => { lines.push({ date: inv.date, description: `فاتورة ${inv.type === 'sale' ? 'بيع' : 'شراء'} ${inv.reference || ''}`, debit: inv.type === 'purchase' ? 0 : inv.total, credit: inv.type === 'purchase' ? inv.total : 0, balance: 0 }); });
      payments?.forEach(p => { lines.push({ date: p.payment_date, description: `دفعة ${p.notes || ''}`, debit: p.amount, credit: 0, balance: 0 }); });
      lines.sort((a, b) => a.date.localeCompare(b.date));
      let running = 0;
      lines.forEach(l => { running += l.credit - l.debit; l.balance = running; });
      return res.json(lines);
    }

    if (reportType === 'monthly_summary') {
      const { data: invoices } = await supabase.from('invoices').select('type, total, date').eq('user_id', userId);
      const { data: payments } = await supabase.from('payments').select('amount, payment_date, customer_id, supplier_id').eq('user_id', userId);
      const monthly = {};
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        months.push(key);
        monthly[key] = { sales: 0, purchases: 0, payments_in: 0, payments_out: 0 };
      }
      invoices?.forEach(inv => { if (!inv.date) return; const key = inv.date.substring(0,7); if (monthly[key]) { if (inv.type === 'sale') monthly[key].sales += parseFloat(inv.total||0); else if (inv.type === 'purchase') monthly[key].purchases += parseFloat(inv.total||0); } });
      payments?.forEach(p => { if (!p.payment_date) return; const key = p.payment_date.substring(0,7); if (monthly[key]) { if (p.customer_id) monthly[key].payments_in += parseFloat(p.amount||0); if (p.supplier_id) monthly[key].payments_out += parseFloat(p.amount||0); } });
      const labels = months;
      const salesData = months.map(m => monthly[m].sales);
      const purchasesData = months.map(m => monthly[m].purchases);
      const netProfitData = months.map(m => monthly[m].sales - monthly[m].purchases);
      const paymentsInData = months.map(m => monthly[m].payments_in);
      const paymentsOutData = months.map(m => monthly[m].payments_out);
      return res.json({ labels, sales: salesData, purchases: purchasesData, net_profit: netProfitData, payments_in: paymentsInData, payments_out: paymentsOutData });
    }

    if (reportType === 'daily_profit') {
      const { data: invoices } = await supabase.from('invoices').select('type, total, date').eq('user_id', userId).order('date', { ascending: true });
      const daily = {};
      invoices?.forEach(inv => {
        if (!inv.date) return;
        const day = inv.date;
        if (!daily[day]) daily[day] = 0;
        if (inv.type === 'sale') daily[day] += parseFloat(inv.total || 0);
        else if (inv.type === 'purchase') daily[day] -= parseFloat(inv.total || 0);
      });
      const dates = Object.keys(daily).sort();
      const profits = dates.map(d => daily[d]);
      return res.json({ dates, profits });
    }

    return res.status(400).json({ error: 'نوع تقرير غير معروف' });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};
