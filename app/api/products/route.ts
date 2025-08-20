import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET() {
  try {
    const pool = await getDatabase();
    const result = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, description, download_link, image_url } = await request.json();
    
    if (!name || !download_link) {
      return NextResponse.json({ error: 'Name and download link are required' }, { status: 400 });
    }
    
    const pool = await getDatabase();
    const result = await pool.query(`
      INSERT INTO products (name, description, download_link, image_url)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name, description, download_link, image_url]);
    
    const newProduct = result.rows[0];
    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, name, description, download_link, image_url } = await request.json();
    
    if (!id || !name || !download_link) {
      return NextResponse.json({ error: 'ID, name and download link are required' }, { status: 400 });
    }
    
    const pool = await getDatabase();
    await pool.query(`
      UPDATE products 
      SET name = $1, description = $2, download_link = $3, image_url = $4
      WHERE id = $5
    `, [name, description, download_link, image_url, id]);
    
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    const updatedProduct = result.rows[0];
    
    // Ensure the result is JSON serializable
    const serializedProduct = {
      id: updatedProduct.id,
      name: updatedProduct.name,
      description: updatedProduct.description,
      download_link: updatedProduct.download_link,
      image_url: updatedProduct.image_url,
      created_at: updatedProduct.created_at
    };
    
    return NextResponse.json(serializedProduct);
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }
    
    const pool = await getDatabase();
    await pool.query('DELETE FROM products WHERE id = $1', [id]);
    
    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
