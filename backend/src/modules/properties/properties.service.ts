// ===========================================
// SmartProperty - Properties Service
// ===========================================

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectId } from 'mongodb';
import { Repository } from 'typeorm';
import { UserRole } from '../users/entities/user.entity';
import { CreatePropertyDto, UpdatePropertyDto } from './dto/property.dto';
import {
  Property,
  PropertyStatus,
  PropertyType,
} from './entities/property.entity';

// ===========================================
// Query Options
// ===========================================

export interface FindPropertiesOptions {
  page?: number;
  limit?: number;
  type?: PropertyType;
  status?: PropertyStatus;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  ownerId?: string;
  managerId?: string;
  search?: string;
}

// ===========================================
// Properties Service
// ===========================================

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
  ) {}

  // ===========================================
  // Helpers
  // ===========================================

  private canManage(
    property: Property,
    userId: string,
    role: UserRole,
  ): boolean {
    if (role === UserRole.ADMIN) {
      return true;
    }

    if (property.ownerId === userId) {
      return true;
    }

    if (property.managerId && property.managerId === userId) {
      return true;
    }

    return false;
  }

  // ===========================================
  // CRUD Operations
  // ===========================================

  async create(
    createPropertyDto: CreatePropertyDto,
    currentUserId: string,
    currentUserRole: UserRole,
  ): Promise<Property> {
    if (createPropertyDto.ownerId && currentUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can assign ownerId');
    }

    if (createPropertyDto.managerId && currentUserRole === UserRole.TENANT) {
      throw new ForbiddenException('Tenants cannot assign a manager');
    }

    const ownerId = createPropertyDto.ownerId || currentUserId;

    // Build a clean object without undefined values – MongoDB's $jsonSchema
    // validator does not recognise "undefined" as a BSON type, so sending
    // keys with undefined values causes "Document failed validation" (code 121).
    const raw: Record<string, any> = {
      ...createPropertyDto,
      ownerId,
      status: createPropertyDto.status || PropertyStatus.AVAILABLE,
      currency: createPropertyDto.currency || 'USD',
    };

    // Remove every key whose value is undefined
    Object.keys(raw).forEach((key) => {
      if (raw[key] === undefined) {
        delete raw[key];
      }
    });

    const property = this.propertyRepository.create(raw as Partial<Property>);

    return this.propertyRepository.save(property);
  }

  async findAll(options: FindPropertiesOptions = {}): Promise<{
    properties: Property[];
    total: number;
    page: number;
    limit: number;
  }> {
    const parseIntSafe = (value: unknown, fallback: number): number => {
      const parsed = Number.parseInt(String(value), 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    };

    const parseNumber = (value: unknown): number | undefined => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }

      const parsed = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    const page = parseIntSafe(options.page, 1);
    const limit = parseIntSafe(options.limit, 12);
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {
      deletedAt: null,
    };

    if (options.type) {
      where.type = options.type;
    }

    if (options.status) {
      where.status = options.status;
    }

    if (options.ownerId) {
      where.ownerId = options.ownerId;
    }

    if (options.managerId) {
      where.managerId = options.managerId;
    }

    if (options.city) {
      where['address.city'] = options.city;
    }

    const minPrice = parseNumber(options.minPrice);
    const maxPrice = parseNumber(options.maxPrice);

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {
        $gte: minPrice ?? 0,
        $lte: maxPrice ?? Number.MAX_SAFE_INTEGER,
      };
    }

    if (options.search) {
      where.$or = [
        { title: { $regex: options.search, $options: 'i' } },
        { description: { $regex: options.search, $options: 'i' } },
      ];
    }

    const [properties, total] = await this.propertyRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      properties: properties.map((property) => property.toJSON() as Property),
      total,
      page,
      limit,
    };
  }

  async findById(id: string): Promise<Property> {
    let objectId: ObjectId;

    try {
      objectId = new ObjectId(id);
    } catch {
      throw new NotFoundException('Property not found');
    }

    const property = await this.propertyRepository.findOne({
      where: { _id: objectId },
    });

    if (!property || property.deletedAt) {
      throw new NotFoundException('Property not found');
    }

    return property;
  }

  async update(
    id: string,
    updatePropertyDto: UpdatePropertyDto,
    currentUserId: string,
    currentUserRole: UserRole,
  ): Promise<Property> {
    const property = await this.findById(id);

    if (!this.canManage(property, currentUserId, currentUserRole)) {
      throw new ForbiddenException('You do not have access to this property');
    }

    if (updatePropertyDto.ownerId && currentUserRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can change ownerId');
    }

    if (updatePropertyDto.address) {
      property.address = {
        ...property.address,
        ...updatePropertyDto.address,
        coordinates: updatePropertyDto.address.coordinates
          ? {
              ...property.address?.coordinates,
              ...updatePropertyDto.address.coordinates,
            }
          : property.address?.coordinates,
      };
    }

    if (updatePropertyDto.features) {
      property.features = {
        ...property.features,
        ...updatePropertyDto.features,
      };
    }

    const remainingUpdates = { ...updatePropertyDto };
    delete remainingUpdates.address;
    delete remainingUpdates.features;

    Object.assign(property, remainingUpdates);

    return this.propertyRepository.save(property);
  }

  async remove(
    id: string,
    currentUserId: string,
    currentUserRole: UserRole,
  ): Promise<void> {
    const property = await this.findById(id);

    if (!this.canManage(property, currentUserId, currentUserRole)) {
      throw new ForbiddenException('You do not have access to this property');
    }

    property.status = PropertyStatus.UNLISTED;
    property.deletedAt = new Date();

    await this.propertyRepository.save(property);
  }
}
