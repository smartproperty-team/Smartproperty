// ===========================================
// VerificationService unit tests - AI switch
// ===========================================

import { ServiceUnavailableException } from '@nestjs/common';
import { ObjectId } from 'mongodb';

import {
  DocumentType,
  FraudAnalysisStatus,
} from './entities/verification.entity';
import { VerificationService } from './verification.service';

describe('VerificationService (AI switch)', () => {
  let aiEnabled: boolean;
  let service: VerificationService;

  const savedId = new ObjectId();

  const docRepo = {
    create: jest.fn((doc: Record<string, unknown>) => doc),
    save: jest.fn(async (doc: Record<string, unknown>) => ({
      ...doc,
      _id: savedId,
    })),
    findOne: jest.fn(),
  } as any;

  const verificationRepo = {
    findOne: jest.fn(),
    create: jest.fn((v: Record<string, unknown>) => v),
    save: jest.fn(async (v: Record<string, unknown>) => v),
  } as any;

  const minioService = {
    uploadFile: jest.fn(async () => ({
      key: 'verification/u1/identity/id.jpg',
      url: 'https://storage.example/id.jpg',
    })),
  } as any;

  const configService = {
    get: jest.fn((key: string) =>
      key === 'app.aiService.enabled' ? aiEnabled : undefined,
    ),
  } as any;

  const usersService = { findById: jest.fn() } as any;
  const fraudDetectionService = { analyzeDocument: jest.fn() } as any;

  const file = {
    originalname: 'id.jpg',
    size: 2048,
    mimetype: 'image/jpeg',
  } as Express.Multer.File;

  // Background analysis is fire-and-forget; let its first await settle.
  const flush = () => new Promise((resolve) => setImmediate(resolve));

  beforeEach(() => {
    jest.clearAllMocks();
    verificationRepo.findOne.mockResolvedValue({ userId: 'u1' });
    docRepo.findOne.mockResolvedValue(null);
    service = new VerificationService(
      docRepo,
      verificationRepo,
      minioService,
      {} as any,
      configService,
      usersService,
      {} as any,
      fraudDetectionService,
    );
  });

  describe('uploadDocument', () => {
    it('records the fraud check as not run and queues nothing while AI is off', async () => {
      aiEnabled = false;

      const result = await service.uploadDocument(
        'u1',
        file,
        DocumentType.IDENTITY,
      );
      await flush();

      expect(docRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fraudAnalysisStatus: FraudAnalysisStatus.NOT_RUN,
        }),
      );
      expect(result.document.fraudAnalysisStatus).toBe(
        FraudAnalysisStatus.NOT_RUN,
      );
      // runFraudAnalysisInBackground starts by loading the document.
      expect(docRepo.findOne).not.toHaveBeenCalled();
      expect(fraudDetectionService.analyzeDocument).not.toHaveBeenCalled();
    });

    it('marks the check pending and queues it while AI is on', async () => {
      aiEnabled = true;

      await service.uploadDocument('u1', file, DocumentType.IDENTITY);
      await flush();

      expect(docRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fraudAnalysisStatus: FraudAnalysisStatus.PENDING,
        }),
      );
      expect(docRepo.findOne).toHaveBeenCalledWith({
        where: { _id: savedId },
      });
    });
  });

  describe('rerunFraudAnalysis', () => {
    it('refuses with 503 while AI is off, without touching the document', async () => {
      aiEnabled = false;

      await expect(
        service.rerunFraudAnalysis(savedId.toHexString()),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(docRepo.findOne).not.toHaveBeenCalled();
      expect(docRepo.save).not.toHaveBeenCalled();
    });

    it('re-queues the check while AI is on', async () => {
      aiEnabled = true;
      const doc = {
        _id: savedId,
        userId: 'u1',
        fraudAnalysisStatus: FraudAnalysisStatus.FAILED,
      };
      docRepo.findOne.mockResolvedValueOnce(doc).mockResolvedValue(null);

      const result = await service.rerunFraudAnalysis(savedId.toHexString());
      await flush();

      expect(doc.fraudAnalysisStatus).toBe(FraudAnalysisStatus.PENDING);
      expect(docRepo.save).toHaveBeenCalledWith(doc);
      expect(result).toEqual({
        message: 'Fraud analysis re-queued',
        documentId: savedId.toHexString(),
      });
    });
  });
});
