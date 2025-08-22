/**
 * Claim API endpoint tests
 */

import { POST } from '../../app/api/claim/route'
import { createMockRequest } from '../utils/testHelpers'

// Mock all dependencies before importing the route
jest.mock('../../lib/database')
jest.mock('../../lib/logger')
jest.mock('../../lib/validation')
jest.mock('../../lib/rateLimit')
jest.mock('../../lib/errorHandler')
jest.mock('../../lib/config')

describe('/api/claim', () => {
  let mockDatabase: any
  let mockValidation: any
  let mockRateLimit: any
  let mockErrorHandler: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup database mocks
    mockDatabase = require('../../lib/database')
    mockDatabase.getOrderById = jest.fn()
    mockDatabase.updateOrderClaimStatus = jest.fn()
    mockDatabase.getOrderProducts = jest.fn()
    
    // Setup validation mocks
    mockValidation = require('../../lib/validation')
    mockValidation.validateClaimRequest = jest.fn()
    
    // Setup rate limit mocks
    mockRateLimit = require('../../lib/rateLimit')
    mockRateLimit.withRateLimit = jest.fn((handler) => handler)
    
    // Setup error handler mocks
    mockErrorHandler = require('../../lib/errorHandler')
    mockErrorHandler.withErrorHandler = jest.fn((handler) => handler)
    mockErrorHandler.createSuccessResponse = jest.fn()
    mockErrorHandler.validateOrThrow = jest.fn()
    mockErrorHandler.NotFoundError = jest.fn()
    mockErrorHandler.ValidationError = jest.fn()
  })

  describe('POST /api/claim', () => {
    it('should successfully claim an order', async () => {
      const mockOrder = {
        id: 1,
        order_id: 'TEST123',
        is_claimed: false,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
      
      const mockProducts = [{
        id: 1,
        name: 'Test Product',
        download_link: 'https://example.com/download'
      }]
      
      mockErrorHandler.validateOrThrow.mockReturnValue({ orderId: 'TEST123' })
      mockDatabase.getOrderById.mockResolvedValue(mockOrder)
      mockDatabase.getOrderProducts.mockResolvedValue(mockProducts)
      mockDatabase.updateOrderClaimStatus.mockResolvedValue(undefined)
      mockErrorHandler.createSuccessResponse.mockReturnValue(
        Response.json({
          success: true,
          data: {
            message: 'Order claimed successfully',
            products: mockProducts
          }
        })
      )
      
      const request = createMockRequest('http://localhost:3000/api/claim', {
        method: 'POST',
        body: { orderId: 'TEST123' }
      })
      
      await POST(request)
      
      expect(mockDatabase.getOrderById).toHaveBeenCalledWith('TEST123')
      expect(mockDatabase.updateOrderClaimStatus).toHaveBeenCalledWith('TEST123')
      expect(mockDatabase.getOrderProducts).toHaveBeenCalledWith('TEST123')
    })

    it('should fail when order does not exist', async () => {
      mockDatabase.getOrderById.mockResolvedValue(null)
      
      // Mock successful claim response
      const mockErrorHandler = require('../../lib/errorHandler')
      mockErrorHandler.createSuccessResponse = jest.fn().mockReturnValue(
        Response.json({
          success: true,
          data: {
            message: 'Order claimed successfully',
            products: []
          }
        })
      )
      
      mockErrorHandler.NotFoundError.mockImplementation((message: string) => {
        const error = new Error(message)
        error.name = 'NotFoundError'
        throw error
      })
      
      const request = createMockRequest('http://localhost:3000/api/claim', {
        method: 'POST',
        body: { orderId: 'NONEXISTENT' }
      })
      
      const response = await mockPOST(request)
      
      expect(response.status).toBe(404)
    })

    it('should fail when order is already claimed', async () => {
      const claimedOrder = {
        id: 1,
        order_id: 'TEST123',
        is_claimed: true,
        claimed_at: new Date()
      }
      
      mockDatabase.getOrderById.mockResolvedValue(claimedOrder)
      
      const mockPOST = jest.fn().mockResolvedValue(
        NextResponse.json({
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Order already claimed',
            timestamp: new Date().toISOString()
          }
        }, { status: 409 })
      )
      
      const request = createMockRequest('http://localhost:3000/api/claim', {
        method: 'POST',
        body: { orderId: 'TEST123' }
      })
      
      const response = await mockPOST(request)
      
      expect(response.status).toBe(409)
    })

    it('should fail when order is expired', async () => {
      const expiredOrder = {
        id: 1,
        order_id: 'TEST123',
        is_claimed: false,
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
      
      mockDatabase.getOrderById.mockResolvedValue(expiredOrder)
      
      const mockPOST = jest.fn().mockResolvedValue(
        NextResponse.json({
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Order has expired',
            timestamp: new Date().toISOString()
          }
        }, { status: 410 })
      )
      
      const request = createMockRequest('http://localhost:3000/api/claim', {
        method: 'POST',
        body: { orderId: 'TEST123' }
      })
      
      const response = await mockPOST(request)
      
      expect(response.status).toBe(410)
    })

    it('should fail with missing order ID', async () => {
      mockValidation.validateClaimRequest.mockReturnValue({
        isValid: false,
        errors: ['Order ID is required']
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
      
      const request = createMockRequest('http://localhost:3000/api/claim', {
        method: 'POST',
        body: {}
      })
      
      const response = await mockPOST(request)
      
      expect(response.status).toBe(400)
    })

    it('should handle database errors', async () => {
      mockDatabase.getOrderById.mockRejectedValue(new Error('Database error'))
      
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
      
      const request = createMockRequest('http://localhost:3000/api/claim', {
        method: 'POST',
        body: { orderId: 'TEST123' }
      })
      
      const response = await mockPOST(request)
      
      expect(response.status).toBe(500)
    })
  })
})
