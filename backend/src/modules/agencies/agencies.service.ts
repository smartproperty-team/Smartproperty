import { MailerService } from '@nestjs-modules/mailer';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { ObjectId } from 'mongodb';
import { MongoRepository, Repository } from 'typeorm';
import { generateTemporaryPassword } from '../../common/utils/password.generator';
import { Property } from '../properties/entities/property.entity';
import {
  AuthProvider,
  User,
  UserRole,
  UserStatus,
} from '../users/entities/user.entity';
import { CreateAgencyDto, RoleSeedDto } from './dto/create-agency.dto';
import { Agency, AgencyMember } from './entities/agency.entity';

type ProvisionRoleSpec = {
  seed: RoleSeedDto;
  role: UserRole;
  roleToken: string;
  fallbackLastName: string;
};

type AgencyCreator = {
  id: string;
  email?: string;
  name?: string;
};

type CreatedProvisionedAccount = {
  id: string;
  role: UserRole;
  roleLabel: string;
  email: string;
  firstName: string;
  lastName: string;
  temporaryPassword: string;
  notificationEmail: string;
};

type SkippedProvisionedAccount = {
  role: UserRole;
  roleLabel: string;
  email: string;
  reason: string;
  message: string;
};

@Injectable()
export class AgenciesService {
  private readonly logger = new Logger(AgenciesService.name);

