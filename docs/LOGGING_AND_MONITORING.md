# Logging and Monitoring System

This document describes the comprehensive logging and monitoring system implemented for the self-claim-link-2 application.

## 🎯 Overview

The application now includes enterprise-grade logging and monitoring capabilities:

- **Structured Logging** with Winston
- **Error Tracking** with Sentry
- **Performance Monitoring** 
- **Health Checks** and **Metrics** endpoints
- **Request/Response Logging**
- **Business Event Tracking**

## 📊 Components

### 1. Enhanced Logger (`lib/logger.ts`)

A comprehensive logging system that provides:

```typescript
import { logger } from '@/lib/logger';

// Basic logging
logger.info('User action completed', { userId: '123' });
logger.warn('Rate limit approaching', { attempts: 8 });
logger.error('Database connection failed', { error });

// Business events
logger.logClaimOperation('ORDER123', true, 'success');
logger.logProductOperation('create', 'PROD456');

// Performance monitoring
logger.logPerformance({
  operation: 'database_query',
  duration: 150,
  success: true
});
```

**Features:**
- Multiple log levels (error, warn, info, http, debug)
- Structured JSON logging in production
- Colorized console output in development
- File rotation for production logs
- Business event tracking
- Performance metrics logging

### 2. Request Middleware (`lib/middleware.ts`)

Automatic request/response logging for all API routes:

```typescript
import { withRequestLogging } from '@/lib/middleware';

export const POST = withRequestLogging(yourHandler);
```

**Captures:**
- Request method, URL, IP, User-Agent
- Response status codes and timing
- Request IDs for tracing
- Error details

### 3. Sentry Integration

**Client-side** (`sentry.client.config.ts`):
- Browser error tracking
- Performance monitoring
- User session tracking

**Server-side** (`sentry.server.config.ts`):
- Server error tracking
- API performance monitoring
- Database error tracking

### 4. Health Check Endpoint

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-10T12:33:24.000Z",
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 45
    },
    "memory": {
      "status": "healthy",
      "usage": {
        "used": 52428800,
        "total": 134217728,
        "percentage": 39.06
      }
    },
    "uptime": {
      "status": "healthy",
      "seconds": 3600
    }
  }
}
```

### 5. Metrics Endpoint

**Endpoint:** `GET /api/metrics`

**Response:**
```json
{
  "timestamp": "2025-01-10T12:33:24.000Z",
  "system": {
    "uptime": 3600,
    "memory": {
      "used": 52428800,
      "total": 134217728,
      "percentage": 39.06
    }
  },
  "database": {
    "connectionCount": 5,
    "responseTime": 23
  },
  "business": {
    "totalOrders": 1250,
    "totalProducts": 45,
    "totalClaims": 980,
    "claimsToday": 23,
    "successfulClaims": 945,
    "failedClaims": 35,
    "claimSuccessRate": 96.43
  }
}
```

## 🔧 Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Logging
LOG_LEVEL=info
NODE_ENV=production

# Sentry (optional)
SENTRY_DSN=your_sentry_dsn_here
NEXT_PUBLIC_SENTRY_DSN=your_public_sentry_dsn_here

# Application
APP_VERSION=1.0.0
SERVER_NAME=self-claim-link-2-server
```

### Log Files (Production)

Logs are automatically written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- `logs/exceptions.log` - Unhandled exceptions
- `logs/rejections.log` - Unhandled promise rejections

## 📈 Monitoring Setup

### 1. Health Monitoring

Set up monitoring tools to check:
- `GET /api/health` every 30 seconds
- Alert if status is "unhealthy" or response time > 5s

### 2. Metrics Collection

- `GET /api/metrics` every 5 minutes
- Track business KPIs and system performance
- Set up alerts for:
  - Memory usage > 90%
  - Database response time > 1000ms
  - Claim success rate < 95%

### 3. Log Aggregation

**Development:**
- Logs output to console with colors
- Debug level enabled

**Production:**
- JSON structured logs
- File rotation (5MB max, 10 files)
- Consider log aggregation service (ELK, Splunk, etc.)

## 🚨 Alert Recommendations

### Critical Alerts
- Database connection failures
- Memory usage > 95%
- Error rate > 5%
- Health check failures

### Warning Alerts
- Memory usage > 80%
- Database response time > 500ms
- Claim success rate < 98%
- High number of failed login attempts

## 📊 Business Metrics Tracked

### Claim Operations
- Total claims attempted
- Successful vs failed claims
- Claim success rate
- Claims per day/hour
- Order expiration events

### Product Operations
- Product creation/updates/deletions
- Download events
- Popular products

### Authentication Events
- Login attempts/successes/failures
- Admin access patterns
- Security events

### Performance Metrics
- API response times
- Database query performance
- Memory and CPU usage
- Error rates by endpoint

## 🔍 Log Analysis Examples

### Find Failed Claims
```bash
# Search logs for failed claims
grep "claim_failure" logs/combined.log | jq '.'
```

### Monitor API Performance
```bash
# Find slow API responses (>1000ms)
grep "api_response" logs/combined.log | jq 'select(.duration > 1000)'
```

### Security Events
```bash
# Find security-related events
grep "eventType.*security" logs/combined.log | jq '.'
```

## 🛠️ Usage Examples

### Adding Business Event Logging

```typescript
// In your API route
import { logger } from '@/lib/logger';

// Log successful product creation
logger.logProductOperation('create', productId, {
  adminId: 'admin123',
  productName: 'New Digital Product'
});

// Log custom business event
logger.logBusinessEvent({
  event: 'bulk_order_processed',
  data: {
    orderCount: 50,
    totalValue: 2500,
    processingTime: 1200
  }
});
```

### Adding Performance Monitoring

```typescript
import { measurePerformance } from '@/lib/logger';

// Wrap expensive operations
const result = await measurePerformance(
  'complex_calculation',
  async () => {
    // Your expensive operation
    return await complexCalculation();
  },
  { inputSize: 1000 }
);
```

### Custom Error Logging

```typescript
import { logger } from '@/lib/logger';

try {
  // Risky operation
} catch (error) {
  logger.error('Operation failed', {
    operation: 'user_registration',
    userId: '123',
    error: error.message,
    stack: error.stack
  });
  throw error;
}
```

## 📋 Maintenance

### Log Rotation
- Logs automatically rotate at 5MB
- Keep last 10 files for combined logs
- Keep last 5 files for error logs

### Cleanup
- Monitor disk space usage
- Consider log archival for long-term storage
- Regular cleanup of old log files

### Performance
- Monitor logging overhead
- Adjust log levels in production
- Consider async logging for high-traffic scenarios

## 🚀 Next Steps

1. **Set up log aggregation** (ELK Stack, Splunk, etc.)
2. **Configure alerting** (PagerDuty, Slack, email)
3. **Create dashboards** (Grafana, Kibana)
4. **Implement custom metrics** for business KPIs
5. **Add distributed tracing** for microservices (if applicable)

This logging and monitoring system provides comprehensive visibility into your application's health, performance, and business metrics, enabling proactive issue detection and data-driven decision making.
