import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAdminByUsername, updateAdminPassword } from '@/lib/database';
import { withStrictRateLimit } from '@/lib/rateLimit';
import { withErrorHandler, createSuccessResponse, AuthenticationError } from '@/lib/errorHandler';
import { z } from 'zod';
import { validate, schemas } from '@/lib/validation/validator';
import { verifyToken } from '@/lib/auth/jwt';
import { withCsrfProtection } from '@/lib/middleware/csrf';
import config from '@/lib/config';


async function changePasswordHandler(request: NextRequest) {
  // Get JWT token from Authorization header
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Authorization token required');
  }
  
  const token = authHeader.substring(7);
  
  const decoded = verifyToken(token);
  
  const requestBody = await request.json();
  
  // Validate input
  const { currentPassword, newPassword } = validate(
    z.object({
      currentPassword: schemas.password,
      newPassword: schemas.password,
      confirmPassword: schemas.password,
    }).refine((data) => data.newPassword === data.confirmPassword, {
      message: 'New password and confirmation do not match',
      path: ['confirmPassword'],
    }).refine((data) => data.currentPassword !== data.newPassword, {
      message: 'New password must be different from current password',
      path: ['newPassword'],
    }),
    requestBody
  );
  
  // Get admin user
  const admin = await getAdminByUsername(decoded.username);
  
  if (!admin) {
    throw new AuthenticationError('Admin user not found');
  }
  
  // Verify current password
  const isValidCurrentPassword = await bcrypt.compare(currentPassword, admin.password_hash);
  
  if (!isValidCurrentPassword) {
    throw new AuthenticationError('Current password is incorrect');
  }
  
  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, config.getBcryptRounds());
  
  // Update password in database
  await updateAdminPassword(admin.id, newPasswordHash);
  
  return createSuccessResponse({
    message: 'Password changed successfully',
    mustChangePassword: false
  });
}

export const POST = withCsrfProtection(withStrictRateLimit(withErrorHandler(changePasswordHandler)));
