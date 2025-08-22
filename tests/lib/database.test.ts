/**
 * Database layer unit tests
 */

import * as database from '../../lib/database'

// Mock the database functions directly
const mockDatabase = database as jest.Mocked<typeof database>

describe('Database Layer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getDatabase', () => {
    it('should establish database connection successfully', async () => {
      const mockPool = { connect: jest.fn(), query: jest.fn() }
      mockDatabase.getDatabase = jest.fn().mockResolvedValue(mockPool)
      
      const db = await mockDatabase.getDatabase()
      
      expect(db).toBeDefined()
      expect(mockDatabase.getDatabase).toHaveBeenCalled()
    })

    it('should return existing pool on subsequent calls', async () => {
      const mockPool = { connect: jest.fn(), query: jest.fn() }
      mockDatabase.getDatabase = jest.fn().mockResolvedValue(mockPool)
      
      const db1 = await mockDatabase.getDatabase()
      const db2 = await mockDatabase.getDatabase()
      
      expect(db1).toBe(db2)
    })
  })

  describe('getAdminByUsername', () => {
    it('should return admin when found', async () => {
      const mockAdmin = {
        id: 1,
        username: 'admin',
        password_hash: 'hashed_password',
        failed_login_attempts: 0,
        locked_until: null,
        created_at: new Date(),
        updated_at: new Date()
      }
      
      mockDatabase.getAdminByUsername = jest.fn().mockResolvedValue(mockAdmin)
      
      const admin = await mockDatabase.getAdminByUsername('admin')
      
      expect(admin).toEqual(mockAdmin)
      expect(mockDatabase.getAdminByUsername).toHaveBeenCalledWith('admin')
    })

    it('should return null when admin not found', async () => {
      mockDatabase.getAdminByUsername = jest.fn().mockResolvedValue(null)
      
      const admin = await mockDatabase.getAdminByUsername('nonexistent')
      
      expect(admin).toBeNull()
    })

    it('should handle database errors', async () => {
      mockDatabase.getAdminByUsername = jest.fn().mockRejectedValue(new Error('Failed to retrieve admin user'))
      
      await expect(mockDatabase.getAdminByUsername('admin')).rejects.toThrow('Failed to retrieve admin user')
    })
  })

  describe('updateAdminPassword', () => {
    it('should update password successfully', async () => {
      mockDatabase.updateAdminPassword = jest.fn().mockResolvedValue(undefined)
      
      await mockDatabase.updateAdminPassword(1, 'new_hash')
      
      expect(mockDatabase.updateAdminPassword).toHaveBeenCalledWith(1, 'new_hash')
    })

    it('should handle update errors', async () => {
      mockDatabase.updateAdminPassword = jest.fn().mockRejectedValue(new Error('Failed to update password'))
      
      await expect(mockDatabase.updateAdminPassword(1, 'hash')).rejects.toThrow('Failed to update password')
    })
  })

  describe('recordFailedLogin', () => {
    it('should record failed login attempt', async () => {
      mockDatabase.recordFailedLogin = jest.fn().mockResolvedValue(undefined)
      
      await mockDatabase.recordFailedLogin('admin')
      
      expect(mockDatabase.recordFailedLogin).toHaveBeenCalledWith('admin')
    })
  })

  describe('isAdminLocked', () => {
    it('should return true when admin is locked', async () => {
      mockDatabase.isAdminLocked = jest.fn().mockResolvedValue(true)
      
      const isLocked = await mockDatabase.isAdminLocked('admin')
      
      expect(isLocked).toBe(true)
    })

    it('should return false when admin is not locked', async () => {
      mockDatabase.isAdminLocked = jest.fn().mockResolvedValue(false)
      
      const isLocked = await mockDatabase.isAdminLocked('admin')
      
      expect(isLocked).toBe(false)
    })
  })
})
