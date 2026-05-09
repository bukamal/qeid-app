// lib/rate-limit.js
// نظام تحديد معدل الطلبات مع دعم Redis-like store

const LIMITS = {
  invoices: { window: 60, max: 30, scope: 'user' },
  'invoices-send': { window: 60, max: 10, scope: 'user' },
  payments: { window: 60, max: 50, scope: 'user' },
  items: { window: 60, max: 20, scope: 'user' },
  customers: { window: 60, max: 20, scope: 'user' },
  suppliers: { window: 60, max: 20, scope: 'user' },
  definitions: { window: 60, max: 30, scope: 'user' },
  expenses: { window: 60, max: 30, scope: 'user' },
  verify: { window: 300, max: 5, scope: 'ip' },
  default: { window: 60, max: 100, scope: 'user' }
};

class MemoryStore {
  constructor() {
    this.buckets = new Map();
    this.timestamps = new Map();
    this._cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    if (typeof this._cleanupInterval.unref === 'function') {
      this._cleanupInterval.unref();
    }
  }

  cleanup() {
    const now = Date.now();
    for (const [key, timestamp] of this.timestamps) {
      if (now - timestamp > 24 * 60 * 60 * 1000) {
        this.buckets.delete(key);
        this.timestamps.delete(key);
      }
    }
  }

  async increment(key, windowMs) {
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const bucketKey = `${key}:${windowStart}`;
    
    const current = this.buckets.get(bucketKey) || 0;
    this.buckets.set(bucketKey, current + 1);
    this.timestamps.set(bucketKey, now);
    
    return {
      count: current + 1,
      resetTime: windowStart + windowMs
    };
  }

  async getRemaining(key, windowMs, max) {
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const bucketKey = `${key}:${windowStart}`;
    const current = this.buckets.get(bucketKey) || 0;
    
    return {
      remaining: Math.max(0, max - current),
      resetTime: windowStart + windowMs,
      count: current
    };
  }
}

const globalStore = globalThis.__rateLimitStore || new MemoryStore();
if (!globalThis.__rateLimitStore) globalThis.__rateLimitStore = globalStore;

async function checkRateLimit(identifier, endpoint) {
  const config = LIMITS[endpoint] || LIMITS.default;
  const windowMs = config.window * 1000;
  
  const result = await globalStore.increment(identifier, windowMs);
  const remaining = await globalStore.getRemaining(identifier, windowMs, config.max);
  
  const allowed = result.count <= config.max;
  const retryAfter = allowed ? 0 : Math.ceil((remaining.resetTime - Date.now()) / 1000);
  
  return {
    allowed,
    limit: config.max,
    remaining: Math.max(0, remaining.remaining - 1),
    resetTime: remaining.resetTime,
    retryAfter: Math.max(0, retryAfter),
    window: config.window
  };
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
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  if (!result.allowed) {
    res.setHeader('Retry-After', String(result.retryAfter));
  }
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

