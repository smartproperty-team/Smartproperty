import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectId } from 'mongodb';
import { MongoRepository } from 'typeorm';
import { NotificationType } from '../notifications/entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AssignMaintenanceRequestDto,
  CreateMaintenanceRequestDto,
  RecordMaintenanceOutcomeDto,
  SubmitServiceReportDto,
  UpdateMaintenanceStatusDto,
  UpdateProviderMaintenanceStatusDto,
} from './dto/maintenance-request.dto';
import {
  MaintenancePriority,
  MaintenanceRequest,
  MaintenanceStatus,
} from './entities/maintenance-request.entity';

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    @InjectRepository(MaintenanceRequest)
    private readonly maintenanceRepo: MongoRepository<MaintenanceRequest>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private normalizeUserId(value: unknown): string | undefined {
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

  private getRequestLink(request: MaintenanceRequest): string {
    const requestId = request._id?.toHexString?.() || String(request._id);
    return `/maintenance/requests/mine?requestId=${requestId}`;
  }

  private async notifyRequester(
    request: MaintenanceRequest,
    title: string,
    message: string,
    type: NotificationType,
  ): Promise<void> {
    const requesterId = this.normalizeUserId(request.requesterId);

    if (!requesterId || request.isDraft === true) {
      return;
    }

    try {
      await this.notificationsService.create({
        userId: requesterId,
        title,
        message,
        type,
        link: this.getRequestLink(request),
      });
    } catch (error) {
      this.logger.warn(
        `Failed to create notification for maintenance request ${String(request._id)}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  private async findByIdOrFail(id: string): Promise<MaintenanceRequest> {
    if (!ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid request id');
    }

    const request = await this.maintenanceRepo.findOne({
      where: { _id: new ObjectId(id) },
    });

    if (!request) {
      throw new NotFoundException('Maintenance request not found');
    }

    return request;
  }

  private normalizeOwnerFilter(userId: string): Record<string, unknown> {
    const idVariants: Array<string | ObjectId> = [userId];

    if (ObjectId.isValid(userId)) {
      idVariants.push(new ObjectId(userId));
    }

    return {
      requesterId: { $in: idVariants },
    };
  }

  private normalizeAssigneeFilter(userId: string): Record<string, unknown> {
    const idVariants: Array<string | ObjectId> = [userId];

    if (ObjectId.isValid(userId)) {
      idVariants.push(new ObjectId(userId));
    }

    return {
      'assignment.assigneeId': { $in: idVariants },
    };
  }

  private readonly providerLockedStatuses: MaintenanceStatus[] = [
    MaintenanceStatus.COMPLETED,
    MaintenanceStatus.CLOSED,
    MaintenanceStatus.CANCELED,
    MaintenanceStatus.REJECTED,
  ];

  private assertProviderCanMutate(
    request: MaintenanceRequest,
    providerUserId: string,
  ): void {
    const assigneeId = request.assignment?.assigneeId;
    if (!assigneeId || String(assigneeId) !== String(providerUserId)) {
      throw new NotFoundException(
        'Assigned maintenance request not found for this service provider',
      );
    }

    if (this.providerLockedStatuses.includes(request.status)) {
      throw new BadRequestException(
        'This request is locked and can no longer be modified by the service provider',
      );
    }
  }

  private validateMediaFileConstraints(dto: CreateMaintenanceRequestDto): void {
    const mediaItems = dto.media || [];

    for (const file of mediaItems) {
      const type = file.mimeType || '';
      const isAllowed = type.startsWith('image/') || type.startsWith('video/');

      if (!isAllowed) {
        throw new BadRequestException(
          `Unsupported media type for ${file.fileName}. Only image/* and video/* are allowed.`,
        );
      }

      const isVideo = type.startsWith('video/');
      const maxBytes = isVideo ? 25 * 1024 * 1024 : 10 * 1024 * 1024;

      if (file.sizeBytes > maxBytes) {
        throw new BadRequestException(
          `${file.fileName} exceeds size limit (${isVideo ? '25MB for video' : '10MB for image'}).`,
        );
      }
    }
  }

  private validateSubmissionRules(dto: CreateMaintenanceRequestDto): void {
    const isDraft = dto.saveAsDraft === true;

    if (!dto.propertyId?.trim()) {
      throw new BadRequestException('Property selection is required.');
    }

    this.validateMediaFileConstraints(dto);

    if (dto.firstSeenAt && new Date(dto.firstSeenAt) > new Date()) {
      throw new BadRequestException('First seen date cannot be in the future.');
    }

    if (isDraft) {
      return;
    }

    if (!dto.issueTitle?.trim()) {
      throw new BadRequestException('Issue title is required.');
    }

    if (!dto.category) {
      throw new BadRequestException('Category is required.');
    }

    if (!dto.priority) {
      throw new BadRequestException('Priority is required.');
    }

    if (!dto.description?.trim()) {
      throw new BadRequestException('Description is required.');
    }

    const needsMedia =
      dto.priority === MaintenancePriority.HIGH ||
      dto.priority === MaintenancePriority.EMERGENCY ||
      dto.emergency === true;

    if (needsMedia && (!dto.media || dto.media.length === 0)) {
      throw new BadRequestException(
        'At least one media file is required for high or emergency requests.',
      );
    }

    if (dto.emergency && !dto.emergencyContact) {
      throw new BadRequestException(
        'Emergency contact is required when emergency is enabled.',
      );
    }
  }

  private omitUndefined<T extends Record<string, unknown>>(value: T): T {
    return Object.fromEntries(
      Object.entries(value).filter(
        ([, entryValue]) => entryValue !== undefined,
      ),
    ) as T;
  }

  private toResponse(request: MaintenanceRequest) {
    return {
      id: request._id?.toHexString?.() || String(request._id),
      requesterId: request.requesterId,
      requesterRole: request.requesterRole,
      propertyId: request.propertyId,
      issueTitle: request.issueTitle,
      category: request.category,
      priority: request.priority,
      emergency: request.emergency,
      description: request.description,
      locationInProperty: request.locationInProperty,
      firstSeenAt: request.firstSeenAt,
      isBlockingUsage: request.isBlockingUsage,
      media: request.media || [],
      preferredVisitWindows: request.preferredVisitWindows || [],
      contactPhone: request.contactPhone,
      entryPermission: request.entryPermission,
      emergencyContact: request.emergencyContact,
      assignment: request.assignment,
      status: request.status,
      statusReason: request.statusReason,
      costs: request.costs,
      resolutionNotes: request.resolutionNotes,
      closeReason: request.closeReason,
      closedAt: request.closedAt,
      serviceProviderReport: request.serviceProviderReport,
      isDraft: request.isDraft,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }

  async createRequest(
    dto: CreateMaintenanceRequestDto,
    requesterId: string,
    requesterRole: string,
  ) {
    this.validateSubmissionRules(dto);

    const request = this.maintenanceRepo.create(
      this.omitUndefined({
        requesterId,
        requesterRole,
        propertyId: dto.propertyId,
        issueTitle: dto.issueTitle?.trim(),
        category: dto.category,
        priority: dto.priority,
        emergency: dto.emergency === true,
        description: dto.description?.trim(),
        locationInProperty: dto.locationInProperty?.trim(),
        firstSeenAt: dto.firstSeenAt ? new Date(dto.firstSeenAt) : undefined,
        isBlockingUsage: dto.isBlockingUsage,
        media: dto.media,
        preferredVisitWindows: dto.preferredVisitWindows,
        contactPhone: dto.contactPhone?.trim(),
        entryPermission: dto.entryPermission,
        emergencyContact: dto.emergencyContact,
        status: MaintenanceStatus.SUBMITTED,
        isDraft: dto.saveAsDraft === true,
      }),
    );

    const saved = await this.maintenanceRepo.save(request);

    if (saved.isDraft !== true) {
      await this.notifyRequester(
        saved,
        'Maintenance request submitted',
        `Your request "${saved.issueTitle || 'Untitled issue'}" has been submitted successfully.`,
        NotificationType.MAINTENANCE_REQUEST_SUBMITTED,
      );
    }

    return this.toResponse(saved);
  }

  async findMine(userId: string) {
    const list = await this.maintenanceRepo.find({
      where: this.normalizeOwnerFilter(userId),
      order: { createdAt: 'DESC' },
    });

    return list.map((item) => this.toResponse(item));
  }

  async findAssignedToProvider(userId: string) {
    const list = await this.maintenanceRepo.find({
      where: this.normalizeAssigneeFilter(userId),
      order: { updatedAt: 'DESC' },
    });

    return list
      .filter((item) => item.isDraft !== true)
      .map((item) => this.toResponse(item));
  }

  async findAvailableForProvider() {
    const list = await this.maintenanceRepo.find({
      where: { isDraft: false },
      order: { createdAt: 'DESC' },
    });

    return list
      .filter((item) => !item.assignment?.assigneeId)
      .filter((item) =>
        [MaintenanceStatus.SUBMITTED, MaintenanceStatus.TRIAGED].includes(
          item.status,
        ),
      )
      .map((item) => this.toResponse(item));
  }

  async assignRequest(id: string, dto: AssignMaintenanceRequestDto) {
    const request = await this.findByIdOrFail(id);

    request.assignment = this.omitUndefined({
      assigneeId: dto.assigneeId,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      slaTargetHours: dto.slaTargetHours,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      internalNotes: dto.internalNotes,
    });

    request.status = dto.scheduledAt
      ? MaintenanceStatus.SCHEDULED
      : MaintenanceStatus.ASSIGNED;

    const saved = await this.maintenanceRepo.save(request);

    await this.notifyRequester(
      saved,
      'Maintenance request assigned',
      `Your request "${saved.issueTitle || 'Untitled issue'}" is now assigned to a service provider.`,
      NotificationType.MAINTENANCE_ASSIGNED,
    );

    return this.toResponse(saved);
  }

  async updateStatus(id: string, dto: UpdateMaintenanceStatusDto) {
    const request = await this.findByIdOrFail(id);

    request.status = dto.status;
    request.statusReason = dto.reason;

    if (
      dto.status === MaintenanceStatus.CLOSED ||
      dto.status === MaintenanceStatus.CANCELED ||
      dto.status === MaintenanceStatus.REJECTED
    ) {
      request.closedAt = new Date();
      request.closeReason = dto.reason;
    }

    const saved = await this.maintenanceRepo.save(request);

    await this.notifyRequester(
      saved,
      'Maintenance status updated',
      `Your request "${saved.issueTitle || 'Untitled issue'}" is now ${saved.status.replace('_', ' ')}.`,
      NotificationType.MAINTENANCE_STATUS_CHANGED,
    );

    return this.toResponse(saved);
  }

  async recordOutcome(id: string, dto: RecordMaintenanceOutcomeDto) {
    const request = await this.findByIdOrFail(id);

    request.costs = this.omitUndefined({
      labor: dto.laborCost,
      parts: dto.partsCost,
      other: dto.otherCost,
      total:
        dto.totalCost ??
        (dto.laborCost || 0) + (dto.partsCost || 0) + (dto.otherCost || 0),
    });

    request.resolutionNotes = dto.resolutionNotes;

    if (dto.closeReason) {
      request.closeReason = dto.closeReason;
      request.status = MaintenanceStatus.CLOSED;
      request.closedAt = new Date();
    }

    const saved = await this.maintenanceRepo.save(request);

    await this.notifyRequester(
      saved,
      'Maintenance outcome recorded',
      `The outcome for your request "${saved.issueTitle || 'Untitled issue'}" has been recorded. Current status: ${saved.status.replace('_', ' ')}.`,
      NotificationType.MAINTENANCE_STATUS_CHANGED,
    );

    return this.toResponse(saved);
  }

  async submitServiceReport(
    id: string,
    dto: SubmitServiceReportDto,
    actorUserId?: string,
    actorRole?: string,
  ) {
    const request = await this.findByIdOrFail(id);

    if (actorRole === 'service_provider' && actorUserId) {
      this.assertProviderCanMutate(request, actorUserId);
    }

    request.serviceProviderReport = this.omitUndefined({
      interventionStartedAt: dto.interventionStartedAt
        ? new Date(dto.interventionStartedAt)
        : undefined,
      interventionEndedAt: dto.interventionEndedAt
        ? new Date(dto.interventionEndedAt)
        : undefined,
      workPerformedSummary: dto.workPerformedSummary,
      reportMedia: dto.reportMedia,
      invoiceAmount: dto.invoiceAmount,
      invoiceReference: dto.invoiceReference,
      followUpRequired: dto.followUpRequired,
    });

    if (dto.workPerformedSummary) {
      request.status = MaintenanceStatus.COMPLETED;
    }

    const saved = await this.maintenanceRepo.save(request);

    if (dto.workPerformedSummary) {
      await this.notifyRequester(
        saved,
        'Maintenance completed',
        `Your request "${saved.issueTitle || 'Untitled issue'}" has been marked as completed by the service provider.`,
        NotificationType.MAINTENANCE_COMPLETED,
      );
    }

    return this.toResponse(saved);
  }

  async updateProviderStatus(
    id: string,
    providerUserId: string,
    dto: UpdateProviderMaintenanceStatusDto,
  ) {
    const request = await this.findByIdOrFail(id);

    this.assertProviderCanMutate(request, providerUserId);

    if (dto.status === MaintenanceStatus.CANCELED) {
      request.assignment = this.omitUndefined({
        ...(request.assignment || {}),
        assigneeId: undefined,
        dueDate: undefined,
        scheduledAt: undefined,
      });
      request.status = MaintenanceStatus.TRIAGED;
      request.statusReason = dto.reason
        ? `Released by provider: ${dto.reason}`
        : 'Released by service provider for reassignment';
      request.closedAt = undefined;
      request.closeReason = undefined;
    } else {
      request.status = dto.status;
      request.statusReason = dto.reason;
    }

    if (dto.status === MaintenanceStatus.COMPLETED) {
      request.closedAt = undefined;
    }

    const saved = await this.maintenanceRepo.save(request);

    if (dto.status === MaintenanceStatus.CANCELED) {
      await this.notifyRequester(
        saved,
        'Maintenance request reopened',
        `Your request "${saved.issueTitle || 'Untitled issue'}" was released by the current provider and is open for reassignment.`,
        NotificationType.MAINTENANCE_STATUS_CHANGED,
      );
    } else {
      await this.notifyRequester(
        saved,
        'Maintenance status updated',
        `Your request "${saved.issueTitle || 'Untitled issue'}" is now ${saved.status.replace('_', ' ')}.`,
        dto.status === MaintenanceStatus.COMPLETED
          ? NotificationType.MAINTENANCE_COMPLETED
          : NotificationType.MAINTENANCE_STATUS_CHANGED,
      );
    }

    return this.toResponse(saved);
  }

  async claimRequest(id: string, providerUserId: string) {
    const request = await this.findByIdOrFail(id);

    if (request.isDraft) {
      throw new BadRequestException('Cannot claim draft maintenance requests');
    }

    if (request.assignment?.assigneeId) {
      throw new BadRequestException('Request is already assigned');
    }

    request.assignment = this.omitUndefined({
      ...(request.assignment || {}),
      assigneeId: providerUserId,
    });
    request.status = MaintenanceStatus.ASSIGNED;

    const saved = await this.maintenanceRepo.save(request);

    await this.notifyRequester(
      saved,
      'Maintenance request assigned',
      `A service provider has claimed your request "${saved.issueTitle || 'Untitled issue'}".`,
      NotificationType.MAINTENANCE_ASSIGNED,
    );

    return this.toResponse(saved);
  }
}
