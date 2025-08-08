import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { addDays } from 'date-fns';

export async function GET() {
  try {
    const db = await getDatabase();
    const orders = await db.all(`
      SELECT o.*, 
             GROUP_CONCAT(p.name) as product_names,
             GROUP_CONCAT(p.id) as product_ids
      FROM orders o
      LEFT JOIN order_products op ON o.id = op.order_id
      LEFT JOIN products p ON op.product_id = p.id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `);
    
    // Parse product names and IDs
    const ordersWithProducts = orders.map(order => ({
      ...order,
      product_names: order.product_names ? order.product_names.split(',') : [],
      product_ids: order.product_ids ? order.product_ids.split(',').map(Number) : []
    }));
    
    return NextResponse.json(ordersWithProducts);
  } catch (error) {
    console.error('Get orders error:', error);
    // Return empty array if table doesn't exist yet
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { order_id, product_ids, expiration_days, one_time_use, created_by } = await request.json();
    
    if (!order_id || !product_ids || product_ids.length === 0) {
      return NextResponse.json({ error: 'Order ID and at least one product are required' }, { status: 400 });
    }
    
    const db = await getDatabase();
    
    // Check if order already exists
    const existingOrder = await db.get('SELECT id FROM orders WHERE order_id = ?', [order_id]);
    if (existingOrder) {
      return NextResponse.json({ error: 'Order ID already exists' }, { status: 400 });
    }
    
    // Verify all products exist
    for (const productId of product_ids) {
      const product = await db.get('SELECT id FROM products WHERE id = ?', [productId]);
      if (!product) {
        return NextResponse.json({ error: `Product with ID ${productId} not found` }, { status: 404 });
      }
    }
    
    // Calculate expiration date
    const expirationDate = expiration_days 
      ? addDays(new Date(), expiration_days).toISOString()
      : null;
    
    // Create order
    const orderResult = await db.run(`
      INSERT INTO orders (order_id, expiration_date, one_time_use, created_by)
      VALUES (?, ?, ?, ?)
    `, [order_id, expirationDate, one_time_use ?? true, created_by]);
    
    // Add products to order
    for (const productId of product_ids) {
      await db.run(`
        INSERT INTO order_products (order_id, product_id)
        VALUES (?, ?)
      `, [orderResult.lastID, productId]);
    }
    
    // Get the created order with product details
    const newOrder = await db.get(`
      SELECT o.*, 
             GROUP_CONCAT(p.name) as product_names,
             GROUP_CONCAT(p.id) as product_ids
      FROM orders o
      LEFT JOIN order_products op ON o.id = op.order_id
      LEFT JOIN products p ON op.product_id = p.id
      WHERE o.id = ?
      GROUP BY o.id
    `, [orderResult.lastID]);
    
    return NextResponse.json({
      ...newOrder,
      product_names: newOrder.product_names ? newOrder.product_names.split(',') : [],
      product_ids: newOrder.product_ids ? newOrder.product_ids.split(',').map(Number) : []
    }, { status: 201 });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, order_id, product_ids, expiration_days, one_time_use } = await request.json();
    
    console.log('PUT /api/orders - Received data:', { id, order_id, product_ids, expiration_days, one_time_use });
    
    if (!id || !order_id || !product_ids || product_ids.length === 0) {
      return NextResponse.json({ error: 'ID, order ID and at least one product are required' }, { status: 400 });
    }
    
    const db = await getDatabase();
    
    // Check if order exists
    const existingOrder = await db.get('SELECT id, one_time_use, claim_count FROM orders WHERE id = ?', [id]);
    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    console.log('PUT /api/orders - Existing order:', existingOrder);
    
    // Verify all products exist
    for (const productId of product_ids) {
      const product = await db.get('SELECT id FROM products WHERE id = ?', [productId]);
      if (!product) {
        return NextResponse.json({ error: `Product with ID ${productId} not found` }, { status: 404 });
      }
    }
    
    // Calculate expiration date
    const expirationDate = expiration_days 
      ? addDays(new Date(), expiration_days).toISOString()
      : null;
    
    // If changing from multi-use to one-time use, reset claim count to allow one more claim
    let newClaimCount = existingOrder.claim_count;
    if (!existingOrder.one_time_use && one_time_use) {
      newClaimCount = 0;
      console.log('PUT /api/orders - Resetting claim count from', existingOrder.claim_count, 'to 0');
    }
    
    console.log('PUT /api/orders - Updating with:', { order_id, expirationDate, one_time_use, newClaimCount });
    
    // Update order
    await db.run(`
      UPDATE orders 
      SET order_id = ?, expiration_date = ?, one_time_use = ?, claim_count = ?
      WHERE id = ?
    `, [order_id, expirationDate, one_time_use, newClaimCount, id]);
    
    // Remove existing products and add new ones
    await db.run('DELETE FROM order_products WHERE order_id = ?', [id]);
    
    for (const productId of product_ids) {
      await db.run(`
        INSERT INTO order_products (order_id, product_id)
        VALUES (?, ?)
      `, [id, productId]);
    }
    
    // Get the updated order with product details
    const updatedOrder = await db.get(`
      SELECT o.*, 
             GROUP_CONCAT(p.name) as product_names,
             GROUP_CONCAT(p.id) as product_ids
      FROM orders o
      LEFT JOIN order_products op ON o.id = op.order_id
      LEFT JOIN products p ON op.product_id = p.id
      WHERE o.id = ?
      GROUP BY o.id
    `, [id]);
    
    console.log('PUT /api/orders - Updated order:', updatedOrder);
    
    return NextResponse.json({
      ...updatedOrder,
      product_names: updatedOrder.product_names ? updatedOrder.product_names.split(',') : [],
      product_ids: updatedOrder.product_ids ? updatedOrder.product_ids.split(',').map(Number) : []
    });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }
    
    const db = await getDatabase();
    
    // Delete order products first
    await db.run('DELETE FROM order_products WHERE order_id = ?', [id]);
    
    // Delete order
    await db.run('DELETE FROM orders WHERE id = ?', [id]);
    
    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
