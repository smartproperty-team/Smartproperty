import { MailerService } from '@nestjs-modules/mailer';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectId } from 'mongodb';
import { MongoRepository } from 'typeorm';
import { generateTemporaryPassword } from '../../common/utils/password.generator';
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

@Injectable()
export class AgenciesService {
  private readonly logger = new Logger(AgenciesService.name);

  constructor(
    @InjectRepository(Agency)
    private readonly agenciesRepository: MongoRepository<Agency>,
    @InjectRepository(User)
    private readonly usersRepository: MongoRepository<User>,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async createWithAutoAccounts(
    createAgencyDto: CreateAgencyDto,
    createdBy: string,
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
      createdBy,
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

    const createdAccounts: Array<Record<string, unknown>> = [];
    const skippedAccounts: Array<Record<string, unknown>> = [];
    const members: AgencyMember[] = [];

    for (const spec of roleSpecs) {
      const email = this.buildEmail(slug, spec.seed.firstName, spec.roleToken);
      const existingUser = await this.usersRepository.findOne({
        where: { email },
      });

      if (existingUser) {
        skippedAccounts.push({
          role: spec.role,
          email,
          reason: 'email_exists',
          message: 'An account with this email already exists',
        });
        continue;
      }

      const temporaryPassword = generateTemporaryPassword();
      const firstName = spec.seed.firstName.trim();
      const lastName = spec.seed.lastName?.trim() || spec.fallbackLastName;

      const createdUser = this.usersRepository.create({
        email,
        password: temporaryPassword,
        firstName,
        lastName,
        role: spec.role,
        status: UserStatus.ACTIVE,
        authProvider: AuthProvider.LOCAL,
        isEmailVerified: true,
        agencyId: savedAgency.id,
        mustChangePassword: true,
      });

      const savedUser = await this.usersRepository.save(createdUser);
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
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        temporaryPassword,
      });

      await this.sendProvisioningEmail({
        to: savedUser.email,
        firstName: savedUser.firstName,
        roleLabel: spec.fallbackLastName,
        agencyName: savedAgency.name,
        temporaryPassword,
      });
    }

    savedAgency.members = members;
    await this.agenciesRepository.save(savedAgency);

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

    return agency.toJSON();
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
          email: params.to,
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