  constructor(
    @InjectRepository(Agency)
    private readonly agenciesRepository: MongoRepository<Agency>,
    @InjectRepository(User)
    private readonly usersRepository: MongoRepository<User>,
    @InjectRepository(Property)
    private readonly propertiesRepository: Repository<Property>,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async createWithAutoAccounts(
    createAgencyDto: CreateAgencyDto,
    createdBy: AgencyCreator,
  ) {
    const slug = this.toAgencySlug(createAgencyDto.name);
    await this.ensureUniqueAgency(slug, createAgencyDto.name);

    const agency = this.agenciesRepository.create({
      name: createAgencyDto.name.trim(),
      slug,
      region: createAgencyDto.region.trim(),
      description: createAgencyDto.description?.trim(),
      phone: createAgencyDto.phone?.trim(),
      contactEmail: createAgencyDto.contactEmail?.toLowerCase(),
      establishedAt: new Date(createAgencyDto.agencyCreationDate),
      createdBy: createdBy.id,
      members: [],
    });

    const savedAgency = await this.agenciesRepository.save(agency);
    const roleSpecs: ProvisionRoleSpec[] = [
      {
        seed: createAgencyDto.accountant,
        role: UserRole.ACCOUNTANT_ADMIN_ASSISTANT,
        roleToken: 'accountant',
        fallbackLastName: 'Accountant',
      },
      {
        seed: createAgencyDto.rentalManager,
        role: UserRole.RENTAL_MANAGER,
        roleToken: 'rentalmanager',
        fallbackLastName: 'Rental Manager',
      },
      {
        seed: createAgencyDto.manager,
        role: UserRole.REAL_ESTATE_AGENT,
        roleToken: 'manager',
        fallbackLastName: 'Manager',
      },
      {
        seed: createAgencyDto.serviceProvider,
        role: UserRole.SERVICE_PROVIDER,
        roleToken: 'serviceprovider',
        fallbackLastName: 'Service Provider',
      },
    ];

    const createdAccounts: CreatedProvisionedAccount[] = [];
    const skippedAccounts: SkippedProvisionedAccount[] = [];
    const members: AgencyMember[] = [];

    for (const spec of roleSpecs) {
      const email = this.buildEmail(slug, spec.seed.firstName, spec.roleToken);
      const existingUser = await this.usersRepository.findOne({
        where: { email },
      });

      if (existingUser) {
        skippedAccounts.push({
          role: spec.role,
          roleLabel: spec.fallbackLastName,
          email,
          reason: 'email_exists',
          message: 'An account with this email already exists',
        });
        continue;
      }

      const temporaryPassword = generateTemporaryPassword();
      const firstName = spec.seed.firstName.trim();
      const lastName = spec.seed.lastName?.trim() || spec.fallbackLastName;

      const hashedPassword = await bcrypt.hash(temporaryPassword, 12);
      const now = new Date();

      const insertResult = await this.usersRepository.insertOne({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: spec.role,
        status: UserStatus.ACTIVE,
        authProvider: AuthProvider.LOCAL,
        isEmailVerified: true,
        loginAttempts: 0,
        twoFactorEnabled: false,
        agencyId: savedAgency.id,
        mustChangePassword: true,
        permanentlyDeleted: false,
        createdAt: now,
        updatedAt: now,
      });

      const savedUser = await this.usersRepository.findOne({
        where: { _id: insertResult.insertedId },
      });

      if (!savedUser) {
        throw new InternalServerErrorException(
          'Failed to load provisioned account after creation',
        );
      }
      members.push({
        userId: savedUser.id,
        role: spec.role,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        createdAt: savedUser.createdAt,
      });

      createdAccounts.push({
        id: savedUser.id,
        role: savedUser.role,
        roleLabel: spec.fallbackLastName,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        temporaryPassword,
        notificationEmail:
          spec.seed.personalEmail?.trim().toLowerCase() || savedUser.email,
      });

      const notificationEmail =
        spec.seed.personalEmail?.trim().toLowerCase() || savedUser.email;

      await this.sendProvisioningEmail({
        to: notificationEmail,
        firstName: savedUser.firstName,
        roleLabel: spec.fallbackLastName,
        agencyName: savedAgency.name,
        loginEmail: savedUser.email,
        temporaryPassword,
      });
    }

    savedAgency.members = members;
    await this.agenciesRepository.save(savedAgency);

    await this.sendManagerSummaryEmail({
      to: createdBy.email,
      managerName: createdBy.name || 'Branch Manager',
      agencyName: savedAgency.name,
      createdAccounts,
      skippedAccounts,
    });

    return {
      agency: savedAgency.toJSON(),
      createdAccounts,
      skippedAccounts,
    };
  }

  async findMyAgencies(userId: string) {
    const agencies = await this.agenciesRepository.find({
      where: { createdBy: userId },
      order: { createdAt: 'DESC' },
    });

    return agencies.map((agency) => agency.toJSON());
  }

  async searchAgencies(query?: string) {
    const normalizedQuery = query?.trim();

    const exactAgencyById =
      normalizedQuery && ObjectId.isValid(normalizedQuery)
        ? await this.agenciesRepository.findOne({
            where: { _id: new ObjectId(normalizedQuery) },
          })
        : null;

    const where =
      normalizedQuery && normalizedQuery.length > 0
        ? {
            $or: [
              { name: { $regex: normalizedQuery, $options: 'i' } },
              { region: { $regex: normalizedQuery, $options: 'i' } },
              { slug: { $regex: normalizedQuery, $options: 'i' } },
            ],
          }
        : {};

    const agencies = await this.agenciesRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: 20,
    });

    const mergedAgencies = [exactAgencyById, ...agencies].filter(
      (agency, index, self): agency is Agency =>
        !!agency && self.findIndex((item) => item?.id === agency.id) === index,
    );

    const managerIds = mergedAgencies
      .map((agency) => this.resolveAgencyManagerUserId(agency))
      .filter((value): value is string => !!value);

    const managerObjectIds = Array.from(
      new Set(managerIds.filter((value) => ObjectId.isValid(value))),
    ).map((value) => new ObjectId(value));

    const managers = managerObjectIds.length
      ? await this.usersRepository.find({
          where: { _id: { $in: managerObjectIds } as any },
        })
      : [];

    const managerNameById = new Map<string, string>(
      managers.map((manager) => [manager.id, manager.fullName]),
    );

