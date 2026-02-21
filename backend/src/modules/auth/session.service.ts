// ===========================================
// SmartProperty - Session Service
// ===========================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectId } from 'mongodb';
import * as bcrypt from 'bcrypt';
import { LessThan, Repository } from 'typeorm';
import { Session } from './entities/session.entity';

// ===========================================
// Device Info Interface
// ===========================================

export interface DeviceInfo {
  deviceName?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  ipAddress?: string;
  location?: string;
}

// ===========================================
// Session Service
// ===========================================

@Injectable()
export class SessionService {
  // Maximum number of active sessions per user
  private readonly MAX_SESSIONS_PER_USER = 5;

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  // ===========================================
  // Create Session
  // ===========================================

  async createSession(
    userId: string,
    refreshToken: string,
    deviceInfo: DeviceInfo,
    expiresInSeconds: number = 7 * 24 * 60 * 60, // 7 days default
  ): Promise<Session> {
    // Hash the refresh token
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    // Check existing session count and remove oldest if exceeds limit
    await this.enforceSessionLimit(userId);

    // Create new session
    const session = this.sessionRepository.create({
      userId,
      refreshTokenHash,
      deviceName: deviceInfo.deviceName || 'Unknown Device',
      deviceType: deviceInfo.deviceType || 'unknown',
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      ipAddress: deviceInfo.ipAddress,
      location: deviceInfo.location,
      isActive: true,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
      lastActivityAt: new Date(),
    });

    return this.sessionRepository.save(session);
  }

  // ===========================================
  // Validate Session
  // ===========================================

  async validateSession(
    userId: string,
    refreshToken: string,
  ): Promise<Session | null> {
    // Get all active sessions for user
    const sessions = await this.sessionRepository.find({
      where: {
        userId,
        isActive: true,
      },
    });

    // Find session with matching refresh token
    for (const session of sessions) {
      if (session.isExpired) {
        // Mark expired sessions as inactive
        session.isActive = false;
        await this.sessionRepository.save(session);
        continue;
      }

      const isValid = await bcrypt.compare(
        refreshToken,
        session.refreshTokenHash,
      );
      if (isValid) {
        // Update last activity
        session.lastActivityAt = new Date();
        await this.sessionRepository.save(session);
        return session;
      }
    }

    return null;
  }

  // ===========================================
  // Update Session Token
  // ===========================================

  async updateSessionToken(
    sessionId: string,
    newRefreshToken: string,
  ): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { _id: sessionId as any },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    session.refreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
    session.lastActivityAt = new Date();

    await this.sessionRepository.save(session);
  }

  // ===========================================
  // Get User Sessions
  // ===========================================

  async getUserSessions(userId: string): Promise<Session[]> {
    const sessions = await this.sessionRepository.find({
      where: {
        userId,
        isActive: true,
      },
      order: {
        lastActivityAt: 'DESC',
      },
    });

    // Filter out expired sessions
    const validSessions: Session[] = [];
    for (const session of sessions) {
      if (session.isExpired) {
        session.isActive = false;
        await this.sessionRepository.save(session);
      } else {
        validSessions.push(session);
      }
    }

    return validSessions;
  }

  // ===========================================
  // Revoke Session
  // ===========================================

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    // Always convert sessionId to ObjectId for MongoDB queries
    let objectId: any;
    try {
      objectId = new ObjectId(sessionId);
    } catch {
      throw new NotFoundException('Invalid session ID');
    }
    const session = await this.sessionRepository.findOne({
      where: {
        _id: objectId,
        userId: userId, // compare as string
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    session.isActive = false;
    await this.sessionRepository.save(session);
  }

  // ===========================================
  // Revoke All Sessions
  // ===========================================

  async revokeAllSessions(
    userId: string,
    exceptSessionId?: string,
  ): Promise<number> {
    const sessions = await this.sessionRepository.find({
      where: {
        userId,
        isActive: true,
      },
    });

    let revokedCount = 0;
    for (const session of sessions) {
      if (exceptSessionId && session._id.toHexString() === exceptSessionId) {
        continue; // Skip current session
      }
      session.isActive = false;
      await this.sessionRepository.save(session);
      revokedCount++;
    }

    return revokedCount;
  }

  // ===========================================
  // Revoke Session by Token
  // ===========================================

  async revokeSessionByToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const session = await this.validateSession(userId, refreshToken);

    if (session) {
      session.isActive = false;
      await this.sessionRepository.save(session);
    }
  }

  // ===========================================
  // Cleanup Expired Sessions
  // ===========================================

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.sessionRepository.update(
      {
        isActive: true,
        expiresAt: LessThan(new Date()),
      },
      { isActive: false },
    );

    return result.affected || 0;
  }

  // ===========================================
  // Private Methods
  // ===========================================

  private async enforceSessionLimit(userId: string): Promise<void> {
    const activeSessions = await this.sessionRepository.find({
      where: {
        userId,
        isActive: true,
      },
      order: {
        lastActivityAt: 'ASC', // Oldest first
      },
    });

    // Remove oldest sessions if limit exceeded
    const sessionsToRemove =
      activeSessions.length - this.MAX_SESSIONS_PER_USER + 1;
    if (sessionsToRemove > 0) {
      for (let i = 0; i < sessionsToRemove; i++) {
        activeSessions[i].isActive = false;
        await this.sessionRepository.save(activeSessions[i]);
      }
    }
  }

  // ===========================================
  // Parse User Agent
  // ===========================================

  parseUserAgent(userAgent: string): Partial<DeviceInfo> {
    const result: Partial<DeviceInfo> = {};

    // Simple browser detection
    if (userAgent.includes('Firefox')) {
      result.browser = 'Firefox';
    } else if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      result.browser = 'Chrome';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      result.browser = 'Safari';
    } else if (userAgent.includes('Edg')) {
      result.browser = 'Edge';
    } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
      result.browser = 'Opera';
    } else {
      result.browser = 'Unknown';
    }

    // Simple OS detection
    if (userAgent.includes('Windows')) {
      result.os = 'Windows';
    } else if (userAgent.includes('Mac OS')) {
      result.os = 'macOS';
    } else if (userAgent.includes('Linux')) {
      result.os = 'Linux';
    } else if (userAgent.includes('Android')) {
      result.os = 'Android';
    } else if (userAgent.includes('iOS') || userAgent.includes('iPhone')) {
      result.os = 'iOS';
    } else {
      result.os = 'Unknown';
    }

    // Device type detection
    if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
      result.deviceType = 'mobile';
    } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
      result.deviceType = 'tablet';
    } else {
      result.deviceType = 'desktop';
    }

    // Generate device name
    result.deviceName = `${result.browser} on ${result.os}`;

    return result;
  }
}
