const { supabase } = require('./supabase');

const LIMITS = {
  invoices: { window: 60, max: 30, scope: 'user' },
  'invoices-send': { window: 60, max: 10, scope: 'user' },
  payments: { window: 60, max: 50, scope: 'user' },
  items: { window: 60, max: 30, scope: 'user' },
  customers: { window: 60, max: 30, scope: 'user' },
  suppliers: { window: 60, max: 30, scope: 'user' },
  definitions: { window: 60, max: 30, scope: 'user' },
  expenses: { window: 60, max: 30, scope: 'user' },
  verify: { window: 300, max: 5, scope: 'ip' },
  default: { window: 60, max: 100, scope: 'user' }
};

async function checkRateLimit(identifier, endpoint) {
  const config = LIMITS[endpoint] || LIMITS.default;
  const bucketKey = `${endpoint}:${identifier}`;
  const maxTokens = config.max;
  const windowSec = config.window;
  const refillRate = maxTokens / windowSec; // tokens per second

  try {
    // استدعاء دالة استهلاك رمز واحدة (atomic)
    const { data: allowed, error } = await supabase.rpc('consume_token', {
      p_bucket_key: bucketKey,
      p_max_tokens: maxTokens,
      p_refill_rate: refillRate,
      p_window_seconds: windowSec
    });

    if (error) {
      console.error('Rate limit RPC error:', error);
      // Fail open في حال خطأ قاعدة البيانات
      return {
        allowed: true,
        limit: maxTokens,
        remaining: 1,
        resetTime: Date.now() + windowSec * 1000,
        retryAfter: 0,
        window: windowSec
      };
    }

    // الحصول على الرموز المتبقية لإضافتها في الهيدر
    const { data: tokenData } = await supabase
      .from('rate_limits')
      .select('tokens')
      .eq('bucket_key', bucketKey)
      .single();

    const remainingTokens = tokenData?.tokens ?? maxTokens;
    const remaining = Math.max(0, Math.floor(remainingTokens));
    
    // تقدير وقت إعادة التعيين (إذا كان allowed false)
    let resetTime = Date.now() + windowSec * 1000;
    let retryAfter = 0;
    if (!allowed) {
      // إذا لم يسمح، نحتاج إلى وقت انتظار حتى يتوفر رمز واحد على الأقل
      // الفرضية: tokens تزداد بمعدل refillRate في الثانية
      const needed = 1 - remainingTokens;
      const secondsToWait = needed / refillRate;
      retryAfter = Math.ceil(secondsToWait);
      resetTime = Date.now() + retryAfter * 1000;
    } else {
      // إذا سمح، نحسب وقت إعادة التعيين الكامل (optional)
      retryAfter = 0;
    }

    return {
      allowed: allowed === true,
      limit: maxTokens,
      remaining: remaining,
      resetTime: resetTime,
      retryAfter: retryAfter,
      window: windowSec
    };
  } catch (err) {
    console.error('Rate limit check error:', err);
    return {
      allowed: true,
      limit: maxTokens,
      remaining: maxTokens,
      resetTime: Date.now() + windowSec * 1000,
      retryAfter: 0,
      window: windowSec
    };
  }
}

function getRateLimitHeaders(result) {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(Math.max(0, result.remaining)),
    'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
    'X-RateLimit-Window': String(result.window)
  };
}

function setRateLimitHeaders(res, result) {
  const headers = getRateLimitHeaders(result);
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  if (!result.allowed) res.setHeader('Retry-After', String(result.retryAfter));
}

function getIdentifier(req, scope, userId) {
  if (scope === 'ip') {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           'unknown';
  }
  return String(userId);
}

module.exports = {
  checkRateLimit,
  getRateLimitHeaders,
  setRateLimitHeaders,
  getIdentifier
};
