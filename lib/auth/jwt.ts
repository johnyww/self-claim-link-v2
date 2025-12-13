import jwt from 'jsonwebtoken';
import config from '../config';

const JWT_ALGORITHM = 'HS256';
const JWT_ISSUER = 'self-claim-link';

export interface JwtPayload {
  userId: number;
  username: string;
  mustChangePassword: boolean;
  iat?: number;
  exp?: number;
  iss?: string;
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp' | 'iss'>): string {
  return jwt.sign(
    {
      ...payload,
      iss: JWT_ISSUER,
    },
    config.getJwtSecret(),
    {
      algorithm: JWT_ALGORITHM,
      expiresIn: `${config.get().sessionTimeoutHours}h`,
    }
  );
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.getJwtSecret(), {
    algorithms: [JWT_ALGORITHM],
    issuer: JWT_ISSUER,
  }) as JwtPayload;
}
