const crypto = require('crypto');
const { supabase } = require('./supabase');
const { checkRateLimit, setRateLimitHeaders, getIdentifier } = require('./rate-limit');

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://telegram.org https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'");
}

function verifyTelegramData(initData) {
  if (!initData) return false;
  
  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (!BOT_TOKEN) {
    console.error('BOT_TOKEN not configured');
    return false;
  }
  
  const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  
  if (!hash) return false;
  
  const authDate = parseInt(params.get('auth_date'));
  if (!authDate || isNaN(authDate)) return false;
  
  const now = Math.floor(Date.now() / 1000);
  const maxAge = parseInt(process.env.INIT_DATA_MAX_AGE) || 86400;
  
  if (now - authDate > maxAge) {
    console.warn(`initData expired: ${now - authDate}s old`);
    return false;
  }
  
  if (authDate > now + 60) {
    console.warn('initData from future detected');
    return false;
  }
  
  params.delete('hash');
  const pairs = Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const dataCheckString = pairs.map(([k, v]) => `${k}=${v}`).join('\n');
  
  const computedHash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  
  try {
    return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

async function getUserId(initData) {
  if (!initData || !verifyTelegramData(initData)) throw new Error('Unauthorized');
  const userJson = new URLSearchParams(initData).get('user');
  if (!userJson) throw new Error('Unauthorized');
  const user = JSON.parse(userJson);
  const allowedUsers = process.env.ALLOWED_USERS || '';
  const allowedIds = allowedUsers.split(',').map(id => id.trim()).filter(Boolean);
  if (allowedIds.length > 0 && !allowedIds.includes(String(user.id))) {
    throw new Error('Forbidden');
  }
  return user.id;
}

async function rateLimitMiddleware(req, res, endpoint) {
  try {
    let userId = null;
    let scope = 'ip';
    
    try {
      const initData = req.method === 'GET' || req.method === 'DELETE' 
        ? req.query.initData 
        : req.body?.initData;
      
      if (initData && verifyTelegramData(initData)) {
        userId = JSON.parse(new URLSearchParams(initData).get('user')).id;
        scope = 'user';
      }
    } catch {
      // fallback to IP
    }
    
    const identifier = getIdentifier(req, scope, userId);
    const result = await checkRateLimit(identifier, endpoint);
    
    setRateLimitHeaders(res, result);
    
    if (!result.allowed) {
      res.status(429).json({
        error: `تم تجاوز الحد المسموح (${result.limit} طلب كل ${result.window} ثانية). حاول مرة أخرى بعد ${result.retryAfter} ثانية.`,
        retryAfter: result.retryAfter,
        limit: result.limit,
        window: result.window
      });
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Rate limit error:', err);
    return true;
  }
}

module.exports = { 
  setCorsHeaders, 
  verifyTelegramData, 
  getUserId,
  rateLimitMiddleware 
};
