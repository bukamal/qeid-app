const { createClient } = require('@supabase/supabase-js');
const { setCorsHeaders, getUserId } = require('../lib/auth');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const TABLES = {
  category: { table: 'categories', pk: 'id', columns: ['name'] },
  unit: { table: 'units', pk: 'id', columns: ['name', 'abbreviation'] }
};

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let initData = req.method === 'GET' || req.method === 'DELETE' ? req.query.initData : req.body?.initData;
    const userId = await getUserId(initData);
    const type = req.query.type || req.body?.type || 'category';
    const config = TABLES[type];
    if (!config) return res.status(400).json({ error: 'نوع غير معروف' });

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from(config.table)
        .select('*')
        .eq('user_id', userId)
        .order('name');
      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'POST') {
      const entry = { name: req.body.name };
      if (type === 'unit') entry.abbreviation = req.body.abbreviation || null;
      if (!entry.name) return res.status(400).json({ error: 'الاسم مطلوب' });
      const { data, error } = await supabase
        .from(config.table)
        .insert({ user_id: userId, ...entry })
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'PUT') {
      const { id, name, abbreviation } = req.body;
      if (!id) return res.status(400).json({ error: 'المعرف مطلوب' });
      const updates = { name };
      if (type === 'unit') updates.abbreviation = abbreviation || null;
      const { data, error } = await supabase
        .from(config.table)
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'المعرف مطلوب' });
      const { error } = await supabase
        .from(config.table)
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
