import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

let db: any = null;

export async function getDatabase() {
  if (db) return db;
  
  db = await open({
    filename: path.join(process.cwd(), 'database.sqlite'),
    driver: sqlite3.Database
  });

  // Create tables if they don't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      download_links TEXT NOT NULL,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT UNIQUE NOT NULL,
      product_id INTEGER NOT NULL,
      claim_status TEXT DEFAULT 'unclaimed',
      claim_timestamp DATETIME,
      expiration_date DATETIME,
      one_time_use BOOLEAN DEFAULT 1,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products (id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert default settings if they don't exist
  await db.run(`
    INSERT OR IGNORE INTO settings (key, value) VALUES 
    ('default_expiration_days', '7'),
    ('one_time_use_enabled', 'true'),
    ('admin_username', 'admin'),
    ('admin_password', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi')
  `);

  return db;
}

export async function closeDatabase() {
  if (db) {
    await db.close();
    db = null;
  }
}
