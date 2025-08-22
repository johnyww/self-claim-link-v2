/**
 * Claim API endpoint tests
 */

import { createMockRequest } from '../utils/testHelpers'

// Mock all dependencies before importing the route
jest.mock('../../lib/database')
jest.mock('../../lib/logger')
jest.mock('../../lib/validation')
jest.mock('../../lib/rateLimit')
jest.mock('../../lib/errorHandler')
jest.mock('../../lib/config')

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

describe('/api/claim', () => {
  let mockDatabase: any
  let mockValidation: any
  let mockRateLimit: any
  let mockErrorHandler: any
  let POST: any

  beforeEach(async () => {
    jest.clearAllMocks()
    
    // Setup database mocks
    mockDatabase = require('../../lib/database')
    mockDatabase.getDatabase = jest.fn().mockResolvedValue({
      query: jest.fn()
    })
    
    // Setup validation mocks
    mockValidation = require('../../lib/validation')
    mockValidation.validateOrderId = jest.fn()
    
    // Setup rate limit mocks
    mockRateLimit = require('../../lib/rateLimit')
    mockRateLimit.withApiRateLimit = jest.fn((handler) => handler)
    
    // Setup error handler mocks
    mockErrorHandler = require('../../lib/errorHandler')
    mockErrorHandler.withErrorHandler = jest.fn((handler) => handler)
    mockErrorHandler.createSuccessResponse = jest.fn()
    mockErrorHandler.validateOrThrow = jest.fn()
    mockErrorHandler.NotFoundError = jest.fn()
    mockErrorHandler.ValidationError = jest.fn()

    // Import the route after setting up mocks
    const route = await import('../../app/api/claim/route')
    POST = route.POST
  })

  describe('POST /api/claim', () => {
    it('should successfully claim an order', async () => {
      const mockOrder = {
        id: 1,
        order_id: 'TEST123',
        claim_count: 0,
        one_time_use: true,
        expiration_date: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
      
      const mockProducts = [{
        id: 1,
        name: 'Test Product',
        description: 'Test Description',
        image_url: 'https://example.com/image.jpg',
        download_link: 'https://example.com/download'
      }]
      
      const mockDbClient = {
        query: jest.fn()
      }
      
      mockDatabase.getDatabase.mockResolvedValue(mockDbClient)
      mockDbClient.query
        .mockResolvedValueOnce({ rows: [mockOrder] }) // Order query
        .mockResolvedValueOnce({ rows: mockProducts }) // Products query
        .mockResolvedValueOnce({ rows: [] }) // Update query
      
      mockErrorHandler.validateOrThrow.mockReturnValue('TEST123')
      mockErrorHandler.createSuccessResponse.mockReturnValue({
        json: () => Promise.resolve({
          success: true,
          data: {
            message: 'Products claimed successfully!',
            products: mockProducts
          }
        }),
        status: 200,
        ok: true
      })
      
      const request = createMockRequest('http://localhost:3000/api/claim', {
        method: 'POST',
        body: { orderId: 'TEST123' }
      })
      
      await POST(request)
      
      expect(mockDatabase.getDatabase).toHaveBeenCalled()
      expect(mockDbClient.query).toHaveBeenCalledTimes(3)
      expect(mockErrorHandler.createSuccessResponse).toHaveBeenCalled()
    })

    it('should fail when order does not exist', async () => {
      const mockDbClient = {
        query: jest.fn()
      }
      
      mockDatabase.getDatabase.mockResolvedValue(mockDbClient)
      mockDbClient.query.mockResolvedValueOnce({ rows: [] }) // No order found
      
      mockErrorHandler.validateOrThrow.mockReturnValue('NONEXISTENT')
      mockErrorHandler.NotFoundError.mockImplementation((message: string) => {
        const error = new Error(message)
        error.name = 'NotFoundError'
        throw error
      })
      
      const request = createMockRequest('http://localhost:3000/api/claim', {
        method: 'POST',
        body: { orderId: 'NONEXISTENT' }
      })
      
      await expect(POST(request)).rejects.toThrow('Order')
    })

    it('should fail when order is already claimed (one-time use)', async () => {
      const claimedOrder = {
        id: 1,
        order_id: 'TEST123',
        claim_count: 1,
        one_time_use: true,
        expiration_date: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
      
      const mockDbClient = {
        query: jest.fn()
      }
      
      mockDatabase.getDatabase.mockResolvedValue(mockDbClient)
      mockDbClient.query.mockResolvedValueOnce({ rows: [claimedOrder] })
      
      mockErrorHandler.validateOrThrow.mockReturnValue('TEST123')
      mockErrorHandler.createSuccessResponse.mockReturnValue({
        json: () => Promise.resolve({
          success: false,
          message: 'This order has already been claimed (one-time use only)'
        }),
        status: 400,
        ok: false
      })
      
      const request = createMockRequest('http://localhost:3000/api/claim', {
        method: 'POST',
        body: { orderId: 'TEST123' }
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
    })

    it('should fail when order is expired', async () => {
      const expiredOrder = {
        id: 1,
        order_id: 'TEST123',
        claim_count: 0,
        one_time_use: true,
        expiration_date: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
      
      const mockDbClient = {
        query: jest.fn()
      }
      
      mockDatabase.getDatabase.mockResolvedValue(mockDbClient)
      mockDbClient.query.mockResolvedValueOnce({ rows: [expiredOrder] })
      
      mockErrorHandler.validateOrThrow.mockReturnValue('TEST123')
      mockErrorHandler.createSuccessResponse.mockReturnValue({
        json: () => Promise.resolve({
          success: false,
          message: 'This order has expired'
        }),
        status: 400,
        ok: false
      })
      
      const request = createMockRequest('http://localhost:3000/api/claim', {
        method: 'POST',
        body: { orderId: 'TEST123' }
      })
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
    })

    it('should fail with missing order ID', async () => {
      mockErrorHandler.validateOrThrow.mockImplementation(() => {
        throw new Error('Order ID is required')
      })
      
      const request = createMockRequest('http://localhost:3000/api/claim', {
        method: 'POST',
        body: {}
      })
      
      await expect(POST(request)).rejects.toThrow('Order ID is required')
    })

    it('should handle database errors', async () => {
      const mockDbClient = {
        query: jest.fn()
      }
      
      mockDatabase.getDatabase.mockResolvedValue(mockDbClient)
      mockDbClient.query.mockRejectedValue(new Error('Database error'))
      
      mockErrorHandler.validateOrThrow.mockReturnValue('TEST123')
      
      const request = createMockRequest('http://localhost:3000/api/claim', {
        method: 'POST',
        body: { orderId: 'TEST123' }
      })
      
      await expect(POST(request)).rejects.toThrow('Database error')
    })
  })
})
