const { supabase } = require('../lib/supabase');
const { setCorsHeaders, getUserId, rateLimitMiddleware } = require('../lib/auth');
const { escapeHtml } = require('../lib/sanitize');

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const allowed = await rateLimitMiddleware(req, res, 'default');
  if (!allowed) return;

  try {
    const initData = req.method === 'GET' ? req.query.initData : req.body?.initData;
    const userId = await getUserId(initData);

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .order('name');
      if (error) throw error;
      const safeData = data.map(acc => ({ ...acc, name: escapeHtml(acc.name) }));
      return res.json(safeData);
    }

    if (req.method === 'POST') {
      const { name, type } = req.body;
      if (!name) return res.status(400).json({ error: 'اسم الحساب مطلوب' });
      const escapedName = escapeHtml(name.trim());
      const { data, error } = await supabase
        .from('accounts')
        .insert({ user_id: userId, name: escapedName, type: type || 'expense', balance: 0 })
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'غير مصرح' });
    res.status(500).json({ error: err.message });
  }
};
