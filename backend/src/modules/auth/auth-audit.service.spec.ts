import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthAuditService } from './auth-audit.service';
import {
  AuthAuditEventType,
  AuthAuditLog,
} from './entities/auth-audit-log.entity';

const mockRepository = {
  create: jest.fn(),
  save: jest.fn(),
};

describe('AuthAuditService', () => {
  let service: AuthAuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthAuditService,
        {
          provide: getRepositoryToken(AuthAuditLog),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AuthAuditService>(AuthAuditService);
    jest.clearAllMocks();
  });

  describe('logEvent', () => {
    it('should create and save an audit log entry', async () => {
      const log = { eventType: AuthAuditEventType.LOGIN, success: true };
      mockRepository.create.mockReturnValue(log);
      mockRepository.save.mockResolvedValue(log);

      await service.logEvent({
        eventType: AuthAuditEventType.LOGIN,
        success: true,
        userId: 'user-123',
        email: 'test@example.com',
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuthAuditEventType.LOGIN,
          success: true,
          userId: 'user-123',
          email: 'test@example.com',
        }),
      );
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should include device info fields when provided', async () => {
      const log = {};
      mockRepository.create.mockReturnValue(log);
      mockRepository.save.mockResolvedValue(log);

      await service.logEvent({
        eventType: AuthAuditEventType.LOGIN,
        success: true,
        deviceInfo: {
          ipAddress: '192.168.1.1',
          deviceName: 'Chrome on Windows',
          deviceType: 'desktop',
          browser: 'Chrome',
          os: 'Windows',
        },
        userAgent: 'Mozilla/5.0',
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '192.168.1.1',
          deviceName: 'Chrome on Windows',
          deviceType: 'desktop',
          browser: 'Chrome',
          os: 'Windows',
          userAgent: 'Mozilla/5.0',
        }),
      );
    });

    it('should log failure details', async () => {
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      await service.logEvent({
        eventType: AuthAuditEventType.LOGIN,
        success: false,
        failureReason: 'Invalid password',
        email: 'test@example.com',
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          failureReason: 'Invalid password',
        }),
      );
    });

    it('should not throw when save fails', async () => {
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockRejectedValue(new Error('DB error'));

      await expect(
        service.logEvent({
          eventType: AuthAuditEventType.LOGIN,
          success: true,
        }),
      ).resolves.not.toThrow();
    });
  });
});
