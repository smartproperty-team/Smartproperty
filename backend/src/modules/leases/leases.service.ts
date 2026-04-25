// ===========================================
// SmartProperty - Leases Service
// ===========================================

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectId } from 'mongodb';
import { MongoRepository, Repository } from 'typeorm';
import {
  Application,
  ApplicationStatus,
} from '../applications/entities/application.entity';
import { NotificationType } from '../notifications/entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import {
  Property,
  PropertyStatus,
} from '../properties/entities/property.entity';
import { MinioService } from '../upload/minio.service';
import { User, UserRole } from '../users/entities/user.entity';
import {
  hasPlatformAdminRole,
  LEASE_MANAGEMENT_ROLES,
} from '../users/role-groups';
import {
  CreateLeaseFromApplicationDto,
  LeaseDepositDto,
  LeaseInventoryDto,
  LeaseListQueryDto,
  LeaseOwnerDecisionDto,
  LeaseRenewalDto,
  LeaseSignatureDto,
  LeaseTerminationDto,
  UploadLeaseDocumentDto,
} from './dto/lease.dto';
import {
  Lease,
  LeaseDocumentType,
  LeaseInventoryPhase,
  LeaseStatus,
} from './entities/lease.entity';

interface LeaseReportTotals {
  count: number;
  totalMonthlyRent: number;
  currencies: Record<string, number>;
}

interface LeaseTemplatePayload extends Partial<Lease> {
  tenantName?: string;
  ownerName?: string;
  managerName?: string;
  propertyTitle?: string;
  propertyAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

@Injectable()
export class LeasesService {
  constructor(
    @InjectRepository(Lease)
    private readonly leaseRepo: MongoRepository<Lease>,
    @InjectRepository(Application)
    private readonly applicationRepo: MongoRepository<Application>,
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
    @InjectRepository(User)
    private readonly userRepo: MongoRepository<User>,
    private readonly minioService: MinioService,
    private readonly notificationsService: NotificationsService,
  ) {}

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

  private parseObjectId(id: string, message: string): ObjectId {
    if (!ObjectId.isValid(id)) {
      throw new NotFoundException(message);
    }

    return new ObjectId(id);
  }

  private toStatusEvent(status: LeaseStatus, changedBy: string, note?: string) {
    return {
      status,
      note,
      changedBy,
      changedAt: new Date(),
    };
  }

  private async findLeaseOrFail(id: string): Promise<Lease> {
    const lease = await this.leaseRepo.findOne({
      where: { _id: this.parseObjectId(id, 'Lease not found') },
    });

    if (!lease || lease.deletedAt) {
      throw new NotFoundException('Lease not found');
    }

    return lease;
  }

