const { createClient } = require('@supabase/supabase-js');
const { setCorsHeaders, verifyTelegramData } = require('../lib/auth');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { initData } = req.body;
    if (!initData || !verifyTelegramData(initData)) {
      return res.status(401).json({ error: 'بيانات تيليجرام غير صالحة' });
    }

    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get('user'));

    const allowedUsers = process.env.ALLOWED_USERS || '';
    const allowedIds = allowedUsers.split(',').map(id => id.trim()).filter(Boolean);
    if (allowedIds.length > 0 && !allowedIds.includes(String(user.id))) {
      return res.status(403).json({ verified: false, error: 'غير مصرح لك باستخدام التطبيق' });
    }

    const { error } = await supabase
      .from('users')
      .upsert({ id: user.id, first_name: user.first_name, username: user.username }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase user error:', error);
      return res.status(500).json({ error: 'فشل حفظ المستخدم: ' + error.message });
    }

    const defaultAccounts = [
      { name: 'الصندوق', type: 'asset' },
      { name: 'المبيعات', type: 'income' },
      { name: 'المشتريات', type: 'expense' },
      { name: 'المخزون', type: 'asset' },
      { name: 'مصاريف عامة', type: 'expense' },
      { name: 'رأس المال', type: 'equity' }
    ];
    for (const acc of defaultAccounts) {
      const { data: existing } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', acc.name)
        .maybeSingle();
      if (!existing) {
        await supabase.from('accounts').insert({
          user_id: user.id,
          name: acc.name,
          type: acc.type,
          balance: 0
        });
      }
    }

    res.json({ verified: true, user_id: user.id });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'خطأ في الخادم: ' + err.message });
  }
};
