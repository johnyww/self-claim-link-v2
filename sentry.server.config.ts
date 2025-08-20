/**
 * Sentry configuration for server-side error tracking and performance monitoring
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Performance monitoring
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],
  
  // Environment
  environment: process.env.NODE_ENV || 'development',
  
  // Release tracking
  release: process.env.APP_VERSION || '1.0.0',
  
  // Filter out non-error events in development
  beforeSend(event, _hint) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Sentry Server Event:', event);
    }
    return event;
  },
  
  // Server-specific configuration
  serverName: process.env.SERVER_NAME || 'self-claim-link-server',
  
  // Ignore certain errors
  ignoreErrors: [
    'DatabaseError',
    'ValidationError',
  ],
});
