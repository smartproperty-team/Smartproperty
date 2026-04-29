// ===========================================
// AWS (S3) Configuration
// ===========================================

import { registerAs } from '@nestjs/config';

export const awsConfig = registerAs('aws', () => ({
  // AWS credentials
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  region: process.env.AWS_REGION || 'us-east-1',

  // S3 bucket settings
  s3: {
    bucket: process.env.AWS_S3_BUCKET || 'smartproperty-uploads',

    // File upload limits
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'video/mp4',
      'video/webm',
    ],

    // Presigned URL settings
    presignedUrlExpiry: 3600, // 1 hour

    // Folder structure
    folders: {
      properties: 'properties',
      users: 'users',
      documents: 'documents',
      temp: 'temp',
    },
  },
}));
