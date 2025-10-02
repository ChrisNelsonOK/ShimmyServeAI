// Rate limiting utilities for API security

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: 15 * 60 * 1000, // 15 minutes default
      maxRequests: 100, // 100 requests default
      message: 'Too many requests, please try again later',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config,
    };

    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  private getKey(identifier: string): string {
    return `rate_limit:${identifier}`;
  }

  public check(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const key = this.getKey(identifier);
    const now = Date.now();
    const resetTime = now + this.config.windowMs;

    // Initialize or reset if window expired
    if (!this.store[key] || this.store[key].resetTime < now) {
      this.store[key] = {
        count: 1,
        resetTime,
      };
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime,
      };
    }

    // Increment count
    this.store[key].count++;

    const allowed = this.store[key].count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - this.store[key].count);

    return {
      allowed,
      remaining,
      resetTime: this.store[key].resetTime,
    };
  }

  public reset(identifier: string): void {
    const key = this.getKey(identifier);
    delete this.store[key];
  }

  public getStatus(identifier: string): { count: number; remaining: number; resetTime: number } | null {
    const key = this.getKey(identifier);
    const entry = this.store[key];
    
    if (!entry || entry.resetTime < Date.now()) {
      return null;
    }

    return {
      count: entry.count,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.resetTime,
    };
  }
}

// Pre-configured rate limiters for different use cases
export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later',
});

export const apiRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 API calls per 15 minutes
  message: 'API rate limit exceeded, please try again later',
});

export const uploadRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 uploads per hour
  message: 'Upload rate limit exceeded, please try again later',
});

// React hook for client-side rate limiting
export function useRateLimit(limiter: RateLimiter, identifier: string) {
  const checkRateLimit = (): { allowed: boolean; remaining: number; resetTime: number } => {
    return limiter.check(identifier);
  };

  const getRemainingRequests = (): number => {
    const status = limiter.getStatus(identifier);
    return status?.remaining ?? limiter['config'].maxRequests;
  };

  const getResetTime = (): number | null => {
    const status = limiter.getStatus(identifier);
    return status?.resetTime ?? null;
  };

  const resetLimit = (): void => {
    limiter.reset(identifier);
  };

  return {
    checkRateLimit,
    getRemainingRequests,
    getResetTime,
    resetLimit,
  };
}

// Utility function to get user identifier (IP or user ID)
export function getUserIdentifier(userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }
  
  // In a browser environment, we can't get the real IP
  // So we'll use a session-based identifier
  let sessionId = sessionStorage.getItem('rate_limit_session');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('rate_limit_session', sessionId);
  }
  
  return `session:${sessionId}`;
}

// Express middleware for server-side rate limiting
export function createRateLimitMiddleware(limiter: RateLimiter) {
  return (req: any, res: any, next: any) => {
    const identifier = req.ip || req.connection.remoteAddress || 'unknown';
    const result = limiter.check(identifier);

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': limiter['config'].maxRequests.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
    });

    if (!result.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: limiter['config'].message,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      });
    }

    next();
  };
}

export { RateLimiter };
export type { RateLimitConfig };