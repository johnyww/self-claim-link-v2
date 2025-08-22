/**
 * Login API endpoint tests
 */

import { createMockRequest } from '../../utils/testHelpers'

// Mock all dependencies
jest.mock('../../../lib/database')
jest.mock('../../../lib/logger')
jest.mock('../../../lib/validation')
jest.mock('../../../lib/rateLimit')
jest.mock('../../../lib/errorHandler')
jest.mock('../../../lib/config')
jest.mock('bcryptjs')
jest.mock('jsonwebtoken')

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200,
      ok: options?.status < 400
    }))
  }
}))

describe('/api/auth/login', () => {
  let mockDatabase: any
  let mockValidation: any
  let mockRateLimit: any
  let mockErrorHandler: any
  let mockConfig: any
  let mockBcrypt: any
  let mockJwt: any
  let POST: any

  beforeEach(async () => {
    jest.clearAllMocks()
    
    // Setup database mocks
    mockDatabase = require('../../../lib/database')
    mockDatabase.getAdminByUsername = jest.fn()
    mockDatabase.recordFailedLogin = jest.fn()
    mockDatabase.resetFailedLogins = jest.fn()
    mockDatabase.isAdminLocked = jest.fn()
    
    // Setup validation mocks
    mockValidation = require('../../../lib/validation')
    mockValidation.validateAdminCredentials = jest.fn()
    
    // Setup rate limit mocks
    mockRateLimit = require('../../../lib/rateLimit')
    mockRateLimit.withStrictRateLimit = jest.fn((handler) => handler)
    
    // Setup error handler mocks
    mockErrorHandler = require('../../../lib/errorHandler')
    mockErrorHandler.withErrorHandler = jest.fn((handler) => handler)
    mockErrorHandler.createSuccessResponse = jest.fn()
    mockErrorHandler.validateOrThrow = jest.fn()
    mockErrorHandler.AuthenticationError = jest.fn()
    mockErrorHandler.ValidationError = jest.fn()
    
    // Setup config mocks
    mockConfig = require('../../../lib/config')
    mockConfig.default = {
      getJwtSecret: jest.fn(() => 'test-secret'),
      get: jest.fn(() => ({ sessionTimeoutHours: 24 }))
    }
    
    // Setup bcrypt mocks
    mockBcrypt = require('bcryptjs')
    mockBcrypt.compare = jest.fn()
    
    // Setup JWT mocks
    mockJwt = require('jsonwebtoken')
    mockJwt.sign = jest.fn(() => 'test-token')

    // Import the route after setting up mocks
    const route = await import('../../../app/api/auth/login/route')
    POST = route.POST
  })

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockAdmin = {
        id: 1,
        username: 'admin',
        password_hash: '$2a$12$validhashedpassword',
        must_change_password: false
      }
      
      // Setup successful login scenario
      mockErrorHandler.validateOrThrow.mockReturnValue({ username: 'admin', password: 'password' })
      mockDatabase.isAdminLocked.mockResolvedValue(false)
      mockDatabase.getAdminByUsername.mockResolvedValue(mockAdmin)
      mockBcrypt.compare.mockResolvedValue(true)
      mockDatabase.resetFailedLogins.mockResolvedValue(undefined)
      mockErrorHandler.createSuccessResponse.mockReturnValue({
        json: () => Promise.resolve({
          success: true,
          data: {
            token: 'test-token',
            username: 'admin',
            mustChangePassword: false
          }
        }),
        status: 200,
        ok: true
      })
      
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'admin', password: 'password' }
      })
      
      await POST(request)
      
      expect(mockDatabase.isAdminLocked).toHaveBeenCalledWith('admin')
      expect(mockDatabase.getAdminByUsername).toHaveBeenCalledWith('admin')
      expect(mockBcrypt.compare).toHaveBeenCalledWith('password', mockAdmin.password_hash)
      expect(mockDatabase.resetFailedLogins).toHaveBeenCalledWith('admin')
    })

    it('should fail with invalid username', async () => {
      // Setup failed login scenario
      mockErrorHandler.validateOrThrow.mockReturnValue({ username: 'invalid', password: 'password' })
      mockDatabase.isAdminLocked.mockResolvedValue(false)
      mockDatabase.getAdminByUsername.mockResolvedValue(null)
      mockDatabase.recordFailedLogin.mockResolvedValue(undefined)
      mockErrorHandler.AuthenticationError.mockImplementation((message: string) => {
        const error = new Error(message)
        error.name = 'AuthenticationError'
        throw error
      })
      
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'invalid', password: 'password' }
      })
      
      await expect(POST(request)).rejects.toThrow('Invalid credentials')
      expect(mockDatabase.recordFailedLogin).toHaveBeenCalledWith('invalid')
    })

    it('should fail with invalid password', async () => {
      const mockAdmin = {
        id: 1,
        username: 'admin',
        password_hash: '$2a$12$differenthashedpassword'
      }
      
      mockErrorHandler.validateOrThrow.mockReturnValue({ username: 'admin', password: 'wrongpassword' })
      mockDatabase.isAdminLocked.mockResolvedValue(false)
      mockDatabase.getAdminByUsername.mockResolvedValue(mockAdmin)
      mockBcrypt.compare.mockResolvedValue(false)
      mockDatabase.recordFailedLogin.mockResolvedValue(undefined)
      mockErrorHandler.AuthenticationError.mockImplementation((message: string) => {
        const error = new Error(message)
        error.name = 'AuthenticationError'
        throw error
      })
      
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'admin', password: 'wrongpassword' }
      })
      
      await expect(POST(request)).rejects.toThrow('Invalid credentials')
      expect(mockDatabase.recordFailedLogin).toHaveBeenCalledWith('admin')
    })

    it('should fail when admin account is locked', async () => {
      mockErrorHandler.validateOrThrow.mockReturnValue({ username: 'admin', password: 'password' })
      mockDatabase.isAdminLocked.mockResolvedValue(true)
      mockErrorHandler.AuthenticationError.mockImplementation((message: string) => {
        const error = new Error(message)
        error.name = 'AuthenticationError'
        throw error
      })
      
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'admin', password: 'password' }
      })
      
      await expect(POST(request)).rejects.toThrow('Account is temporarily locked')
      expect(mockDatabase.isAdminLocked).toHaveBeenCalledWith('admin')
    })

    it('should handle database errors gracefully', async () => {
      mockErrorHandler.validateOrThrow.mockReturnValue({ username: 'admin', password: 'password' })
      mockDatabase.isAdminLocked.mockRejectedValue(new Error('Database connection failed'))
      
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'admin', password: 'password' }
      })
      
      await expect(POST(request)).rejects.toThrow('Database connection failed')
    })
  })
})
