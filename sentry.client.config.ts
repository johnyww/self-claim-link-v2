/**
 * Sentry configuration for client-side error tracking and performance monitoring
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Capture unhandled promise rejections (handled by default in newer versions)
  
  // Performance monitoring
  integrations: [
    new Sentry.BrowserTracing({
      // Set sampling rate for performance monitoring
      tracePropagationTargets: ['localhost', /^https:\/\/yourapp\.com\/api/],
    }),
  ],
  
  // Environment
  environment: process.env.NODE_ENV || 'development',
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  
  // Filter out non-error events in development
  beforeSend(event, _hint) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Sentry Event:', event);
    }
    return event;
  },
  
  // Ignore certain errors
  ignoreErrors: [
    // Browser extensions
    'Non-Error promise rejection captured',
    'ResizeObserver loop limit exceeded',
    // Network errors
    'NetworkError',
    'fetch',
  ],
});