  private async findApplicationOrFail(id: string): Promise<Application> {
    const application = await this.applicationRepo.findOne({
      where: { _id: this.parseObjectId(id, 'Application not found') },
    });

    if (!application || application.deletedAt) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  private async findPropertyOrFail(id: string): Promise<Property> {
    const property = await this.propertyRepo.findOne({
      where: { _id: this.parseObjectId(id, 'Property not found') },
    });

    if (!property || property.deletedAt) {
      throw new NotFoundException('Property not found');
    }

    return property;
  }

  private canManageLease(role: UserRole): boolean {
    return hasPlatformAdminRole(role) || LEASE_MANAGEMENT_ROLES.includes(role);
  }

  private canViewLease(lease: Lease, userId: string, role: UserRole): boolean {
    if (hasPlatformAdminRole(role)) {
      return true;
    }

    return [lease.tenantId, lease.ownerId, lease.managerId]
      .map((value) => this.normalizeId(value))
      .some((value) => value === userId);
  }

  private async notifyLeaseParties(
    lease: Lease,
    title: string,
    message: string,
    type: NotificationType,
  ): Promise<void> {
    const recipientIds = Array.from(
      new Set(
        [lease.tenantId, lease.ownerId, lease.managerId]
          .map((value) => this.normalizeId(value))
          .filter((value): value is string => !!value),
      ),
    );

    await Promise.all(
      recipientIds.map((userId) =>
        this.notificationsService.create({
          userId,
          title,
          message,
          type,
          link: `/leases/${lease.id}`,
        }),
      ),
    );
  }

  private buildLeaseTemplate(lease: LeaseTemplatePayload): string {
    const propertyAddress = this.formatAddress(lease.propertyAddress);
    const propertyLine = [
      lease.propertyTitle || undefined,
      propertyAddress || undefined,
    ]
      .filter(Boolean)
      .join(' - ');
    const tenantLabel = lease.tenantName?.trim() || 'N/A';
    const ownerLabel = lease.ownerName?.trim() || 'N/A';
    const managerLabel = lease.managerName?.trim() || 'N/A';
    const customTerms = lease.customTerms || [];
    const terms =
      lease.terms?.trim() || 'Standard residential lease terms apply.';

    const bulletTerms = customTerms.length
      ? customTerms.map((term) => `- ${term}`).join('\n')
      : '- No extra custom terms provided.';

    return [
      'LEASE AGREEMENT',
      '',
      `Property: ${propertyLine || 'N/A'}`,
      `Tenant: ${tenantLabel}`,
      `Owner: ${ownerLabel}`,
      `Manager: ${managerLabel}`,
      `Start date: ${lease.startDate ? lease.startDate.toISOString() : 'N/A'}`,
      `End date: ${lease.endDate ? lease.endDate.toISOString() : 'N/A'}`,
      `Monthly rent: ${lease.monthlyRent ?? 'N/A'} ${lease.currency || ''}`.trim(),
      `Security deposit: ${lease.securityDeposit ?? 0}`,
      '',
      'Base terms:',
      terms,
      '',
      'Custom terms:',
      bulletTerms,
      '',
      'This template is generated for review and signature.',
    ].join('\n');
  }

  private formatAddress(
    address?: Partial<{
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    }>,
  ): string | undefined {
    if (!address) {
      return undefined;
    }

    const parts = [
      address.street,
      address.city,
      address.state,
      address.zipCode,
      address.country,
    ]
      .map((value) => value?.trim())
      .filter((value): value is string => !!value);

    if (!parts.length) {
      return undefined;
    }

    return parts.join(', ');
  }

  private async findUserDisplayName(
    userId?: string,
  ): Promise<string | undefined> {
    if (!userId || !ObjectId.isValid(userId)) {
      return undefined;
    }

    const user = await this.userRepo.findOne({
      where: { _id: new ObjectId(userId) },
    });

    if (!user || user.deletedAt) {
      return undefined;
    }

    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return name || user.email || undefined;
  }

  private async enrichLease(lease: Lease) {
    const [property, tenantName, ownerName, managerName] = await Promise.all([
      this.findPropertyOrFail(lease.propertyId).catch(() => null),
      this.findUserDisplayName(lease.tenantId),
      this.findUserDisplayName(lease.ownerId),
      this.findUserDisplayName(lease.managerId),
    ]);

    const signerNameMap = new Map<string, string>();
    const signerIds = Array.from(
      new Set(
        (lease.signatures || [])
          .map((signature) => this.normalizeId(signature.signerId))
          .filter((value): value is string => !!value),
      ),
    );

    await Promise.all(
      signerIds.map(async (id) => {
        const displayName = await this.findUserDisplayName(id);
        if (displayName) {
          signerNameMap.set(id, displayName);
        }
      }),
    );

    return {
      ...lease.toJSON(),
      tenantName,
      ownerName,
      managerName,
      propertyTitle: property?.title,
      propertyAddress: this.formatAddress(property?.address),
      propertyLocation:
        [property?.address?.city, property?.address?.state]
          .filter((value): value is string => !!value)
          .join(', ') || undefined,
      signatures: (lease.signatures || []).map((signature) => ({
        ...signature,
        signerName:
          signerNameMap.get(this.normalizeId(signature.signerId) || '') ||
          undefined,
      })),
    };
  }

  private async persistPropertyStatus(propertyId: string): Promise<void> {
    const activeLeases = await this.leaseRepo.find({
      where: { propertyId },
    });

    const hasActiveLease = activeLeases.some(
      (lease) => !lease.deletedAt && lease.status === LeaseStatus.ACTIVE,
    );

    const property = await this.findPropertyOrFail(propertyId);

    if (hasActiveLease) {
      if (property.status !== PropertyStatus.RENTED) {
        property.status = PropertyStatus.RENTED;
        await this.propertyRepo.save(property);
      }
      return;
    }

    if (property.status === PropertyStatus.RENTED) {
      property.status = PropertyStatus.AVAILABLE;
      await this.propertyRepo.save(property);
    }
  }

  private normalizeQuery(query: LeaseListQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    return { page, limit };
  }

  private async filterLeases(
    query: LeaseListQueryDto,
    predicate: (lease: Lease) => boolean,
  ) {
    const leases = await this.leaseRepo.find({
      where: { deletedAt: null } as any,
      order: { createdAt: 'DESC' },
    });

    const filtered = leases.filter((lease) => {
      if (query.status && lease.status !== query.status) {
        return false;
      }

      if (query.propertyId && lease.propertyId !== query.propertyId) {
        return false;
      }

      if (query.tenantId && lease.tenantId !== query.tenantId) {
        return false;
      }

      return predicate(lease);
    });

    const { page, limit } = this.normalizeQuery(query);
    const start = (page - 1) * limit;

    const items = await Promise.all(
      filtered
        .slice(start, start + limit)
        .map((lease) => this.enrichLease(lease)),
    );

    return {
      items,
      total: filtered.length,
      page,
      limit,
    };
  }

  private computeReminderDate(endDate: Date, daysBefore: number): Date {
    const reminder = new Date(endDate);
    reminder.setDate(reminder.getDate() - daysBefore);
    return reminder;
  }

  async createFromApprovedApplication(
    applicationId: string,
    userId: string,
    role: UserRole,
    dto: CreateLeaseFromApplicationDto,
  ) {
    if (!this.canManageLease(role)) {
      throw new ForbiddenException('You do not have access to create leases');
    }

    const application = await this.findApplicationOrFail(applicationId);
    if (application.status !== ApplicationStatus.APPROVED) {
      throw new BadRequestException(
        'The application must be approved before creating a lease',
      );
    }

    const property = await this.findPropertyOrFail(application.propertyId);

    const existingLease = (
      await this.leaseRepo.find({
        where: { propertyId: application.propertyId },
      })
    ).find(
      (lease) =>
        !lease.deletedAt &&
        [
          LeaseStatus.DRAFT,
          LeaseStatus.PENDING_OWNER_APPROVAL,
          LeaseStatus.PENDING_SIGNATURE,
          LeaseStatus.ACTIVE,
          LeaseStatus.RENEWAL_PENDING,
        ].includes(lease.status),
    );

    if (existingLease) {
      throw new BadRequestException('A lease already exists for this property');
    }

    const [tenantName, ownerName, managerName] = await Promise.all([
      this.findUserDisplayName(application.tenantId),
      this.findUserDisplayName(application.ownerId),
      this.findUserDisplayName(application.managerId),
    ]);

    const lease = this.leaseRepo.create({
      applicationId: application.id,
      propertyId: application.propertyId,
      tenantId: application.tenantId,
      ownerId: application.ownerId,
      managerId: application.managerId,
      leaseNumber: `LS-${new Date().getFullYear()}-${application.id.slice(-6).toUpperCase()}`,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      monthlyRent: dto.monthlyRent,
      currency: dto.currency || property.currency || 'USD',
      securityDeposit: dto.securityDeposit,
      status: LeaseStatus.PENDING_OWNER_APPROVAL,
      terms: dto.terms,
      customTerms: dto.customTerms || [],
      generatedTemplate: this.buildLeaseTemplate({
        propertyId: application.propertyId,
        propertyTitle: property.title,
        propertyAddress: property.address,
        tenantId: application.tenantId,
        tenantName,
        ownerId: application.ownerId,
        ownerName,
        managerId: application.managerId,
        managerName,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        monthlyRent: dto.monthlyRent,
        securityDeposit: dto.securityDeposit,
        currency: dto.currency || property.currency || 'USD',
        terms: dto.terms,
        customTerms: dto.customTerms || [],
      }),
      documents: [],
      signatures: [],
      statusHistory: [
        this.toStatusEvent(
          LeaseStatus.PENDING_OWNER_APPROVAL,
          userId,
          'Lease created from approved application',
        ),
      ],
      renewalReminderAt: this.computeReminderDate(new Date(dto.endDate), 30),
    });

    const saved = await this.leaseRepo.save(lease);

    await this.notifyLeaseParties(
      saved,
      'Lease pending owner review',
      'A new lease has been created from an approved application and is waiting for owner validation.',
      NotificationType.LEASE_CREATED,
    );

    return this.enrichLease(saved);
  }

  async reviewOwnerDecision(
    leaseId: string,
    userId: string,
    role: UserRole,
    dto: LeaseOwnerDecisionDto,
  ) {
    const lease = await this.findLeaseOrFail(leaseId);
    const isOwner = lease.ownerId === userId && role === UserRole.OWNER;

    if (!isOwner && !hasPlatformAdminRole(role)) {
      throw new ForbiddenException(
        'You do not have access to review this lease',
      );
    }

    if (dto.approved) {
      lease.status = LeaseStatus.PENDING_SIGNATURE;
      lease.ownerDecisionAt = new Date();
      lease.ownerDecisionBy = userId;
      lease.ownerDecisionNote = dto.note;
      lease.statusHistory = [
        ...(lease.statusHistory || []),
        this.toStatusEvent(
          LeaseStatus.PENDING_SIGNATURE,
          userId,
          dto.note || 'Owner approved the lease terms',
        ),
      ];
    } else {
      lease.status = LeaseStatus.REJECTED;
      lease.ownerDecisionAt = new Date();
      lease.ownerDecisionBy = userId;
      lease.ownerDecisionNote = dto.note;
      lease.statusHistory = [
        ...(lease.statusHistory || []),
        this.toStatusEvent(
          LeaseStatus.REJECTED,
          userId,
          dto.note || 'Owner rejected the lease terms',
        ),
      ];
    }

    const saved = await this.leaseRepo.save(lease);

    if (dto.approved) {
      await this.notifyLeaseParties(
        saved,
        'Lease approved by owner',
        'The personalized lease contract is now ready for tenant and owner digital signatures.',
        NotificationType.LEASE_SIGNATURE_REQUESTED,
      );
    } else {
      await this.notifyLeaseParties(
        saved,
        'Lease rejected by owner',
        'The lease terms were rejected and need to be revised.',
        NotificationType.LEASE_STATUS_CHANGED,
      );
    }

    return this.enrichLease(saved);
  }

  async uploadLeaseDocument(
    leaseId: string,
    userId: string,
    role: UserRole,
    file: Express.Multer.File,
    dto: UploadLeaseDocumentDto,
    documentTypeOverride?: LeaseDocumentType,
  ) {
    const lease = await this.findLeaseOrFail(leaseId);
    if (!this.canViewLease(lease, userId, role) && !this.canManageLease(role)) {
      throw new ForbiddenException('You do not have access to this lease');
    }

    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const uploaded = await this.minioService.uploadFile(file, {
      folder: `leases/${lease.id}/documents`,
      metadata: {
        'Lease-Id': lease.id,
        'Uploaded-By': userId,
      },
    });

    const documents = lease.documents || [];
    const documentType = documentTypeOverride || dto.type;
    documents.push({
      id: new ObjectId().toHexString(),
      name: uploaded.originalName,
      mimeType: uploaded.mimeType,
      size: uploaded.size,
      key: uploaded.key,
      url: uploaded.url,
      type: documentType,
      description: dto.description,
      uploadedBy: userId,
      uploadedAt: new Date(),
    });

    lease.documents = documents;
    lease.statusHistory = [
      ...(lease.statusHistory || []),
      this.toStatusEvent(
        lease.status,
        userId,
        `Lease document uploaded (${documentType})`,
      ),
    ];

    const saved = await this.leaseRepo.save(lease);
    await this.notifyLeaseParties(
      saved,
      'Lease document uploaded',
      `A new ${documentType} was added to the lease.`,
      NotificationType.LEASE_DOCUMENT_UPLOADED,
    );

    return this.enrichLease(saved);
  }

  async addEndorsement(
    leaseId: string,
    userId: string,
    role: UserRole,
    file: Express.Multer.File,
    dto: UploadLeaseDocumentDto,
  ) {
    return this.uploadLeaseDocument(
      leaseId,
      userId,
      role,
      file,
      dto,
      LeaseDocumentType.ENDORSEMENT,
    );
  }

  async signLease(
    leaseId: string,
    userId: string,
    role: UserRole,
    dto: LeaseSignatureDto,
  ) {
    const lease = await this.findLeaseOrFail(leaseId);
    const normalizedUserId = this.normalizeId(userId);

    if (!normalizedUserId) {
      throw new ForbiddenException('Unable to resolve signer identity');
    }

    const canSignAsTenant =
      lease.tenantId === normalizedUserId && role === UserRole.TENANT;
    const canSignAsOwner =
      lease.ownerId === normalizedUserId && role === UserRole.OWNER;
    const canSignAsManager =
      lease.managerId === normalizedUserId &&
      [
        UserRole.BRANCH_MANAGER,
        UserRole.REAL_ESTATE_AGENT,
        UserRole.RENTAL_MANAGER,
      ].includes(role);
    const canSignAsAdmin = hasPlatformAdminRole(role);

    if (
      !canSignAsTenant &&
      !canSignAsOwner &&
      !canSignAsManager &&
      !canSignAsAdmin
    ) {
      throw new ForbiddenException('You are not authorized to sign this lease');
    }

    if (
      ![
        LeaseStatus.PENDING_SIGNATURE,
        LeaseStatus.ACTIVE,
        LeaseStatus.RENEWAL_PENDING,
      ].includes(lease.status)
    ) {
      throw new BadRequestException('The lease is not ready for signatures');
    }

    const signatures = lease.signatures || [];
    const signerAlreadyRecorded = signatures.some(
      (signature) => signature.signerId === normalizedUserId,
    );

    if (signerAlreadyRecorded) {
      throw new BadRequestException('This signer has already signed the lease');
    }

    signatures.push({
      id: new ObjectId().toHexString(),
      signerId: normalizedUserId,
      signerRole: role,
      method: dto.method,
      signedAt: new Date(),
      note: dto.note,
      documentId: dto.documentId,
    });

    lease.signatures = signatures;
    lease.statusHistory = [
      ...(lease.statusHistory || []),
      this.toStatusEvent(
        lease.status,
        normalizedUserId,
        'Lease signature recorded',
      ),
    ];

    const tenantSigned = signatures.some(
      (signature) => signature.signerId === lease.tenantId,
    );
    const ownerSigned = signatures.some(
      (signature) => signature.signerId === lease.ownerId,
    );

    if (
      tenantSigned &&
      ownerSigned &&
      lease.status === LeaseStatus.PENDING_SIGNATURE
    ) {
      lease.statusHistory.push(
        this.toStatusEvent(
          LeaseStatus.PENDING_SIGNATURE,
          normalizedUserId,
          'Lease is ready for activation',
        ),
      );
    }

    const saved = await this.leaseRepo.save(lease);
    await this.notifyLeaseParties(
      saved,
      'Lease signed',
      'One of the required lease signatures has been completed.',
      NotificationType.LEASE_SIGNATURE_COMPLETED,
    );

    return this.enrichLease(saved);
  }

  async activateLease(leaseId: string, userId: string, role: UserRole) {
    const lease = await this.findLeaseOrFail(leaseId);
    if (!this.canManageLease(role)) {
      throw new ForbiddenException(
        'You do not have access to activate this lease',
      );
    }

    const signatures = lease.signatures || [];
    const tenantSigned = signatures.some(
      (signature) => signature.signerId === lease.tenantId,
    );
    const ownerSigned = signatures.some(
      (signature) => signature.signerId === lease.ownerId,
    );

    if (!tenantSigned || !ownerSigned) {
      throw new BadRequestException(
        'Tenant and owner signatures are required before activation',
      );
    }

    lease.status = LeaseStatus.ACTIVE;
    lease.activatedAt = new Date();
    lease.statusHistory = [
      ...(lease.statusHistory || []),
      this.toStatusEvent(LeaseStatus.ACTIVE, userId, 'Lease activated'),
    ];

    const saved = await this.leaseRepo.save(lease);
    await this.persistPropertyStatus(saved.propertyId);
    await this.notifyLeaseParties(
      saved,
      'Lease activated',
      'The lease is now active and ready for occupancy.',
      NotificationType.LEASE_ACTIVATED,
    );

    return this.enrichLease(saved);
  }

  async recordInventory(
    leaseId: string,
    userId: string,
    role: UserRole,
    dto: LeaseInventoryDto,
    files: Express.Multer.File[] = [],
  ) {
    const lease = await this.findLeaseOrFail(leaseId);
    if (!this.canManageLease(role) && lease.tenantId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this lease inventory',
      );
    }

    if (!files.length) {
      throw new BadRequestException(
        'At least one photo is required for inventory records',
      );
    }

    const uploadedPhotos = await Promise.all(
      files.map(async (file) => {
        const uploaded = await this.minioService.uploadFile(file, {
          folder: `leases/${lease.id}/inventory/${dto.phase}`,
          metadata: {
            'Lease-Id': lease.id,
            'Uploaded-By': userId,
          },
        });

        return {
          id: new ObjectId().toHexString(),
          name: uploaded.originalName,
          mimeType: uploaded.mimeType,
          size: uploaded.size,
          key: uploaded.key,
          url: uploaded.url,
          uploadedBy: userId,
          uploadedAt: new Date(),
        };
      }),
    );

    const record = {
      id: new ObjectId().toHexString(),
      phase: dto.phase,
      room: dto.room,
      item: dto.item,
      condition: dto.condition,
      notes: dto.notes,
      recordedBy: userId,
      recordedAt: new Date(),
      photos: uploadedPhotos,
    };

    if (dto.phase === LeaseInventoryPhase.MOVE_IN) {
      lease.moveInInventory = [...(lease.moveInInventory || []), record];
    } else {
      lease.moveOutInventory = [...(lease.moveOutInventory || []), record];
    }

    lease.statusHistory = [
      ...(lease.statusHistory || []),
      this.toStatusEvent(
        lease.status,
        userId,
        `Lease inventory recorded (${dto.phase})`,
      ),
    ];

    const saved = await this.leaseRepo.save(lease);
    await this.notifyLeaseParties(
      saved,
      'Lease inventory updated',
      `A ${dto.phase === LeaseInventoryPhase.MOVE_IN ? 'move-in' : 'move-out'} inventory was recorded.`,
      NotificationType.LEASE_STATUS_CHANGED,
    );

    return this.enrichLease(saved);
  }

