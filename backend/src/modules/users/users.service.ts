// ===========================================
// SmartProperty - Users Service
// ===========================================

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectId } from 'mongodb';
import { Repository } from 'typeorm';
import {
  User,
  UserPreferences,
  UserRole,
  UserStatus,
} from './entities/user.entity';

// ===========================================
// DTOs
// ===========================================

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: UserRole;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  preferences?: UserPreferences;
}

export interface FindUsersOptions {
  page?: number;
  limit?: number;
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}

const DEFAULT_USER_PREFERENCES: UserPreferences = {
  propertyTypes: [],
  budgetRange: [500, 3000],
  locations: '',
  locationPreference: {
    label: '',
    radiusKm: 11,
  },
  notifications: {
    email: true,
    sms: false,
    push: true,
  },
  completed: false,
  skipped: false,
  language: 'en',
  timezone: 'UTC',
};

// ===========================================
// Users Service
// ===========================================

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ===========================================
  // CRUD Operations
  // ===========================================

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const user = this.userRepository.create({
      ...createUserDto,
      email: createUserDto.email.toLowerCase(),
      role: createUserDto.role || UserRole.TENANT,
    });

    return this.userRepository.save(user);
  }

  async findAll(options: FindUsersOptions = {}): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { role, status, search } = options;
    const parsedPage = Number.parseInt(String(options.page ?? 1), 10);
    const parsedLimit = Number.parseInt(String(options.limit ?? 10), 10);
    const page =
      Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const limit =
      Number.isInteger(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 100)
        : 10;
    const skip = (page - 1) * limit;
    const mongoRepository =
      this.userRepository.manager.getMongoRepository(User);
    const filter: any = {};

    if (role) {
      filter.role = role;
    }

    if (status) {
      filter.status = status;
    }

    if (search?.trim()) {
      const escapedSearch = search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedSearch, 'i');

      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
      ];
    }

    const [users, total] = await Promise.all([
      mongoRepository.find({
        where: filter,
        skip,
        take: limit,
        order: { createdAt: 'DESC' },
      }),
      mongoRepository.countDocuments(filter),
    ]);

    return {
      users: users.map((user) => user.toJSON() as User),
      total,
      page,
      limit,
    };
  }

  async findById(id: string): Promise<User> {
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      throw new NotFoundException('User not found');
    }

    const user = await this.userRepository.findOne({
      where: { _id: objectId as any },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  async findByRole(role: UserRole): Promise<any[]> {
    const users = await this.userRepository.find({
      where: { role },
      order: { createdAt: 'DESC' },
    });
    return users.map((u) => u.toJSON());
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    // Merge updates
    Object.assign(user, updateUserDto);

    return this.userRepository.save(user);
  }

  async getPreferences(id: string): Promise<UserPreferences> {
    const user = await this.findById(id);
    return {
      ...DEFAULT_USER_PREFERENCES,
      ...(user.preferences || {}),
    };
  }

  async updatePreferences(
    id: string,
    preferences: Partial<UserPreferences>,
  ): Promise<UserPreferences> {
    const user = await this.findById(id);
    const currentPreferences = {
      ...DEFAULT_USER_PREFERENCES,
      ...(user.preferences || {}),
    };

    const mergedNotifications = {
      email: currentPreferences.notifications?.email ?? true,
      sms: currentPreferences.notifications?.sms ?? false,
      push: currentPreferences.notifications?.push ?? true,
      ...(preferences.notifications || {}),
    };

    user.preferences = {
      ...currentPreferences,
      ...preferences,
      notifications: mergedNotifications,
    };

    const updatedUser = await this.userRepository.save(user);
    return {
      ...DEFAULT_USER_PREFERENCES,
      ...(updatedUser.preferences || {}),
    };
  }

  async updateStatus(id: string, status: UserStatus): Promise<User> {
    const user = await this.findById(id);
    user.status = status;
    return this.userRepository.save(user);
  }

  async updateRole(id: string, role: UserRole): Promise<User> {
    const user = await this.findById(id);
    user.role = role;
    return this.userRepository.save(user);
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.userRepository.remove(user);
  }

  async softDelete(id: string): Promise<void> {
    const user = await this.findById(id);
    user.status = UserStatus.INACTIVE;
    user.deletedAt = new Date();
    await this.userRepository.save(user);
  }

  /**
   * Permanently delete user account with GDPR compliance (anonymize PII)
   * This keeps a record for audit purposes but removes all personal identifiable information
   */
  async permanentDelete(id: string): Promise<void> {
    const user = await this.findById(id);

    // Anonymize personal information (GDPR compliance)
    user.firstName = `[Deleted User]`;
    user.lastName = `${new Date().getTime()}`;
    user.email = `deleted-${user._id.toHexString()}@smartproperty.local`;
    user.phone = undefined;
    user.avatar = undefined;
    user.address = undefined;

    // Clear all sensitive data
    user.password = undefined;
    user.refreshToken = undefined;
    user.emailVerificationToken = undefined;
    user.passwordResetToken = undefined;
    user.twoFactorSecret = undefined;
    user.previousPasswords = [];
    user.pendingEmail = undefined;

    // Mark as permanently deleted (cannot be restored or logged into)
    user.permanentlyDeleted = true;
    user.status = UserStatus.INACTIVE;
    user.deletedAt = new Date();
    user.isEmailVerified = false;
    user.twoFactorEnabled = false;
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    // Clear preferences
    if (user.preferences) {
      user.preferences = {
        language: 'en',
        timezone: 'UTC',
      };
    }

    await this.userRepository.save(user);
  }

  // ===========================================
  // Statistics
  // ===========================================

  async getUserStats(): Promise<{
    total: number;
    byRole: Record<UserRole, number>;
    byStatus: Record<UserStatus, number>;
    newThisMonth: number;
  }> {
    const total = await this.userRepository.count();

    const byRole = {} as Record<UserRole, number>;
    for (const role of Object.values(UserRole)) {
      byRole[role] = await this.userRepository.count({ where: { role } });
    }

    const byStatus = {} as Record<UserStatus, number>;
    for (const status of Object.values(UserStatus)) {
      byStatus[status] = await this.userRepository.count({ where: { status } });
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const mongoRepository =
      this.userRepository.manager.getMongoRepository(User);
    const newThisMonth = await mongoRepository.countDocuments({
      createdAt: { $gte: startOfMonth },
    });

    return { total, byRole, byStatus, newThisMonth };
  }
}
