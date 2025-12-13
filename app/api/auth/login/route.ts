import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getAdminByUsername, recordFailedLogin, resetFailedLogins, isAdminLocked } from '@/lib/database';
import { withStrictRateLimit } from '@/lib/rateLimit';
import { withErrorHandler, createSuccessResponse, AuthenticationError } from '@/lib/errorHandler';
import { validate, schemas } from '@/lib/validation/validator';
import { signToken } from '@/lib/auth/jwt';

async function loginHandler(request: NextRequest) {
  const requestBody = await request.json();
  
  // Validate input
  const { username, password } = validate(z.object({ 
    username: schemas.username, 
    password: schemas.password 
  }), requestBody);
  
  // Check if account is locked
  if (await isAdminLocked(username)) {
    throw new AuthenticationError('Account is temporarily locked due to multiple failed login attempts');
  }
  
  // Get admin user
  const admin = await getAdminByUsername(username);
  
  if (!admin) {
    await recordFailedLogin(username);
    throw new AuthenticationError('Invalid credentials');
  }
  
  // Verify password
  const isValidPassword = await bcrypt.compare(password, admin.password_hash);
  
  if (!isValidPassword) {
    await recordFailedLogin(username);
    throw new AuthenticationError('Invalid credentials');
  }
  
  // Reset failed login attempts on successful login
  await resetFailedLogins(username);
  
  // Generate JWT token
  const tokenPayload = {
    userId: admin.id,
    username: admin.username,
    mustChangePassword: admin.must_change_password
  };
  
  const token = signToken(tokenPayload);
  
  return createSuccessResponse({
    token,
    username: admin.username,
    mustChangePassword: admin.must_change_password
  });
}

export const POST = withStrictRateLimit(withErrorHandler(loginHandler));
