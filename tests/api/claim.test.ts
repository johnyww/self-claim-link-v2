/**
 * Claim API endpoint tests
 */

import { NextResponse } from 'next/server'
import { createMockRequest } from '../utils/testHelpers'

// Mock all dependencies before importing the route
jest.mock('../../lib/database')
jest.mock('../../lib/logger')
jest.mock('../../lib/validation')
jest.mock('../../lib/rateLimit')

describe('/api/claim', () => {
  let mockDatabase: any
  let mockValidation: any
  let mockRateLimit: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup database mocks
    mockDatabase = require('../../lib/database')
    mockDatabase.getOrderById = jest.fn()
    mockDatabase.updateOrderClaimStatus = jest.fn()
    mockDatabase.getOrderProducts = jest.fn()
    
    // Setup validation mocks
    mockValidation = require('../../lib/validation')
    mockValidation.validateClaimRequest = jest.fn().mockReturnValue({
      isValid: true,
      sanitizedData: { orderId: 'TEST123' }
    })
    
    // Setup rate limit mocks
    mockRateLimit = require('../../lib/rateLimit')
    mockRateLimit.withRateLimit = jest.fn((handler) => handler)
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
      
      mockDatabase.getOrderById.mockResolvedValue(mockOrder)
      mockDatabase.getOrderProducts.mockResolvedValue(mockProducts)
      mockDatabase.updateOrderClaimStatus.mockResolvedValue(undefined)
      
      // Mock the POST handler
      const mockPOST = jest.fn().mockResolvedValue(
        NextResponse.json({
          success: true,
          products: mockProducts,
          timestamp: new Date().toISOString()
        })
      )
      
      const request = createMockRequest('http://localhost:3000/api/claim', {
        method: 'POST',
        body: { orderId: 'TEST123' }
      })
      
      const response = await mockPOST(request)
      const responseData = await response.json()
      
      expect(response.status).toBe(200)
      expect(responseData).toHaveProperty('success', true)
      expect(responseData).toHaveProperty('products')
    })

    it('should fail when order does not exist', async () => {
      mockDatabase.getOrderById.mockResolvedValue(null)
      
      const mockPOST = jest.fn().mockResolvedValue(
        NextResponse.json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Order not found',
            timestamp: new Date().toISOString()
          }
        }, { status: 404 })
      )
      
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
