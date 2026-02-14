// ===========================================
// MinIO (S3-Compatible Storage) Configuration
// ===========================================

import { registerAs } from '@nestjs/config';

export const minioConfig = registerAs('minio', () => ({
  // MinIO server connection
  endpoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',

  // Credentials
  accessKey: process.env.MINIO_ACCESS_KEY || 'smartproperty_minio',
  secretKey: process.env.MINIO_SECRET_KEY || 'smartproperty_minio_secret_2024',

  // Bucket settings
  bucketName: process.env.MINIO_BUCKET_NAME || 'smartproperty',

  // Public URL for accessing files (for generating URLs)
  publicUrl: process.env.MINIO_PUBLIC_URL || 'http://localhost:9000',

  // File upload settings
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],

  // Presigned URL settings
  presignedUrlExpiry: 3600, // 1 hour

  // Folder structure in bucket
  folders: {
    properties: 'properties',
    users: 'users',
    documents: 'documents',
    temp: 'temp',
  },
}));
