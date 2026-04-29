const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
    const initData = req.query.initData;
    const userId = await getUserId(initData);
    const reportType = req.query.type;

    if (reportType === 'trial_balance') {
      // 1) إجمالي فواتير المبيعات (الإيرادات)
      const { data: salesInvoices } = await supabase
        .from('invoices')
        .select('total')
        .eq('user_id', userId)
        .eq('type', 'sale');
      const totalSales = salesInvoices?.reduce((s, inv) => s + parseFloat(inv.total), 0) || 0;

      // 2) إجمالي فواتير المشتريات (المصروفات)
      const { data: purchaseInvoices } = await supabase
        .from('invoices')
        .select('total')
        .eq('user_id', userId)
        .eq('type', 'purchase');
      const totalPurchases = purchaseInvoices?.reduce((s, inv) => s + parseFloat(inv.total), 0) || 0;

      // 3) إجمالي الدفعات المستلمة (مدينة للصندوق)
      const { data: paymentsIn } = await supabase
        .from('payments')
        .select('amount')
        .eq('user_id', userId)
        .not('customer_id', 'is', null);
      const totalReceived = paymentsIn?.reduce((s, p) => s + parseFloat(p.amount), 0) || 0;

      // 4) إجمالي الدفعات المنفقة (دائنة للصندوق)
      const { data: paymentsOut } = await supabase
        .from('payments')
        .select('amount')
        .eq('user_id', userId)
        .not('supplier_id', 'is', null);
      const totalPaid = paymentsOut?.reduce((s, p) => s + parseFloat(p.amount), 0) || 0;

      // 5) رصيد الصندوق = المستلم - المنفق
      const cashBalance = totalReceived - totalPaid;

      // 6) أرصدة العملاء والموردين من جدولهم مباشرة
      const { data: customers } = await supabase
        .from('customers')
        .select('name, balance')
        .eq('user_id', userId);
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('name, balance')
        .eq('user_id', userId);

      // 7) حساب رأس المال = الأصول - الخصوم
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
    else if (reportType === 'income_statement') {
      const { data: sales } = await supabase
        .from('invoices')
        .select('total')
        .eq('user_id', userId)
        .eq('type', 'sale');
      const { data: purchases } = await supabase
        .from('invoices')
        .select('total')
        .eq('user_id', userId)
        .eq('type', 'purchase');

      const totalIncome = sales?.reduce((s, inv) => s + parseFloat(inv.total), 0) || 0;
      const totalExpense = purchases?.reduce((s, inv) => s + parseFloat(inv.total), 0) || 0;

      return res.json({
        income: [{ name: 'المبيعات', balance: totalIncome }],
        total_income: totalIncome,
        expenses: [{ name: 'المشتريات', balance: totalExpense }],
        total_expenses: totalExpense,
        net_profit: totalIncome - totalExpense
      });
    } 
    else if (reportType === 'balance_sheet') {
      const { data: paymentsIn } = await supabase
        .from('payments')
        .select('amount')
        .eq('user_id', userId)
        .not('customer_id', 'is', null);
      const { data: paymentsOut } = await supabase
        .from('payments')
        .select('amount')
        .eq('user_id', userId)
        .not('supplier_id', 'is', null);
      const totalReceived = paymentsIn?.reduce((s, p) => s + parseFloat(p.amount), 0) || 0;
      const totalPaid = paymentsOut?.reduce((s, p) => s + parseFloat(p.amount), 0) || 0;
      const cash = totalReceived - totalPaid;

      const { data: customers } = await supabase
        .from('customers')
        .select('balance')
        .eq('user_id', userId);
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('balance')
        .eq('user_id', userId);

      const receivables = customers?.reduce((s, c) => s + parseFloat(c.balance), 0) || 0;
      const payables = suppliers?.reduce((s, s2) => s + parseFloat(s2.balance), 0) || 0;
      const totalAssets = cash + receivables;
      const equity = totalAssets - payables;

      return res.json({
        assets: [
          { name: 'الصندوق', balance: cash },
          { name: 'ذمم مدينة', balance: receivables }
        ],
        total_assets: totalAssets,
        liabilities: [
          { name: 'ذمم دائنة', balance: payables }
        ],
        total_liabilities: payables,
        equity: [
          { name: 'رأس المال', balance: equity }
        ],
        total_equity: equity
      });
    } 
    else if (reportType === 'account_ledger') {
      const accountId = req.query.account_id;
      if (!accountId) return res.status(400).json({ error: 'account_id مطلوب' });
      // في النظام الحالي، يمكننا عرض حركات الفواتير والدفعات كدفتر أستاذ مبسط
      // لكننا سنعيد قائمة فارغة مع تنبيه للتطوير المستقبلي
      return res.json([]);
    } 
    else if (reportType === 'customer_statement') {
      const customerId = req.query.customer_id;
      if (!customerId) return res.status(400).json({ error: 'customer_id مطلوب' });

      // نجلب الفواتير والدفعات الخاصة بهذا العميل
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, date, reference, total, type')
        .eq('user_id', userId)
        .eq('customer_id', customerId);
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, payment_date, notes')
        .eq('user_id', userId)
        .eq('customer_id', customerId);

      let lines = [];
      invoices?.forEach(inv => {
        lines.push({
          date: inv.date,
          description: `فاتورة ${inv.type === 'sale' ? 'بيع' : 'شراء'} ${inv.reference || ''}`,
          debit: inv.type === 'sale' ? inv.total : 0,
          credit: inv.type === 'purchase' ? inv.total : 0,
          balance: 0
        });
      });
      payments?.forEach(p => {
        lines.push({
          date: p.payment_date,
          description: `دفعة ${p.notes || ''}`,
          debit: 0,
          credit: p.amount,
          balance: 0
        });
      });
      // ترتيب حسب التاريخ
      lines.sort((a, b) => a.date.localeCompare(b.date));
      let running = 0;
      lines.forEach(l => {
        running += l.debit - l.credit;
        l.balance = running;
      });
      return res.json(lines);
    } 
    else if (reportType === 'supplier_statement') {
      const supplierId = req.query.supplier_id;
      if (!supplierId) return res.status(400).json({ error: 'supplier_id مطلوب' });

      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, date, reference, total, type')
        .eq('user_id', userId)
        .eq('supplier_id', supplierId);
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, payment_date, notes')
        .eq('user_id', userId)
        .eq('supplier_id', supplierId);

      let lines = [];
      invoices?.forEach(inv => {
        lines.push({
          date: inv.date,
          description: `فاتورة ${inv.type === 'sale' ? 'بيع' : 'شراء'} ${inv.reference || ''}`,
          debit: inv.type === 'purchase' ? 0 : inv.total,
          credit: inv.type === 'purchase' ? inv.total : 0,
          balance: 0
        });
      });
      payments?.forEach(p => {
        lines.push({
          date: p.payment_date,
          description: `دفعة ${p.notes || ''}`,
          debit: p.amount,
          credit: 0,
          balance: 0
        });
      });
      lines.sort((a, b) => a.date.localeCompare(b.date));
      let running = 0;
      lines.forEach(l => {
        // للمورد: الرصيد = دائن - مدين
        running += l.credit - l.debit;
        l.balance = running;
      });
      return res.json(lines);
    } 
    else {
      return res.status(400).json({ error: 'نوع تقرير غير معروف' });
    }
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};
