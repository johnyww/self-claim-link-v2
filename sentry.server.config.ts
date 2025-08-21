/**
 * Sentry configuration for server-side error tracking and performance monitoring
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  environment: process.env.NODE_ENV || 'development',
  release: process.env.APP_VERSION || '1.0.0',
  integrations: [
    Sentry.captureConsoleIntegration({ levels: ['error'] }),
    Sentry.httpIntegration(),
  ],
  beforeSend(event) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('Sentry Server Event:', event);
    }
    return event;
  },
  ignoreErrors: [
    'DatabaseError',
    'ValidationError',
  ],
});
