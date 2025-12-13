import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getDatabase } from '@/lib/database';
import { withApiRateLimit } from '@/lib/rateLimit';
import { withErrorHandler, createSuccessResponse, NotFoundError, ValidationError } from '@/lib/errorHandler';
import { validate, schemas } from '@/lib/validation/validator';
import { PoolClient } from 'pg';

async function claimHandler(request: NextRequest) {
  const requestBody = await request.json();
  
  // Validate input
  const { orderId } = validate(z.object({ 
    orderId: schemas.orderId,
  }), requestBody);

  const pool = await getDatabase();
  const client: PoolClient = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get order
    const orderResult = await client.query(
      'SELECT * FROM orders WHERE order_id = $1 FOR UPDATE',
      [orderId]
    );
    const order = orderResult.rows[0];

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Check if order is expired
        if (order.expiration_date && new Date(order.expiration_date) < new Date()) {         
          throw new ValidationError('This order has expired', []);                               
        }
    // Check if order is already claimed
        if (order.one_time_use && order.claim_count > 0) {                                   
          throw new ValidationError('This order has already been claimed (one-time use only)', []);                               
        }
    // Update order claim status
    await client.query(
      'UPDATE orders SET claim_count = claim_count + 1, claim_timestamp = CURRENT_TIMESTAMP, claim_status = $2 WHERE id = $1',
      [order.id, 'claimed']
    );

    // Get products associated with the order
    const productsResult = await client.query(`
      SELECT p.id, p.name, p.description, p.download_link, p.image_url
      FROM products p
      JOIN order_products op ON p.id = op.product_id
      WHERE op.order_id = $1
    `, [order.id]);

    const products = productsResult.rows;

    await client.query('COMMIT');

    return createSuccessResponse({
      message: 'Products claimed successfully!',
      products,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error; // Re-throw to be handled by withErrorHandler
  } finally {
    client.release();
  }
}

export const POST = withApiRateLimit(withErrorHandler(claimHandler));
