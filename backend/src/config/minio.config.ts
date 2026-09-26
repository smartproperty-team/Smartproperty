// ===========================================
// MinIO (S3-Compatible Storage) Configuration
// ===========================================

import { registerAs } from '@nestjs/config';

export const minioConfig = registerAs('minio', () => ({
  // MinIO server connection
  endpoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',

  // S3 region. Left undefined for a real MinIO server, which does not need
  // one. Cloudflare R2 requires the literal value "auto": without it the SDK
  // attempts a GetBucketLocation call that R2 answers differently from S3,
  // and requests fail to sign correctly.
  region: process.env.MINIO_REGION || undefined,

  // Credentials
  accessKey: process.env.MINIO_ACCESS_KEY || 'smartproperty_minio',
  secretKey: process.env.MINIO_SECRET_KEY || 'smartproperty_minio_secret_2024',

  // Bucket settings
  bucketName: process.env.MINIO_BUCKET_NAME || 'smartproperty',

  // Public URL for accessing files (for generating URLs)
  publicUrl: process.env.MINIO_PUBLIC_URL || 'http://localhost:9000',

  // MinIO serves objects at {publicUrl}/{bucket}/{key}. Cloudflare R2's
  // r2.dev domain is already bound to one bucket and serves {publicUrl}/{key},
  // so including the bucket there produces 404s. Set
  // MINIO_PUBLIC_INCLUDE_BUCKET=false for R2 or any equivalent setup.
  publicUrlIncludesBucket: process.env.MINIO_PUBLIC_INCLUDE_BUCKET !== 'false',

  // File upload settings
  maxFileSize: 50 * 1024 * 1024, // 50MB
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
