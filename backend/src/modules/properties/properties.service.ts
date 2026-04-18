// ===========================================
// SmartProperty - Properties Service
// ===========================================

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectId } from 'mongodb';
import * as QRCode from 'qrcode';
import { MongoRepository, Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { Agency } from '../agencies/entities/agency.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { hasPlatformAdminRole } from '../users/role-groups';
import {
  PortfolioConnectorId,
  PortfolioConnectorSyncDto,
  PortfolioImportRowDto,
} from './dto/portfolio.dto';
import { CreatePropertyDto, UpdatePropertyDto } from './dto/property.dto';
import {
  Property,
  PropertyCategory,
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
  category?: PropertyCategory;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  nearLat?: number;
  nearLng?: number;
  radiusKm?: number;
  city?: string;
  ownerId?: string;
  managerId?: string;
  search?: string;
}

export interface PortfolioFilters {
  type?: PropertyType;
  status?: PropertyStatus;
  city?: string;
  category?: PropertyCategory;
  scope?: 'owner' | 'manager' | 'all';
}

export interface PortfolioSummary {
  totals: {
    properties: number;
    listed: number;
    rented: number;
    maintenance: number;
    avgPrice: number;
  };
  byCategory: Record<PropertyCategory, number>;
  byStatus: Record<PropertyStatus, number>;
  topCities: Array<{ city: string; count: number }>;
  dataQuality: {
    missingDescription: number;
    missingImages: number;
    missingCoordinates: number;
    missingCoreFeatures: number;
    avgCompletenessScore: number;
  };
}

export interface PortfolioImportIssue {
  rowNumber: number;
  code: string;
  message: string;
}

export interface PortfolioImportPreviewResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warnings: number;
  errors: PortfolioImportIssue[];
  warningItems: PortfolioImportIssue[];
  acceptedRows: PortfolioImportRowDto[];
}

export interface PortfolioImportCommitResult {
  created: number;
  skipped: number;
  failed: number;
  issues: PortfolioImportIssue[];
}

export interface PortfolioBinaryFileResult {
  fileName: string;
  contentType: string;
  base64: string;
}

export interface PortfolioConnectorDefinition {
  id: PortfolioConnectorId;
  label: string;
  description: string;
  supportsPush: boolean;
  requiredFields: string[];
}

export interface PortfolioConnectorSyncResult {
  connectorId: PortfolioConnectorId;
  dryRun: boolean;
  totalRecords: number;
  mappedRecords: number;
  failedRecords: number;
  pushedRecords: number;
  endpointUrl?: string;
  payloadSample: Array<Record<string, unknown>>;
  issues: PortfolioImportIssue[];
}

// ===========================================
// Properties Service
// ===========================================

