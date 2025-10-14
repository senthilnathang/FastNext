interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limit configurations for different endpoints
const rateLimitConfigs: Record<string, RateLimitConfig> = {
  '/login': { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 attempts per 15 minutes
  '/register': { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 attempts per hour
  '/api/': { windowMs: 60 * 1000, maxRequests: 100 }, // 100 requests per minute for API
  default: { windowMs: 60 * 1000, maxRequests: 60 } // 60 requests per minute default
};

export async function rateLimit(identifier: string, pathname: string): Promise<RateLimitResult> {
  // Skip rate limiting in development or if explicitly bypassed
  const bypassRateLimit = process.env.NODE_ENV === 'development' || process.env.BYPASS_RATE_LIMIT === 'true';

  if (bypassRateLimit) {
    return {
      allowed: true,
      limit: 999999,
      remaining: 999999,
      resetTime: Date.now() + 60000,
      retryAfter: 0
    };
  }

  // Determine rate limit config based on pathname
  let config = rateLimitConfigs.default;

  for (const [path, pathConfig] of Object.entries(rateLimitConfigs)) {
    if (pathname.startsWith(path)) {
      config = pathConfig;
      break;
    }
  }

  const key = `${identifier}:${pathname}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Clean up expired entries
  cleanupExpiredEntries(windowStart);

  // Get current count for this identifier
  const entry = rateLimitStore.get(key);
  const resetTime = now + config.windowMs;

  if (!entry || entry.resetTime < now) {
    // First request in window or window has expired
    rateLimitStore.set(key, { count: 1, resetTime });

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetTime,
      retryAfter: 0
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const retryAfter = allowed ? 0 : Math.ceil((entry.resetTime - now) / 1000);

  return {
    allowed,
    limit: config.maxRequests,
    remaining,
    resetTime: entry.resetTime,
    retryAfter
  };
}

function cleanupExpiredEntries(cutoffTime: number): void {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < cutoffTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Enhanced rate limiting with different strategies
export class AdvancedRateLimit {
  private store = new Map<string, any>();

  // Sliding window rate limit
  async slidingWindow(
    identifier: string,
    windowMs: number,
    maxRequests: number
  ): Promise<RateLimitResult> {
    const key = `sliding:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    let requests = this.store.get(key) || [];

    // Remove old requests outside window
    requests = requests.filter((timestamp: number) => timestamp > windowStart);

    // Add current request
    requests.push(now);
    this.store.set(key, requests);

    const allowed = requests.length <= maxRequests;
    const remaining = Math.max(0, maxRequests - requests.length);

    return {
      allowed,
      limit: maxRequests,
      remaining,
      resetTime: now + windowMs,
      retryAfter: allowed ? 0 : Math.ceil(windowMs / 1000)
    };
  }

  // Token bucket rate limit
  async tokenBucket(
    identifier: string,
    capacity: number,
    refillRate: number,
    refillPeriod: number
  ): Promise<RateLimitResult> {
    const key = `bucket:${identifier}`;
    const now = Date.now();

    const bucket = this.store.get(key) || {
      tokens: capacity,
      lastRefill: now
    };

    // Calculate tokens to add based on time elapsed
    const timeDiff = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(timeDiff / refillPeriod) * refillRate;

    bucket.tokens = Math.min(capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Try to consume a token
    const allowed = bucket.tokens > 0;
    if (allowed) {
      bucket.tokens--;
    }

    this.store.set(key, bucket);

    return {
      allowed,
      limit: capacity,
      remaining: bucket.tokens,
      resetTime: now + refillPeriod,
      retryAfter: allowed ? 0 : refillPeriod / 1000
    };
  }
}
