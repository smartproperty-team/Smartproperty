// ===========================================
// SmartProperty - Applications Service
// ===========================================

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectId } from 'mongodb';
import { MongoRepository, Repository } from 'typeorm';
import { NotificationType } from '../notifications/entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Property } from '../properties/entities/property.entity';
import { MinioService } from '../upload/minio.service';
import { User, UserRole } from '../users/entities/user.entity';
import { hasPlatformAdminRole } from '../users/role-groups';
import {
  ListApplicationsQueryDto,
  RequestAdditionalDocumentsDto,
  ScheduleViewingDto,
  SubmitApplicationDto,
} from './dto/application.dto';
import { Application, ApplicationStatus } from './entities/application.entity';

@Injectable()
export class ApplicationsService {
  private static readonly REVIEWER_ROLES = new Set<UserRole>([
    UserRole.BRANCH_MANAGER,
    UserRole.REAL_ESTATE_AGENT,
    UserRole.RENTAL_MANAGER,
  ]);

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepo: MongoRepository<Application>,
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
    @InjectRepository(User)
    private readonly userRepo: MongoRepository<User>,
    private readonly minioService: MinioService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private parseObjectId(id: string, message: string): ObjectId {
    try {
      return new ObjectId(id);
    } catch {
      throw new NotFoundException(message);
    }
  }

  private normalizeId(value: unknown): string | undefined {
    if (!value) {
      return undefined;
    }

    if (typeof value === 'string') {
      return value;
    }

    if (value instanceof ObjectId) {
      return value.toHexString();
    }

    if (
      typeof value === 'object' &&
      value !== null &&
      'toHexString' in value &&
      typeof (value as { toHexString?: unknown }).toHexString === 'function'
    ) {
      return (value as { toHexString: () => string }).toHexString();
    }

    return String(value);
  }

  private async findUserByLooseId(value: unknown): Promise<User | null> {
    const normalizedId = this.normalizeId(value);
    if (!normalizedId || !ObjectId.isValid(normalizedId)) {
      return null;
    }

    return this.userRepo.findOne({
      where: { _id: new ObjectId(normalizedId) },
    });
  }

  private canReviewApplication(
    application: Application,
    userId: string,
    role: UserRole,
  ): boolean {
    if (hasPlatformAdminRole(role)) {
      return true;
    }

    if (!ApplicationsService.REVIEWER_ROLES.has(role)) {
      return false;
    }

    const managerId = this.normalizeId(application.managerId);

    return managerId === userId;
  }

  private toStatusEvent(
    status: ApplicationStatus,
    changedBy: string,
    note?: string,
  ) {
    return {
      status,
      note,
      changedBy,
      changedAt: new Date(),
    };
  }

  private async notifyReviewers(
    application: Application,
    title: string,
    message: string,
    type: NotificationType = NotificationType.APPLICATION_STATUS_CHANGED,
  ) {
    const reviewerIds = Array.from(
      new Set(
        [this.normalizeId(application.managerId)].filter(
          (id): id is string => !!id,
        ),
      ),
    );

    await Promise.all(
      reviewerIds.map((userId) =>
        this.notificationsService.create({
          userId,
          title,
          message,
          type,
          link: `/applications/review?applicationId=${application.id}`,
        }),
      ),
    );
  }

  private async notifyTenantStatusChange(
    application: Application,
    title: string,
    message: string,
    type: NotificationType = NotificationType.APPLICATION_STATUS_CHANGED,
  ) {
    await this.notificationsService.create({
      userId: application.tenantId,
      title,
      message,
      type,
      link: `/applications?applicationId=${application.id}`,
    });
  }

