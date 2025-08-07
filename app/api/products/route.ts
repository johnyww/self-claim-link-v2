import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

// GET - Get all products
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

// POST - Create new product
export async function POST(request: NextRequest) {
  try {
    const { name, description, download_links, image_url } = await request.json();
    
    if (!name || !download_links) {
      return NextResponse.json({ error: 'Name and download links are required' }, { status: 400 });
    }
    
    const db = await getDatabase();
    
    // Convert download_links to JSON string if it's an array
    const linksJson = Array.isArray(download_links) 
      ? JSON.stringify(download_links) 
      : download_links;
    
    const result = await db.run(`
      INSERT INTO products (name, description, download_links, image_url)
      VALUES (?, ?, ?, ?)
    `, [name, description, linksJson, image_url]);
    
    const newProduct = await db.get('SELECT * FROM products WHERE id = ?', [result.lastID]);
    
    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
