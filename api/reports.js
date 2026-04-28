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
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id, name, type')
        .eq('user_id', userId)
        .order('name');

      const result = [];
      for (let acc of accounts) {
        const { data: lines } = await supabase
          .from('journal_lines')
          .select('debit, credit')
          .eq('account_id', acc.id);
        const totalDebit = lines?.reduce((s, l) => s + parseFloat(l.debit), 0) || 0;
        const totalCredit = lines?.reduce((s, l) => s + parseFloat(l.credit), 0) || 0;
        const balance = totalDebit - totalCredit;
        result.push({
          id: acc.id,
          name: acc.name,
          type: acc.type,
          total_debit: totalDebit,
          total_credit: totalCredit,
          balance
        });
      }
      return res.json(result);
    } 
    else if (reportType === 'income_statement') {
      const { data: incomeAccs } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('user_id', userId)
        .eq('type', 'income');
      const { data: expenseAccs } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('user_id', userId)
        .eq('type', 'expense');

      let totalIncome = 0, totalExpense = 0;
      const incomeDetails = [], expenseDetails = [];

      for (let acc of incomeAccs) {
        const { data: lines } = await supabase
          .from('journal_lines')
          .select('debit, credit')
          .eq('account_id', acc.id);
        const debit = lines?.reduce((s, l) => s + parseFloat(l.debit), 0) || 0;
        const credit = lines?.reduce((s, l) => s + parseFloat(l.credit), 0) || 0;
        const balance = credit - debit;
        totalIncome += balance;
        incomeDetails.push({ name: acc.name, balance });
      }
      for (let acc of expenseAccs) {
        const { data: lines } = await supabase
          .from('journal_lines')
          .select('debit, credit')
          .eq('account_id', acc.id);
        const debit = lines?.reduce((s, l) => s + parseFloat(l.debit), 0) || 0;
        const credit = lines?.reduce((s, l) => s + parseFloat(l.credit), 0) || 0;
        const balance = debit - credit;
        totalExpense += balance;
        expenseDetails.push({ name: acc.name, balance });
      }

      return res.json({
        income: incomeDetails,
        total_income: totalIncome,
        expenses: expenseDetails,
        total_expenses: totalExpense,
        net_profit: totalIncome - totalExpense
      });
    } 
    else if (reportType === 'balance_sheet') {
      const types = ['asset', 'liability', 'equity'];
      const result = {};
      for (let type of types) {
        const { data: accounts } = await supabase
          .from('accounts')
          .select('id, name')
          .eq('user_id', userId)
          .eq('type', type);
        let total = 0;
        const details = [];
        for (let acc of accounts) {
          const { data: lines } = await supabase
            .from('journal_lines')
            .select('debit, credit')
            .eq('account_id', acc.id);
          const debit = lines?.reduce((s, l) => s + parseFloat(l.debit), 0) || 0;
          const credit = lines?.reduce((s, l) => s + parseFloat(l.credit), 0) || 0;
          let balance = 0;
          if (type === 'asset') balance = debit - credit;
          else balance = credit - debit;
          total += balance;
          details.push({ name: acc.name, balance });
        }
        result[type] = { details, total };
      }
      return res.json({
        assets: result.asset.details,
        total_assets: result.asset.total,
        liabilities: result.liability.details,
        total_liabilities: result.liability.total,
        equity: result.equity.details,
        total_equity: result.equity.total
      });
    } 
    else if (reportType === 'account_ledger') {
      const accountId = req.query.account_id;
      if (!accountId) return res.status(400).json({ error: 'account_id مطلوب' });

      const { data: lines, error } = await supabase
        .from('journal_lines')
        .select('id, debit, credit, entry:journal_entries(date, description, reference)')
        .eq('account_id', accountId)
        .order('id', { ascending: true });

      if (error) throw error;

      let runningBalance = 0;
      const linesWithBalance = lines.map(line => {
        const debit = parseFloat(line.debit) || 0;
        const credit = parseFloat(line.credit) || 0;
        runningBalance += (debit - credit);
        return {
          id: line.id,
          date: line.entry?.date,
          description: line.entry?.description,
          reference: line.entry?.reference,
          debit: debit,
          credit: credit,
          balance: runningBalance
        };
      });

      return res.json(linesWithBalance);
    } 
    else if (reportType === 'customer_statement') {
      const customerId = req.query.customer_id;
      if (!customerId) return res.status(400).json({ error: 'customer_id مطلوب' });

      const { data: lines, error } = await supabase
        .from('journal_lines')
        .select('id, debit, credit, entry:journal_entries(date, description, reference)')
        .eq('customer_id', customerId)
        .order('id', { ascending: true });

      if (error) throw error;

      let runningBalance = 0;
      const linesWithBalance = lines.map(line => {
        const debit = parseFloat(line.debit) || 0;
        const credit = parseFloat(line.credit) || 0;
        runningBalance += (debit - credit);
        return {
          id: line.id,
          date: line.entry?.date,
          description: line.entry?.description,
          debit: debit,
          credit: credit,
          balance: runningBalance
        };
      });

      return res.json(linesWithBalance);
    } 
    else if (reportType === 'supplier_statement') {
      const supplierId = req.query.supplier_id;
      if (!supplierId) return res.status(400).json({ error: 'supplier_id مطلوب' });

      const { data: lines, error } = await supabase
        .from('journal_lines')
        .select('id, debit, credit, entry:journal_entries(date, description, reference)')
        .eq('supplier_id', supplierId)
        .order('id', { ascending: true });

      if (error) throw error;

      let runningBalance = 0;
      const linesWithBalance = lines.map(line => {
        const debit = parseFloat(line.debit) || 0;
        const credit = parseFloat(line.credit) || 0;
        runningBalance += (credit - debit);
        return {
          id: line.id,
          date: line.entry?.date,
          description: line.entry?.description,
          debit: debit,
          credit: credit,
          balance: runningBalance
        };
      });

      return res.json(linesWithBalance);
    } 
    else {
      return res.status(400).json({ error: 'نوع تقرير غير معروف' });
    }
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};
