/**
 * Enhanced logging system with structured logging, performance monitoring, and error tracking
 */

import winston from 'winston';
import config from './config';

// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  DEBUG = 'debug'
}

// Log context interface
export interface LogContext {
  requestId?: string;
  userId?: string;
  orderId?: string;
  productId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  error?: any;
  [key: string]: any;
}

// Performance metrics interface
export interface PerformanceMetrics {
  operation: string;
  duration: number;
  success: boolean;
  metadata?: Record<string, any>;
}

// Business event interface
export interface BusinessEvent {
  event: string;
  data: Record<string, any>;
  timestamp?: Date;
}

class Logger {
  private winston: winston.Logger;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = config.isDevelopment();
    this.winston = this.createWinstonLogger();
  }

  private createWinstonLogger(): winston.Logger {
    const formats = [
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ];

    if (this.isDevelopment) {
      formats.push(
        winston.format.colorize(),
        winston.format.simple()
      );
    }

    return winston.createLogger({
      level: this.isDevelopment ? 'debug' : 'info',
      format: winston.format.combine(...formats),
      defaultMeta: {
        service: 'self-claim-link',
        environment: process.env.NODE_ENV || 'development'
      },
      transports: [
        // Console transport
        new winston.transports.Console({
          format: this.isDevelopment 
            ? winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
              )
            : winston.format.json()
        }),
        
        // File transports for production
        ...(this.isDevelopment ? [] : [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 10
          })
        ])
      ],
      exceptionHandlers: [
        new winston.transports.Console(),
        ...(this.isDevelopment ? [] : [
          new winston.transports.File({ filename: 'logs/exceptions.log' })
        ])
      ],
      rejectionHandlers: [
        new winston.transports.Console(),
        ...(this.isDevelopment ? [] : [
          new winston.transports.File({ filename: 'logs/rejections.log' })
        ])
      ]
    });
  }

  // Core logging methods
  error(message: string, context?: LogContext): void {
    this.winston.error(message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.winston.warn(message, context);
  }

  info(message: string, context?: LogContext): void {
    this.winston.info(message, context);
  }

  http(message: string, context?: LogContext): void {
    this.winston.http(message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.winston.debug(message, context);
  }

  // Business event logging
  logBusinessEvent(event: BusinessEvent): void {
    this.info(`Business Event: ${event.event}`, {
      eventType: 'business',
      event: event.event,
      data: event.data,
      timestamp: event.timestamp || new Date()
    });
  }

  // Performance monitoring
  logPerformance(metrics: PerformanceMetrics): void {
    const level = metrics.success ? 'info' : 'warn';
    this.winston.log(level, `Performance: ${metrics.operation}`, {
      eventType: 'performance',
      operation: metrics.operation,
      duration: metrics.duration,
      success: metrics.success,
      metadata: metrics.metadata
    });
  }

  // Database operation logging
  logDatabaseOperation(operation: string, duration: number, success: boolean, error?: any): void {
    const context: LogContext = {
      eventType: 'database',
      operation,
      duration,
      success
    };

    if (error) {
      context.error = error;
    }

    if (success) {
      this.debug(`DB Operation: ${operation} (${duration}ms)`, context);
    } else {
      this.error(`DB Operation Failed: ${operation}`, context);
    }
  }

  // API request/response logging
  logApiRequest(method: string, url: string, context?: LogContext): void {
    this.http(`${method} ${url}`, {
      eventType: 'api_request',
      method,
      url,
      ...context
    });
  }

  logApiResponse(method: string, url: string, statusCode: number, duration: number, context?: LogContext): void {
    const level = statusCode >= 400 ? 'warn' : 'info';
    this.winston.log(level, `${method} ${url} ${statusCode} (${duration}ms)`, {
      eventType: 'api_response',
      method,
      url,
      statusCode,
      duration,
      ...context
    });
  }

  // Security event logging
  logSecurityEvent(event: string, context?: LogContext): void {
    this.warn(`Security Event: ${event}`, {
      eventType: 'security',
      event,
      ...context
    });
  }

  // Authentication logging
  logAuth(event: 'login_attempt' | 'login_success' | 'login_failure' | 'logout', context?: LogContext): void {
    const level = event === 'login_failure' ? 'warn' : 'info';
    this.winston.log(level, `Auth: ${event}`, {
      eventType: 'auth',
      event,
      ...context
    });
  }

  // Claim operation logging
  logClaimOperation(orderId: string, success: boolean, reason?: string, context?: LogContext): void {
    this.logBusinessEvent({
      event: success ? 'claim_success' : 'claim_failure',
      data: {
        orderId,
        success,
        reason,
        ...context
      }
    });
  }

  // Product operation logging
  logProductOperation(operation: 'create' | 'update' | 'delete', productId: string, context?: LogContext): void {
    this.logBusinessEvent({
      event: `product_${operation}`,
      data: {
        productId,
        operation,
        ...context
      }
    });
  }

  // Order operation logging
  logOrderOperation(operation: 'create' | 'update' | 'delete', orderId: string, context?: LogContext): void {
    this.logBusinessEvent({
      event: `order_${operation}`,
      data: {
        orderId,
        operation,
        ...context
      }
    });
  }
}

// Create singleton instance
export const logger = new Logger();

// Performance measurement utility
export function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const start = Date.now();
  
  return fn()
    .then((result) => {
      const duration = Date.now() - start;
      logger.logPerformance({
        operation,
        duration,
        success: true,
        metadata
      });
      return result;
    })
    .catch((error) => {
      const duration = Date.now() - start;
      logger.logPerformance({
        operation,
        duration,
        success: false,
        metadata: { ...metadata, error: error.message }
      });
      throw error;
    });
}

// Request ID generation
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
