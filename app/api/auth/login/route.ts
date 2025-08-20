import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getAdminByUsername, recordFailedLogin, resetFailedLogins, isAdminLocked } from '@/lib/database';
import { withStrictRateLimit } from '@/lib/rateLimit';
import { withErrorHandler, createSuccessResponse, AuthenticationError, validateOrThrow } from '@/lib/errorHandler';
import { validateAdminCredentials, ValidationError } from '@/lib/validation';
import config from '@/lib/config';

async function loginHandler(request: NextRequest) {
  let requestBody;
  try {
    requestBody = await request.json();
  } catch (error) {
    throw new ValidationError(['Invalid JSON in request body']);
  }
  
  // Validate input
  const { username, password } = validateOrThrow(validateAdminCredentials, requestBody);
  
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
  
  const token = jwt.sign(
    tokenPayload,
    config.getJwtSecret(),
    { expiresIn: `${config.get().sessionTimeoutHours}h` }
  );
  
  return createSuccessResponse({
    token,
    username: admin.username,
    mustChangePassword: admin.must_change_password
  });
}

export const POST = withStrictRateLimit(withErrorHandler(loginHandler));
