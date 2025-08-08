import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function GET() {
  try {
    const db = await getDatabase();
    const settings = await db.all('SELECT key, value FROM settings');
    const admins = await db.all('SELECT id, username, created_at FROM admins');
    
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
    const db = await getDatabase();

    switch (action) {
      case 'update_settings':
        const { settings } = data;
        
        // Update each setting
        for (const [key, value] of Object.entries(settings)) {
          await db.run(
            'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
            [key, value]
          );
        }
        
        return NextResponse.json({ success: true, message: 'Settings updated successfully' });

      case 'create_admin':
        const { username, password } = data;
        
        // Check if username already exists
        const existingAdmin = await db.get('SELECT id FROM admins WHERE username = ?', [username]);
        if (existingAdmin) {
          return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
        }
        
        // Hash password and create admin
        const passwordHash = await bcrypt.hash(password, 10);
        const result = await db.run(
          'INSERT INTO admins (username, password_hash) VALUES (?, ?)',
          [username, passwordHash]
        );
        
        return NextResponse.json({ 
          success: true, 
          message: 'Admin created successfully',
          adminId: result.lastID
        });

      case 'update_admin_password':
        const { adminId, newPassword } = data;
        
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await db.run(
          'UPDATE admins SET password_hash = ? WHERE id = ?',
          [newPasswordHash, adminId]
        );
        
        return NextResponse.json({ success: true, message: 'Password updated successfully' });

      case 'delete_admin':
        const { adminId: deleteAdminId } = data;
        
        // Prevent deleting the last admin
        const adminCount = await db.get('SELECT COUNT(*) as count FROM admins');
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
        
        await db.run('DELETE FROM admins WHERE id = ?', [deleteAdminId]);
        
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