  async submitApplication(
    tenantId: string,
    dto: SubmitApplicationDto,
  ): Promise<Application> {
    const propertyObjectId = this.parseObjectId(
      dto.propertyId,
      'Property not found',
    );

    const property = await this.propertyRepo.findOne({
      where: { _id: propertyObjectId },
    });
    if (!property || property.deletedAt) {
      throw new NotFoundException('Property not found');
    }

    const existing = await this.applicationRepo.findOne({
      where: {
        propertyId: dto.propertyId,
        tenantId,
        deletedAt: null,
        status: {
          $in: [
            ApplicationStatus.SUBMITTED,
            ApplicationStatus.UNDER_REVIEW,
            ApplicationStatus.DOCUMENTS_REQUESTED,
            ApplicationStatus.VIEWING_SCHEDULED,
          ],
        } as any,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'You already have an active application for this property',
      );
    }

    const normalizedOwnerId = this.normalizeId(property.ownerId);
    if (!normalizedOwnerId) {
      throw new BadRequestException('Property owner is missing.');
    }

    const normalizedManagerId = this.normalizeId(property.managerId);
    let resolvedManagerId = normalizedManagerId;

    if (!resolvedManagerId) {
      const owner = await this.findUserByLooseId(property.ownerId);
      const ownerRole = owner?.role;

      if (
        ownerRole === UserRole.BRANCH_MANAGER ||
        ownerRole === UserRole.REAL_ESTATE_AGENT ||
        ownerRole === UserRole.RENTAL_MANAGER
      ) {
        const normalizedFallbackManagerId = this.normalizeId(property.ownerId);
        if (normalizedFallbackManagerId) {
          resolvedManagerId = normalizedFallbackManagerId;
          property.managerId = normalizedFallbackManagerId;
          await this.propertyRepo.save(property);
        }
      }
    }

    if (!resolvedManagerId) {
      throw new BadRequestException(
        'No responsible agent/manager is assigned to this property yet.',
      );
    }

    const application = this.applicationRepo.create({
      propertyId: dto.propertyId,
      tenantId,
      ownerId: normalizedOwnerId,
      managerId: resolvedManagerId,
      status: ApplicationStatus.SUBMITTED,
      employmentInfo: dto.employmentInfo,
      references: dto.references || [],
      messageToOwner: dto.messageToOwner,
      questionnaire: dto.questionnaire,
      applicationDeadline: dto.applicationDeadline
        ? new Date(dto.applicationDeadline)
        : undefined,
      statusHistory: [
        this.toStatusEvent(
          ApplicationStatus.SUBMITTED,
          tenantId,
          'Application submitted by tenant',
        ),
      ],
      documents: [],
      requestedDocuments: [],
    });

    const saved = await this.applicationRepo.save(application);

    const ownerMessage = dto.messageToOwner?.trim();

    await this.notifyReviewers(
      saved,
      'New rental application',
      ownerMessage
        ? `A tenant submitted a rental application. Note: ${ownerMessage}`
        : 'A new rental application was submitted for your property.',
      NotificationType.APPLICATION_SUBMITTED,
    );

    await this.notifyTenantStatusChange(
      saved,
      'Application submitted',
      'Your rental application was submitted successfully.',
    );

    return saved;
  }

  async uploadDocument(
    applicationId: string,
    userId: string,
    role: UserRole,
    file: Express.Multer.File,
    category?: string,
  ): Promise<Application> {
    const application = await this.findById(applicationId);

    const isTenantOwner = application.tenantId === userId;
    const isReviewer = this.canReviewApplication(application, userId, role);

    if (!isTenantOwner && !isReviewer) {
      throw new ForbiddenException(
        'You do not have access to this application',
      );
    }

    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const uploaded = await this.minioService.uploadFile(file, {
      folder: `applications/${application.id}`,
      metadata: {
        'Application-Id': application.id,
        'Uploaded-By': userId,
      },
    });

    const documents = application.documents || [];
    documents.push({
      id: new ObjectId().toHexString(),
      name: uploaded.originalName,
      mimeType: uploaded.mimeType,
      size: uploaded.size,
      key: uploaded.key,
      url: uploaded.url,
      category: category || 'supporting_document',
      uploadedAt: new Date(),
      uploadedBy: userId,
    });

    application.documents = documents;

    // Auto-move from docs requested back to review once tenant adds documents.
    if (
      isTenantOwner &&
      application.status === ApplicationStatus.DOCUMENTS_REQUESTED
    ) {
      application.status = ApplicationStatus.UNDER_REVIEW;
      application.statusHistory = [
        ...(application.statusHistory || []),
        this.toStatusEvent(
          ApplicationStatus.UNDER_REVIEW,
          userId,
          'Tenant uploaded requested documents',
        ),
      ];
    }

    const updated = await this.applicationRepo.save(application);

    if (isTenantOwner) {
      await this.notifyReviewers(
        updated,
        'Application document uploaded',
        'The tenant uploaded additional documents for an application.',
      );
    }

    return updated;
  }

  async findById(id: string): Promise<Application> {
    const objectId = this.parseObjectId(id, 'Application not found');

    const application = await this.applicationRepo.findOne({
      where: { _id: objectId },
    });

    if (!application || application.deletedAt) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  async getMyApplications(
    tenantId: string,
    query: ListApplicationsQueryDto,
  ): Promise<{
    applications: Application[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Number.isFinite(query.page) ? Number(query.page) : 1;
    const limit = Number.isFinite(query.limit) ? Number(query.limit) : 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.propertyId) {
      where.propertyId = query.propertyId;
    }

    const [applications, total] = await this.applicationRepo.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const enrichedApplications = await Promise.all(
      applications.map(async (app) => {
        const applicationData = app.toJSON() as any;

        // Fetch property details
        try {
          const property = await this.propertyRepo.findOne({
            where: { _id: new ObjectId(app.propertyId) },
          });

          if (property) {
            const address = property.address;
            applicationData.propertyTitle = property.title;
            applicationData.propertyAddress =
              `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`.trim();
            applicationData.propertyPrice = property.price;

            const owner = await this.findUserByLooseId(property.ownerId);
            if (owner) {
              applicationData.ownerName =
                `${owner.firstName} ${owner.lastName}`.trim() || owner.email;
            }
          }
        } catch {
          // Keep user-friendly fallback values when lookup fails
          applicationData.propertyTitle =
            applicationData.propertyTitle || app.propertyId;
        }

        if (!applicationData.ownerName) {
          const owner = await this.findUserByLooseId(app.ownerId);
          if (owner) {
            applicationData.ownerName =
              `${owner.firstName} ${owner.lastName}`.trim() || owner.email;
          }
        }

        return applicationData;
      }),
    );

    return {
      applications: enrichedApplications,
      total,
      page,
      limit,
    };
  }

  async withdrawApplication(
    applicationId: string,
    tenantId: string,
    reason?: string,
  ): Promise<Application> {
    const application = await this.findById(applicationId);

    if (application.tenantId !== tenantId) {
      throw new ForbiddenException(
        'You can only withdraw your own application',
      );
    }

    if (
      application.status === ApplicationStatus.APPROVED ||
      application.status === ApplicationStatus.REJECTED ||
      application.status === ApplicationStatus.WITHDRAWN
    ) {
      throw new BadRequestException(
        'This application can no longer be withdrawn',
      );
    }

    application.status = ApplicationStatus.WITHDRAWN;
    application.withdrawnAt = new Date();
    application.withdrawnReason = reason;
    application.statusHistory = [
      ...(application.statusHistory || []),
      this.toStatusEvent(ApplicationStatus.WITHDRAWN, tenantId, reason),
    ];

    const updated = await this.applicationRepo.save(application);

    await this.notifyReviewers(
      updated,
      'Application withdrawn',
      'The tenant withdrew their rental application.',
    );

    await this.notifyTenantStatusChange(
      updated,
      'Application withdrawn',
      'Your rental application has been withdrawn.',
    );

    return updated;
  }

  async getReceivedApplications(
    reviewerId: string,
    role: UserRole,
    query: ListApplicationsQueryDto,
  ): Promise<{
    applications: Application[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Number.isFinite(query.page) ? Number(query.page) : 1;
    const limit = Number.isFinite(query.limit) ? Number(query.limit) : 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      deletedAt: null,
      status: { $ne: ApplicationStatus.WITHDRAWN } as any,
    };

    if (!hasPlatformAdminRole(role)) {
      const idFilters: Array<Record<string, unknown>> = [
        { managerId: reviewerId },
      ];

      if (ObjectId.isValid(reviewerId)) {
        const reviewerObjectId = new ObjectId(reviewerId);
        idFilters.push({ managerId: reviewerObjectId });
      }

      where.$or = idFilters;
    }

    if (query.status) {
      if (query.status === ApplicationStatus.WITHDRAWN) {
        return {
          applications: [],
          total: 0,
          page,
          limit,
        };
      }

      where.status = query.status;
    }

    if (query.propertyId) {
      where.propertyId = query.propertyId;
    }

    const [applications, total] = await this.applicationRepo.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    // Enrich applications with tenant name and property details
    const enrichedApplications = await Promise.all(
      applications.map(async (app) => {
        const applicationData = app.toJSON() as any;

        // Fetch tenant details
        try {
          const tenant = await this.userRepo.findOne({
            where: { _id: new ObjectId(app.tenantId) },
          });
          if (tenant) {
            applicationData.tenantName =
              `${tenant.firstName} ${tenant.lastName}`.trim() || tenant.email;
            applicationData.tenantEmail = tenant.email;
            applicationData.tenantPhone = tenant.phone;
          }
        } catch (e) {
          // If tenant lookup fails, use tenantId as fallback
          applicationData.tenantName = app.tenantId;
        }

        // Fetch property details
        try {
          const property = await this.propertyRepo.findOne({
            where: { _id: new ObjectId(app.propertyId) },
          });
          if (property) {
            const address = property.address;
            applicationData.propertyTitle = property.title;
            applicationData.propertyAddress =
              `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`.trim();
            applicationData.propertyPrice = property.price;
          }
        } catch (e) {
          // If property lookup fails, use propertyId as fallback
          applicationData.propertyTitle = app.propertyId;
        }

        // Fetch owner details
        const owner = await this.findUserByLooseId(app.ownerId);
        if (owner) {
          applicationData.ownerName =
            `${owner.firstName} ${owner.lastName}`.trim() || owner.email;
        } else {
          // Friendly fallback if owner lookup fails
          applicationData.ownerName = 'Property owner';
        }

        return applicationData;
      }),
    );

    return {
      applications: enrichedApplications,
      total,
      page,
      limit,
    };
  }

  async getApplicationDetails(
    applicationId: string,
    userId: string,
    role: UserRole,
  ): Promise<Application> {
    const application = await this.findById(applicationId);

    const canView =
      application.tenantId === userId ||
      this.canReviewApplication(application, userId, role);

    if (!canView) {
      throw new ForbiddenException(
        'You do not have access to this application',
      );
    }

    return application;
  }

  async requestAdditionalDocuments(
    applicationId: string,
    reviewerId: string,
    role: UserRole,
    dto: RequestAdditionalDocumentsDto,
  ): Promise<Application> {
    const application = await this.findById(applicationId);

    if (!this.canReviewApplication(application, reviewerId, role)) {
      throw new ForbiddenException(
        'You do not have access to this application',
      );
    }

    if (application.status === ApplicationStatus.WITHDRAWN) {
      throw new BadRequestException(
        'Cannot request documents on a withdrawn application',
      );
    }

    application.status = ApplicationStatus.DOCUMENTS_REQUESTED;
    application.requestedDocuments = Array.from(
      new Set([
        ...(application.requestedDocuments || []),
        ...dto.requestedDocuments,
      ]),
    );

    if (dto.applicationDeadline) {
      application.applicationDeadline = new Date(dto.applicationDeadline);
      application.deadlineReminderSentAt = undefined;
    }

    application.statusHistory = [
      ...(application.statusHistory || []),
      this.toStatusEvent(
        ApplicationStatus.DOCUMENTS_REQUESTED,
        reviewerId,
        dto.note,
      ),
    ];

    const updated = await this.applicationRepo.save(application);

    await this.notifyTenantStatusChange(
      updated,
      'Additional documents requested',
      dto.note ||
        'The property manager requested additional documents for your application.',
      NotificationType.APPLICATION_DOCUMENT_REQUESTED,
    );

    return updated;
  }

  async approveApplication(
    applicationId: string,
    reviewerId: string,
    role: UserRole,
  ): Promise<Application> {
    const application = await this.findById(applicationId);

    if (!this.canReviewApplication(application, reviewerId, role)) {
      throw new ForbiddenException(
        'You do not have access to this application',
      );
    }

    application.status = ApplicationStatus.APPROVED;
    application.rejectionReason = undefined;
    application.statusHistory = [
      ...(application.statusHistory || []),
      this.toStatusEvent(ApplicationStatus.APPROVED, reviewerId),
    ];

    const updated = await this.applicationRepo.save(application);

    await this.notifyTenantStatusChange(
      updated,
      'Application approved',
      'Your rental application has been approved.',
    );

    return updated;
  }

  async rejectApplication(
    applicationId: string,
    reviewerId: string,
    role: UserRole,
    reason: string,
  ): Promise<Application> {
    const application = await this.findById(applicationId);

    if (!this.canReviewApplication(application, reviewerId, role)) {
      throw new ForbiddenException(
        'You do not have access to this application',
      );
    }

    application.status = ApplicationStatus.REJECTED;
    application.rejectionReason = reason;
    application.statusHistory = [
      ...(application.statusHistory || []),
      this.toStatusEvent(ApplicationStatus.REJECTED, reviewerId, reason),
    ];

    const updated = await this.applicationRepo.save(application);

    await this.notifyTenantStatusChange(
      updated,
      'Application rejected',
      `Your rental application was rejected. Reason: ${reason}`,
    );

    return updated;
  }

  async scheduleViewing(
    applicationId: string,
    reviewerId: string,
    role: UserRole,
    dto: ScheduleViewingDto,
  ): Promise<Application> {
    const application = await this.findById(applicationId);

    if (!this.canReviewApplication(application, reviewerId, role)) {
      throw new ForbiddenException(
        'You do not have access to this application',
      );
    }

    application.status = ApplicationStatus.VIEWING_SCHEDULED;
    application.viewingSchedule = {
      scheduledAt: new Date(dto.scheduledAt),
      location: dto.location,
      notes: dto.notes,
      scheduledBy: reviewerId,
    };

    application.statusHistory = [
      ...(application.statusHistory || []),
      this.toStatusEvent(
        ApplicationStatus.VIEWING_SCHEDULED,
        reviewerId,
        dto.notes || 'Property viewing scheduled',
      ),
    ];

    const updated = await this.applicationRepo.save(application);

    await this.notifyTenantStatusChange(
      updated,
      'Property viewing scheduled',
      `A property viewing has been scheduled for ${new Date(dto.scheduledAt).toLocaleString()}.`,
    );

    return updated;
  }

  async triggerDeadlineReminders(): Promise<{ reminded: number }> {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const toRemind = await this.applicationRepo.find({
      where: {
        status: {
          $in: [
            ApplicationStatus.SUBMITTED,
            ApplicationStatus.DOCUMENTS_REQUESTED,
            ApplicationStatus.UNDER_REVIEW,
          ],
        } as any,
        applicationDeadline: { $lte: in24Hours, $gte: now } as any,
        deadlineReminderSentAt: null,
        deletedAt: null,
      },
    });

    for (const application of toRemind) {
      await this.notificationsService.create({
        userId: application.tenantId,
        title: 'Application deadline reminder',
        message:
          'Your rental application deadline is approaching. Please complete any pending steps.',
        type: NotificationType.APPLICATION_DEADLINE_REMINDER,
        link: `/applications?applicationId=${application.id}`,
      });

      application.deadlineReminderSentAt = new Date();
      await this.applicationRepo.save(application);
    }

    return { reminded: toRemind.length };
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendDailyDeadlineReminders() {
    await this.triggerDeadlineReminders();
  }
}
