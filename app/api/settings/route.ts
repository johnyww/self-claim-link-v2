import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '@/lib/config';

export async function GET() {
  try {
    const pool = await getDatabase();
    const settingsResult = await pool.query('SELECT key, value FROM settings');
    const adminsResult = await pool.query('SELECT id, username, created_at FROM admins');
    
    const settings = settingsResult.rows;
    const admins = adminsResult.rows;
    
    // Convert settings array to object for easier access
    const settingsObj = settings.reduce((acc: any, setting: any) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
    
    return NextResponse.json({
      settings: settingsObj,
      admins: admins
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;
    const pool = await getDatabase();

    switch (action) {
      case 'update_settings':
        const { settings } = data;
        
        // Update each setting
        for (const [key, value] of Object.entries(settings)) {
          await pool.query(
            'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
            [key, value]
          );
        }
        
        return NextResponse.json({ success: true, message: 'Settings updated successfully' });

      case 'create_admin':
        const { username, password } = data;
        
        // Check if username already exists
        const adminResult = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
        const existingAdmin = adminResult.rows[0];
        if (existingAdmin) {
          return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
        }
        
        // Hash password and create admin
        const passwordHash = await bcrypt.hash(password, config.getBcryptRounds());
        const result = await pool.query(
          'INSERT INTO admins (username, password_hash) VALUES ($1, $2) RETURNING id',
          [username, passwordHash]
        );
        
        return NextResponse.json({ 
          success: true, 
          message: 'Admin created successfully',
          adminId: result.rows[0].id
        });

      case 'update_admin_password':
        const { adminId, newPassword } = data;
        
        // Validate password requirements (consistent with login validation)
        if (!newPassword || typeof newPassword !== 'string') {
          return NextResponse.json({ error: 'Password is required and must be a string' }, { status: 400 });
        }
        
        if (newPassword.length < config.getPasswordMinLength()) {
          return NextResponse.json({ error: `Password must be at least ${config.getPasswordMinLength()} characters long` }, { status: 400 });
        }
        
        if (newPassword.length > config.getPasswordMaxLength()) {
          return NextResponse.json({ error: `Password must be less than ${config.getPasswordMaxLength()} characters` }, { status: 400 });
        }
        
        const newPasswordHash = await bcrypt.hash(newPassword, config.getBcryptRounds());
        await pool.query(
          'UPDATE admins SET password_hash = $1 WHERE id = $2',
          [newPasswordHash, adminId]
        );
        
        return NextResponse.json({ success: true, message: 'Password updated successfully' });

      case 'delete_admin':
        const { adminId: deleteAdminId } = data;
        
        // Prevent deleting the last admin
        const adminCountResult = await pool.query('SELECT COUNT(*) as count FROM admins');
        const adminCount = adminCountResult.rows[0];
        if (adminCount.count <= 1) {
          return NextResponse.json({ error: 'Cannot delete the last admin account' }, { status: 400 });
        }
        
        // Check if the current user is deleting themselves
        let isSelfDeletion = false;
        const authHeader = request.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          try {
            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
            isSelfDeletion = decoded.userId === deleteAdminId;
          } catch (error) {
            // Token verification failed, continue with deletion but assume not self-deletion
          }
        }
        
        await pool.query('DELETE FROM admins WHERE id = $1', [deleteAdminId]);
        
        return NextResponse.json({ 
          success: true, 
          message: 'Admin deleted successfully',
          selfDeletion: isSelfDeletion
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
