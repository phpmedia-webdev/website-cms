/**
 * Simple in-memory rate limiting for API routes.
 * In production, consider using Redis or a dedicated rate limiting service.
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

/**
 * Rate limit configuration
 */
const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per window
};

/**
 * Check if a request should be rate limited.
 * Returns null if allowed, or an error response if rate limited.
 */
export function checkRateLimit(
  identifier: string
): { allowed: boolean; remaining: number; resetTime: number } | null {
  const now = Date.now();
  const key = identifier;

  // Clean up old entries (simple cleanup)
  if (Object.keys(store).length > 10000) {
    Object.keys(store).forEach((k) => {
      if (store[k].resetTime < now) {
        delete store[k];
      }
    });
  }

  const record = store[key];

  if (!record || record.resetTime < now) {
    // New window or expired, reset
    store[key] = {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs,
    };
    return {
      allowed: true,
      remaining: RATE_LIMIT.maxRequests - 1,
      resetTime: now + RATE_LIMIT.windowMs,
    };
  }

  if (record.count >= RATE_LIMIT.maxRequests) {
    // Rate limited
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  // Increment count
  record.count++;
  return {
    allowed: true,
    remaining: RATE_LIMIT.maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Get client identifier from request (IP address or API key).
 */
export function getClientIdentifier(request: Request): string {
  // Try to get API key from header
  const apiKey = request.headers.get("x-api-key");
  if (apiKey) {
    return `api-key:${apiKey}`;
  }

  // Fall back to IP address
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip") || "unknown";
  return `ip:${ip}`;
}
