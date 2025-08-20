/**
 * Rate limiting middleware for API endpoints
 * Prevents abuse and DoS attacks
 */

import { NextRequest, NextResponse } from 'next/server';
import config from './config';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.store.forEach((entry, key) => {
      if (now > entry.resetTime) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.store.delete(key));
  }

  private getClientId(request: NextRequest): string {
    // Try to get real IP from various headers (for production behind proxy)
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    
    let clientIp = forwarded?.split(',')[0] || realIp || cfConnectingIp;
    
    // Fallback to connection remote address
    if (!clientIp) {
      // In development, we might not have these headers
      clientIp = 'development-client';
    }
    
    return clientIp.trim();
  }

  public isRateLimited(request: NextRequest, customLimits?: { windowMs: number; max: number }): {
    isLimited: boolean;
    remainingRequests: number;
    resetTime: number;
    retryAfter?: number;
  } {
    const clientId = this.getClientId(request);
    const now = Date.now();
    const limits = customLimits || config.getRateLimitConfig();
    
    const entry = this.store.get(clientId);
    
    // If no entry exists or the window has expired, create a new one
    if (!entry || now > entry.resetTime) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + limits.windowMs
      };
      this.store.set(clientId, newEntry);
      
      return {
        isLimited: false,
        remainingRequests: limits.max - 1,
        resetTime: newEntry.resetTime
      };
    }
    
    // Check if limit is exceeded
    if (entry.count >= limits.max) {
      return {
        isLimited: true,
        remainingRequests: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      };
    }
    
    // Increment count
    entry.count++;
    this.store.set(clientId, entry);
    
    return {
      isLimited: false,
      remainingRequests: limits.max - entry.count,
      resetTime: entry.resetTime
    };
  }

  public reset(request: NextRequest): void {
    const clientId = this.getClientId(request);
    this.store.delete(clientId);
  }

  public getStats(): { totalClients: number; totalRequests: number } {
    let totalRequests = 0;
    
    this.store.forEach((entry) => {
      totalRequests += entry.count;
    });
    
    return {
      totalClients: this.store.size,
      totalRequests
    };
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

/**
 * Rate limiting middleware function
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  customLimits?: { windowMs: number; max: number }
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const result = rateLimiter.isRateLimited(request, customLimits);
      
      if (result.isLimited) {
        return NextResponse.json(
          {
            error: 'Too many requests',
            message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
            retryAfter: result.retryAfter
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': customLimits?.max.toString() || config.getRateLimitConfig().max.toString(),
              'X-RateLimit-Remaining': result.remainingRequests.toString(),
              'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
              'Retry-After': result.retryAfter?.toString() || '0'
            }
          }
        );
      }
      
      // Add rate limit headers to successful responses
      const response = await handler(request);
      
      response.headers.set('X-RateLimit-Limit', customLimits?.max.toString() || config.getRateLimitConfig().max.toString());
      response.headers.set('X-RateLimit-Remaining', result.remainingRequests.toString());
      response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
      
      return response;
    } catch (error) {
      console.error('Rate limiting error:', error);
      // If rate limiting fails, continue with the request
      return handler(request);
    }
  };
}

/**
 * Stricter rate limiting for sensitive endpoints (login, admin operations)
 */
export function withStrictRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  const strictConfig = config.getStrictRateLimitConfig();
  return withRateLimit(handler, {
    windowMs: strictConfig.windowMs,
    max: strictConfig.max
  });
}

/**
 * Moderate rate limiting for API endpoints
 */
export function withApiRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  const rateLimitConfig = config.getRateLimitConfig();
  return withRateLimit(handler, {
    windowMs: rateLimitConfig.windowMs,
    max: Math.floor(rateLimitConfig.max / 2) // More lenient than strict, but still controlled
  });
}

export { rateLimiter };
export default withRateLimit;
