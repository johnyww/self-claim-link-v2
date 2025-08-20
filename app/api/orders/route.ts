import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { addDays } from 'date-fns';

export async function GET() {
  try {
    const pool = await getDatabase();
    const result = await pool.query(`
      SELECT o.*, 
             STRING_AGG(p.name, ',') as product_names,
             STRING_AGG(p.id::text, ',') as product_ids
      FROM orders o
      LEFT JOIN order_products op ON o.id = op.order_id
      LEFT JOIN products p ON op.product_id = p.id
      GROUP BY o.id, o.order_id, o.claim_status, o.claim_timestamp, o.claim_count, o.expiration_date, o.one_time_use, o.created_by, o.created_at
      ORDER BY o.created_at DESC
    `);
    const orders = result.rows;
    
    // Parse product names and IDs
    const ordersWithProducts = orders.map((order: any) => {
      const productNames = order.product_names ? order.product_names.split(',') : [];
      const productIds = order.product_ids ? order.product_ids.split(',').map(Number) : [];
      
      // Create products array with proper structure for frontend
      const products = productNames.map((name: string, index: number) => ({
        id: productIds[index],
        name: name.trim()
      }));
      
      return {
        ...order,
        product_names: productNames,
        product_ids: productIds,
        products: products
      };
    });
    
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
    
    const pool = await getDatabase();
    
    // Check if order already exists
    const existingOrderResult = await pool.query('SELECT id FROM orders WHERE order_id = $1', [order_id]);
    if (existingOrderResult.rows.length > 0) {
      return NextResponse.json({ error: 'Order ID already exists' }, { status: 400 });
    }
    
    // Verify all products exist
    for (const productId of product_ids) {
      const productResult = await pool.query('SELECT id FROM products WHERE id = $1', [productId]);
      if (productResult.rows.length === 0) {
        return NextResponse.json({ error: `Product with ID ${productId} not found` }, { status: 404 });
      }
    }
    
    // Calculate expiration date
    const expirationDate = expiration_days 
      ? addDays(new Date(), expiration_days).toISOString()
      : null;
    
    // Create order
    const orderResult = await pool.query(`
      INSERT INTO orders (order_id, expiration_date, one_time_use, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [order_id, expirationDate, one_time_use ?? true, created_by]);
    
    const newOrderId = orderResult.rows[0].id;
    
    // Add products to order
    for (const productId of product_ids) {
      await pool.query(`
        INSERT INTO order_products (order_id, product_id)
        VALUES ($1, $2)
      `, [newOrderId, productId]);
    }
    
    // Get the created order with product details
    const newOrderResult = await pool.query(`
      SELECT o.*, 
             STRING_AGG(p.name, ',') as product_names,
             STRING_AGG(p.id::text, ',') as product_ids
      FROM orders o
      LEFT JOIN order_products op ON o.id = op.order_id
      LEFT JOIN products p ON op.product_id = p.id
      WHERE o.id = $1
      GROUP BY o.id, o.order_id, o.claim_status, o.claim_timestamp, o.claim_count, o.expiration_date, o.one_time_use, o.created_by, o.created_at
    `, [newOrderId]);
    
    const newOrder = newOrderResult.rows[0];
    
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
    

    
    if (!id || !order_id || !product_ids || product_ids.length === 0) {
      return NextResponse.json({ error: 'ID, order ID and at least one product are required' }, { status: 400 });
    }
    
    const pool = await getDatabase();
    
    // Check if order exists
    const existingOrderResult = await pool.query('SELECT id, one_time_use, claim_count FROM orders WHERE id = $1', [id]);
    if (existingOrderResult.rows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    const existingOrder = existingOrderResult.rows[0];

    
    // Verify all products exist
    for (const productId of product_ids) {
      const productResult = await pool.query('SELECT id FROM products WHERE id = $1', [productId]);
      if (productResult.rows.length === 0) {
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

    }
    

    
    // Update order
    await pool.query(`
      UPDATE orders 
      SET order_id = $1, expiration_date = $2, one_time_use = $3, claim_count = $4
      WHERE id = $5
    `, [order_id, expirationDate, one_time_use ?? true, newClaimCount, id]);
    
    // Remove existing product associations
    await pool.query('DELETE FROM order_products WHERE order_id = $1', [id]);
    
    // Add new product associations
    for (const productId of product_ids) {
      await pool.query(`
        INSERT INTO order_products (order_id, product_id)
        VALUES ($1, $2)
      `, [id, productId]);
    }
    
    // Get updated order with product details
    const updatedOrderResult = await pool.query(`
      SELECT o.*, 
             STRING_AGG(p.name, ',') as product_names,
             STRING_AGG(p.id::text, ',') as product_ids
      FROM orders o
      LEFT JOIN order_products op ON o.id = op.order_id
      LEFT JOIN products p ON op.product_id = p.id
      WHERE o.id = $1
      GROUP BY o.id, o.order_id, o.claim_status, o.claim_timestamp, o.claim_count, o.expiration_date, o.one_time_use, o.created_by, o.created_at
    `, [id]);
    
    const updatedOrder = updatedOrderResult.rows[0];
    

    
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
    
    const pool = await getDatabase();
    
    // Delete order (this will cascade delete order_products due to foreign key)
    await pool.query('DELETE FROM orders WHERE id = $1', [id]);
    
    // Also explicitly delete order_products (in case cascade doesn't work)
    await pool.query('DELETE FROM order_products WHERE order_id = $1', [id]);
    
    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
