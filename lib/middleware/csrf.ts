import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createHmac, timingSafeEqual } from 'crypto';
import config from '../config';

const CSRF_TOKEN_NAME = 'XSRF-TOKEN';

export function generateCsrfToken(): { token: string; signedToken: string } {
  const token = randomBytes(32).toString('hex');
  const secret = config.getJwtSecret(); // Reuse the app secret for HMAC
  const signedToken = createHmac('sha256', secret).update(token).digest('hex');
  return { token, signedToken: `${token}.${signedToken}` }; // Combine token and signature
}

export function verifyCsrfToken(signedTokenWithDot: string): boolean {
  const secret = config.getJwtSecret();
  const [token, signature] = signedTokenWithDot.split('.');

  if (!token || !signature) {
    return false;
  }

  const expectedSignature = createHmac('sha256', secret).update(token).digest('hex');

  // Use timingSafeEqual to prevent timing attacks
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}

export function withCsrfProtection(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return handler(req);
    }

    const signedCookieToken = req.cookies.get(CSRF_TOKEN_NAME)?.value;
    const headerToken = req.headers.get('x-csrf-token');

    if (!signedCookieToken || !headerToken) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Invalid CSRF token',
          message: 'CSRF token is missing from headers or cookies.'
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // The header token must match the unsigned part of the cookie token
    const [unsignedCookieToken] = signedCookieToken.split('.');
    if (unsignedCookieToken !== headerToken) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Invalid CSRF token',
          message: 'CSRF token mismatch.'
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Finally, verify the signature of the cookie token
    if (!verifyCsrfToken(signedCookieToken)) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Invalid CSRF token',
          message: 'The request could not be processed due to an invalid CSRF token.'
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return handler(req);
  };
}
