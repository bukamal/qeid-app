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

async function getUserId(initData) {
  if (!initData || !verifyTelegramData(initData)) throw new Error('Unauthorized');
  const params = new URLSearchParams(initData);
  const user = JSON.parse(params.get('user'));
  return user.id;
}

module.exports = async (req, res) => {
  try {
    const { initData } = req.body;
    const userId = await getUserId(initData);

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*, journal_lines(*)')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      if (error) throw error;
      return res.json(data);
    } else if (req.method === 'POST') {
      const { date, description, reference, lines } = req.body;
      if (!lines || !Array.isArray(lines)) return res.status(400).json({ error: 'lines required' });
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({ user_id: userId, date, description, reference })
        .select()
        .single();
      if (entryError) throw entryError;
      const linesWithEntry = lines.map(l => ({ ...l, entry_id: entry.id }));
      const { error: linesError } = await supabase
        .from('journal_lines')
        .insert(linesWithEntry);
      if (linesError) throw linesError;
      return res.json(entry);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    res.status(err.message === 'Unauthorized' ? 401 : 500).json({ error: err.message });
  }
};
