// ===========================================
// Database (MongoDB) Configuration
// ===========================================

import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  // MongoDB connection settings
  host: process.env.MONGODB_HOST || 'localhost',
  port: parseInt(process.env.MONGODB_PORT ?? '27017', 10),
  database: process.env.MONGODB_DATABASE || 'smartproperty',
  username: process.env.MONGODB_USERNAME || 'smartproperty_user',
  password: process.env.MONGODB_PASSWORD || 'smartproperty_pass_2024',

  // Full MongoDB URI (takes precedence if provided)
  uri:
    process.env.MONGODB_URI ||
    `mongodb://${process.env.MONGODB_USERNAME || 'smartproperty_user'}:${process.env.MONGODB_PASSWORD || 'smartproperty_pass_2024'}@${process.env.MONGODB_HOST || 'localhost'}:${process.env.MONGODB_PORT || 27017}/${process.env.MONGODB_DATABASE || 'smartproperty'}?authSource=admin`,

  // TypeORM specific settings for MongoDB
  type: 'mongodb' as const,
  synchronize: false, // Disabled to avoid index conflicts with existing MongoDB schema
  logging: process.env.NODE_ENV === 'development',

  // Retry settings
  retryAttempts: 5,
  retryDelay: 3000,
}));
