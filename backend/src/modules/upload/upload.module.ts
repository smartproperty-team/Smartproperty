// ===========================================
// SmartProperty - Upload Module
// ===========================================

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MinioService } from './minio.service';
import { UploadController } from './upload.controller';

@Module({
  imports: [
    ConfigModule,
    MulterModule.register({
      storage: memoryStorage(), // Store files in memory for processing before sending to MinIO
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
        files: 20, // Max 20 files per request
      },
    }),
  ],
  controllers: [UploadController],
  providers: [MinioService],
  exports: [MinioService],
})
export class UploadModule {}
