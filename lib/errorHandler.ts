/**
 * Centralized error handling utilities
 * Provides consistent error responses and logging
 */

import { NextResponse } from 'next/server';
import { ValidationError } from './validation';
import { logger, generateRequestId } from './logger';
import config from './config';

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR'
}

export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(ErrorCode.AUTHENTICATION_ERROR, message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(ErrorCode.AUTHORIZATION_ERROR, message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(ErrorCode.NOT_FOUND, `${resource} not found`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(ErrorCode.CONFLICT, message, 409);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', details?: any) {
    super(ErrorCode.DATABASE_ERROR, message, 500, details);
  }
}



/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: Error | AppError | ValidationError,
  requestId?: string
): NextResponse {
  const timestamp = new Date().toISOString();
  const id = requestId || generateRequestId();

  // Handle different error types
  if (error instanceof ValidationError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        details: error.errors,
        timestamp,
        requestId: id
      }
    };

    logger.warn('Validation error', { requestId: id, errors: error.errors });
    return NextResponse.json(response, { status: 400 });
  }

  if (error instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp,
        requestId: id
      }
    };

    logger.error(`Application error: ${error.message}`, { 
      requestId: id, 
      code: error.code, 
      details: error.details 
    });
    
    return NextResponse.json(response, { status: error.statusCode });
  }

  // Handle database errors
  if (error.message.includes('database')) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Database operation failed',
        timestamp,
        requestId: id
      }
    };

    logger.error('Database error', { requestId: id, originalError: error.message });
    return NextResponse.json(response, { status: 500 });
  }

  // Generic error handling
  const response: ErrorResponse = {
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: config.isDevelopment() ? error.message : 'Internal server error',
      timestamp,
      requestId: id
    }
  };

  logger.error('Unhandled error', { requestId: id, error });
  return NextResponse.json(response, { status: 500 });
}

/**
 * Async error handler wrapper for API routes
 */
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const requestId = generateRequestId();
    
    try {
      logger.info('API request started', { requestId });
      const response = await handler(...args);
      logger.info('API request completed', { requestId, status: response.status });
      return response;
    } catch (error) {
      logger.error('API request failed', { requestId, error });
      return createErrorResponse(error as Error, requestId);
    }
  };
}

/**
 * Success response helper
 */
export function createSuccessResponse(data: any, status: number = 200): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  }, { status });
}

/**
 * Validation helper that throws AppError
 */
export function validateOrThrow<T>(
  validationFn: (data: any) => { isValid: boolean; errors: string[]; sanitizedData?: T },
  data: any
): T {
  const result = validationFn(data);
  if (!result.isValid) {
    throw new ValidationError(result.errors);
  }
  return result.sanitizedData as T;
}

/**
 * Database operation wrapper with error handling
 */
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string = 'Database operation'
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error(`${operationName} failed`, { error });
    throw new DatabaseError(`${operationName} failed`, error);
  }
}
