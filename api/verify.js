const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
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

    // تسجيل/تحديث المستخدم
    const { error: userError } = await supabase
      .from('users')
      .upsert({ id: user.id, first_name: user.first_name, username: user.username }, { onConflict: 'id' });

    if (userError) {
      console.error('Supabase user error:', userError);
      return res.status(500).json({ error: 'فشل حفظ المستخدم: ' + userError.message });
    }

    // إنشاء الحسابات الافتراضية إذا لم تكن موجودة
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
