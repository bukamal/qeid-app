const { supabase } = require('../lib/supabase');
const { setCorsHeaders, getUserId, rateLimitMiddleware } = require('../lib/auth');
const { escapeHtml } = require('../lib/sanitize');

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const allowed = await rateLimitMiddleware(req, res, 'expenses');
  if (!allowed) return;

  try {
    let initData = req.method === 'GET' || req.method === 'DELETE' ? req.query.initData : req.body?.initData;
    const userId = await getUserId(initData);

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .order('expense_date', { ascending: false });
      if (error) throw error;
      const safeData = data.map(e => ({ ...e, description: e.description ? escapeHtml(e.description) : null }));
      return res.json(safeData);
    }

    if (req.method === 'POST') {
      const { amount, expense_date, description } = req.body;
      if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'المبلغ مطلوب' });
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          user_id: userId,
          amount: parseFloat(amount),
          expense_date: expense_date || new Date().toISOString().split('T')[0],
          description: description ? escapeHtml(description) : null
        })
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'معرف المصروف مطلوب' });
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};
