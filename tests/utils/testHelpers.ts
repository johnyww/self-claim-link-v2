/**
 * Test utilities and helpers
 */

import type { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

// Mock database client for testing
export const mockDbClient = {
  query: jest.fn(),
  connect: jest.fn(),
  release: jest.fn(),
  end: jest.fn(),
}

// Mock database pool
export const mockDbPool = {
  connect: jest.fn().mockResolvedValue(mockDbClient),
  query: mockDbClient.query,
  end: jest.fn(),
}

// Create mock NextRequest
export function createMockRequest(
  url: string,
  options: {
    method?: string
    headers?: Record<string, string>
    body?: any
  } = {}
): NextRequest | any {
  const { method = 'GET', headers = {}, body } = options
  
  const request = new Request(url, {
    method,
    headers: new Headers(headers),
    body: body ? JSON.stringify(body) : undefined,
  })
  
  return request
}

// Create JWT token for testing
export function createTestJWT(payload: any = { userId: 1, username: 'admin' }): string {
  return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' })
}

// Mock admin user
export const mockAdmin = {
  id: 1,
  username: 'admin',
  password_hash: '$2a$12$mockhashedpassword',
  created_at: new Date(),
  last_login: new Date(),
  failed_login_attempts: 0,
  locked_until: null,
}

// Mock product
export const mockProduct = {
  id: 1,
  name: 'Test Product',
  description: 'Test Description',
  download_link: 'https://example.com/download',
  created_at: new Date(),
}

// Mock order
export const mockOrder = {
  id: 1,
  order_id: 'TEST123',
  is_claimed: false,
  claimed_at: null,
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  created_at: new Date(),
}

// Database test helpers
export const dbTestHelpers = {
  resetMocks: () => {
    jest.clearAllMocks()
    mockDbClient.query.mockReset()
    mockDbPool.connect.mockReset()
    mockDbPool.query.mockReset()
  },
  
  mockQueryResult: (result: any) => {
    mockDbClient.query.mockResolvedValueOnce({ rows: result, rowCount: result.length })
  },
  
  mockQueryError: (error: Error) => {
    mockDbClient.query.mockRejectedValueOnce(error)
  },
}

// API response helpers
export const apiTestHelpers = {
  expectSuccessResponse: (response: Response, expectedData?: any) => {
    expect(response.status).toBe(200)
    if (expectedData) {
      expect(response.json()).resolves.toMatchObject(expectedData)
    }
  },
  
  expectErrorResponse: (response: Response, expectedStatus: number, expectedMessage?: string) => {
    expect(response.status).toBe(expectedStatus)
    if (expectedMessage) {
      expect(response.json()).resolves.toMatchObject({
        error: expect.stringContaining(expectedMessage)
      })
    }
  },
}

// Clean up function for tests
export const cleanup = () => {
  jest.clearAllMocks()
  dbTestHelpers.resetMocks()
}