  async renewLease(
    leaseId: string,
    userId: string,
    role: UserRole,
    dto: LeaseRenewalDto,
  ) {
    const lease = await this.findLeaseOrFail(leaseId);
    if (!this.canManageLease(role)) {
      throw new ForbiddenException(
        'You do not have access to renew this lease',
      );
    }

    lease.renewalRequestedAt = new Date();
    lease.endDate = new Date(dto.endDate);
    if (dto.monthlyRent !== undefined) {
      lease.monthlyRent = dto.monthlyRent;
    }
    if (dto.securityDeposit !== undefined) {
      lease.securityDeposit = dto.securityDeposit;
    }
    if (dto.customTerms) {
      lease.customTerms = dto.customTerms;
    }
    if (dto.note) {
      lease.ownerDecisionNote = dto.note;
    }
    lease.status = LeaseStatus.ACTIVE;
    lease.renewalReminderAt = this.computeReminderDate(
      new Date(dto.endDate),
      30,
    );
    lease.statusHistory = [
      ...(lease.statusHistory || []),
      this.toStatusEvent(
        LeaseStatus.ACTIVE,
        userId,
        dto.note || 'Lease renewed',
      ),
    ];

    const saved = await this.leaseRepo.save(lease);
    await this.notifyLeaseParties(
      saved,
      'Lease renewed',
      'The lease period has been extended.',
      NotificationType.LEASE_RENEWED,
    );

    return this.enrichLease(saved);
  }

