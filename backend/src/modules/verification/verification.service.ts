// ===========================================
// SmartProperty - Verification Service
// ===========================================

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectId } from 'mongodb';
import { MongoRepository } from 'typeorm';
import { MinioService } from '../upload/minio.service';
import {
  DocumentType,
  TenantVerification,
  VerificationDocument,
  VerificationStatus,
} from './entities/verification.entity';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    @InjectRepository(VerificationDocument)
    private readonly docRepo: MongoRepository<VerificationDocument>,
    @InjectRepository(TenantVerification)
    private readonly verificationRepo: MongoRepository<TenantVerification>,
    private readonly minioService: MinioService,
  ) {}

  // ─── Get or create tenant verification record ──────────
  async getVerificationStatus(userId: string) {
    let verification = await this.verificationRepo.findOne({
      where: { userId },
    });

    if (!verification) {
      verification = this.verificationRepo.create({
        userId,
        overallStatus: VerificationStatus.NOT_SUBMITTED,
      });
      verification = await this.verificationRepo.save(verification);
    }

    const documents = await this.docRepo.find({ where: { userId } });

    const identityDocuments = documents.filter(
      (d) => d.type === DocumentType.IDENTITY,
    );
    const incomeDocuments = documents.filter(
      (d) => d.type === DocumentType.PROOF_OF_INCOME,
    );

    return {
      id: verification._id?.toHexString() || verification.id,
      userId: verification.userId,
      identityDocuments: identityDocuments.map((d) => this.mapDocument(d)),
      incomeDocuments: incomeDocuments.map((d) => this.mapDocument(d)),
      overallStatus: verification.overallStatus,
      submittedAt: verification.submittedAt?.toISOString(),
      verifiedAt: verification.verifiedAt?.toISOString(),
      updatedAt: verification.updatedAt?.toISOString(),
    };
  }

  // ─── Upload document ───────────────────────────────────
  async uploadDocument(
    userId: string,
    file: Express.Multer.File,
    type: DocumentType,
  ) {
    // Upload to MinIO/S3
    const folder = `verification/${userId}/${type}`;
    const uploaded = await this.minioService.uploadFile(file, { folder });

    // Save document record
    const doc = this.docRepo.create({
      userId,
      type,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      key: uploaded.key,
      url: uploaded.url,
      status: VerificationStatus.PENDING,
    });

    const saved = await this.docRepo.save(doc);

    // Ensure a tenant verification record exists
    const existing = await this.verificationRepo.findOne({
      where: { userId },
    });
    if (!existing) {
      const newVerification = this.verificationRepo.create({
        userId,
        overallStatus: VerificationStatus.NOT_SUBMITTED,
      });
      await this.verificationRepo.save(newVerification);
    }

    this.logger.log(
      `Document uploaded: ${file.originalname} (${type}) for user ${userId}`,
    );

    return {
      document: this.mapDocument(saved),
      message: 'Document uploaded successfully',
    };
  }

  // ─── Delete document ───────────────────────────────────
  async deleteDocument(userId: string, documentId: string) {
    const doc = await this.docRepo.findOne({
      where: { _id: new ObjectId(documentId) },
    });

    if (!doc || doc.userId !== userId) {
      throw new NotFoundException('Document not found');
    }

    if (doc.status === VerificationStatus.VERIFIED) {
      throw new BadRequestException('Cannot delete a verified document');
    }

    // Delete from storage
    try {
      await this.minioService.deleteFile(doc.key);
    } catch (err) {
      this.logger.warn(`Failed to delete file from storage: ${doc.key}`, err);
    }

    await this.docRepo.delete(doc._id);
    this.logger.log(`Document deleted: ${doc.fileName} for user ${userId}`);
  }

  // ─── Get all documents for a user ──────────────────────
  async getDocuments(userId: string) {
    const documents = await this.docRepo.find({ where: { userId } });
    return documents.map((d) => this.mapDocument(d));
  }

  // ─── Submit for review ─────────────────────────────────
  async submitForReview(userId: string) {
    const documents = await this.docRepo.find({ where: { userId } });

    const hasIdentity = documents.some((d) => d.type === DocumentType.IDENTITY);
    const hasIncome = documents.some(
      (d) => d.type === DocumentType.PROOF_OF_INCOME,
    );

    if (!hasIdentity || !hasIncome) {
      throw new BadRequestException(
        'Both identity document and proof of income are required',
      );
    }

    // Update verification status
    let verification = await this.verificationRepo.findOne({
      where: { userId },
    });

    if (!verification) {
      verification = this.verificationRepo.create({
        userId,
        overallStatus: VerificationStatus.PENDING,
        submittedAt: new Date(),
      });
    } else {
      verification.overallStatus = VerificationStatus.PENDING;
      verification.submittedAt = new Date();
    }

    await this.verificationRepo.save(verification);

    // Mark all pending docs as under review
    for (const doc of documents) {
      if (doc.status === VerificationStatus.PENDING) {
        doc.status = VerificationStatus.UNDER_REVIEW;
        await this.docRepo.save(doc);
      }
    }

    this.logger.log(`Verification submitted for user ${userId}`);

    return this.getVerificationStatus(userId);
  }

  // ─── Helper: map document entity to DTO ────────────────
  private mapDocument(doc: VerificationDocument) {
    return {
      id: doc._id?.toHexString() || (doc as any).id,
      type: doc.type,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      url: doc.url,
      status: doc.status,
      uploadedAt: doc.uploadedAt?.toISOString?.() || doc.uploadedAt,
      reviewedAt: doc.reviewedAt?.toISOString?.() || doc.reviewedAt,
      rejectionReason: doc.rejectionReason,
    };
  }

  // ─── ADMIN: Get all pending verifications ──────────────
  async getAllVerifications(status?: VerificationStatus) {
    const where: Record<string, any> = {};
    if (status) {
      where.overallStatus = status;
    }

    const verifications = await this.verificationRepo.find({ where });
    const result: any[] = [];

    for (const v of verifications) {
      const documents = await this.docRepo.find({
        where: { userId: v.userId },
      });

      result.push({
        id: v._id?.toHexString() || v.id,
        userId: v.userId,
        overallStatus: v.overallStatus,
        submittedAt: v.submittedAt?.toISOString(),
        verifiedAt: v.verifiedAt?.toISOString(),
        createdAt: v.createdAt?.toISOString(),
        updatedAt: v.updatedAt?.toISOString(),
        documents: documents.map((d) => this.mapDocument(d)),
      });
    }

    return result;
  }

  // ─── ADMIN: Approve verification ───────────────────────
  async approveVerification(verificationId: string) {
    const verification = await this.verificationRepo.findOne({
      where: { _id: new ObjectId(verificationId) },
    });

    if (!verification) {
      throw new NotFoundException('Verification record not found');
    }

    verification.overallStatus = VerificationStatus.VERIFIED;
    verification.verifiedAt = new Date();
    await this.verificationRepo.save(verification);

    // Mark all documents as verified
    const documents = await this.docRepo.find({
      where: { userId: verification.userId },
    });
    for (const doc of documents) {
      doc.status = VerificationStatus.VERIFIED;
      doc.reviewedAt = new Date();
      await this.docRepo.save(doc);
    }

    this.logger.log(`Verification approved for user ${verification.userId}`);

    return this.getVerificationStatus(verification.userId);
  }

  // ─── ADMIN: Reject verification ────────────────────────
  async rejectVerification(verificationId: string, reason: string) {
    const verification = await this.verificationRepo.findOne({
      where: { _id: new ObjectId(verificationId) },
    });

    if (!verification) {
      throw new NotFoundException('Verification record not found');
    }

    verification.overallStatus = VerificationStatus.REJECTED;
    await this.verificationRepo.save(verification);

    // Mark all documents as rejected
    const documents = await this.docRepo.find({
      where: { userId: verification.userId },
    });
    for (const doc of documents) {
      doc.status = VerificationStatus.REJECTED;
      doc.reviewedAt = new Date();
      doc.rejectionReason = reason;
      await this.docRepo.save(doc);
    }

    this.logger.log(
      `Verification rejected for user ${verification.userId}: ${reason}`,
    );

    return this.getVerificationStatus(verification.userId);
  }
}
