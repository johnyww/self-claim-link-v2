/**
 * Middleware for logging, monitoring, and request tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger, generateRequestId, LogContext } from './logger';

// Request context storage
export interface RequestContext extends LogContext {
  requestId: string;
  startTime: number;
  method: string;
  url: string;
  ip?: string;
  userAgent?: string;
}

// Store request context (in production, consider using AsyncLocalStorage)
const requestContextMap = new Map<string, RequestContext>();

/**
 * Logging middleware for API routes
 */
export function withRequestLogging<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const request = args[0] as NextRequest;
    const requestId = generateRequestId();
    const startTime = Date.now();
    
    // Extract request information
    const method = request.method;
    const url = request.url;
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Create request context
    const context: RequestContext = {
      requestId,
      startTime,
      method,
      url,
      ip,
      userAgent
    };
    
    // Store context for this request
    requestContextMap.set(requestId, context);
    
    // Log incoming request
    logger.logApiRequest(method, url, {
      requestId,
      ip,
      userAgent
    });
    
    try {
      // Add request ID to headers for tracing
      const response = await handler(...args);
      
      // Calculate duration
      const duration = Date.now() - startTime;
      const statusCode = response.status;
      
      // Log response
      logger.logApiResponse(method, url, statusCode, duration, {
        requestId,
        ip,
        userAgent
      });
      
      // Add request ID to response headers
      response.headers.set('X-Request-ID', requestId);
      
      // Clean up context
      requestContextMap.delete(requestId);
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log error response
      logger.logApiResponse(method, url, 500, duration, {
        requestId,
        ip,
        userAgent,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Clean up context
      requestContextMap.delete(requestId);
      
      throw error;
    }
  };
}

/**
 * Get current request context
 */
export function getCurrentRequestContext(): RequestContext | undefined {
  // In a real implementation, you'd use AsyncLocalStorage
  // For now, we'll return undefined and rely on explicit context passing
  return undefined;
}

/**
 * Database operation logging middleware
 */
export function withDatabaseLogging<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  return fn()
    .then((result) => {
      const duration = Date.now() - startTime;
      logger.logDatabaseOperation(operation, duration, true);
      return result;
    })
    .catch((error) => {
      const duration = Date.now() - startTime;
      logger.logDatabaseOperation(operation, duration, false, error);
      throw error;
    });
}

/**
 * Business operation logging middleware
 */
export function withBusinessEventLogging<T>(
  eventName: string,
  fn: () => Promise<T>,
  getEventData?: (result: T) => Record<string, any>
): Promise<T> {
  return fn()
    .then((result) => {
      logger.logBusinessEvent({
        event: eventName,
        data: getEventData ? getEventData(result) : {}
      });
      return result;
    })
    .catch((error) => {
      logger.logBusinessEvent({
        event: `${eventName}_failed`,
        data: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    });
}

/**
 * Security event logging middleware
 */
export function withSecurityLogging<T>(
  securityEvent: string,
  fn: () => Promise<T>,
  getSecurityContext?: (result: T) => LogContext
): Promise<T> {
  return fn()
    .then((result) => {
      logger.logSecurityEvent(securityEvent, getSecurityContext ? getSecurityContext(result) : {});
      return result;
    })
    .catch((error) => {
      logger.logSecurityEvent(`${securityEvent}_failed`, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    });
}

/**
 * Performance monitoring middleware
 */
export function withPerformanceMonitoring<T>(
  operationName: string,
  fn: () => Promise<T>,
  getMetadata?: (result: T) => Record<string, any>
): Promise<T> {
  const startTime = Date.now();
  
  return fn()
    .then((result) => {
      const duration = Date.now() - startTime;
      logger.logPerformance({
        operation: operationName,
        duration,
        success: true,
        metadata: getMetadata ? getMetadata(result) : {}
      });
      return result;
    })
    .catch((error) => {
      const duration = Date.now() - startTime;
      logger.logPerformance({
        operation: operationName,
        duration,
        success: false,
        metadata: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    });
}
