import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { addDays } from 'date-fns';

// GET - Get all orders with product details
export async function GET() {
  try {
    const db = await getDatabase();
    const orders = await db.all(`
      SELECT o.*, p.name as product_name, p.description as product_description
      FROM orders o
      JOIN products p ON o.product_id = p.id
      ORDER BY o.created_at DESC
    `);
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new order
export async function POST(request: NextRequest) {
  try {
    const { order_id, product_id, expiration_days, one_time_use, created_by } = await request.json();
    
    if (!order_id || !product_id) {
      return NextResponse.json({ error: 'Order ID and product ID are required' }, { status: 400 });
    }
    
    const db = await getDatabase();
    
    // Check if order already exists
    const existingOrder = await db.get('SELECT id FROM orders WHERE order_id = ?', [order_id]);
    if (existingOrder) {
      return NextResponse.json({ error: 'Order ID already exists' }, { status: 400 });
    }
    
    // Check if product exists
    const product = await db.get('SELECT id FROM products WHERE id = ?', [product_id]);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    // Calculate expiration date
    const expirationDate = expiration_days 
      ? addDays(new Date(), expiration_days).toISOString()
      : null;
    
    const result = await db.run(`
      INSERT INTO orders (order_id, product_id, expiration_date, one_time_use, created_by)
      VALUES (?, ?, ?, ?, ?)
    `, [order_id, product_id, expirationDate, one_time_use ?? true, created_by]);
    
    const newOrder = await db.get(`
      SELECT o.*, p.name as product_name
      FROM orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.id = ?
    `, [result.lastID]);
    
    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