  async terminateLease(
    leaseId: string,
    userId: string,
    role: UserRole,
    dto: LeaseTerminationDto,
  ) {
    const lease = await this.findLeaseOrFail(leaseId);
    if (!this.canManageLease(role)) {
      throw new ForbiddenException(
        'You do not have access to terminate this lease',
      );
    }

    lease.terminationRequestedAt = new Date();
    lease.terminationReason = dto.reason;
    lease.terminationType = dto.terminationType;
    lease.terminatedAt = dto.effectiveDate
      ? new Date(dto.effectiveDate)
      : new Date();
    lease.status = LeaseStatus.TERMINATED;
    lease.statusHistory = [
      ...(lease.statusHistory || []),
      this.toStatusEvent(
        LeaseStatus.TERMINATED,
        userId,
        dto.reason || 'Lease terminated',
      ),
    ];

    const saved = await this.leaseRepo.save(lease);
    await this.persistPropertyStatus(saved.propertyId);
    await this.notifyLeaseParties(
      saved,
      'Lease terminated',
      dto.reason || 'The lease has been terminated.',
      NotificationType.LEASE_TERMINATED,
    );

    return this.enrichLease(saved);
  }

  async updateDeposit(
    leaseId: string,
    userId: string,
    role: UserRole,
    dto: LeaseDepositDto,
  ) {
    const lease = await this.findLeaseOrFail(leaseId);
    if (!this.canManageLease(role)) {
      throw new ForbiddenException(
        'You do not have access to update this deposit',
      );
    }

    lease.securityDepositStatus = dto.status;
    lease.securityDepositAmountReleased = dto.amountReleased;
    lease.securityDepositHandledAt = new Date();
    lease.securityDepositHandledBy = userId;
    lease.statusHistory = [
      ...(lease.statusHistory || []),
      this.toStatusEvent(
        lease.status,
        userId,
        dto.note || 'Security deposit updated',
      ),
    ];

    const saved = await this.leaseRepo.save(lease);
    await this.notifyLeaseParties(
      saved,
      'Security deposit updated',
      dto.note || 'The lease security deposit status has changed.',
      NotificationType.LEASE_STATUS_CHANGED,
    );

    return this.enrichLease(saved);
  }

