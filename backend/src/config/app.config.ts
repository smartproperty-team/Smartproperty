// ===========================================
// Application Configuration
// ===========================================

import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  name: process.env.APP_NAME || 'SmartProperty API',
  port: parseInt(process.env.APP_PORT || process.env.PORT || '3000', 10),
  corsOrigin:
    process.env.APP_CORS_ORIGIN ||
    process.env.CORS_ORIGIN ||
    'http://localhost:5173',
  frontendUrl:
    process.env.APP_FRONTEND_URL ||
    process.env.FRONTEND_URL ||
    'http://localhost:5173',

  // API Versioning
  apiPrefix: 'api',
  apiVersion: 'v1',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'debug',

  // GraphQL
  graphql: {
    playground: process.env.GRAPHQL_PLAYGROUND === 'true',
    debug: process.env.GRAPHQL_DEBUG === 'true',
    path: '/graphql',
  },
}));