@Injectable()
export class PropertiesService {
  private readonly portfolioConnectorCatalog: PortfolioConnectorDefinition[] = [
    {
      id: PortfolioConnectorId.SELOGER,
      label: 'SeLoger Connector',
      description: 'Formats portfolio listings for SeLoger distribution.',
      supportsPush: false,
      requiredFields: ['title', 'price', 'city', 'country', 'type', 'status'],
    },
    {
      id: PortfolioConnectorId.LEBONCOIN,
      label: 'LeBonCoin Connector',
      description: 'Formats portfolio listings for LeBonCoin publication feed.',
      supportsPush: false,
      requiredFields: ['title', 'price', 'city', 'country', 'category'],
    },
    {
      id: PortfolioConnectorId.WEBHOOK,
      label: 'Generic Webhook Connector',
      description:
        'Dispatches normalized listing payload to a partner endpoint URL.',
      supportsPush: true,
      requiredFields: ['title', 'price', 'city', 'country'],
    },
  ];

  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(User)
    private readonly usersRepository: MongoRepository<User>,
    @InjectRepository(Agency)
    private readonly agenciesRepository: MongoRepository<Agency>,
  ) {}

  private async getAgencyManagerIdForOwner(
    ownerId: string,
  ): Promise<string | undefined> {
    if (!ObjectId.isValid(ownerId)) {
      return undefined;
    }

    const owner = await this.usersRepository.findOne({
      where: { _id: new ObjectId(ownerId) },
    });

    if (!owner?.agencyId || !ObjectId.isValid(owner.agencyId)) {
      return undefined;
    }

    const agency = await this.agenciesRepository.findOne({
      where: { _id: new ObjectId(owner.agencyId) },
    });

    if (!agency?.createdBy) {
      return undefined;
    }

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

  private async getAgencyOwnerIdsForManager(
    managerId?: string,
  ): Promise<string[]> {
    if (!managerId || !ObjectId.isValid(managerId)) {
      return [];
    }

    const manager = await this.usersRepository.findOne({
      where: { _id: new ObjectId(managerId) },
    });

    if (!manager?.agencyId || !ObjectId.isValid(manager.agencyId)) {
      return [];
    }

    const owners = await this.usersRepository.find({
      where: {
        agencyId: manager.agencyId,
        role: UserRole.OWNER,
        deletedAt: null as any,
      },
    });

    return Array.from(new Set(owners.map((owner) => owner.id)));
  }

  private async mapPropertiesWithOwnerSummary(properties: Property[]) {
    if (!properties.length) {
      return [];
    }

    const ownerIds = Array.from(
      new Set(properties.map((property) => property.ownerId).filter(Boolean)),
    ).filter((ownerId) => ObjectId.isValid(ownerId));

    const owners = await this.usersRepository.find({
      where: {
        _id: { $in: ownerIds.map((ownerId) => new ObjectId(ownerId)) } as any,
      },
    });

    const ownersById = new Map(
      owners.map((owner) => [
        owner.id,
        {
          id: owner.id,
          name: owner.fullName,
          email: owner.email,
        },
      ]),
    );

    return properties.map((property) => {
      const json = property.toJSON() as any;
      const owner = ownersById.get(property.ownerId);

      if (owner) {
        json.owner = owner;
      }

      return json;
    });
  }

  // ===========================================
  // Helpers
  // ===========================================

  /** Escape special regex characters in user input */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private calculateDistanceKm(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
  ): number {
    const earthRadiusKm = 6371;
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

    const dLat = toRadians(to.lat - from.lat);
    const dLng = toRadians(to.lng - from.lng);
    const lat1 = toRadians(from.lat);
    const lat2 = toRadians(to.lat);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusKm * c;
  }

  private canManage(
    property: Property,
    userId: string,
    role: UserRole,
  ): boolean {
    if (hasPlatformAdminRole(role)) {
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

  private canAccessPortfolio(role: UserRole): boolean {
    return (
      hasPlatformAdminRole(role) ||
      role === UserRole.OWNER ||
      role === UserRole.BRANCH_MANAGER ||
      role === UserRole.REAL_ESTATE_AGENT ||
      role === UserRole.RENTAL_MANAGER ||
      role === UserRole.ACCOUNTANT_ADMIN_ASSISTANT
    );
  }

  private buildScopedWhere(
    currentUserId: string,
    currentUserRole: UserRole,
    scope?: 'owner' | 'manager' | 'all',
  ): Record<string, any> {
    const where: Record<string, any> = {
      deletedAt: null,
    };

    if (hasPlatformAdminRole(currentUserRole)) {
      if (scope === 'owner') {
        where.ownerId = currentUserId;
      }

      if (scope === 'manager') {
        where.managerId = currentUserId;
      }

      return where;
    }

    if (currentUserRole === UserRole.OWNER) {
      where.ownerId = currentUserId;
      return where;
    }

    if (
      currentUserRole === UserRole.BRANCH_MANAGER ||
      currentUserRole === UserRole.REAL_ESTATE_AGENT ||
      currentUserRole === UserRole.RENTAL_MANAGER
    ) {
      where.managerId = currentUserId;
      return where;
    }

    if (currentUserRole === UserRole.ACCOUNTANT_ADMIN_ASSISTANT) {
      if (scope === 'owner') {
        where.ownerId = currentUserId;
      } else {
        where.managerId = currentUserId;
      }

      return where;
    }

    throw new ForbiddenException('You do not have access to portfolio data');
  }

  private applyPortfolioFilters(
    where: Record<string, any>,
    filters: PortfolioFilters,
  ): Record<string, any> {
    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.city) {
      const safeCity = this.escapeRegex(filters.city);
      where['address.city'] = { $regex: `^${safeCity}$`, $options: 'i' };
    }

    return where;
  }

  private toCsvValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined) {
      return '';
    }

    const normalized = String(value).replace(/\r?\n|\r/g, ' ');
    const escaped = normalized.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  private getCompletenessScore(property: Property): number {
    const checks = [
      !!property.description?.trim(),
      !!property.images?.length,
      !!property.address?.coordinates,
      !!(
        property.features &&
        property.features.area !== undefined &&
        property.features.bedrooms !== undefined &&
        property.features.bathrooms !== undefined
      ),
      !!property.virtualTour,
    ];

    const passed = checks.filter(Boolean).length;
    return Math.round((passed / checks.length) * 100);
  }

  private parseCsvRows(csvContent: string): {
    headers: string[];
    rows: string[][];
  } {
    const sanitized = csvContent.replace(/^\uFEFF/, '').trim();
    if (!sanitized) {
      return { headers: [], rows: [] };
    }

    const rows: string[][] = [];
    let currentCell = '';
    let currentRow: string[] = [];
    let inQuotes = false;

    for (let i = 0; i < sanitized.length; i += 1) {
      const char = sanitized[i];
      const next = sanitized[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          currentCell += '"';
          i += 1;
          continue;
        }

        inQuotes = !inQuotes;
        continue;
      }

      if (char === ',' && !inQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
        continue;
      }

      if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && next === '\n') {
          i += 1;
        }

        currentRow.push(currentCell.trim());
        if (currentRow.some((cell) => cell.length > 0)) {
          rows.push(currentRow);
        }

        currentCell = '';
        currentRow = [];
        continue;
      }

      currentCell += char;
    }

    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }

    if (rows.length === 0) {
      return { headers: [], rows: [] };
    }

    const [headerRow, ...dataRows] = rows;
    const headers = headerRow.map((value) => value.toLowerCase().trim());
    return { headers, rows: dataRows };
  }

  private parseXlsxRows(fileBuffer: Buffer): {
    headers: string[];
    rows: string[][];
  } {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { headers: [], rows: [] };
    }

    const sheet = workbook.Sheets[firstSheetName];
    const matrix = XLSX.utils.sheet_to_json<
      (string | number | boolean | null)[]
    >(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
      raw: false,
    });

    if (!matrix.length) {
      return { headers: [], rows: [] };
    }

    const [headerRow, ...dataRows] = matrix;
    const headers = headerRow.map((value) =>
      String(value).toLowerCase().trim(),
    );
    const rows = dataRows.map((row) =>
      row.map((value) => String(value).trim()),
    );
    return { headers, rows };
  }

  private getPortfolioExportRows(
    properties: Property[],
  ): Array<Record<string, string | number | undefined>> {
    return properties.map((property) => ({
      propertyId: property.id,
      title: property.title,
      description: property.description,
      category: property.category || PropertyCategory.RENTAL,
      status: property.status,
      type: property.type,
      price: property.price,
      currency: property.currency,
      street: property.address?.street,
      city: property.address?.city,
      state: property.address?.state,
      zipCode: property.address?.zipCode,
      country: property.address?.country,
      lat: property.address?.coordinates?.lat,
      lng: property.address?.coordinates?.lng,
      ownerId: property.ownerId,
      managerId: property.managerId,
      createdAt: property.createdAt?.toISOString(),
      updatedAt: property.updatedAt?.toISOString(),
    }));
  }

  private buildPortfolioTemplateRows(): Array<Record<string, string | number>> {
    return [
      {
        title: 'Example apartment',
        description: 'Bright unit close to city center',
        category: 'rental',
        status: 'available',
        type: 'apartment',
        price: 1200,
        currency: 'USD',
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        lat: 40.7128,
        lng: -74.006,
        ownerId: '',
        managerId: '',
      },
    ];
  }

  private mapImportRow(
    headers: string[],
    rowValues: string[],
  ): PortfolioImportRowDto {
    const rowMap = new Map<string, string>();
    headers.forEach((header, index) => {
      rowMap.set(header, (rowValues[index] || '').trim());
    });

    return {
      title: rowMap.get('title') || '',
      description: rowMap.get('description') || undefined,
      type: (rowMap.get('type') as PropertyType) || PropertyType.APARTMENT,
      status:
        (rowMap.get('status') as PropertyStatus) || PropertyStatus.AVAILABLE,
      category:
        (rowMap.get('category') as PropertyCategory) || PropertyCategory.RENTAL,
      price: rowMap.get('price') || '',
      currency: rowMap.get('currency') || 'USD',
      city: rowMap.get('city') || '',
      country: rowMap.get('country') || '',
      street: rowMap.get('street') || undefined,
      state: rowMap.get('state') || undefined,
      zipCode: rowMap.get('zipcode') || rowMap.get('zipCode') || undefined,
      ownerId: rowMap.get('ownerid') || rowMap.get('ownerId') || undefined,
      managerId:
        rowMap.get('managerid') || rowMap.get('managerId') || undefined,
      lat: rowMap.get('lat') || undefined,
      lng: rowMap.get('lng') || undefined,
    };
  }

  private validateImportRow(
    row: PortfolioImportRowDto,
    rowNumber: number,
    duplicateKeySet: Set<string>,
  ): { errors: PortfolioImportIssue[]; warnings: PortfolioImportIssue[] } {
    const errors: PortfolioImportIssue[] = [];
    const warnings: PortfolioImportIssue[] = [];

    if (!row.title) {
      errors.push({
        rowNumber,
        code: 'MISSING_TITLE',
        message: 'title is required',
      });
    }

    if (!Object.values(PropertyType).includes(row.type)) {
      errors.push({
        rowNumber,
        code: 'INVALID_TYPE',
        message: `type must be one of: ${Object.values(PropertyType).join(', ')}`,
      });
    }

    if (!Object.values(PropertyStatus).includes(row.status)) {
      errors.push({
        rowNumber,
        code: 'INVALID_STATUS',
        message: `status must be one of: ${Object.values(PropertyStatus).join(', ')}`,
      });
    }

    if (!Object.values(PropertyCategory).includes(row.category)) {
      errors.push({
        rowNumber,
        code: 'INVALID_CATEGORY',
        message: `category must be one of: ${Object.values(PropertyCategory).join(', ')}`,
      });
    }

    const parsedPrice = Number(row.price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      errors.push({
        rowNumber,
        code: 'INVALID_PRICE',
        message: 'price must be a positive number',
      });
    }

    if (!row.city) {
      errors.push({
        rowNumber,
        code: 'MISSING_CITY',
        message: 'city is required',
      });
    }

    if (!row.country) {
      errors.push({
        rowNumber,
        code: 'MISSING_COUNTRY',
        message: 'country is required',
      });
    }

    if (!row.street || !row.state || !row.zipCode) {
      warnings.push({
        rowNumber,
        code: 'MISSING_ADDRESS_FIELDS',
        message:
          'street/state/zipCode missing; defaults will be used during import',
      });
    }

    const duplicateKey = `${row.title.toLowerCase()}|${row.city.toLowerCase()}|${row.price}`;
    if (duplicateKeySet.has(duplicateKey)) {
      warnings.push({
        rowNumber,
        code: 'DUPLICATE_IN_FILE',
        message: 'possible duplicate row detected in this file',
      });
    } else {
      duplicateKeySet.add(duplicateKey);
    }

    return { errors, warnings };
  }

  private toImportScopedIds(
    row: PortfolioImportRowDto,
    currentUserId: string,
    currentUserRole: UserRole,
  ): { ownerId: string; managerId?: string } {
    if (hasPlatformAdminRole(currentUserRole)) {
      return {
        ownerId: row.ownerId || currentUserId,
        managerId: row.managerId,
      };
    }

    if (currentUserRole === UserRole.OWNER) {
      return {
        ownerId: currentUserId,
        managerId: row.managerId,
      };
    }

    if (
      currentUserRole === UserRole.BRANCH_MANAGER ||
      currentUserRole === UserRole.REAL_ESTATE_AGENT ||
      currentUserRole === UserRole.RENTAL_MANAGER
    ) {
      return {
        ownerId: row.ownerId || currentUserId,
        managerId: currentUserId,
      };
    }

    throw new ForbiddenException(
      'You do not have access to import portfolio data',
    );
  }

  private mapConnectorPayload(
    property: Property,
    connectorId: PortfolioConnectorId,
  ): Record<string, unknown> {
    const basePayload: Record<string, unknown> = {
      externalId: property.id,
      title: property.title,
      description: property.description,
      type: property.type,
      status: property.status,
      category: property.category || PropertyCategory.RENTAL,
      price: property.price,
      currency: property.currency,
      location: {
        street: property.address?.street,
        city: property.address?.city,
        state: property.address?.state,
        zipCode: property.address?.zipCode,
        country: property.address?.country,
        coordinates: property.address?.coordinates,
      },
      features: property.features,
      images: (property.images || []).map((image) => image.url),
      virtualTour: property.virtualTour,
      ownerId: property.ownerId,
      managerId: property.managerId,
      publishedAt: property.createdAt,
      updatedAt: property.updatedAt,
    };

    if (connectorId === PortfolioConnectorId.SELOGER) {
      return {
        ...basePayload,
        listingType:
          property.category === PropertyCategory.SALE ? 'sell' : 'rent',
        source: 'smartproperty-seloger',
      };
    }

    if (connectorId === PortfolioConnectorId.LEBONCOIN) {
      return {
        ...basePayload,
        adCategory:
          property.category === PropertyCategory.MANAGEMENT
            ? 'service'
            : 'real_estate',
        source: 'smartproperty-leboncoin',
      };
    }

    return {
      ...basePayload,
      source: 'smartproperty-webhook',
    };
  }

  private validateConnectorRequiredFields(
    property: Property,
    connector: PortfolioConnectorDefinition,
    rowNumber: number,
  ): PortfolioImportIssue[] {
    const issues: PortfolioImportIssue[] = [];

    if (!property.title?.trim()) {
      issues.push({
        rowNumber,
        code: 'MISSING_TITLE',
        message: `${connector.label}: title is required`,
      });
    }

    if (property.price === undefined || property.price === null) {
      issues.push({
        rowNumber,
        code: 'MISSING_PRICE',
        message: `${connector.label}: price is required`,
      });
    }

    if (!property.address?.city?.trim()) {
      issues.push({
        rowNumber,
        code: 'MISSING_CITY',
        message: `${connector.label}: city is required`,
      });
    }

    if (!property.address?.country?.trim()) {
      issues.push({
        rowNumber,
        code: 'MISSING_COUNTRY',
        message: `${connector.label}: country is required`,
      });
    }

    return issues;
  }

  // ===========================================
  // CRUD Operations
  // ===========================================

  async create(
    createPropertyDto: CreatePropertyDto,
    currentUserId: string,
    currentUserRole: UserRole,
  ): Promise<Property> {
    if (createPropertyDto.ownerId && !hasPlatformAdminRole(currentUserRole)) {
      throw new ForbiddenException('Only admins can assign ownerId');
    }

    if (createPropertyDto.managerId && currentUserRole === UserRole.TENANT) {
      throw new ForbiddenException('Tenants cannot assign a manager');
    }

    const requestedOwnerId = createPropertyDto.ownerId?.trim();
    const requestedManagerId = createPropertyDto.managerId?.trim();

    const ownerId = requestedOwnerId || currentUserId;

    const shouldAutoAssignManager =
      currentUserRole === UserRole.BRANCH_MANAGER ||
      currentUserRole === UserRole.REAL_ESTATE_AGENT ||
      currentUserRole === UserRole.RENTAL_MANAGER;

    let managerId =
      requestedManagerId ||
      (shouldAutoAssignManager ? currentUserId : undefined);

    if (!managerId && currentUserRole === UserRole.OWNER) {
      managerId = await this.getAgencyManagerIdForOwner(currentUserId);
    }

    // Build a clean object without undefined values – MongoDB's $jsonSchema
    // validator does not recognise "undefined" as a BSON type, so sending
    // keys with undefined values causes "Document failed validation" (code 121).
    const raw: Record<string, any> = {
      ...createPropertyDto,
      ownerId,
      managerId,
      status: createPropertyDto.status || PropertyStatus.AVAILABLE,
      currency: createPropertyDto.currency || 'USD',
      createdAt: new Date(),
      updatedAt: new Date(),
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

    const managerAgencyOwnerIds = await this.getAgencyOwnerIdsForManager(
      options.managerId,
    );

    if (options.type) {
      where.type = options.type;
    }

    if (options.status) {
      where.status = options.status;
    }

    if (options.category) {
      where.category = options.category;
    }

    if (options.ownerId) {
      where.ownerId = options.ownerId;
    }

    if (options.managerId) {
      where.managerId = options.managerId;
    }

    if (options.city) {
      const safeCity = this.escapeRegex(options.city);
      where['address.city'] = { $regex: `^${safeCity}$`, $options: 'i' };
    }

    const minPrice = parseNumber(options.minPrice);
    const maxPrice = parseNumber(options.maxPrice);
    const bedrooms = parseNumber(options.bedrooms);
    const bathrooms = parseNumber(options.bathrooms);
    const nearLat = parseNumber(options.nearLat);
    const nearLng = parseNumber(options.nearLng);
    const radiusKm = parseNumber(options.radiusKm) ?? 5;

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {
        $gte: minPrice ?? 0,
        $lte: maxPrice ?? Number.MAX_SAFE_INTEGER,
      };
    }

    if (bedrooms !== undefined) {
      where['features.bedrooms'] = bedrooms;
    }

    if (bathrooms !== undefined) {
      where['features.bathrooms'] = bathrooms;
    }

    if (options.search) {
      const safeSearch = this.escapeRegex(options.search);
      where.$or = [
        { title: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    let effectiveWhere: Record<string, any> = where;

    if (options.managerId && managerAgencyOwnerIds.length > 0) {
      const managerScopeOr = [
        { managerId: options.managerId },
        { ownerId: { $in: managerAgencyOwnerIds } },
      ];

      const baseWhere = { ...where };
      const existingSearchOr = baseWhere.$or;
      delete baseWhere.$or;
      delete baseWhere.managerId;

      if (existingSearchOr) {
        effectiveWhere = {
          $and: [baseWhere, { $or: existingSearchOr }, { $or: managerScopeOr }],
        };
      } else {
        effectiveWhere = {
          ...baseWhere,
          $or: managerScopeOr,
        };
      }
    }

    const hasNearbyFilter = nearLat !== undefined && nearLng !== undefined;

    if (hasNearbyFilter) {
      const allMatching = await this.propertyRepository.find({
        where: effectiveWhere,
        order: { createdAt: 'DESC' },
      });

      const center = { lat: nearLat, lng: nearLng };
      const filtered = allMatching.filter((property) => {
        const coords = property.address?.coordinates;
        if (!coords) {
          return false;
        }

        const distance = this.calculateDistanceKm(center, coords);
        return distance <= radiusKm;
      });

      const total = filtered.length;
      const properties = filtered.slice(skip, skip + limit);

      const serializedProperties =
        await this.mapPropertiesWithOwnerSummary(properties);

      return {
        properties: serializedProperties as Property[],
        total,
        page,
        limit,
      };
    }

    const [properties, total] = await this.propertyRepository.findAndCount({
      where: effectiveWhere,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const serializedProperties =
      await this.mapPropertiesWithOwnerSummary(properties);

    return {
      properties: serializedProperties as Property[],
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

    if (
      Object.prototype.hasOwnProperty.call(updatePropertyDto, 'ownerId') &&
      !hasPlatformAdminRole(currentUserRole)
    ) {
      throw new ForbiddenException('Only admins can change ownerId');
    }

    if (Object.prototype.hasOwnProperty.call(updatePropertyDto, 'ownerId')) {
      const normalizedOwnerId = updatePropertyDto.ownerId?.trim();

      if (!normalizedOwnerId) {
        throw new BadRequestException('ownerId cannot be empty');
      }

      if (!ObjectId.isValid(normalizedOwnerId)) {
        throw new BadRequestException('ownerId must be a valid ObjectId');
      }

      updatePropertyDto.ownerId = normalizedOwnerId;
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

  async generateShareQRCode(shareUrl: string): Promise<string> {
    return QRCode.toDataURL(shareUrl, {
      margin: 1,
      width: 280,
    });
  }

  async getPortfolioSummary(
    currentUserId: string,
    currentUserRole: UserRole,
    filters: PortfolioFilters = {},
  ): Promise<PortfolioSummary> {
    if (!this.canAccessPortfolio(currentUserRole)) {
      throw new ForbiddenException('You do not have access to portfolio data');
    }

    const scopedWhere = this.buildScopedWhere(
      currentUserId,
      currentUserRole,
      filters.scope,
    );
    const where = this.applyPortfolioFilters(scopedWhere, filters);

    const properties = await this.propertyRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    const totals = {
      properties: properties.length,
      listed: properties.filter((p) => p.status === PropertyStatus.AVAILABLE)
        .length,
      rented: properties.filter((p) => p.status === PropertyStatus.RENTED)
        .length,
      maintenance: properties.filter(
        (p) => p.status === PropertyStatus.MAINTENANCE,
      ).length,
      avgPrice:
        properties.length > 0
          ? Math.round(
              properties.reduce((sum, property) => sum + property.price, 0) /
                properties.length,
            )
          : 0,
    };

    const byCategory: Record<PropertyCategory, number> = {
      [PropertyCategory.SALE]: 0,
      [PropertyCategory.RENTAL]: 0,
      [PropertyCategory.MANAGEMENT]: 0,
    };

    const byStatus: Record<PropertyStatus, number> = {
      [PropertyStatus.AVAILABLE]: 0,
      [PropertyStatus.RENTED]: 0,
      [PropertyStatus.MAINTENANCE]: 0,
      [PropertyStatus.UNLISTED]: 0,
    };

    const cityMap = new Map<string, number>();
    let missingDescription = 0;
    let missingImages = 0;
    let missingCoordinates = 0;
    let missingCoreFeatures = 0;
    let completenessTotal = 0;

    for (const property of properties) {
      byCategory[property.category || PropertyCategory.RENTAL] += 1;
      byStatus[property.status] += 1;

      const city = property.address?.city?.trim();
      if (city) {
        cityMap.set(city, (cityMap.get(city) || 0) + 1);
      }

      if (!property.description?.trim()) {
        missingDescription += 1;
      }

      if (!property.images?.length) {
        missingImages += 1;
      }

      if (!property.address?.coordinates) {
        missingCoordinates += 1;
      }

      if (
        !property.features ||
        property.features.area === undefined ||
        property.features.bedrooms === undefined ||
        property.features.bathrooms === undefined
      ) {
        missingCoreFeatures += 1;
      }

      completenessTotal += this.getCompletenessScore(property);
    }

    const topCities = [...cityMap.entries()]
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totals,
      byCategory,
      byStatus,
      topCities,
      dataQuality: {
        missingDescription,
        missingImages,
        missingCoordinates,
        missingCoreFeatures,
        avgCompletenessScore:
          properties.length > 0
            ? Math.round(completenessTotal / properties.length)
            : 0,
      },
    };
  }

  async exportPortfolioCsv(
    currentUserId: string,
    currentUserRole: UserRole,
    filters: PortfolioFilters = {},
  ): Promise<{ fileName: string; contentType: string; csv: string }> {
    if (!this.canAccessPortfolio(currentUserRole)) {
      throw new ForbiddenException('You do not have access to portfolio data');
    }

    const scopedWhere = this.buildScopedWhere(
      currentUserId,
      currentUserRole,
      filters.scope,
    );
    const where = this.applyPortfolioFilters(scopedWhere, filters);

    const properties = await this.propertyRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    const exportRows = this.getPortfolioExportRows(properties);

    const headers = [
      'propertyId',
      'title',
      'description',
      'category',
      'status',
      'type',
      'price',
      'currency',
      'street',
      'city',
      'state',
      'zipCode',
      'country',
      'lat',
      'lng',
      'ownerId',
      'managerId',
      'createdAt',
      'updatedAt',
    ];

    const lines = [headers.join(',')];

    for (const row of exportRows) {
      lines.push(
        [
          this.toCsvValue(row.propertyId as string),
          this.toCsvValue(row.title as string),
          this.toCsvValue(row.description as string | undefined),
          this.toCsvValue(row.category as string),
          this.toCsvValue(row.status as string),
          this.toCsvValue(row.type as string),
          this.toCsvValue(row.price as number),
          this.toCsvValue(row.currency as string),
          this.toCsvValue(row.street as string | undefined),
          this.toCsvValue(row.city as string | undefined),
          this.toCsvValue(row.state as string | undefined),
          this.toCsvValue(row.zipCode as string | undefined),
          this.toCsvValue(row.country as string | undefined),
          this.toCsvValue(row.lat as number | undefined),
          this.toCsvValue(row.lng as number | undefined),
          this.toCsvValue(row.ownerId as string),
          this.toCsvValue(row.managerId as string | undefined),
          this.toCsvValue(row.createdAt as string | undefined),
          this.toCsvValue(row.updatedAt as string | undefined),
        ].join(','),
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    const fileName = `portfolio-export-${today}.csv`;

    return {
      fileName,
      contentType: 'text/csv; charset=utf-8',
      csv: lines.join('\n'),
    };
  }

  async exportPortfolioExcel(
    currentUserId: string,
    currentUserRole: UserRole,
    filters: PortfolioFilters = {},
  ): Promise<PortfolioBinaryFileResult> {
    if (!this.canAccessPortfolio(currentUserRole)) {
      throw new ForbiddenException('You do not have access to portfolio data');
    }

    const scopedWhere = this.buildScopedWhere(
      currentUserId,
      currentUserRole,
      filters.scope,
    );
    const where = this.applyPortfolioFilters(scopedWhere, filters);

    const properties = await this.propertyRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    const rows = this.getPortfolioExportRows(properties);
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PortfolioExport');

    const base64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
    const today = new Date().toISOString().slice(0, 10);

    return {
      fileName: `portfolio-export-${today}.xlsx`,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      base64,
    };
  }

  getPortfolioImportTemplateExcel(): PortfolioBinaryFileResult {
    const worksheet = XLSX.utils.json_to_sheet(
      this.buildPortfolioTemplateRows(),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    const base64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });

    return {
      fileName: 'portfolio-import-template.xlsx',
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      base64,
    };
  }

  async previewPortfolioImportFile(
    fileBuffer: Buffer,
    fileName: string | undefined,
    mimeType: string | undefined,
    currentUserRole: UserRole,
  ): Promise<PortfolioImportPreviewResult> {
    if (
      !hasPlatformAdminRole(currentUserRole) &&
      currentUserRole !== UserRole.OWNER &&
      currentUserRole !== UserRole.BRANCH_MANAGER &&
      currentUserRole !== UserRole.REAL_ESTATE_AGENT &&
      currentUserRole !== UserRole.RENTAL_MANAGER
    ) {
      throw new ForbiddenException(
        'You do not have access to import portfolio data',
      );
    }

    const extension = (fileName || '').toLowerCase();
    const isXlsxFile =
      extension.endsWith('.xlsx') ||
      mimeType ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const csvContent = fileBuffer.toString('utf-8');
    const { headers, rows } = isXlsxFile
      ? this.parseXlsxRows(fileBuffer)
      : this.parseCsvRows(csvContent);
    if (!headers.length) {
      return {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        warnings: 0,
        errors: [],
        warningItems: [],
        acceptedRows: [],
      };
    }

    const issues: PortfolioImportIssue[] = [];
    const warnings: PortfolioImportIssue[] = [];
    const acceptedRows: PortfolioImportRowDto[] = [];
    const duplicateKeySet = new Set<string>();

    rows.forEach((rowValues, index) => {
      const rowNumber = index + 2;
      const mapped = this.mapImportRow(headers, rowValues);
      const validation = this.validateImportRow(
        mapped,
        rowNumber,
        duplicateKeySet,
      );

      issues.push(...validation.errors);
      warnings.push(...validation.warnings);

      if (validation.errors.length === 0) {
        acceptedRows.push(mapped);
      }
    });

    return {
      totalRows: rows.length,
      validRows: acceptedRows.length,
      invalidRows: rows.length - acceptedRows.length,
      warnings: warnings.length,
      errors: issues,
      warningItems: warnings,
      acceptedRows,
    };
  }

  async commitPortfolioImportRows(
    rows: PortfolioImportRowDto[],
    currentUserId: string,
    currentUserRole: UserRole,
    skipDuplicates = true,
  ): Promise<PortfolioImportCommitResult> {
    const issues: PortfolioImportIssue[] = [];
    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const rowNumber = i + 1;

      const { errors } = this.validateImportRow(
        row,
        rowNumber,
        new Set<string>(),
      );
      if (errors.length > 0) {
        issues.push(...errors);
        failed += 1;
        continue;
      }

      const scopedIds = this.toImportScopedIds(
        row,
        currentUserId,
        currentUserRole,
      );

      if (skipDuplicates) {
        const duplicate = await this.propertyRepository.findOne({
          where: {
            deletedAt: null,
            ownerId: scopedIds.ownerId,
            title: row.title,
            'address.city': row.city,
            price: Number(row.price),
          } as Record<string, any>,
        });

        if (duplicate) {
          skipped += 1;
          issues.push({
            rowNumber,
            code: 'SKIPPED_DUPLICATE',
            message: 'duplicate property skipped',
          });
          continue;
        }
      }

      const lat = row.lat ? Number(row.lat) : undefined;
      const lng = row.lng ? Number(row.lng) : undefined;

      const property = this.propertyRepository.create({
        title: row.title,
        description: row.description,
        type: row.type,
        status: row.status,
        category: row.category,
        price: Number(row.price),
        currency: (row.currency || 'USD').toUpperCase(),
        address: {
          street: row.street || 'Unknown street',
          city: row.city,
          state: row.state || 'Unknown state',
          zipCode: row.zipCode || '00000',
          country: row.country,
          coordinates:
            Number.isFinite(lat) && Number.isFinite(lng)
              ? { lat: lat as number, lng: lng as number }
              : undefined,
        },
        ownerId: scopedIds.ownerId,
        managerId: scopedIds.managerId,
      } as Partial<Property>);

      try {
        await this.propertyRepository.save(property);
        created += 1;
      } catch {
        failed += 1;
        issues.push({
          rowNumber,
          code: 'IMPORT_SAVE_FAILED',
          message: 'failed to save property row',
        });
      }
    }

    return {
      created,
      skipped,
      failed,
      issues,
    };
  }

  getPortfolioConnectors(): PortfolioConnectorDefinition[] {
    return this.portfolioConnectorCatalog;
  }

  async syncPortfolioConnector(
    currentUserId: string,
    currentUserRole: UserRole,
    payload: PortfolioConnectorSyncDto,
  ): Promise<PortfolioConnectorSyncResult> {
    if (!this.canAccessPortfolio(currentUserRole)) {
      throw new ForbiddenException('You do not have access to portfolio data');
    }

    const connector = this.portfolioConnectorCatalog.find(
      (item) => item.id === payload.connectorId,
    );

    if (!connector) {
      throw new NotFoundException('Connector not found');
    }

    const dryRun = payload.dryRun ?? true;

    if (
      connector.id === PortfolioConnectorId.WEBHOOK &&
      !dryRun &&
      !payload.endpointUrl
    ) {
      throw new ForbiddenException(
        'endpointUrl is required for webhook connector push',
      );
    }

    const scopedWhere = this.buildScopedWhere(
      currentUserId,
      currentUserRole,
      payload.scope,
    );

    const where = this.applyPortfolioFilters(scopedWhere, payload);

    const properties = await this.propertyRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    const issues: PortfolioImportIssue[] = [];
    const mappedPayloads: Array<Record<string, unknown>> = [];

    properties.forEach((property, index) => {
      const rowNumber = index + 1;
      const rowIssues = this.validateConnectorRequiredFields(
        property,
        connector,
        rowNumber,
      );

      if (rowIssues.length > 0) {
        issues.push(...rowIssues);
        return;
      }

      mappedPayloads.push(this.mapConnectorPayload(property, connector.id));
    });

    let pushedRecords = 0;

    if (
      !dryRun &&
      connector.supportsPush &&
      payload.endpointUrl &&
      mappedPayloads.length > 0
    ) {
      try {
        const response = await fetch(payload.endpointUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connectorId: connector.id,
            exportedAt: new Date().toISOString(),
            records: mappedPayloads,
          }),
        });

        if (!response.ok) {
          issues.push({
            rowNumber: 0,
            code: 'PUSH_FAILED',
            message: `Connector push failed with status ${response.status}`,
          });
        } else {
          pushedRecords = mappedPayloads.length;
        }
      } catch {
        issues.push({
          rowNumber: 0,
          code: 'PUSH_FAILED',
          message: 'Connector push failed due to network error',
        });
      }
    }

    return {
      connectorId: connector.id,
      dryRun,
      totalRecords: properties.length,
      mappedRecords: mappedPayloads.length,
      failedRecords: properties.length - mappedPayloads.length,
      pushedRecords,
      endpointUrl: payload.endpointUrl,
      payloadSample: mappedPayloads.slice(0, 3),
      issues,
    };
  }
}
