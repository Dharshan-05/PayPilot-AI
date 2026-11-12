/**
 * In-Memory Sliding-Window Rate Limiter
 *
 * NOTE FOR PRODUCTION:
 * This rate limiter is designed for local development, test environments, and single-instance
 * deployments. In a distributed multi-instance production environment, rate limiting MUST be
 * backed by an external distributed store such as Redis/Upstash or edge proxies (Cloudflare WAF).
 */

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
  limit: number;
}

export class InMemoryRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(options: RateLimitOptions = { windowMs: 60_000, maxRequests: 60 }) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
  }

  /**
   * Evaluates whether a request from the given client key (e.g. IP or session ID) is allowed.
   */
  public check(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Retrieve or initialize request timestamps
    let timestamps = this.requests.get(key) || [];

    // Filter out timestamps outside the active window
    timestamps = timestamps.filter((t) => t > windowStart);

    if (timestamps.length >= this.maxRequests) {
      const oldest = timestamps[0];
      const resetMs = Math.max(0, oldest + this.windowMs - now);
      this.requests.set(key, timestamps);
      return {
        allowed: false,
        remaining: 0,
        resetMs,
        limit: this.maxRequests,
      };
    }

    // Record this request
    timestamps.push(now);
    this.requests.set(key, timestamps);

    const resetMs = this.windowMs;
    return {
      allowed: true,
      remaining: this.maxRequests - timestamps.length,
      resetMs,
      limit: this.maxRequests,
    };
  }

  /**
   * Resets rate limit counters (useful for unit testing).
   */
  public reset(key?: string): void {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }
}

const globalForLimiters = globalThis as unknown as {
  __paypalApiRateLimiter?: InMemoryRateLimiter;
  __paypalSensitiveRateLimiter?: InMemoryRateLimiter;
};

// Global default rate limiter instances shared across Next.js route chunks
export const apiRateLimiter =
  globalForLimiters.__paypalApiRateLimiter ||
  (globalForLimiters.__paypalApiRateLimiter = new InMemoryRateLimiter({
    windowMs: 60_000,
    maxRequests: 120,
  }));

export const sensitiveActionRateLimiter =
  globalForLimiters.__paypalSensitiveRateLimiter ||
  (globalForLimiters.__paypalSensitiveRateLimiter = new InMemoryRateLimiter({
    windowMs: 60_000,
    maxRequests: 35,
  }));
