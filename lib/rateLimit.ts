/**
 * Rate limiting middleware for API endpoints.
 * Prevents abuse and DoS attacks by using a database-backed rate limiter.
 */

import { NextRequest, NextResponse } from 'next/server';
import config from './config';
import { logger } from './logger';
import { checkIpRateLimit } from './database';

function createRateLimitMiddleware(
  limitConfig: { windowMs: number; max: number }
) {
  return (handler: (request: NextRequest) => Promise<NextResponse>) =>
    async (request: NextRequest): Promise<NextResponse> => {
      try {
        const clientId = request.headers.get('x-forwarded-for') || '127.0.0.1';
        
        // The window for the database check is in seconds
        const windowSeconds = Math.ceil(limitConfig.windowMs / 1000);

        const { isLimited, remaining, reset } = await checkIpRateLimit(
          clientId,
          windowSeconds,
          limitConfig.max
        );

        const headers: {
          'X-RateLimit-Limit': string;
          'X-RateLimit-Remaining': string;
          'X-RateLimit-Reset': string;
          'Retry-After'?: string;
        } = {
          'X-RateLimit-Limit': limitConfig.max.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': new Date(reset).toISOString(),
        };

        if (isLimited) {
          const retryAfter = Math.ceil((reset - Date.now()) / 1000);
          if (retryAfter > 0) {
            headers['Retry-After'] = retryAfter.toString();
          }
          return NextResponse.json(
            {
              error: 'TOO_MANY_REQUESTS',
              message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
            },
            { status: 429, headers }
          );
        }

        const response = await handler(request);

        // Attach rate limit headers to the successful response
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });

        return response;
      } catch (error) {
        logger.error('Critical error in rate limiting middleware. Blocking request for security.', { error });
        // Fail-closed: If rate limiting has an error, block the request.
        return NextResponse.json(
          { error: 'INTERNAL_SERVER_ERROR', message: 'An internal error occurred.' },
          { status: 500 }
        );
      }
    };
}

/**
 * Stricter rate limiting for sensitive endpoints (e.g., login, password reset).
 */
export const withStrictRateLimit = createRateLimitMiddleware({
  windowMs: config.getStrictRateLimitConfig().windowMs, // e.g., 15 minutes
  max: config.getStrictRateLimitConfig().max, // e.g., 5 requests
});

/**
 * Moderate rate limiting for general API endpoints.
 */
export const withApiRateLimit = createRateLimitMiddleware({
  windowMs: config.getRateLimitConfig().windowMs, // e.g., 15 minutes
  max: config.getRateLimitConfig().max, // e.g., 100 requests
});