  async getLeaseDetails(leaseId: string, userId: string, role: UserRole) {
    const lease = await this.findLeaseOrFail(leaseId);
    if (!this.canViewLease(lease, userId, role) && !this.canManageLease(role)) {
      throw new ForbiddenException('You do not have access to this lease');
    }

    return this.enrichLease(lease);
  }

  async getMine(userId: string, role: UserRole, query: LeaseListQueryDto) {
    return this.filterLeases(query, (lease) => {
      if (hasPlatformAdminRole(role)) {
        return true;
      }

      return [lease.tenantId, lease.ownerId, lease.managerId]
        .map((value) => this.normalizeId(value))
        .some((value) => value === userId);
    });
  }

  async getManaged(userId: string, role: UserRole, query: LeaseListQueryDto) {
    if (!this.canManageLease(role)) {
      throw new ForbiddenException('You do not have access to these leases');
    }

    return this.filterLeases(query, (lease) => {
      if (hasPlatformAdminRole(role)) {
        return true;
      }

      return [lease.ownerId, lease.managerId]
        .map((value) => this.normalizeId(value))
        .some((value) => value === userId);
    });
  }

  async getExpiringLeases(days: number = 90) {
    const leases = await this.leaseRepo.find({
      where: { deletedAt: null } as any,
      order: { endDate: 'ASC' },
    });

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    const expiring = leases.filter(
      (lease) =>
        !lease.deletedAt &&
        lease.status === LeaseStatus.ACTIVE &&
        lease.endDate instanceof Date &&
        lease.endDate <= cutoff,
    );

    return {
      items: await Promise.all(
        expiring.map((lease) => this.enrichLease(lease)),
      ),
      count: expiring.length,
      cutoff,
    };
  }

