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
      // ... (نفس كود ميزان المراجعة السابق دون تغيير)
    } 
    else if (reportType === 'income_statement') {
      // 1) الإيرادات = مجموع فواتير المبيعات
      const { data: sales } = await supabase
        .from('invoices')
        .select('id, total')
        .eq('user_id', userId)
        .eq('type', 'sale');
      const totalIncome = sales?.reduce((s, inv) => s + parseFloat(inv.total), 0) || 0;

      // 2) تكلفة المبيعات = مجموع (سعر شراء المادة × الكمية المباعة) لكل بنود فواتير البيع
      let totalCostOfSales = 0;
      if (sales && sales.length > 0) {
        const saleIds = sales.map(inv => inv.id);
        const { data: lines } = await supabase
          .from('invoice_lines')
          .select('quantity, item:items(purchase_price)')
          .in('invoice_id', saleIds);
        if (lines) {
          for (const line of lines) {
            const qty = parseFloat(line.quantity) || 0;
            const purchasePrice = parseFloat(line.item?.purchase_price) || 0;
            totalCostOfSales += qty * purchasePrice;
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
    else if (reportType === 'balance_sheet') {
      // ... (نفس كود الميزانية العمومية دون تغيير)
    } 
    else if (reportType === 'account_ledger') {
      // ... (نفس كود الأستاذ العام دون تغيير)
    } 
    else if (reportType === 'customer_statement') {
      // ... (نفس كود كشف حساب عميل دون تغيير)
    } 
    else if (reportType === 'supplier_statement') {
      // ... (نفس كود كشف حساب مورد دون تغيير)
    } 
    else {
      return res.status(400).json({ error: 'نوع تقرير غير معروف' });
    }
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};
