jest.mock('../../../lib/database', () => ({
  getAdminByUsername: jest.fn(),
  recordFailedLogin: jest.fn(),
  resetFailedLogins: jest.fn(),
  isAdminLocked: jest.fn(),
  getDatabase: jest.fn()
}));
jest.mock('../../../lib/logger');
jest.mock('../../../lib/validation/validator');
jest.mock('../../../lib/rateLimit', () => ({
  withStrictRateLimit: jest.fn(handler => handler)
}));
jest.mock('../../../lib/errorHandler', () => ({
  withErrorHandler: jest.fn(handler => handler),
  createSuccessResponse: jest.fn(),
  AuthenticationError: class extends Error { constructor(message: string) { super(message); this.name = 'AuthenticationError'; } },
  ValidationError: class extends Error { constructor(message: string) { super(message); this.name = 'ValidationError'; } }
}));
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

jest.doMock('../../../lib/config', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => ({
      sessionTimeoutHours: 24
    })),
    getJwtSecret: jest.fn(() => 'test-secret'),
    getStrictRateLimitConfig: jest.fn(() => ({
      windowMs: 900000,
      max: 5
    })),
    isDevelopment: jest.fn(() => true),
    isProduction: jest.fn(() => false),
  }
}));

import { createMockRequest } from '../../utils/testHelpers';
import * as database from '../../../lib/database';
import * as errorHandler from '../../../lib/errorHandler';
import * as bcrypt from 'bcryptjs';
import * as validator from '../../../lib/validation/validator';

describe('/api/auth/login', () => {
  let POST: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const route = await import('../../../app/api/auth/login/route');
    POST = route.POST;
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockAdmin = {
        id: 1,
        username: 'admin',
        password_hash: '$2a$12$validhashedpassword',
        must_change_password: false
      };
      
      (validator.validate as jest.Mock).mockReturnValue({ username: 'admin', password: 'password' });
      (database.isAdminLocked as jest.Mock).mockResolvedValue(false);
      (database.getAdminByUsername as jest.Mock).mockResolvedValue(mockAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (database.resetFailedLogins as jest.Mock).mockResolvedValue(undefined);
      (errorHandler.createSuccessResponse as jest.Mock).mockReturnValue({
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
      });
      
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'admin', password: 'password' })
      });
      
      await POST(request);
      
      expect(database.isAdminLocked).toHaveBeenCalledWith('admin');
      expect(database.getAdminByUsername).toHaveBeenCalledWith('admin');
      expect(bcrypt.compare).toHaveBeenCalledWith('password', mockAdmin.password_hash);
      expect(database.resetFailedLogins).toHaveBeenCalledWith('admin');
    });

    it('should fail with invalid username', async () => {
      (validator.validate as jest.Mock).mockReturnValue({ username: 'invalid', password: 'password' });
      (database.isAdminLocked as jest.Mock).mockResolvedValue(false);
      (database.getAdminByUsername as jest.Mock).mockResolvedValue(null);
      (database.recordFailedLogin as jest.Mock).mockResolvedValue(undefined);
      
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'invalid', password: 'password' })
      });
      
      await expect(POST(request)).rejects.toThrow('Invalid credentials');
      expect(database.recordFailedLogin).toHaveBeenCalledWith('invalid');
    });

    it('should fail with invalid password', async () => {
      const mockAdmin = {
        id: 1,
        username: 'admin',
        password_hash: '$2a$12$differenthashedpassword'
      };
      
      (validator.validate as jest.Mock).mockReturnValue({ username: 'admin', password: 'wrongpassword' });
      (database.isAdminLocked as jest.Mock).mockResolvedValue(false);
      (database.getAdminByUsername as jest.Mock).mockResolvedValue(mockAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      (database.recordFailedLogin as jest.Mock).mockResolvedValue(undefined);
      
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'admin', password: 'wrongpassword' })
      });
      
      await expect(POST(request)).rejects.toThrow('Invalid credentials');
      expect(database.recordFailedLogin).toHaveBeenCalledWith('admin');
    });

    it('should fail when admin account is locked', async () => {
      (validator.validate as jest.Mock).mockReturnValue({ username: 'admin', password: 'password' });
      (database.isAdminLocked as jest.Mock).mockResolvedValue(true);
      
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'admin', password: 'password' })
      });
      
      await expect(POST(request)).rejects.toThrow('Account is temporarily locked');
      expect(database.isAdminLocked).toHaveBeenCalledWith('admin');
    });

    it('should handle database errors gracefully', async () => {
      (validator.validate as jest.Mock).mockReturnValue({ username: 'admin', password: 'password' });
      (database.isAdminLocked as jest.Mock).mockRejectedValue(new Error('Database connection failed'));
      
      const request = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'admin', password: 'password' })
      });
      
      await expect(POST(request)).rejects.toThrow('Database connection failed');
    });
  });
});
