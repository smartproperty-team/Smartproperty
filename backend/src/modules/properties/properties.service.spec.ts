// ===========================================
// PropertiesService unit tests
// ===========================================

import { BadRequestException } from '@nestjs/common';
import { ObjectId } from 'mongodb';

import { UserRole } from '../users/entities/user.entity';
import { CreatePropertyDto, UpdatePropertyDto } from './dto/property.dto';
import { PropertyStatus, PropertyType } from './entities/property.entity';
import { PropertiesService } from './properties.service';

describe('PropertiesService', () => {
  let service: PropertiesService;

  const propertyRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
  } as any;

  const usersRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  } as any;

  const agenciesRepository = {
    findOne: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PropertiesService(
      propertyRepository,
      usersRepository,
      agenciesRepository,
    );
  });

  const baseCreateDto = (): CreatePropertyDto => ({
    title: 'Test property',
    type: PropertyType.APARTMENT,
    price: 1200,
    address: {
      street: '123 Main St',
      city: 'Tunis',
      state: 'Tunis',
      zipCode: '1000',
      country: 'Tunisia',
    },
  });

  it('sanitizes virtual tour URL on create', async () => {
    const dto = {
      ...baseCreateDto(),
      virtualTour: ' https://www.youtube.com/watch?v=abc123#section ',
    };

    propertyRepository.create.mockImplementation((payload: unknown) => payload);
    propertyRepository.save.mockImplementation(
      async (payload: unknown) => payload,
    );

    const result = await service.create(
      dto,
      '507f1f77bcf86cd799439011',
      UserRole.BRANCH_MANAGER,
    );

    expect(propertyRepository.create).toHaveBeenCalledTimes(1);
    const createdPayload = propertyRepository.create.mock.calls[0][0] as Record<
      string,
      unknown
    >;

    expect(createdPayload.virtualTour).toBe(
      'https://www.youtube.com/watch?v=abc123',
    );
    expect(createdPayload.status).toBe(PropertyStatus.AVAILABLE);
    expect(createdPayload.currency).toBe('USD');
    expect(result).toEqual(createdPayload);
  });

  it('rejects local/private virtual tour URL on create', async () => {
    const dto = {
      ...baseCreateDto(),
      virtualTour: 'http://localhost:8080/tour',
    };

    await expect(
      service.create(dto, '507f1f77bcf86cd799439011', UserRole.BRANCH_MANAGER),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects local/private virtual tour URL on update', async () => {
    const propertyId = new ObjectId().toHexString();

    propertyRepository.findOne.mockResolvedValue({
      _id: new ObjectId(propertyId),
      ownerId: 'owner-id',
      managerId: 'manager-id',
      address: {
        street: 's',
        city: 'c',
        state: 'st',
        zipCode: 'z',
        country: 'co',
      },
      features: {},
      deletedAt: null,
    });

    const updateDto: UpdatePropertyDto = {
      virtualTour: 'http://192.168.1.5:3000/tour',
    };

    await expect(
      service.update(propertyId, updateDto, 'owner-id', UserRole.OWNER),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows clearing virtual tour on update with empty input', async () => {
    const propertyId = new ObjectId().toHexString();

    const entity = {
      _id: new ObjectId(propertyId),
      ownerId: 'owner-id',
      managerId: 'manager-id',
      address: {
        street: 's',
        city: 'c',
        state: 'st',
        zipCode: 'z',
        country: 'co',
      },
      features: {},
      virtualTour: 'https://matterport.com/show/?m=abc',
      deletedAt: null,
    } as any;

    propertyRepository.findOne.mockResolvedValue(entity);
    propertyRepository.save.mockImplementation(
      async (payload: unknown) => payload,
    );

    const updateDto: UpdatePropertyDto = {
      virtualTour: '   ',
    };

    const updated = await service.update(
      propertyId,
      updateDto,
      'owner-id',
      UserRole.OWNER,
    );

    expect(propertyRepository.save).toHaveBeenCalledTimes(1);
    expect(updated.virtualTour).toBeUndefined();
  });

  describe('findAll map search', () => {
    const pinnable = (overrides: Record<string, unknown> = {}) =>
      ({
        _id: new ObjectId('507f1f77bcf86cd799439011'),
        title: 'Marina flat',
        type: PropertyType.APARTMENT,
        status: PropertyStatus.AVAILABLE,
        price: 1750,
        currency: 'TND',
        address: {
          city: 'Tunis',
          coordinates: { lat: 36.85, lng: 10.3 },
        },
        features: { bedrooms: 2, area: 80 },
        images: [
          { url: '/second.webp', order: 2 },
          { url: '/first.webp', order: 1 },
        ],
        ...overrides,
      }) as any;

    beforeEach(() => {
      propertyRepository.findAndCount.mockResolvedValue([[], 0]);
      propertyRepository.find.mockResolvedValue([]);
    });

    it('keeps results inside the visible map area', async () => {
      await service.findAll({
        neLat: 36.9,
        neLng: 10.4,
        swLat: 36.8,
        swLng: 10.2,
      });

      const { where } = propertyRepository.findAndCount.mock.calls[0][0];
      expect(where['address.coordinates.lat']).toEqual({
        $gte: 36.8,
        $lte: 36.9,
      });
      expect(where['address.coordinates.lng']).toEqual({
        $gte: 10.2,
        $lte: 10.4,
      });
    });

    it('matches both sides of a map panned across the antimeridian', async () => {
      await service.findAll({
        neLat: 10,
        neLng: -170,
        swLat: -10,
        swLng: 170,
      } as any);

      const { where } = propertyRepository.findAndCount.mock.calls[0][0];
      expect(where['address.coordinates.lng']).toBeUndefined();
      expect(where.$and).toEqual([
        {
          $or: [
            { 'address.coordinates.lng': { $gte: 170 } },
            { 'address.coordinates.lng': { $lte: -170 } },
          ],
        },
      ]);
    });

    it('accepts bounds as query-string values and ignores partial ones', async () => {
      await service.findAll({
        neLat: '36.9',
        neLng: '10.4',
        swLat: '36.8',
        swLng: '10.2',
      } as any);
      expect(
        propertyRepository.findAndCount.mock.calls[0][0].where[
          'address.coordinates.lat'
        ],
      ).toEqual({ $gte: 36.8, $lte: 36.9 });

      await service.findAll({ neLat: 36.9, neLng: 10.4 });
      expect(
        propertyRepository.findAndCount.mock.calls[1][0].where[
          'address.coordinates.lat'
        ],
      ).toBeUndefined();
    });

    it('returns light pins for every match when asked', async () => {
      propertyRepository.find.mockResolvedValue([
        pinnable(),
        pinnable({
          _id: new ObjectId('507f1f77bcf86cd799439012'),
          address: { city: 'Tunis' },
        }),
      ]);

      const result = await service.findAll({
        includeMapPins: 'true',
        neLat: 36.9,
        neLng: 10.4,
        swLat: 36.8,
        swLng: 10.2,
      });

      const pinQuery = propertyRepository.find.mock.calls[0][0];
      expect(pinQuery.take).toBe(300);
      expect(pinQuery.select).toContain('price');
      // The bounds condition wins over the "has coordinates" default.
      expect(pinQuery.where['address.coordinates.lat']).toEqual({
        $gte: 36.8,
        $lte: 36.9,
      });
      expect(result.mapPins).toEqual([
        {
          id: '507f1f77bcf86cd799439011',
          title: 'Marina flat',
          type: PropertyType.APARTMENT,
          status: PropertyStatus.AVAILABLE,
          price: 1750,
          currency: 'TND',
          city: 'Tunis',
          lat: 36.85,
          lng: 10.3,
          bedrooms: 2,
          area: 80,
          imageUrl: '/first.webp',
        },
      ]);
    });

    it('skips the pin query unless asked', async () => {
      const result = await service.findAll({});

      expect(propertyRepository.find).not.toHaveBeenCalled();
      expect(result).not.toHaveProperty('mapPins');
    });
  });
});
