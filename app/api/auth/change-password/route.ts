import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getAdminByUsername, updateAdminPassword } from '@/lib/database';
import { withStrictRateLimit } from '@/lib/rateLimit';
import { withErrorHandler, createSuccessResponse, AuthenticationError, validateOrThrow } from '@/lib/errorHandler';
import config from '@/lib/config';

function validatePasswordChangeData(data: any) {
  const errors: string[] = [];
  let sanitizedData: any = {};
  
  if (!data.currentPassword) {
    errors.push('Current password is required');
  } else {
    sanitizedData.currentPassword = data.currentPassword;
  }
  
  if (!data.newPassword) {
    errors.push('New password is required');
  } else if (typeof data.newPassword !== 'string') {
    errors.push('New password must be a string');
  } else if (data.newPassword.length < config.getPasswordMinLength()) {
    errors.push(`New password must be at least ${config.getPasswordMinLength()} characters long`);
  } else if (data.newPassword.length > config.getPasswordMaxLength()) {
    errors.push(`New password must be less than ${config.getPasswordMaxLength()} characters`);
  } else {
    sanitizedData.newPassword = data.newPassword;
  }
  
  if (!data.confirmPassword) {
    errors.push('Password confirmation is required');
  } else if (data.newPassword !== data.confirmPassword) {
    errors.push('New password and confirmation do not match');
  }
  
  if (data.currentPassword === data.newPassword) {
    errors.push('New password must be different from current password');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData
  };
}

async function changePasswordHandler(request: NextRequest) {
  // Get JWT token from Authorization header
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Authorization token required');
  }
  
  const token = authHeader.substring(7);
  
  let decoded: any;
  try {
    decoded = jwt.verify(token, config.getJwtSecret());
  } catch (error) {
    throw new AuthenticationError('Invalid or expired token');
  }
  
  const requestBody = await request.json();
  
  // Validate input
  const { currentPassword, newPassword } = validateOrThrow(validatePasswordChangeData, requestBody);
  
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

export const POST = withStrictRateLimit(withErrorHandler(changePasswordHandler));
