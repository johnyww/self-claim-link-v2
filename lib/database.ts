/**
 * PostgreSQL Database Layer
 * Production-ready database implementation
 */

import { Pool, PoolClient } from 'pg';
import bcrypt from 'bcryptjs';
import config from './config';
import { logger } from './logger';
import { DatabaseError } from './errorHandler';

let pool: Pool | null = null;

export async function getDatabase(): Promise<Pool> {
  if (pool) return pool;
  
  const postgresConfig = config.getPostgresConfig();
  
  pool = new Pool({
    host: postgresConfig.host,
    port: postgresConfig.port,
    database: postgresConfig.database,
    user: postgresConfig.user,
    password: postgresConfig.password,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  // Test connection
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('PostgreSQL database connection established');
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL:', { error });
    throw new DatabaseError('PostgreSQL connection failed');
  }

  // Initialize database schema
  await initializeDatabase();
  
  return pool;
}

async function initializeDatabase(): Promise<void> {
  if (!pool) throw new DatabaseError('Database pool not established');

  const client = await pool.connect();
  
  try {
    // Create tables with proper PostgreSQL syntax
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        download_link TEXT NOT NULL,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(255) UNIQUE NOT NULL,
        claim_status VARCHAR(50) DEFAULT 'available',
        claim_timestamp TIMESTAMP,
        claim_count INTEGER DEFAULT 0,
        expiration_date TIMESTAMP,
        one_time_use BOOLEAN DEFAULT true,
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS order_products (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(order_id, product_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        must_change_password BOOLEAN DEFAULT false,
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    logger.info('PostgreSQL database schema initialized successfully');

    // Create default admin if not exists
    await createDefaultAdmin(client);
    
  } catch (error) {
    logger.error('Database initialization failed:', { error });
    throw new DatabaseError('Failed to initialize database schema');
  } finally {
    client.release();
  }
}

async function createDefaultAdmin(client: PoolClient): Promise<void> {
  try {
    const defaultUsername = config.getDefaultAdminUsername();
    
    // Check if admin already exists
    const result = await client.query('SELECT id FROM admins WHERE username = $1', [defaultUsername]);
    
    if (result.rows.length === 0) {
      const defaultPassword = config.getDefaultAdminPassword(); // This will force password change
      const hashedPassword = await bcrypt.hash(defaultPassword, config.get().bcryptRounds);
      
      await client.query(
        'INSERT INTO admins (username, password_hash, must_change_password) VALUES ($1, $2, $3)',
        [defaultUsername, hashedPassword, true]
      );
      
      logger.info(`Default admin '${defaultUsername}' created`);
    }
  } catch (error) {
    logger.error('Failed to create default admin:', { error });
    throw new DatabaseError('Failed to create default admin');
  }
}

export async function closeDatabase() {
  if (pool) {
    logger.info('Closing PostgreSQL database connection');
    await pool.end();
    pool = null;
  }
}

/**
 * Get admin by username with security checks
 */
export async function getAdminByUsername(username: string) {
  try {
    const pool = await getDatabase();
    const result = await pool.query(
      'SELECT * FROM admins WHERE username = $1',
      [username]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Failed to get admin by username', { username, error });
    throw new DatabaseError('Failed to retrieve admin user');
  }
}

/**
 * Update admin password with security tracking
 */
export async function updateAdminPassword(adminId: number, newPasswordHash: string) {
  try {
    const pool = await getDatabase();
    await pool.query(`
      UPDATE admins 
      SET password_hash = $1, 
          must_change_password = false,
          updated_at = CURRENT_TIMESTAMP,
          failed_login_attempts = 0,
          locked_until = NULL
      WHERE id = $2
    `, [newPasswordHash, adminId]);
    
    logger.info('Admin password updated', { adminId });
  } catch (error) {
    logger.error('Failed to update admin password', { adminId, error });
    throw new DatabaseError('Failed to update password');
  }
}

/**
 * Record failed login attempt
 */
export async function recordFailedLogin(username: string) {
  try {
    const pool = await getDatabase();
    const result = await pool.query(`
      UPDATE admins 
      SET failed_login_attempts = failed_login_attempts + 1,
          locked_until = CASE 
            WHEN failed_login_attempts >= 4 THEN NOW() + INTERVAL '30 minutes'
            ELSE locked_until
          END
      WHERE username = $1
    `, [username]);
    
    if (result.rowCount && result.rowCount > 0) {
      logger.warn('Failed login attempt recorded', { username });
    }
  } catch (error) {
    logger.error('Failed to record login attempt', { username, error });
  }
}

/**
 * Reset failed login attempts on successful login
 */
export async function resetFailedLogins(username: string) {
  try {
    const pool = await getDatabase();
    await pool.query(`
      UPDATE admins 
      SET failed_login_attempts = 0,
          locked_until = NULL
      WHERE username = $1
    `, [username]);
    
    logger.info('Failed login attempts reset', { username });
  } catch (error) {
    logger.error('Failed to reset login attempts', { username, error });
  }
}

/**
 * Check if admin account is locked
 */
export async function isAdminLocked(username: string): Promise<boolean> {
  try {
    const pool = await getDatabase();
    const result = await pool.query(`
      SELECT locked_until 
      FROM admins 
      WHERE username = $1 AND locked_until > NOW()
    `, [username]);
    
    return result.rows.length > 0;
  } catch (error) {
    logger.error('Failed to check admin lock status', { username, error });
    return false;
  }
}
