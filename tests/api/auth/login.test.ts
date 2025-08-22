/**
 * Login API endpoint tests
 */

import { NextResponse } from 'next/server'
import { createMockRequest } from '../../utils/testHelpers'

// Mock all dependencies
jest.mock('../../../lib/database')
jest.mock('../../../lib/logger')
jest.mock('../../../lib/validation')
jest.mock('../../../lib/rateLimit')

describe('/api/auth/login', () => {
  let mockDatabase: any
  let mockValidation: any
  let mockRateLimit: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup database mocks
    mockDatabase = require('../../../lib/database')
    mockDatabase.getAdminByUsername = jest.fn()
    mockDatabase.recordFailedLogin = jest.fn()
    mockDatabase.resetFailedLogins = jest.fn()
    mockDatabase.isAdminLocked = jest.fn()
    
    // Setup validation mocks
    mockValidation = require('../../../lib/validation')
    mockValidation.validateLoginRequest = jest.fn().mockReturnValue({
      isValid: true,
      sanitizedData: { username: 'admin', password: 'password' }
    })
    
    // Setup rate limit mocks
    mockRateLimit = require('../../../lib/rateLimit')
    mockRateLimit.withStrictRateLimit = jest.fn((handler) => handler)
  })

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockAdmin = {
        id: 1,
        username: 'admin',
        password_hash: '$2a$12$validhashedpassword'
      }
      
      mockDatabase.isAdminLocked.mockResolvedValue(false)
      mockDatabase.getAdminByUsername.mockResolvedValue(mockAdmin)
      mockDatabase.resetFailedLogins.mockResolvedValue(undefined)
      
      const mockPOST = jest.fn().mockResolvedValue(
        NextResponse.json({
          success: true,
          token: 'mock-jwt-token',
          admin: { id: 1, username: 'admin' },
          timestamp: new Date().toISOString()
        })
      )
      
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'admin', password: 'password' }
      })
      
      const response = await mockPOST(request)
      const responseData = await response.json()
      
      expect(response.status).toBe(200)
      expect(responseData).toHaveProperty('success', true)
      expect(responseData).toHaveProperty('token')
      expect(responseData).toHaveProperty('admin')
    })

    it('should fail with invalid username', async () => {
      mockDatabase.isAdminLocked.mockResolvedValue(false)
      mockDatabase.getAdminByUsername.mockResolvedValue(null)
      mockDatabase.recordFailedLogin.mockResolvedValue(undefined)
      
      const mockPOST = jest.fn().mockResolvedValue(
        NextResponse.json({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'Invalid credentials',
            timestamp: new Date().toISOString()
          }
        }, { status: 401 })
      )
      
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'invalid', password: 'password' }
      })
      
      const response = await mockPOST(request)
      
      expect(response.status).toBe(401)
    })

    it('should fail with invalid password', async () => {
      const mockAdmin = {
        id: 1,
        username: 'admin',
        password_hash: '$2a$12$differenthashedpassword'
      }
      
      mockDatabase.isAdminLocked.mockResolvedValue(false)
      mockDatabase.getAdminByUsername.mockResolvedValue(mockAdmin)
      mockDatabase.recordFailedLogin.mockResolvedValue(undefined)
      
      const mockPOST = jest.fn().mockResolvedValue(
        NextResponse.json({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'Invalid credentials',
            timestamp: new Date().toISOString()
          }
        }, { status: 401 })
      )
      
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'admin', password: 'wrongpassword' }
      })
      
      const response = await mockPOST(request)
      
      expect(response.status).toBe(401)
    })

    it('should fail when admin account is locked', async () => {
      mockDatabase.isAdminLocked.mockResolvedValue(true)
      
      const mockPOST = jest.fn().mockResolvedValue(
        NextResponse.json({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'Account is temporarily locked',
            timestamp: new Date().toISOString()
          }
        }, { status: 423 })
      )
      
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'admin', password: 'password' }
      })
      
      const response = await mockPOST(request)
      
      expect(response.status).toBe(423)
    })

    it('should fail with missing credentials', async () => {
      mockValidation.validateLoginRequest.mockReturnValue({
        isValid: false,
        errors: ['Username and password are required']
      })
      
      const mockPOST = jest.fn().mockResolvedValue(
        NextResponse.json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            timestamp: new Date().toISOString()
          }
        }, { status: 400 })
      )
      
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'admin' }
      })
      
      const response = await mockPOST(request)
      
      expect(response.status).toBe(400)
    })

    it('should handle database errors gracefully', async () => {
      mockDatabase.isAdminLocked.mockRejectedValue(new Error('Database connection failed'))
      
      const mockPOST = jest.fn().mockResolvedValue(
        NextResponse.json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
            timestamp: new Date().toISOString()
          }
        }, { status: 500 })
      )
      
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'admin', password: 'password' }
      })
      
      const response = await mockPOST(request)
      
      expect(response.status).toBe(500)
    })

    it('should only accept POST method', async () => {
      const mockPOST = jest.fn().mockResolvedValue(
        NextResponse.json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Method not allowed',
            timestamp: new Date().toISOString()
          }
        }, { status: 405 })
      )
      
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'GET'
      })
      
      const response = await mockPOST(request)
      
      expect(response.status).toBe(405)
    })
  })
})
