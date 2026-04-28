const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
    // استخراج initData: من body لـ POST، ومن query لـ GET
    let initData;
    if (req.method === 'GET') {
      initData = req.query.initData;
    } else {
      initData = req.body?.initData;
    }

    const userId = await getUserId(initData);

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*, journal_lines(*)')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Entries GET error:', error);
        return res.status(500).json({ error: 'فشل جلب القيود: ' + error.message });
      }
      return res.json(data);
    } else if (req.method === 'POST') {
      const { date, description, reference, lines } = req.body;
      if (!lines || !Array.isArray(lines)) return res.status(400).json({ error: 'الرجاء توفير سطور القيد' });

      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({ user_id: userId, date, description, reference })
        .select()
        .single();

      if (entryError) {
        console.error('Insert entry error:', entryError);
        return res.status(500).json({ error: 'فشل إنشاء القيد: ' + entryError.message });
      }

      const linesWithEntry = lines.map(l => ({ ...l, entry_id: entry.id }));
      const { error: linesError } = await supabase.from('journal_lines').insert(linesWithEntry);
      if (linesError) {
        console.error('Insert lines error:', linesError);
        return res.status(500).json({ error: 'فشل حفظ سطور القيد: ' + linesError.message });
      }
      return res.json(entry);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('Entries error:', err);
    if (err.message === 'Unauthorized') {
      return res.status(401).json({ error: 'غير مصرح' });
    }
    res.status(500).json({ error: 'خطأ في الخادم: ' + err.message });
  }
};
