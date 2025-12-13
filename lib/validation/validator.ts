import { z } from 'zod';
import { logger } from '../logger';

export function validate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.infer<T> {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      logger.warn('Validation failed', { issues, data });
      throw new ValidationError('Validation failed', issues);
    }
    throw error;
  }
}

export const schemas = {
  orderId: z.string()
    .min(1, 'Order ID is required')
    .max(100, 'Order ID is too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid order ID format'),
  
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username is too long')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  
  email: z.string().email('Invalid email address'),
};

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: Array<{ path: string; message: string }>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
