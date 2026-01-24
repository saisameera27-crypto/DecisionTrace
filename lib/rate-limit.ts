/**
 * Rate Limiting Module
 * Provides IP-based rate limiting with proper header extraction
 */

/**
 * Rate limit entry stored in memory
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory rate limit store (keyed by IP)
 */
const rateLimitStore: Map<string, RateLimitEntry> = new Map();

/**
 * Get client IP from request headers
 * Priority: x-forwarded-for > x-real-ip > 127.0.0.1
 */
export function getClientIP(req: Request): string {
  // Check X-Forwarded-For header (first IP in chain)
  const forwardedFor = req.headers.get('x-forwarded-for') || req.headers.get('X-Forwarded-For');
  
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    const ips = String(forwardedFor).split(',').map((ip: string) => ip.trim());
    const firstIP = ips[0];
    if (firstIP) {
      return firstIP;
    }
  }

  // Fallback to X-Real-IP header
  const realIP = req.headers.get('x-real-ip') || req.headers.get('X-Real-IP');
  if (realIP) {
    return String(realIP);
  }

  // Default fallback for testing/local development
  return '127.0.0.1';
}

/**
 * Check rate limit for an IP
 */
export function checkRateLimit(
  ip: string,
  maxRequests: number,
  windowMs: number,
  now: number = Date.now()
): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
} {
  const entry = rateLimitStore.get(ip);

  if (!entry || entry.resetAt < now) {
    // New window or expired window
    const resetAt = now + windowMs;
    rateLimitStore.set(ip, {
      count: 1,
      resetAt,
    });

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt,
    };
  }

  // Existing window
  if (entry.count >= maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000); // seconds

    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(ip, entry);

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Reset rate limit store (test-only)
 * Only available when NODE_ENV === "test"
 */
export function resetRateLimitStore(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('resetRateLimitStore() can only be called in test environment');
  }
  rateLimitStore.clear();
}

/**
 * Get current rate limit entry for an IP (for testing/debugging)
 */
export function getRateLimitEntry(ip: string): RateLimitEntry | undefined {
  return rateLimitStore.get(ip);
}

