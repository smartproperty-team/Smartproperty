// ===========================================
// SmartProperty - Verification Module
// ===========================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { UploadModule } from '../upload/upload.module';
import { UsersModule } from '../users/users.module';
import {
  TenantVerification,
  VerificationDocument,
} from './entities/verification.entity';
import { FraudDetectionService } from './fraud-detection.service';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([VerificationDocument, TenantVerification]),
    UploadModule,
    NotificationsModule,
    UsersModule,
  ],
  controllers: [VerificationController],
  providers: [VerificationService, FraudDetectionService],
  exports: [VerificationService],
})
export class VerificationModule {}
