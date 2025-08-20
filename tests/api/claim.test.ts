/**
 * Claim API endpoint tests
 */

import { createMockRequest, mockOrder, mockProduct, dbTestHelpers } from '../utils/testHelpers'

// Mock the database module
jest.mock('../../lib/database', () => ({
  getDatabase: jest.fn(),
}))

jest.mock('../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

describe('/api/claim', () => {
  let claimHandler: any
  let mockDbClient: any

  beforeEach(async () => {
    jest.clearAllMocks()
    
    mockDbClient = {
      query: jest.fn(),
      connect: jest.fn(),
      release: jest.fn(),
    }
    
    const mockDatabase = await import('../../lib/database')
    ;(mockDatabase.getDatabase as jest.MockedFunction<typeof mockDatabase.getDatabase>).mockResolvedValue({
      connect: jest.fn().mockResolvedValue(mockDbClient)
    } as any)
    
    const claimModule = await import('../../app/api/claim/route')
    claimHandler = claimModule.POST
  })

  afterEach(() => {
    dbTestHelpers.resetMocks()
  })

  describe('POST /api/claim', () => {
    it('should successfully claim an order', async () => {
      const unclaimedOrder = { ...mockOrder, is_claimed: false }
      const orderProducts = [{ ...mockProduct, product_id: 1 }]
      
      // Mock database responses
      mockDbClient.query
        .mockResolvedValueOnce({ rows: [unclaimedOrder] }) // Find order
        .mockResolvedValueOnce({ rows: orderProducts }) // Get products
        .mockResolvedValueOnce({ rows: [] }) // Update order
      
      const request = createMockRequest('http://localhost:3000/api/claim', {
        method: 'POST',
        body: { orderId: 'TEST123' }
      })
      
      const response = await claimHandler(request)
      const responseData = await response.json()
      
      expect(response.status).toBe(200)
      expect(responseData).toHaveProperty('success', true)
      expect(responseData).toHaveProperty('products')
      expect(responseData.products).toHaveLength(1)
      expect(mockDbClient.query).toHaveBeenCalledTimes(3)
    })

    it('should fail when order does not exist', async () => {
      mockDbClient.query.mockResolvedValueOnce({ rows: [] })
      
      const request = createMockRequest('http://localhost:3000/api/claim', {
        method: 'POST',
        body: { orderId: 'NONEXISTENT' }
      })
      
      const response = await claimHandler(request)
      const responseData = await response.json()
      
      expect(response.status).toBe(404)
      expect(responseData.error).toContain('not found')
    })

    it('should fail when order is already claimed', async () => {
      const claimedOrder = { ...mockOrder, is_claimed: true, claimed_at: new Date() }
      mockDbClient.query.mockResolvedValueOnce({ rows: [claimedOrder] })
      
      const request = createMockRequest('http://localhost:3000/api/claim', {
        method: 'POST',
        body: { orderId: 'TEST123' }
      })
      
      const response = await claimHandler(request)
      const responseData = await response.json()
      
      expect(response.status).toBe(409)
      expect(responseData.error).toContain('already claimed')
    })

    it('should fail when order is expired', async () => {
      const expiredOrder = { 
        ...mockOrder, 
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
      }
      mockDbClient.query.mockResolvedValueOnce({ rows: [expiredOrder] })
      
      const request = createMockRequest('http://localhost:3000/api/claim', {
        method: 'POST',
        body: { orderId: 'TEST123' }
      })
      
      const response = await claimHandler(request)
      const responseData = await response.json()
      
      expect(response.status).toBe(410)
      expect(responseData.error).toContain('expired')
    })

    it('should fail with missing order ID', async () => {
      const request = createMockRequest('http://localhost:3000/api/claim', {
        method: 'POST',
        body: {}
      })
      
      const response = await claimHandler(request)
      
      expect(response.status).toBe(400)
    })

    it('should handle database errors', async () => {
      mockDbClient.query.mockRejectedValueOnce(new Error('Database error'))
      
      const request = createMockRequest('http://localhost:3000/api/claim', {
        method: 'POST',
        body: { orderId: 'TEST123' }
      })
      
      const response = await claimHandler(request)
      
      expect(response.status).toBe(500)
    })
  })
})
