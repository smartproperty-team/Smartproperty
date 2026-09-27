// ===========================================
// Database (MongoDB) Configuration
// ===========================================

import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  // MongoDB connection settings
  host: process.env.MONGODB_HOST || 'localhost',
  port: parseInt(process.env.MONGODB_PORT ?? '27017', 10),
  database: process.env.MONGODB_DATABASE || 'smartproperty',
  // No fallbacks: validation.schema.ts requires both, so a default here
  // could never apply and would only put a password in the source.
  username: process.env.MONGODB_USERNAME,
  password: process.env.MONGODB_PASSWORD,

  // Full MongoDB URI (takes precedence if provided)
  uri:
    process.env.MONGODB_URI ||
    `mongodb://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST || 'localhost'}:${process.env.MONGODB_PORT || 27017}/${process.env.MONGODB_DATABASE || 'smartproperty'}?authSource=admin`,

  // TypeORM specific settings for MongoDB
  type: 'mongodb' as const,
  synchronize: false, // Disabled to avoid index conflicts with existing MongoDB schema
  logging: process.env.NODE_ENV === 'development',

  // Retry settings
  retryAttempts: 5,
  retryDelay: 3000,
}));
