// ===========================================
// SmartProperty - Verification Service
// ===========================================

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { MailerService } from '@nestjs-modules/mailer';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectId } from 'mongodb';
import { MongoRepository } from 'typeorm';
import { NotificationType } from '../notifications/entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { MinioService } from '../upload/minio.service';
import { UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
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
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
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

    // Notify super admins when a tenant submits verification
    try {
      const tenant = await this.usersService.findById(userId);
      const tenantName = `${tenant?.firstName ?? ''} ${tenant?.lastName ?? ''}`
        .trim()
        .replace(/^\s+|\s+$/g, '');
      const label = tenantName || tenant?.email || userId;

      const superAdmins = await this.usersService.findByRole(
        UserRole.SUPER_ADMIN,
      );

      await Promise.all(
        superAdmins.map(async (admin) => {
          const adminId =
            (admin as any)?.id ||
            (admin as any)?._id?.toHexString?.() ||
            (admin as any)?._id?.toString?.();

          if (!adminId) return;

          await this.notificationsService.create({
            userId: adminId,
            title: 'New Verification Request',
            message: `${label} submitted a verification request.`,
            type: NotificationType.INFO,
            link: '/super-administrator/verifications',
          });

          await this.notificationsService.sendPushNotification(
            adminId,
            'New Verification Request',
            `${label} submitted a verification request.`,
          );
        }),
      );
    } catch (error) {
      this.logger.warn(`Failed to notify super admins: ${error}`);
    }

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

      let tenantName: string | null = null;
      let tenantAvatar: string | null = null;
      try {
        const user = await this.usersService.findById(v.userId);
        tenantName = `${user.firstName} ${user.lastName}`.trim();
        tenantAvatar = user.avatar ?? null;
      } catch {
        tenantName = null;
        tenantAvatar = null;
      }

      result.push({
        id: v._id?.toHexString() || v.id,
        userId: v.userId,
        tenantName,
        tenantAvatar,
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

    // Send email & notification
    await this.sendVerificationStatusEmail(verification.userId, 'approved');
    await this.notificationsService.create({
      userId: verification.userId,
      title: 'Account Verified ✅',
      message:
        'Congratulations! Your account has been verified by our admin team. You now have full access to all features.',
      type: NotificationType.VERIFICATION_APPROVED,
      link: '/dashboard',
    });

    await this.notificationsService.sendPushNotification(
      verification.userId,
      'Account Verified ✅',
      'Congratulations! Your account has been verified by our admin team. You now have full access to all features.',
    );

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

    // Send email & notification
    await this.sendVerificationStatusEmail(
      verification.userId,
      'rejected',
      reason,
    );
    await this.notificationsService.create({
      userId: verification.userId,
      title: 'Verification Rejected ❌',
      message: `Your verification request has been rejected. Reason: ${reason}. You can re-submit your documents.`,
      type: NotificationType.VERIFICATION_REJECTED,
      link: '/dashboard',
    });

    await this.notificationsService.sendPushNotification(
      verification.userId,
      'Verification Rejected ❌',
      `Your verification request has been rejected. Reason: ${reason}. You can re-submit your documents.`,
    );

    return this.getVerificationStatus(verification.userId);
  }

  // ─── Helper: Send verification status email ────────────
  private async sendVerificationStatusEmail(
    userId: string,
    status: 'approved' | 'rejected',
    reason?: string,
  ) {
    try {
      const user = await this.usersService.findById(userId);
      if (!user?.email) {
        this.logger.warn(`Cannot send email: user ${userId} not found`);
        return;
      }

      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:5173';
      const dashboardUrl = `${frontendUrl}/dashboard`;
      const name = user.firstName || user.email;

      if (status === 'approved') {
        await this.mailerService.sendMail({
          to: user.email,
          subject: '✅ Your SmartProperty Account is Verified!',
          template: 'verification-approved',
          context: {
            name,
            dashboardUrl,
            year: new Date().getFullYear(),
          },
        });
      } else {
        await this.mailerService.sendMail({
          to: user.email,
          subject: '❌ SmartProperty Verification Update',
          template: 'verification-rejected',
          context: {
            name,
            reason: reason || 'No reason provided',
            dashboardUrl,
            year: new Date().getFullYear(),
          },
        });
      }

      this.logger.log(`Verification ${status} email sent to ${user.email}`);
    } catch (err) {
      this.logger.error(
        `Failed to send verification ${status} email to user ${userId}`,
        err,
      );
    }
  }
}