    return mergedAgencies.map((agency) => ({
      id: agency.id,
      name: agency.name,
      slug: agency.slug,
      region: agency.region,
      managerName: managerNameById.get(this.resolveAgencyManagerUserId(agency)),
    }));
  }

  async findById(id: string) {
    if (!ObjectId.isValid(id)) {
      throw new NotFoundException('Agency not found');
    }

    const agency = await this.agenciesRepository.findOne({
      where: { _id: new ObjectId(id) },
    });

    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    const owners = await this.usersRepository.find({
      where: {
        role: UserRole.OWNER,
        agencyId: agency.id,
      },
      order: { createdAt: 'DESC' },
    });

    return {
      ...agency.toJSON(),
      owners: owners.map((owner) => ({
        id: owner.id,
        email: owner.email,
        firstName: owner.firstName,
        lastName: owner.lastName,
        status: owner.status,
      })),
    };
  }

  async linkOwner(agencyId: string, ownerId: string, requesterId: string) {
    const agency = await this.getAgencyOrFail(agencyId);
    this.ensureAgencyManager(agency, requesterId);

    const owner = await this.getUserOrFail(ownerId);
    if (owner.role !== UserRole.OWNER) {
      throw new ConflictException('Selected user is not an owner');
    }

    owner.agencyId = agency.id;
    owner.updatedAt = new Date();
    const savedOwner = await this.usersRepository.save(owner);
    const effectiveManagerId = this.resolveAgencyManagerUserId(agency);
    await this.syncOwnerPropertiesAgencyManager(
      savedOwner.id,
      effectiveManagerId,
    );

    return {
      agencyId: agency.id,
      owner: {
        id: savedOwner.id,
        email: savedOwner.email,
        firstName: savedOwner.firstName,
        lastName: savedOwner.lastName,
        status: savedOwner.status,
      },
    };
  }

  async unlinkOwner(agencyId: string, ownerId: string, requesterId: string) {
    const agency = await this.getAgencyOrFail(agencyId);
    this.ensureAgencyManager(agency, requesterId);

    const owner = await this.getUserOrFail(ownerId);
    if (owner.role !== UserRole.OWNER) {
      throw new ConflictException('Selected user is not an owner');
    }

    if (owner.agencyId !== agency.id) {
      throw new ConflictException('This owner is not linked to the agency');
    }

    await this.usersRepository.updateOne(
      { _id: owner._id },
      {
        $unset: { agencyId: '' },
        $set: { updatedAt: new Date() },
      },
    );
    await this.syncOwnerPropertiesAgencyManager(owner.id, null);

    return {
      agencyId: agency.id,
      ownerId,
      unlinked: true,
    };
  }

  async linkCurrentOwner(agencyId: string, ownerUserId: string) {
    const agency = await this.getAgencyOrFail(agencyId);
    const owner = await this.getUserOrFail(ownerUserId);

    if (owner.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only owners can self-link to an agency');
    }

    owner.agencyId = agency.id;
    owner.updatedAt = new Date();
    const savedOwner = await this.usersRepository.save(owner);
    const effectiveManagerId = this.resolveAgencyManagerUserId(agency);
    await this.syncOwnerPropertiesAgencyManager(
      savedOwner.id,
      effectiveManagerId,
    );

    return {
      agencyId: agency.id,
      owner: {
        id: savedOwner.id,
        email: savedOwner.email,
        firstName: savedOwner.firstName,
        lastName: savedOwner.lastName,
        status: savedOwner.status,
      },
    };
  }

  async unlinkCurrentOwner(agencyId: string, ownerUserId: string) {
    const agency = await this.getAgencyOrFail(agencyId);
    const owner = await this.getUserOrFail(ownerUserId);

    if (owner.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only owners can unlink themselves');
    }

    if (owner.agencyId !== agency.id) {
      throw new ConflictException('You are not linked to this agency');
    }

    await this.usersRepository.updateOne(
      { _id: owner._id },
      {
        $unset: { agencyId: '' },
        $set: { updatedAt: new Date() },
      },
    );
    await this.syncOwnerPropertiesAgencyManager(owner.id, null);

    return {
      agencyId: agency.id,
      ownerId: owner.id,
      unlinked: true,
    };
  }

  private async getAgencyOrFail(id: string): Promise<Agency> {
    if (!ObjectId.isValid(id)) {
      throw new NotFoundException('Agency not found');
    }

    const agency = await this.agenciesRepository.findOne({
      where: { _id: new ObjectId(id) },
    });

    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    return agency;
  }

  private async getUserOrFail(id: string): Promise<User> {
    if (!ObjectId.isValid(id)) {
      throw new NotFoundException('User not found');
    }

    const user = await this.usersRepository.findOne({
      where: { _id: new ObjectId(id) },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private ensureAgencyManager(agency: Agency, requesterId: string): void {
    if (agency.createdBy !== requesterId) {
      throw new ForbiddenException(
        'Only the branch manager who created the agency can manage owner links',
      );
    }
  }

  private async syncOwnerPropertiesAgencyManager(
    ownerId: string,
    managerId: string | null,
  ): Promise<void> {
    await this.propertiesRepository.update(
      { ownerId, deletedAt: null as any },
      {
        managerId: managerId ?? (null as any),
        updatedAt: new Date(),
      } as Partial<Property>,
    );
  }

  private resolveAgencyManagerUserId(agency: Agency): string {
    const members = agency.members || [];
    const preferredManager = members.find(
      (member) => member.role === UserRole.REAL_ESTATE_AGENT,
    );

    if (preferredManager?.userId) {
      return preferredManager.userId;
    }

    const rentalManager = members.find(
      (member) => member.role === UserRole.RENTAL_MANAGER,
    );

    if (rentalManager?.userId) {
      return rentalManager.userId;
    }

    return agency.createdBy;
  }

  private async ensureUniqueAgency(slug: string, name: string): Promise<void> {
    const existing = await this.agenciesRepository.findOne({
      where: {
        $or: [{ slug }, { name: name.trim() }],
      },
    });

    if (existing) {
      throw new ConflictException('Agency already exists');
    }
  }

  private toAgencySlug(name: string): string {
    const slug = name
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!slug) {
      throw new ConflictException('Agency name cannot generate a valid slug');
    }

    return slug;
  }

  private buildEmail(
    slug: string,
    firstName: string,
    roleToken: string,
  ): string {
    const firstNameToken = firstName
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

    if (!firstNameToken) {
      throw new ConflictException(
        'First name cannot generate a valid email local-part',
      );
    }

    return `${firstNameToken}.${roleToken}@${slug}.com`;
  }

  private async sendProvisioningEmail(params: {
    to: string;
    firstName: string;
    roleLabel: string;
    agencyName: string;
    loginEmail: string;
    temporaryPassword: string;
  }): Promise<void> {
    const loginUrl = this.resolveFrontendLoginUrl();

    try {
      await this.mailerService.sendMail({
        to: params.to,
        subject: `Your ${params.agencyName} account has been created`,
        template: 'agency-account-provisioned',
        context: {
          firstName: params.firstName,
          role: params.roleLabel,
          agencyName: params.agencyName,
          recipientEmail: params.to,
          loginEmail: params.loginEmail,
          temporaryPassword: params.temporaryPassword,
          loginUrl,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Provisioning email failed for ${params.to}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  private async sendManagerSummaryEmail(params: {
    to?: string;
    managerName: string;
    agencyName: string;
    createdAccounts: CreatedProvisionedAccount[];
    skippedAccounts: SkippedProvisionedAccount[];
  }): Promise<void> {
    if (!params.to) {
      this.logger.warn(
        `Manager summary email skipped for agency ${params.agencyName}: creator email unavailable`,
      );
      return;
    }

    const loginUrl = this.resolveFrontendLoginUrl();

    try {
      await this.mailerService.sendMail({
        to: params.to,
        subject: `${params.agencyName} account credentials summary`,
        template: 'agency-accounts-summary',
        context: {
          managerName: params.managerName,
          agencyName: params.agencyName,
          loginUrl,
          createdAccounts: params.createdAccounts,
          skippedAccounts: params.skippedAccounts,
          hasCreatedAccounts: params.createdAccounts.length > 0,
          hasSkippedAccounts: params.skippedAccounts.length > 0,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Manager summary email failed for ${params.to}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  private resolveFrontendLoginUrl(): string {
    const corsOrigin = this.configService.get<string>('app.corsOrigin');
    const candidate = corsOrigin
      ?.split(',')
      .map((value) => value.trim())
      .find((value) => Boolean(value) && value !== '*');

    if (candidate) {
      return `${candidate.replace(/\/$/, '')}/login`;
    }

    return 'http://localhost:5173/login';
  }
}
