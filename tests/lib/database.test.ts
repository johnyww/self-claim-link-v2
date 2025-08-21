/**
 * Database layer unit tests
 */

import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import { mockDbPool, mockDbClient, dbTestHelpers, mockAdmin } from '../utils/testHelpers'

// Mock the database module
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => mockDbPool),
}))

jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

jest.mock('../../lib/config', () => ({
  __esModule: true,
  default: {
    getPostgresConfig: () => ({
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      user: 'test_user',
      password: 'test_password',
    }),
    get: () => ({ bcryptRounds: 12 }),
  },
}))

describe('Database Layer', () => {
  let database: any

  beforeEach(async () => {
    jest.clearAllMocks()
    dbTestHelpers.resetMocks()
    
    // Reset modules to get fresh instance
    jest.resetModules()
    database = await import('../../lib/database')
  })

  afterEach(() => {
    dbTestHelpers.resetMocks()
  })

  describe('getDatabase', () => {
    it('should establish database connection successfully', async () => {
      mockDbClient.query.mockResolvedValueOnce({ rows: [{ now: new Date() }] })
      
      const db = await database.getDatabase()
      
      expect(db).toBeDefined()
      expect(mockDbPool.connect).toHaveBeenCalled()
      expect(mockDbClient.query).toHaveBeenCalledWith('SELECT NOW()')
    })

    it('should handle connection failure', async () => {
      mockDbPool.connect.mockRejectedValueOnce(new Error('Connection failed'))
      
      await expect(database.getDatabase()).rejects.toThrow('PostgreSQL connection failed')
    })

    it('should return existing pool on subsequent calls', async () => {
      mockDbClient.query.mockResolvedValue({ rows: [{ now: new Date() }] })
      
      const db1 = await database.getDatabase()
      const db2 = await database.getDatabase()
      
      expect(db1).toBe(db2)
      expect(Pool).toHaveBeenCalledTimes(1)
    })
  })

  describe('getAdminByUsername', () => {
    it('should return admin when found', async () => {
      dbTestHelpers.mockQueryResult([mockAdmin])
      
      const admin = await database.getAdminByUsername('admin')
      
      expect(admin).toEqual(mockAdmin)
      expect(mockDbClient.query).toHaveBeenCalledWith(
        'SELECT * FROM admins WHERE username = $1',
        ['admin']
      )
    })

    it('should return null when admin not found', async () => {
      dbTestHelpers.mockQueryResult([])
      
      const admin = await database.getAdminByUsername('nonexistent')
      
      expect(admin).toBeNull()
    })

    it('should handle database errors', async () => {
      dbTestHelpers.mockQueryError(new Error('Database error'))
      
      await expect(database.getAdminByUsername('admin')).rejects.toThrow('Database error')
    })
  })

  describe('updateAdminPassword', () => {
    it('should update password successfully', async () => {
      dbTestHelpers.mockQueryResult([{ id: 1 }])
      
      const newPasswordHash = await bcrypt.hash('newpassword', 12)
      await database.updateAdminPassword(1, newPasswordHash)
      
      expect(mockDbClient.query).toHaveBeenCalledWith(
        'UPDATE admins SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newPasswordHash, 1]
      )
    })

    it('should handle update errors', async () => {
      dbTestHelpers.mockQueryError(new Error('Update failed'))
      
      await expect(database.updateAdminPassword(1, 'hash')).rejects.toThrow('Update failed')
    })
  })

  describe('recordFailedLogin', () => {
    it('should record failed login attempt', async () => {
      dbTestHelpers.mockQueryResult([])
      
      await database.recordFailedLogin('admin')
      
      expect(mockDbClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE admins SET failed_login_attempts'),
        ['admin']
      )
    })
  })

  describe('isAdminLocked', () => {
    it('should return true when admin is locked', async () => {
      const lockedAdmin = {
        ...mockAdmin,
        failed_login_attempts: 5,
        locked_until: new Date(Date.now() + 60000), // 1 minute from now
      }
      dbTestHelpers.mockQueryResult([lockedAdmin])
      
      const isLocked = await database.isAdminLocked('admin')
      
      expect(isLocked).toBe(true)
    })

    it('should return false when admin is not locked', async () => {
      dbTestHelpers.mockQueryResult([mockAdmin])
      
      const isLocked = await database.isAdminLocked('admin')
      
      expect(isLocked).toBe(false)
    })

    it('should return false when lock has expired', async () => {
      const expiredLockAdmin = {
        ...mockAdmin,
        failed_login_attempts: 5,
        locked_until: new Date(Date.now() - 60000), // 1 minute ago
      }
      dbTestHelpers.mockQueryResult([expiredLockAdmin])
      
      const isLocked = await database.isAdminLocked('admin')
      
      expect(isLocked).toBe(false)
    })
  })
})
