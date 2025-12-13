jest.mock('../../lib/database', () => ({
  getDatabase: jest.fn()
}));
jest.mock('../../lib/logger');
jest.mock('../../lib/validation/validator');
jest.mock('../../lib/rateLimit', () => ({
  withApiRateLimit: jest.fn(handler => handler)
}));
jest.mock('../../lib/errorHandler', () => ({
  withErrorHandler: jest.fn(handler => handler),
  createSuccessResponse: jest.fn(),
  NotFoundError: class extends Error { constructor(message: string) { super(message); this.name = 'NotFoundError'; } },
  ValidationError: class extends Error { constructor(message: string) { super(message); this.name = 'ValidationError'; } }
}));

jest.doMock('../../lib/config', () => ({
  __esModule: true,
  default: {
    getRateLimitConfig: jest.fn(() => ({
      windowMs: 900000,
      max: 100
    })),
    isDevelopment: jest.fn(() => true),
    isProduction: jest.fn(() => false),
  }
}));

import { createMockRequest } from '../utils/testHelpers';
import * as database from '../../lib/database';
import * as errorHandler from '../../lib/errorHandler';
import * as validator from '../../lib/validation/validator';

describe('/api/claim', () => {
  let POST: any;
  let mockDbClient: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    mockDbClient = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn()
    };
    (database.getDatabase as jest.Mock).mockResolvedValue({ connect: () => mockDbClient });

    const route = await import('../../app/api/claim/route');
    POST = route.POST;
  });

  describe('POST /api/claim', () => {
    it('should successfully claim an order', async () => {
      const mockOrder = {
        id: 1,
        order_id: 'TEST123',
        claim_count: 0,
        one_time_use: true,
        expiration_date: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };
      
      const mockProducts = [{
        id: 1,
        name: 'Test Product',
        description: 'Test Description',
        image_url: 'https://example.com/image.jpg',
        download_link: 'https://example.com/download'
      }];
      
      mockDbClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockOrder] }) // SELECT
        .mockResolvedValueOnce({}) // UPDATE
        .mockResolvedValueOnce({ rows: mockProducts }) // SELECT
        .mockResolvedValueOnce({}); // COMMIT
      
      (validator.validate as jest.Mock).mockReturnValue({ orderId: 'TEST123' });
      
      (errorHandler.createSuccessResponse as jest.Mock).mockReturnValue({
        json: () => Promise.resolve({
          success: true,
          data: {
            message: 'Products claimed successfully!',
            products: mockProducts
          }
        }),
        status: 200,
        ok: true
      });
      
      const request = createMockRequest('http://localhost:3000/api/claim', {
        method: 'POST',
        body: JSON.stringify({ orderId: 'TEST123' })
      });
      
      await POST(request);
      
      expect(mockDbClient.query).toHaveBeenCalledTimes(5);
      expect(errorHandler.createSuccessResponse).toHaveBeenCalled();
    });

    it('should fail when order does not exist', async () => {
      mockDbClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // SELECT
      
      (validator.validate as jest.Mock).mockReturnValue({ orderId: 'NONEXISTENT' });
      
      const request = createMockRequest('http://localhost:3000/api/claim', {
        method: 'POST',
        body: JSON.stringify({ orderId: 'NONEXISTENT' })
      });
      
      await expect(POST(request)).rejects.toThrow('Order not found');
    });

    it('should fail when order is already claimed (one-time use)', async () => {
      const claimedOrder = {
        id: 1,
        order_id: 'TEST123',
        claim_count: 1,
        one_time_use: true,
        expiration_date: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };
      
      mockDbClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [claimedOrder] }); // SELECT
      
      (validator.validate as jest.Mock).mockReturnValue({ orderId: 'TEST123' });
      
      const request = createMockRequest('http://localhost:3000/api/claim', {
        method: 'POST',
        body: JSON.stringify({ orderId: 'TEST123' })
      });
      
      await expect(POST(request)).rejects.toThrow('This order has already been claimed (one-time use only)');
    });

    it('should fail when order is expired', async () => {
      const expiredOrder = {
        id: 1,
        order_id: 'TEST123',
        claim_count: 0,
        one_time_use: true,
        expiration_date: new Date(Date.now() - 24 * 60 * 60 * 1000)
      };
      
      mockDbClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [expiredOrder] }); // SELECT
      
      (validator.validate as jest.Mock).mockReturnValue({ orderId: 'TEST123' });
      
      const request = createMockRequest('http://localhost:3000/api/claim', {
        method: 'POST',
        body: JSON.stringify({ orderId: 'TEST123' })
      });
      
      await expect(POST(request)).rejects.toThrow('This order has expired');
    });

    it('should fail with missing order ID', async () => {
      (validator.validate as jest.Mock).mockImplementation(() => {
        throw new Error('Validation failed');
      });
      const request = createMockRequest('http://localhost:3000/api/claim', {
        method: 'POST',
        body: JSON.stringify({})
      });
      
      await expect(POST(request)).rejects.toThrow('Validation failed');
    });

    it('should handle database errors', async () => {
      mockDbClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Database error'));
      
      (validator.validate as jest.Mock).mockReturnValue({ orderId: 'TEST123' });
      
      const request = createMockRequest('http://localhost:3000/api/claim', {
        method: 'POST',
        body: JSON.stringify({ orderId: 'TEST123' })
      });
      
      await expect(POST(request)).rejects.toThrow('Database error');
    });
  });
});