  async getOccupancyReport() {
    const properties = await this.propertyRepo.find({
      where: { deletedAt: null } as any,
    });
    const activeLeases = await this.leaseRepo.find({
      where: { deletedAt: null } as any,
    });

    const occupiedPropertyIds = new Set(
      activeLeases
        .filter((lease) => lease.status === LeaseStatus.ACTIVE)
        .map((lease) => lease.propertyId),
    );

    const total = properties.length || 0;
    const occupied = occupiedPropertyIds.size;
    const vacancyRate =
      total > 0 ? Number((((total - occupied) / total) * 100).toFixed(2)) : 0;

    return {
      totalProperties: total,
      occupiedProperties: occupied,
      vacantProperties: Math.max(total - occupied, 0),
      occupancyRate:
        total > 0 ? Number(((occupied / total) * 100).toFixed(2)) : 0,
      vacancyRate,
    };
  }

  async getRevenueProjection() {
    const leases = await this.leaseRepo.find({
      where: { deletedAt: null } as any,
    });

    const activeLeases = leases.filter(
      (lease) => lease.status === LeaseStatus.ACTIVE,
    );

    const totals = activeLeases.reduce<LeaseReportTotals>(
      (accumulator, lease) => {
        const rent = lease.monthlyRent || 0;
        const currency = lease.currency || 'USD';

        accumulator.count += 1;
        accumulator.totalMonthlyRent += rent;
        accumulator.currencies[currency] =
          (accumulator.currencies[currency] || 0) + rent;
        return accumulator;
      },
      { count: 0, totalMonthlyRent: 0, currencies: {} },
    );

    return {
      ...totals,
      projectedAnnualRent: Number((totals.totalMonthlyRent * 12).toFixed(2)),
    };
  }

  async triggerRenewalReminders(daysBefore = 30) {
    const leases = await this.leaseRepo.find({
      where: { deletedAt: null } as any,
      order: { endDate: 'ASC' },
    });

    const upcoming = leases.filter(
      (lease) =>
        lease.status === LeaseStatus.ACTIVE &&
        lease.endDate instanceof Date &&
        this.computeReminderDate(lease.endDate, daysBefore) <= new Date() &&
        (!lease.renewalReminderAt ||
          lease.renewalReminderAt <
            this.computeReminderDate(lease.endDate, daysBefore)),
    );

    for (const lease of upcoming) {
      lease.renewalReminderAt = new Date();
      lease.statusHistory = [
        ...(lease.statusHistory || []),
        this.toStatusEvent(lease.status, 'system', 'Renewal reminder sent'),
      ];
      await this.leaseRepo.save(lease);

      await this.notifyLeaseParties(
        lease,
        'Lease renewal reminder',
        'Your lease is approaching its expiration date. Please review renewal options.',
        NotificationType.LEASE_RENEWAL_REMINDER,
      );
    }

    return { sent: upcoming.length };
  }
}
