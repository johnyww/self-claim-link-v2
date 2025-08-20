import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { isAfter } from 'date-fns';
import { withApiRateLimit } from '@/lib/rateLimit';
import { withErrorHandler, createSuccessResponse, NotFoundError, validateOrThrow } from '@/lib/errorHandler';
import { validateOrderId } from '@/lib/validation';
import { logger } from '@/lib/logger';

async function claimHandler(request: NextRequest) {
  const requestBody = await request.json();
  
  // Validate order ID
  const orderId = validateOrThrow(validateOrderId, requestBody.orderId);
  
  logger.info('Claim attempt started', { orderId });
    
    const pool = await getDatabase();
    
    // Get order with all product details
    const result = await pool.query(`
      SELECT o.*
      FROM orders o
      WHERE o.order_id = $1
    `, [orderId]);
    
    const order = result.rows[0];
    
    if (!order) {
      throw new NotFoundError('Order');
    }
    
    // Check expiration
    if (order.expiration_date && isAfter(new Date(), new Date(order.expiration_date))) {
      return createSuccessResponse({ 
        success: false, 
        message: 'This order has expired' 
      }, 400);
    }
    
    // Check one-time use restriction
    // For one-time use orders: if already claimed once, block further claims
    // For multi-use orders: allow unlimited claims
    if (order.one_time_use && order.claim_count >= 1) {
      return createSuccessResponse({ 
        success: false, 
        message: 'This order has already been claimed (one-time use only)' 
      }, 400);
    }
    
    // Get all products for this order
    const productsResult = await pool.query(`
      SELECT p.*
      FROM products p
      JOIN order_products op ON p.id = op.product_id
      WHERE op.order_id = $1
    `, [order.id]);
    
    const products = productsResult.rows;
    
    if (products.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No products found for this order' 
      }, { status: 404 });
    }
    
    // Update claim count and status
    const newClaimCount = order.claim_count + 1;
    const newClaimStatus = order.one_time_use ? 'claimed' : 'available';
    
    await pool.query(`
      UPDATE orders 
      SET claim_status = $1, claim_timestamp = CURRENT_TIMESTAMP, claim_count = $2
      WHERE order_id = $3
    `, [newClaimStatus, newClaimCount, orderId]);
    
    // Prepare download links from all products
    const downloadLinks = products.map((product: any) => product.download_link);
    
    const productsWithDetails = products.map((product: any) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      image_url: product.image_url
    }));
    
    return createSuccessResponse({
      success: true,
      message: 'Products claimed successfully!',
      products: productsWithDetails,
      download_links: downloadLinks,
      claimedAt: new Date().toISOString()
    });
}

export const POST = withApiRateLimit(withErrorHandler(claimHandler));
