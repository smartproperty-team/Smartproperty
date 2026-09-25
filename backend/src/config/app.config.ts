// ===========================================
// Application Configuration
// ===========================================

import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  name: process.env.APP_NAME || 'SmartProperty API',
  port: parseInt(process.env.PORT || '3000', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // API Versioning
  apiPrefix: 'api',
  apiVersion: 'v1',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'debug',

  // AI Services
  aiService: {
    url: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    timeoutMs: parseInt(process.env.AI_SERVICE_TIMEOUT_MS || '60000', 10),
    retries: parseInt(process.env.AI_SERVICE_RETRIES || '1', 10),
  },
}));
