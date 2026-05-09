const { supabase } = require('../lib/supabase');
const { setCorsHeaders, verifyTelegramData, rateLimitMiddleware, getUserId } = require('../lib/auth');
const { escapeHtml } = require('../lib/sanitize');

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const allowed = await rateLimitMiddleware(req, res, 'verify');
  if (!allowed) return;

  try {
    const { initData } = req.body;
    if (!initData || !verifyTelegramData(initData)) {
      return res.status(401).json({ error: 'بيانات تيليجرام غير صالحة' });
    }

    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get('user'));

    // Check allowed users list
    const allowedUsers = process.env.ALLOWED_USERS || '';
    const allowedIds = allowedUsers.split(',').map(id => id.trim()).filter(Boolean);
    if (allowedIds.length > 0 && !allowedIds.includes(String(user.id))) {
      return res.status(403).json({ verified: false, error: 'غير مصرح لك باستخدام التطبيق' });
    }

    // Upsert user
    const { error: userError } = await supabase
      .from('users')
      .upsert({ 
        id: user.id, 
        first_name: escapeHtml(user.first_name || ''), 
        username: escapeHtml(user.username || '') 
      }, { onConflict: 'id' });

    if (userError) {
      console.error('Supabase user error:', userError);
      return res.status(500).json({ error: 'فشل حفظ المستخدم: ' + userError.message });
    }

    // Create default accounts if not exist
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
