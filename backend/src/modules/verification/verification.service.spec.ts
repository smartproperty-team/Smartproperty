// ===========================================
// VerificationService unit tests - AI switch
// ===========================================

import { ServiceUnavailableException } from '@nestjs/common';
import { ObjectId } from 'mongodb';

import {
  DocumentType,
  FraudAnalysisStatus,
  RiskLevel,
  VerificationStatus,
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
    uploadPrivateFile: jest.fn(async () => ({
      key: 'verification/u1/identity/id.jpg',
    })),
    getPrivateFileUrl: jest.fn(
      async (key: string) => `https://signed.example/${key}`,
    ),
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

describe('VerificationService.submitForReview - admin notification', () => {
  const notificationsService = {
    create: jest.fn(),
    sendPushNotification: jest.fn(),
  };
  const usersService = { findById: jest.fn(), findByRole: jest.fn() };

  const build = () =>
    new VerificationService(
      {
        find: jest.fn(async () => [
          { type: DocumentType.IDENTITY, status: 'verified' },
          { type: DocumentType.PROOF_OF_INCOME, status: 'verified' },
        ]),
        save: jest.fn(),
      } as any,
      {
        findOne: jest.fn(async () => ({ userId: 'u1' })),
        save: jest.fn(),
      } as any,
      {
        getPrivateFileUrl: jest.fn(async () => 'https://signed.example/doc'),
      } as any,
      {} as any,
      { get: jest.fn() } as any,
      usersService as any,
      notificationsService as any,
      {} as any,
    );

  const notifiedMessage = () =>
    notificationsService.create.mock.calls[0][0].message as string;

  beforeEach(() => {
    jest.clearAllMocks();
    usersService.findByRole.mockResolvedValue([{ id: 'admin-1' }]);
  });

  it('names the tenant by first and last name', async () => {
    usersService.findById.mockResolvedValue({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
    });

    await build().submitForReview('u1');

    expect(notifiedMessage()).toBe(
      'Ada Lovelace submitted a verification request.',
    );
    expect(notificationsService.sendPushNotification).toHaveBeenCalledWith(
      'admin-1',
      'New Verification Request',
      'Ada Lovelace submitted a verification request.',
    );
  });

  it('falls back to the email when the tenant has no name', async () => {
    usersService.findById.mockResolvedValue({ email: 'ada@example.com' });

    await build().submitForReview('u1');

    expect(notifiedMessage()).toBe(
      'ada@example.com submitted a verification request.',
    );
  });
});

describe('VerificationService - private document storage', () => {
  const docId = new ObjectId();
  const key = 'verification/u1/identity/id.jpg';
  const signed = `https://signed.example/${key}?X-Amz-Expires=600`;
  const stored = {
    _id: docId,
    userId: 'u1',
    type: DocumentType.IDENTITY,
    fileName: 'id.jpg',
    key,
    // Left over from when documents were public.
    url: `https://pub.example/${key}`,
    status: VerificationStatus.PENDING,
  };
  const file = {
    originalname: 'id.jpg',
    size: 2048,
    mimetype: 'image/jpeg',
  } as Express.Multer.File;

  let aiEnabled: boolean;
  const docRepo = {
    create: jest.fn((doc: Record<string, unknown>) => doc),
    save: jest.fn(async (doc: Record<string, unknown>) => ({
      ...doc,
      _id: docId,
    })),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  } as any;
  const verificationRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((v: Record<string, unknown>) => v),
    save: jest.fn(async (v: Record<string, unknown>) => v),
  } as any;
  const minioService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    uploadPrivateFile: jest.fn(async () => ({ key })),
    getPrivateFileUrl: jest.fn(async () => signed),
    deletePrivateFile: jest.fn(),
  } as any;
  const fraudDetectionService = { analyzeDocument: jest.fn() } as any;

  const service = new VerificationService(
    docRepo,
    verificationRepo,
    minioService,
    {} as any,
    {
      get: jest.fn((k: string) =>
        k === 'app.aiService.enabled' ? aiEnabled : undefined,
      ),
    } as any,
    { findById: jest.fn(async () => ({ firstName: 'Ada' })) } as any,
    {} as any,
    fraudDetectionService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    aiEnabled = false;
    docRepo.find.mockResolvedValue([{ ...stored }]);
    docRepo.findOne.mockResolvedValue({ ...stored });
    verificationRepo.find.mockResolvedValue([
      { _id: new ObjectId(), userId: 'u1' },
    ]);
    verificationRepo.findOne.mockResolvedValue({ userId: 'u1' });
  });

  it('stores uploads in the private bucket and keeps no public link', async () => {
    const result = await service.uploadDocument(
      'u1',
      file,
      DocumentType.IDENTITY,
    );

    expect(minioService.uploadPrivateFile).toHaveBeenCalledWith(file, {
      folder: 'verification/u1/identity',
    });
    expect(minioService.uploadFile).not.toHaveBeenCalled();
    expect(docRepo.create.mock.calls[0][0]).not.toHaveProperty('url');
    expect(result.document.url).toBe(signed);
  });

  it('gives the owner signed links, never the old public link', async () => {
    const documents = await service.getDocuments('u1');
    const status = await service.getVerificationStatus('u1');

    expect(documents[0].url).toBe(signed);
    expect(status.identityDocuments[0].url).toBe(signed);
    expect(minioService.getPrivateFileUrl).toHaveBeenCalledWith(key);
    expect(JSON.stringify([documents, status])).not.toContain('pub.example');
  });

  it('gives reviewers signed links, never the old public link', async () => {
    const [verification] = await service.getAllVerifications();

    expect(verification.documents[0].url).toBe(signed);
    expect(JSON.stringify(verification)).not.toContain('pub.example');
  });

  it('deletes the file from the private bucket', async () => {
    await service.deleteDocument('u1', docId.toHexString());

    expect(minioService.deletePrivateFile).toHaveBeenCalledWith(key);
    expect(minioService.deleteFile).not.toHaveBeenCalled();
    expect(docRepo.delete).toHaveBeenCalledWith(docId);
  });

  it('sends the fraud check a signed link while AI is on', async () => {
    aiEnabled = true;
    fraudDetectionService.analyzeDocument.mockResolvedValue({
      fraudScore: 5,
      riskLevel: RiskLevel.LOW,
      flags: [],
      analyzedAt: new Date(),
    });

    await service.rerunFraudAnalysis(docId.toHexString());
    for (
      let i = 0;
      i < 10 && fraudDetectionService.analyzeDocument.mock.calls.length === 0;
      i++
    ) {
      await new Promise((resolve) => setImmediate(resolve));
    }

    expect(fraudDetectionService.analyzeDocument).toHaveBeenCalledWith(
      expect.objectContaining({ fileUrl: signed }),
    );
  });
});
