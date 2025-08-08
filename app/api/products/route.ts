import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET() {
  try {
    const db = await getDatabase();
    const products = await db.all('SELECT * FROM products ORDER BY created_at DESC');
    return NextResponse.json(products);
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
    
    const db = await getDatabase();
    const result = await db.run(`
      INSERT INTO products (name, description, download_link, image_url)
      VALUES (?, ?, ?, ?)
    `, [name, description, download_link, image_url]);
    
    const newProduct = await db.get('SELECT * FROM products WHERE id = ?', [result.lastID]);
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
    
    const db = await getDatabase();
    await db.run(`
      UPDATE products 
      SET name = ?, description = ?, download_link = ?, image_url = ?
      WHERE id = ?
    `, [name, description, download_link, image_url, id]);
    
    const updatedProduct = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    
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
    
    const db = await getDatabase();
    await db.run('DELETE FROM products WHERE id = ?', [id]);
    
    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
