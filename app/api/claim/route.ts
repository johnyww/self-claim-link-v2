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
    
    // Get order with product details
    const order = await db.get(`
      SELECT o.*, p.name, p.description, p.download_links, p.image_url
      FROM orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.order_id = ?
    `, [orderId]);
    
    if (!order) {
      return NextResponse.json({ 
        success: false, 
        message: 'Order not found' 
      }, { status: 404 });
    }
    
    // Check if already claimed
    if (order.claim_status === 'claimed') {
      return NextResponse.json({ 
        success: false, 
        message: 'This order has already been claimed' 
      }, { status: 400 });
    }
    
    // Check expiration
    if (order.expiration_date && isAfter(new Date(), new Date(order.expiration_date))) {
      return NextResponse.json({ 
        success: false, 
        message: 'This order has expired' 
      }, { status: 400 });
    }
    
    // Update claim status
    await db.run(`
      UPDATE orders 
      SET claim_status = 'claimed', claim_timestamp = CURRENT_TIMESTAMP
      WHERE order_id = ?
    `, [orderId]);
    
    // Parse download links (assuming they're stored as JSON string)
    let downloadLinks: string[] = [];
    try {
      downloadLinks = JSON.parse(order.download_links);
    } catch {
      downloadLinks = [order.download_links];
    }
    
    return NextResponse.json({
      success: true,
      message: 'Product claimed successfully!',
      product: {
        id: order.product_id,
        name: order.name,
        description: order.description,
        image_url: order.image_url
      },
      download_links: downloadLinks
    });
    
  } catch (error) {
    console.error('Claim error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 });
  }
}
