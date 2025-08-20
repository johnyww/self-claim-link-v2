import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { getAdminByUsername } from '@/lib/database';
import { withErrorHandler, createSuccessResponse, AuthenticationError } from '@/lib/errorHandler';
import config from '@/lib/config';

async function getAdminInfoHandler(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('No token provided');
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  let decoded: any;
  try {
    decoded = jwt.verify(token, config.getJwtSecret());
  } catch (jwtError) {
    throw new AuthenticationError('Invalid or expired token');
  }
  
  // Get fresh admin data from database to check current status
  const admin = await getAdminByUsername(decoded.username);
  
  if (!admin) {
    throw new AuthenticationError('Admin user not found');
  }
  
  return createSuccessResponse({
    username: admin.username,
    userId: admin.id,
    mustChangePassword: admin.must_change_password,
    lastPasswordChange: admin.last_password_change
  });
}

export const GET = withErrorHandler(getAdminInfoHandler);
