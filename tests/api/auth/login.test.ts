/**
 * Login API endpoint tests
 */

import bcrypt from 'bcryptjs'
import { createMockRequest, mockAdmin, dbTestHelpers } from '../../utils/testHelpers';

// Mock the database module
jest.mock('../../../lib/database', () => ({
  getDatabase: jest.fn(),
  getAdminByUsername: jest.fn(),
  recordFailedLogin: jest.fn(),
  resetFailedLogins: jest.fn(),
  isAdminLocked: jest.fn(),
}))

jest.mock('../../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

describe('/api/auth/login', () => {
  let loginHandler: any
  let mockDatabase: any

  beforeEach(async () => {
    jest.clearAllMocks()
    
    // Import the handler after mocks are set up
    const loginModule = await import('../../../app/api/auth/login/route')
    loginHandler = loginModule.POST
    
    mockDatabase = await import('../../../lib/database')
  })

  afterEach(() => {
    dbTestHelpers.resetMocks()
  })

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const passwordHash = await bcrypt.hash('password', 12)
      const adminWithHash = { ...mockAdmin, password_hash: passwordHash }
      
      mockDatabase.isAdminLocked.mockResolvedValue(false)
      mockDatabase.getAdminByUsername.mockResolvedValue(adminWithHash)
      mockDatabase.resetFailedLogins.mockResolvedValue(undefined)
      
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'admin', password: 'password' }
      })
      
      const response = await loginHandler(request)
      const responseData = await response.json()
      
      expect(response.status).toBe(200)
      expect(responseData).toHaveProperty('token')
      expect(responseData).toHaveProperty('admin')
      expect(responseData.admin.username).toBe('admin')
      expect(mockDatabase.resetFailedLogins).toHaveBeenCalledWith('admin')
    })

    it('should fail with invalid username', async () => {
      mockDatabase.isAdminLocked.mockResolvedValue(false)
      mockDatabase.getAdminByUsername.mockResolvedValue(null)
      mockDatabase.recordFailedLogin.mockResolvedValue(undefined)
      
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'invalid', password: 'password' }
      })
      
      const response = await loginHandler(request)
      
      expect(response.status).toBe(401)
      expect(mockDatabase.recordFailedLogin).toHaveBeenCalledWith('invalid')
    })

    it('should fail with invalid password', async () => {
      const passwordHash = await bcrypt.hash('correctpassword', 12)
      const adminWithHash = { ...mockAdmin, password_hash: passwordHash }
      
      mockDatabase.isAdminLocked.mockResolvedValue(false)
      mockDatabase.getAdminByUsername.mockResolvedValue(adminWithHash)
      mockDatabase.recordFailedLogin.mockResolvedValue(undefined)
      
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'admin', password: 'wrongpassword' }
      })
      
      const response = await loginHandler(request)
      
      expect(response.status).toBe(401)
      expect(mockDatabase.recordFailedLogin).toHaveBeenCalledWith('admin')
    })

    it('should fail when admin account is locked', async () => {
      mockDatabase.isAdminLocked.mockResolvedValue(true)
      
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'admin', password: 'password' }
      })
      
      const response = await loginHandler(request)
      const responseData = await response.json()
      
      expect(response.status).toBe(423)
      expect(responseData.error).toContain('locked')
    })

    it('should fail with missing credentials', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'admin' } // missing password
      })
      
      const response = await loginHandler(request)
      
      expect(response.status).toBe(400)
    })

    it('should handle database errors gracefully', async () => {
      mockDatabase.isAdminLocked.mockRejectedValue(new Error('Database connection failed'))
      
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: { username: 'admin', password: 'password' }
      })
      
      const response = await loginHandler(request)
      
      expect(response.status).toBe(500)
    })

    it('should only accept POST method', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'GET'
      })
      
      const response = await loginHandler(request)
      
      expect(response.status).toBe(405)
    })
  })
})
