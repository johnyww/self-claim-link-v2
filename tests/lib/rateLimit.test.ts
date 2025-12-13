import { NextRequest, NextResponse } from 'next/server';
import { withStrictRateLimit, withApiRateLimit } from '@/lib/rateLimit';
import { checkIpRateLimit } from '@/lib/database';


// Mock the database's checkIpRateLimit function
jest.mock('@/lib/database', () => ({
  checkIpRateLimit: jest.fn(),
  getDatabase: jest.fn(), // Mock getDatabase as well if it's imported elsewhere in rateLimit.ts
}));

// Mock the config module
jest.mock('@/lib/config', () => ({
  __esModule: true,
  default: {
    getStrictRateLimitConfig: jest.fn(() => ({
      windowMs: 10 * 1000, // 10 seconds
      max: 5, // 5 requests
    })),
    getRateLimitConfig: jest.fn(() => ({
      windowMs: 60 * 1000, // 60 seconds
      max: 100, // 100 requests
    })),
    isDevelopment: jest.fn(() => true),
    isProduction: jest.fn(() => false),
  },
}));

// Mock NextRequest and NextResponse to avoid issues with their internal dependencies in Jest
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server');
  return {
    ...actual,
    NextRequest: jest.fn().mockImplementation((url, options) => {
      const mockHeaders = new Headers(options?.headers);
      return {
        url,
        method: options?.method || 'GET',
        headers: {
          get: (name: string) => mockHeaders.get(name),
          append: (name: string, value: string) => mockHeaders.append(name, value),
          set: (name: string, value: string) => mockHeaders.set(name, value),
          has: (name: string) => mockHeaders.has(name),
          delete: (name: string) => mockHeaders.delete(name),
          forEach: (callback: any) => mockHeaders.forEach(callback),
          entries: () => mockHeaders.entries(),
          keys: () => mockHeaders.keys(),
          values: () => mockHeaders.values(),
          [Symbol.iterator]: () => mockHeaders[Symbol.iterator](),
        },
        json: async () => JSON.parse(options?.body || '{}'),
        text: async () => options?.body || '',
        ip: '127.0.0.1', // Mock the IP for rate limiting
        cookies: {
          get: jest.fn(),
          set: jest.fn(),
          delete: jest.fn(),
          getAll: jest.fn(),
        },
      };
    }),
    NextResponse: {
      json: jest.fn((data, options) => {
        return {
          json: () => Promise.resolve(data),
          status: options?.status || 200,
          headers: new Headers(options?.headers),
          cookies: {
            getSetCookie: jest.fn(() => []), // Mock getSetCookie
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            getAll: jest.fn(),
          },
        };
      }),
    },
  };
});

describe('Rate Limiting Middleware', () => {
  let mockRequest: NextRequest;
  let mockHandler: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = new NextRequest('http://localhost/', {
      method: 'GET',
      headers: { 'x-forwarded-for': '127.0.0.1' } // Provide a header for the IP
    });
    mockHandler = jest.fn(async () => NextResponse.json({ message: 'Success' }, { status: 200 }));
  });

  describe('withStrictRateLimit', () => {
    it('should allow request if within strict rate limit', async () => {
      (checkIpRateLimit as jest.Mock).mockResolvedValue({
        isLimited: false,
        remaining: 4,
        reset: Date.now() + 10000,
      });

      const wrappedHandler = withStrictRateLimit(mockHandler);
      const response = await wrappedHandler(mockRequest);

      expect(checkIpRateLimit).toHaveBeenCalledWith('127.0.0.1', 10, 5);
      expect(mockHandler).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.headers.get('X-RateLimit-Limit')).toBe('5');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('4');
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined(); // Check for presence and format if needed
      expect(response.headers.has('Retry-After')).toBeFalsy(); // Should not have Retry-After
    });

    it('should block request if strict rate limit is exceeded', async () => {
      (checkIpRateLimit as jest.Mock).mockResolvedValue({
        isLimited: true,
        remaining: 0,
        reset: Date.now() + 10000,
        retryAfter: 10,
      });

      const wrappedHandler = withStrictRateLimit(mockHandler);
      const response = await wrappedHandler(mockRequest);

      expect(checkIpRateLimit).toHaveBeenCalledWith('127.0.0.1', 10, 5);
      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('10');
      const json = await response.json();
      expect(json.error).toBe('TOO_MANY_REQUESTS');
    });

    it('should handle errors in checkIpRateLimit by blocking the request', async () => {
      (checkIpRateLimit as jest.Mock).mockRejectedValue(new Error('Database error'));

      const wrappedHandler = withStrictRateLimit(mockHandler);
      const response = await wrappedHandler(mockRequest);

      expect(checkIpRateLimit).toHaveBeenCalledWith('127.0.0.1', 10, 5);
      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should use default IP if x-forwarded-for header is missing', async () => {
      (checkIpRateLimit as jest.Mock).mockResolvedValue({
        isLimited: false,
        remaining: 4,
        reset: Date.now() + 10000,
      });

      // Create a request without 'x-forwarded-for' header
      mockRequest = new NextRequest('http://localhost/', { method: 'GET', headers: {} });

      const wrappedHandler = withStrictRateLimit(mockHandler);
      await wrappedHandler(mockRequest);

      expect(checkIpRateLimit).toHaveBeenCalledWith('127.0.0.1', 10, 5);
    });
  });

  describe('withApiRateLimit', () => {
    it('should allow request if within general API rate limit', async () => {
      (checkIpRateLimit as jest.Mock).mockResolvedValue({
        isLimited: false,
        remaining: 99,
        reset: Date.now() + 60000,
      });

      const wrappedHandler = withApiRateLimit(mockHandler);
      const response = await wrappedHandler(mockRequest);

      expect(checkIpRateLimit).toHaveBeenCalledWith('127.0.0.1', 60, 100);
      expect(mockHandler).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('99');
    });

    it('should block request if general API rate limit is exceeded', async () => {
      (checkIpRateLimit as jest.Mock).mockResolvedValue({
        isLimited: true,
        remaining: 0,
        reset: Date.now() + 60000,
        retryAfter: 60,
      });

      const wrappedHandler = withApiRateLimit(mockHandler);
      const response = await wrappedHandler(mockRequest);

      expect(checkIpRateLimit).toHaveBeenCalledWith('127.0.0.1', 60, 100);
      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('60');
      const json = await response.json();
      expect(json.error).toBe('TOO_MANY_REQUESTS');
    });
  });
});