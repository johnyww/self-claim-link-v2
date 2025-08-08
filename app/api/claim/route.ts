import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { addDays, isAfter } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();
    
    if (!orderId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Order ID is required' 
      }, { status: 400 });
    }
    
    const db = await getDatabase();
    
    // Get order with all product details
    const order = await db.get(`
      SELECT o.*
      FROM orders o
      WHERE o.order_id = ?
    `, [orderId]);
    
    if (!order) {
      return NextResponse.json({ 
        success: false, 
        message: 'Order not found' 
      }, { status: 404 });
    }
    
    // Check expiration
    if (order.expiration_date && isAfter(new Date(), new Date(order.expiration_date))) {
      return NextResponse.json({ 
        success: false, 
        message: 'This order has expired' 
      }, { status: 400 });
    }
    
    // Check one-time use restriction
    // For one-time use orders: if already claimed once, block further claims
    // For multi-use orders: allow unlimited claims
    if (order.one_time_use && order.claim_count >= 1) {
      return NextResponse.json({ 
        success: false, 
        message: 'This order has already been claimed (one-time use only)' 
      }, { status: 400 });
    }
    
    // Get all products for this order
    const products = await db.all(`
      SELECT p.*
      FROM products p
      JOIN order_products op ON p.id = op.product_id
      WHERE op.order_id = ?
    `, [order.id]);
    
    if (products.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No products found for this order' 
      }, { status: 404 });
    }
    
    // Update claim count and status
    const newClaimCount = order.claim_count + 1;
    const newClaimStatus = order.one_time_use ? 'claimed' : 'available';
    
    await db.run(`
      UPDATE orders 
      SET claim_status = ?, claim_timestamp = CURRENT_TIMESTAMP, claim_count = ?
      WHERE order_id = ?
    `, [newClaimStatus, newClaimCount, orderId]);
    
    // Prepare download links from all products
    const downloadLinks = products.map(product => product.download_link);
    
    return NextResponse.json({
      success: true,
      message: `Products claimed successfully! (Claimed ${newClaimCount} time${newClaimCount > 1 ? 's' : ''})`,
      products: products.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        image_url: product.image_url
      })),
      download_links: downloadLinks,
      claim_count: newClaimCount
    });
    
  } catch (error) {
    console.error('Claim error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 });
  }
}
