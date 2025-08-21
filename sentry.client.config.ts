/**
 * Sentry configuration for client-side error tracking and performance monitoring
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  environment: process.env.NODE_ENV || 'development',
  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  integrations: [
    Sentry.browserTracingIntegration({
      tracePropagationTargets: ['localhost', /^https:\/\/yourapp\.com\/api/],
    }),
    Sentry.captureConsoleIntegration({ levels: ['error', 'warn'] }),
  ],
  beforeSend(event) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('Sentry Event:', event);
    }
    return event;
  },
  ignoreErrors: [
    'Non-Error promise rejection captured',
    'ResizeObserver loop limit exceeded',
    'NetworkError',
    'fetch',
  ],
});
