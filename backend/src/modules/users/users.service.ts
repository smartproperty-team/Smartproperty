// ===========================================
// SmartProperty - Users Service
// ===========================================

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from './entities/user.entity';

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
  preferences?: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    smsNotifications?: boolean;
    language?: string;
    timezone?: string;
  };
}

export interface FindUsersOptions {
  page?: number;
  limit?: number;
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}

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
    const { page = 1, limit = 10, role, status, search } = options;
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere(
        '(user.firstName LIKE :search OR user.lastName LIKE :search OR user.email LIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.skip(skip).take(limit).orderBy('user.createdAt', 'DESC');

    const [users, total] = await queryBuilder.getManyAndCount();

    return {
      users: users.map((user) => user.toJSON() as User),
      total,
      page,
      limit,
    };
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { _id: id as any },
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

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    // Merge updates
    Object.assign(user, updateUserDto);

    return this.userRepository.save(user);
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

    const newThisMonth = await this.userRepository
      .createQueryBuilder('user')
      .where('user.createdAt >= :startOfMonth', { startOfMonth })
      .getCount();

    return { total, byRole, byStatus, newThisMonth };
  }
}
