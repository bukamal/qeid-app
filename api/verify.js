const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function verifyTelegramData(initData) {
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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { initData } = req.body;
  if (!initData || !verifyTelegramData(initData)) {
    return res.status(401).json({ error: 'Invalid data' });
  }
  const params = new URLSearchParams(initData);
  const user = JSON.parse(params.get('user'));
  const { error } = await supabase
    .from('users')
    .upsert({ id: user.id, first_name: user.first_name, username: user.username }, { onConflict: 'id' });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ verified: true, user_id: user.id });
};
