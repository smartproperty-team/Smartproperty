// ===========================================
// SmartProperty - Auth Audit Service
// ===========================================

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuthAuditEventType,
  AuthAuditLog,
} from './entities/auth-audit-log.entity';
import { DeviceInfo } from './session.service';

export interface AuthAuditLogInput {
  eventType: AuthAuditEventType;
  success: boolean;
  userId?: string;
  email?: string;
  sessionId?: string;
  failureReason?: string;
  deviceInfo?: DeviceInfo;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuthAuditService {
  private readonly logger = new Logger(AuthAuditService.name);

  constructor(
    @InjectRepository(AuthAuditLog)
    private readonly auditRepository: Repository<AuthAuditLog>,
  ) {}

  async logEvent(input: AuthAuditLogInput): Promise<void> {
    try {
      const log = this.auditRepository.create({
        eventType: input.eventType,
        success: input.success,
        userId: input.userId,
        email: input.email,
        sessionId: input.sessionId,
        failureReason: input.failureReason,
        ipAddress: input.deviceInfo?.ipAddress,
        deviceName: input.deviceInfo?.deviceName,
        deviceType: input.deviceInfo?.deviceType,
        browser: input.deviceInfo?.browser,
        os: input.deviceInfo?.os,
        userAgent: input.userAgent,
        metadata: input.metadata,
      });

      await this.auditRepository.save(log);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to write auth audit log: ${message}`);
    }
  }
}
