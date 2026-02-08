// ===========================================
// Configuration Validation Schema
// ===========================================
// Validates environment variables at startup

import Joi from 'joi';

export const validationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  APP_NAME: Joi.string().default('SmartProperty API'),

  // MongoDB
  MONGODB_HOST: Joi.string().default('localhost'),
  MONGODB_PORT: Joi.number().default(27017),
  MONGODB_DATABASE: Joi.string().default('smartproperty'),
  MONGODB_USERNAME: Joi.string().required(),
  MONGODB_PASSWORD: Joi.string().required(),
  MONGODB_URI: Joi.string().optional(),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRATION: Joi.string().default('1d'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),

  // CORS
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),

  // AWS (optional)
  AWS_ACCESS_KEY_ID: Joi.string().optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
  AWS_REGION: Joi.string().default('us-east-1'),
  AWS_S3_BUCKET: Joi.string().optional(),

  // SMTP (optional for dev - MailHog doesn't require auth)
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().optional(),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASSWORD: Joi.string().allow('').optional(),

  // Google OAuth
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().optional(),
  GOOGLE_CALLBACK_URL: Joi.string().optional(),
  GOOGLE_FRONTEND_CALLBACK_URL: Joi.string().optional(),

  // reCAPTCHA
  RECAPTCHA_SECRET_KEY: Joi.string().optional(),
  RECAPTCHA_VERIFY_URL: Joi.string().optional(),

  // Throttling
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('debug'),

  // GraphQL
  GRAPHQL_PLAYGROUND: Joi.boolean().default(true),
  GRAPHQL_DEBUG: Joi.boolean().default(true),
});
