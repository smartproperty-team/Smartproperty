// ===========================================
// PropertiesService unit tests
// ===========================================

import { BadRequestException } from '@nestjs/common';
import { ObjectId } from 'mongodb';

import { UserRole } from '../users/entities/user.entity';
import { CreatePropertyDto, UpdatePropertyDto } from './dto/property.dto';
import { PropertyStatus, PropertyType } from './entities/property.entity';
import { computePriceHistogram, PropertiesService } from './properties.service';

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

  describe('findAll filters panel', () => {
    beforeEach(() => {
      propertyRepository.findAndCount.mockResolvedValue([[], 0]);
      propertyRepository.find.mockResolvedValue([]);
    });

    const lastWhere = () =>
      propertyRepository.findAndCount.mock.calls.at(-1)[0].where;

    it('matches any of several types and ignores unknown ones', async () => {
      await service.findAll({ types: 'villa,house,castle' });

      expect(lastWhere().type).toEqual({ $in: ['villa', 'house'] });
    });

    it('reads rooms as minimums, but keeps exact counts for old links', async () => {
      await service.findAll({ minBedrooms: '2', minBathrooms: 1 } as any);
      expect(lastWhere()['features.bedrooms']).toEqual({ $gte: 2 });
      expect(lastWhere()['features.bathrooms']).toEqual({ $gte: 1 });

      await service.findAll({ bedrooms: 3, minBedrooms: 2 });
      expect(lastWhere()['features.bedrooms']).toBe(3);
    });

    it('needs every amenity, whatever its case', async () => {
      await service.findAll({ amenities: 'WiFi,Air conditioning' });

      const [wifi, airConditioning] = lastWhere()['features.amenities'].$all;
      expect(wifi.test('wifi')).toBe(true);
      expect(wifi.test('wifi router')).toBe(false);
      expect(airConditioning.test('AIR CONDITIONING')).toBe(true);
    });

    it('accepts furnished and parking from either the feature or an amenity', async () => {
      await service.findAll({
        furnished: 'true',
        hasParking: '1',
        petFriendly: true,
        search: 'pool',
      });

      const where = lastWhere();
      expect(where['features.petFriendly']).toBe(true);
      expect(where.$and).toHaveLength(2);
      const [furnished, parking] = where.$and;
      expect(furnished.$or[0]).toEqual({ 'features.furnished': true });
      expect(furnished.$or[1]['features.amenities'].test('Furnished')).toBe(
        true,
      );
      expect(parking.$or[0]).toEqual({
        'features.parkingSpaces': { $gte: 1 },
      });
      expect(
        parking.$or[1]['features.amenities'].$in.some((r: RegExp) =>
          r.test('garage'),
        ),
      ).toBe(true);
      // The search keeps its own $or, now including the address.
      expect(where.$or.map((c: object) => Object.keys(c)[0])).toEqual([
        'title',
        'description',
        'address.city',
        'address.state',
        'address.street',
      ]);
    });

    it('only counts when asked for a count', async () => {
      propertyRepository.findAndCount.mockResolvedValue([[{}], 7]);

      const result = await service.findAll({
        countOnly: 'true',
        category: 'rental' as any,
        includeMapPins: 'true',
      });

      expect(result).toEqual({ properties: [], total: 7, page: 1, limit: 12 });
      const query = propertyRepository.findAndCount.mock.calls[0][0];
      expect(query.take).toBe(1);
      expect(query.select).toEqual(['_id']);
      expect(propertyRepository.find).not.toHaveBeenCalled();
      expect(usersRepository.find).not.toHaveBeenCalled();
    });

    it('builds the price histogram without the price filter', async () => {
      propertyRepository.find.mockResolvedValue([
        { price: 800 },
        { price: 1200 },
        { price: 2000 },
      ]);

      const result = await service.findAll({
        includePriceHistogram: 'true',
        minPrice: 1000,
        maxPrice: 1500,
        category: 'rental' as any,
      });

      const histogramQuery = propertyRepository.find.mock.calls[0][0];
      expect(histogramQuery.where.price).toBeUndefined();
      expect(histogramQuery.where.category).toBe('rental');
      expect(histogramQuery.select).toEqual(['price']);
      expect(lastWhere().price).toEqual({ $gte: 1000, $lte: 1500 });
      expect(result.priceHistogram).toMatchObject({ min: 800, median: 1200 });
    });
  });

  describe('computePriceHistogram', () => {
    it('buckets prices evenly on a square-root scale', () => {
      // 0..400: a quarter of the way in price is half way along the slider.
      const histogram = computePriceHistogram([0, 100, 400], 2)!;

      expect(histogram.min).toBe(0);
      expect(histogram.max).toBe(400);
      expect(histogram.buckets).toEqual([1, 2]);
      expect(histogram.median).toBe(100);
    });

    it('puts the most expensive 2% in the last bucket', () => {
      const prices = [...Array.from({ length: 99 }, (_, i) => 1000 + i), 1e6];
      const histogram = computePriceHistogram(prices, 10)!;

      expect(histogram.max).toBeLessThan(2000);
      expect(histogram.buckets.reduce((a, b) => a + b)).toBe(100);
      expect(histogram.buckets.at(-1)).toBeGreaterThanOrEqual(1);
    });

    it('rounds the range outwards and survives a single price', () => {
      expect(computePriceHistogram([1234, 5678])).toMatchObject({
        min: 1200,
        max: 5700,
      });
      // A lone price sits inside a usable range, not at its edge.
      expect(computePriceHistogram([1750])).toMatchObject({
        min: 1400,
        max: 2100,
        median: 1750,
      });
      expect(computePriceHistogram([])).toBeNull();
      // Free listings must not divide by a zero-wide range.
      expect(computePriceHistogram([0, 0])!.buckets[0]).toBe(2);
    });
  });

  describe('getSearchSuggestions', () => {
    it('suggests cities and regions by word start, busiest first', async () => {
      propertyRepository.find.mockResolvedValue([
        { address: { city: 'Sousse', state: 'Sousse' } },
        { address: { city: 'Sousse', state: 'Sousse' } },
        { address: { city: 'Hammam Sousse', state: 'Sousse' } },
        { address: { city: 'Tunis', state: 'Tunis' } },
      ]);

      const suggestions = await service.getSearchSuggestions('sou');

      // The Sousse region would repeat the Sousse city, so only the city shows.
      expect(suggestions).toEqual([
        { label: 'Sousse', kind: 'city', count: 2 },
        { label: 'Hammam Sousse', kind: 'city', count: 1 },
      ]);
      const pattern = propertyRepository.find.mock.calls[0][0].where.$or[0][
        'address.city'
      ] as RegExp;
      expect(pattern.test('Hammam Sousse')).toBe(true);
      expect(pattern.test('Ksour')).toBe(false);
    });

    it('counts a region over all its listings', async () => {
      propertyRepository.find.mockResolvedValue([
        { address: { city: 'Hammamet', state: 'Nabeul' } },
        { address: { city: 'Nabeul', state: 'Nabeul' } },
        { address: { city: 'Kelibia', state: 'Nabeul' } },
      ]);

      expect(await service.getSearchSuggestions('ham')).toEqual([
        { label: 'Hammamet', kind: 'city', count: 1 },
      ]);
      // "Nabeul" is also a city, so the region gives way to it.
      expect(await service.getSearchSuggestions('nab')).toEqual([
        { label: 'Nabeul', kind: 'city', count: 1 },
      ]);
      propertyRepository.find.mockResolvedValue([
        { address: { city: 'Hammamet', state: 'Nabeul' } },
        { address: { city: 'Kelibia', state: 'Nabeul' } },
      ]);
      expect(await service.getSearchSuggestions('nab')).toEqual([
        { label: 'Nabeul', kind: 'region', count: 2 },
      ]);
    });

    it('lists the busiest places when nothing is typed', async () => {
      propertyRepository.find.mockResolvedValue([
        { address: { city: 'Tunis', state: 'Tunis' } },
        { address: { city: 'La Marsa', state: 'Tunis' } },
        { address: { city: 'La Marsa', state: 'Tunis' } },
      ]);

      const suggestions = await service.getSearchSuggestions('');

      expect(
        propertyRepository.find.mock.calls[0][0].where.$or,
      ).toBeUndefined();
      expect(suggestions[0]).toEqual({
        label: 'La Marsa',
        kind: 'city',
        count: 2,
      });
    });
  });
});
