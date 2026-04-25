// ===========================================
// SmartProperty - Property Seed Script
// ===========================================

import { ObjectId } from 'mongodb';
import { DataSource } from 'typeorm';
import { Agency } from '../modules/agencies/entities/agency.entity';
import {
  Property,
  PropertyCategory,
  PropertyStatus,
  PropertyType,
} from '../modules/properties/entities/property.entity';
import {
  User,
  UserRole,
  UserStatus,
} from '../modules/users/entities/user.entity';

async function seedProperties() {
  console.log('Starting property seeding...');

  const dataSource = new DataSource({
    type: 'mongodb',
    url:
      process.env.MONGODB_URI ||
      'mongodb://smartproperty_user:smartproperty_pass_2024@localhost:27017/smartproperty?authSource=admin',
    database: process.env.MONGODB_DATABASE || 'smartproperty',
    entities: [Property, User, Agency],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('Database connected');

    const propertyRepository = dataSource.getMongoRepository(Property);
    const userRepository = dataSource.getMongoRepository(User);
    const agencyRepository = dataSource.getMongoRepository(Agency);

    const managerRolePriority: UserRole[] = [
      UserRole.REAL_ESTATE_AGENT,
      UserRole.RENTAL_MANAGER,
      UserRole.BRANCH_MANAGER,
    ];

    const roleRank = (role: UserRole): number => {
      const idx = managerRolePriority.indexOf(role);
      return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
    };

    const normalizeUserId = (user: User): string =>
      user.id || user._id?.toHexString?.() || '';

    const activeOwners = await userRepository.find({
      where: {
        role: UserRole.OWNER,
        status: UserStatus.ACTIVE,
        deletedAt: null as any,
      },
      order: { createdAt: 'ASC' },
    });

    const fallbackOwnerUser = await userRepository.findOne({
      where: {
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        deletedAt: null as any,
      } as any,
    });

    const responsibleManagers = (
      await userRepository.find({
        where: {
          role: { $in: managerRolePriority } as any,
          status: UserStatus.ACTIVE,
          deletedAt: null as any,
        } as any,
      })
    ).sort((a, b) => {
      const rankDiff = roleRank(a.role) - roleRank(b.role);
      if (rankDiff !== 0) {
        return rankDiff;
      }

      return (a.createdAt?.getTime?.() || 0) - (b.createdAt?.getTime?.() || 0);
    });

    const ownersForAssignment =
      activeOwners.length > 0
        ? activeOwners
        : fallbackOwnerUser
          ? [fallbackOwnerUser]
          : [];

    if (!ownersForAssignment.length) {
      console.log('No owner/super_admin user found. Run seed:users first.');
      await dataSource.destroy();
      return;
    }

    if (!responsibleManagers.length) {
      console.log(
        'No active responsible manager/agent found. Seed users with manager roles first.',
      );
      await dataSource.destroy();
      return;
    }

    const activeAgencies = await agencyRepository.find({
      where: { deletedAt: null as any },
    });

    const managersById = new Map(
      responsibleManagers.map((manager) => [normalizeUserId(manager), manager]),
    );

    const managersByAgencyId = new Map<string, User[]>();
    for (const manager of responsibleManagers) {
      if (!manager.agencyId) {
        continue;
      }

      const list = managersByAgencyId.get(manager.agencyId) || [];
      list.push(manager);
      managersByAgencyId.set(manager.agencyId, list);
    }

    const agenciesById = new Map(
      activeAgencies.map((agency) => [agency.id, agency]),
    );

    const agencyRoundRobinIndex = new Map<string, number>();
    let globalManagerCursor = 0;

    const pickResponsibleManagerId = (owner: User): string => {
      const ownerAgencyId = owner.agencyId;

      if (ownerAgencyId) {
        const agency = agenciesById.get(ownerAgencyId);
        const members = agency?.members || [];

        // Prefer agency members by role priority when agency metadata is available.
        for (const role of managerRolePriority) {
          const matchedMember = members.find((member) => member.role === role);
          if (matchedMember?.userId && managersById.has(matchedMember.userId)) {
            return matchedMember.userId;
          }
        }

        const agencyManagers = managersByAgencyId.get(ownerAgencyId) || [];
        if (agencyManagers.length > 0) {
          const cursor = agencyRoundRobinIndex.get(ownerAgencyId) || 0;
          const selected = agencyManagers[cursor % agencyManagers.length];
          agencyRoundRobinIndex.set(ownerAgencyId, cursor + 1);
          return normalizeUserId(selected);
        }
      }

      const selected =
        responsibleManagers[globalManagerCursor % responsibleManagers.length];
      globalManagerCursor += 1;
      return normalizeUserId(selected);
    };

    const ownerId = normalizeUserId(ownersForAssignment[0]);
    const managerId = normalizeUserId(responsibleManagers[0]);

    const frontendAssetBaseUrl =
      process.env.FRONTEND_ASSET_BASE_URL || 'http://localhost:5173';
    const now = new Date();

    const toPublicImageUrl = (fileName: string) =>
      `${frontendAssetBaseUrl}/${fileName}`;

    const properties: Partial<Property>[] = [
      {
        title: 'Contemporary Palm Villa',
        description:
          'Luxury modern villa with landscaped garden and poolside terrace.',
        type: PropertyType.VILLA,
        status: PropertyStatus.AVAILABLE,
        category: PropertyCategory.SALE,
        price: 980000,
        currency: 'TND',
        address: {
          street: '18 Rue des Jasmins',
          city: 'La Marsa',
          state: 'Tunis',
          zipCode: '2070',
          country: 'Tunisie',
          coordinates: {
            lat: 36.8863,
            lng: 10.3256,
          },
        },
        features: {
          bedrooms: 5,
          bathrooms: 4,
          area: 420,
          parkingSpaces: 3,
          furnished: true,
          petFriendly: true,
          amenities: ['pool', 'garden', 'wifi', 'air conditioning'],
          availabilityCalendar: {
            availableFrom: '2026-04-01',
            availableTo: '2027-04-01',
          },
        },
        images: [
          {
            url: toPublicImageUrl('tq_4mbtfjfs1k-qkmj-1500h.png'),
            key: 'seed/tq_4mbtfjfs1k-qkmj-1500h.png',
            caption: 'Main facade',
            isPrimary: true,
            order: 0,
            uploadedAt: now,
          },
          {
            url: toPublicImageUrl('tq_g0llmth1q9-t1v-200h.png'),
            key: 'seed/tq_g0llmth1q9-t1v-200h.png',
            caption: 'Outdoor lounge',
            isPrimary: false,
            order: 1,
            uploadedAt: now,
          },
        ],
        virtualTour: 'https://example.com/tours/contemporary-palm-villa',
        ownerId,
        managerId,
      },
      {
        title: 'Sidi Bou Said Sea House',
        description:
          'Elegant hillside house with sea breeze and bright interiors.',
        type: PropertyType.HOUSE,
        status: PropertyStatus.AVAILABLE,
        category: PropertyCategory.RENTAL,
        price: 4600,
        currency: 'TND',
        address: {
          street: '9 Impasse Ennour',
          city: 'Sidi Bou Said',
          state: 'Tunis',
          zipCode: '2026',
          country: 'Tunisie',
          coordinates: {
            lat: 36.8716,
            lng: 10.347,
          },
        },
        features: {
          bedrooms: 3,
          bathrooms: 2,
          area: 210,
          parkingSpaces: 2,
          furnished: true,
          petFriendly: true,
          amenities: ['sea view', 'terrace', 'garage'],
          availabilityCalendar: {
            availableFrom: '2026-05-10',
          },
        },
        images: [
          {
            url: toPublicImageUrl('tq_a7h2f2xeaz-7bp-1500h.png'),
            key: 'seed/tq_a7h2f2xeaz-7bp-1500h.png',
            caption: 'Front facade',
            isPrimary: true,
            order: 0,
            uploadedAt: now,
          },
          {
            url: toPublicImageUrl('tq_gbgopwda6u-gudd-200h.png'),
            key: 'seed/tq_gbgopwda6u-gudd-200h.png',
            caption: 'Terrace detail',
            isPrimary: false,
            order: 1,
            uploadedAt: now,
          },
        ],
        ownerId,
        managerId,
      },
      {
        title: 'Ariana Family Garden Home',
        description:
          'Warm family house with open-plan living and private garden.',
        type: PropertyType.HOUSE,
        status: PropertyStatus.AVAILABLE,
        category: PropertyCategory.SALE,
        price: 620000,
        currency: 'TND',
        address: {
          street: '45 Rue de Carthage',
          city: 'Ariana',
          state: 'Ariana',
          zipCode: '2080',
          country: 'Tunisie',
          coordinates: {
            lat: 36.8625,
            lng: 10.1956,
          },
        },
        features: {
          bedrooms: 4,
          bathrooms: 2,
          area: 260,
          parkingSpaces: 2,
          furnished: false,
          petFriendly: true,
          amenities: ['garden', 'garage', 'storage room'],
          availabilityCalendar: {
            availableFrom: '2026-06-01',
            availableTo: '2026-12-15',
          },
        },
        images: [
          {
            url: toPublicImageUrl('tq_b4rcqm58py-gcw-1500h.png'),
            key: 'seed/tq_b4rcqm58py-gcw-1500h.png',
            caption: 'Garden entrance',
            isPrimary: true,
            order: 0,
            uploadedAt: now,
          },
          {
            url: toPublicImageUrl('tq_h51ykrmpmt-3ssc-200h.png'),
            key: 'seed/tq_h51ykrmpmt-3ssc-200h.png',
            caption: 'Patio corner',
            isPrimary: false,
            order: 1,
            uploadedAt: now,
          },
        ],
        ownerId,
        managerId,
      },
      {
        title: 'Hammamet Poolside Villa',
        description:
          'High-end villa near the coast with large pool and shaded deck.',
        type: PropertyType.VILLA,
        status: PropertyStatus.AVAILABLE,
        category: PropertyCategory.MANAGEMENT,
        price: 7900,
        currency: 'TND',
        address: {
          street: '7 Route de la Plage',
          city: 'Hammamet',
          state: 'Nabeul',
          zipCode: '8050',
          country: 'Tunisie',
          coordinates: {
            lat: 36.4004,
            lng: 10.6169,
          },
        },
        features: {
          bedrooms: 4,
          bathrooms: 3,
          area: 330,
          parkingSpaces: 3,
          furnished: true,
          petFriendly: true,
          amenities: ['pool', 'terrace', 'sea breeze', 'smart home'],
          availabilityCalendar: {
            availableFrom: '2026-06-01',
            availableTo: '2027-01-01',
          },
        },
        images: [
          {
            url: toPublicImageUrl('tq_brzn8uwaca-vatm-1500h.png'),
            key: 'seed/tq_brzn8uwaca-vatm-1500h.png',
            caption: 'Poolside deck',
            isPrimary: true,
            order: 0,
            uploadedAt: now,
          },
        ],
        virtualTour: 'https://example.com/tours/hammamet-poolside-villa',
        ownerId,
        managerId,
      },
      {
        title: 'Sousse Marina Apartment',
        description:
          'Stylish city apartment close to marina and main amenities.',
        type: PropertyType.APARTMENT,
        status: PropertyStatus.AVAILABLE,
        category: PropertyCategory.RENTAL,
        price: 1750,
        currency: 'TND',
        address: {
          street: '22 Avenue de la Corniche',
          city: 'Sousse',
          state: 'Sousse',
          zipCode: '4000',
          country: 'Tunisie',
          coordinates: {
            lat: 35.8245,
            lng: 10.6346,
          },
        },
        features: {
          bedrooms: 2,
          bathrooms: 2,
          area: 110,
          parkingSpaces: 1,
          furnished: true,
          petFriendly: false,
          amenities: ['elevator', 'wifi', 'concierge'],
          availabilityCalendar: {
            availableFrom: '2026-04-15',
          },
        },
        images: [
          {
            url: toPublicImageUrl('tq_eg61ro6xoc-8z2e-1500h.png'),
            key: 'seed/tq_eg61ro6xoc-8z2e-1500h.png',
            caption: 'Living area',
            isPrimary: true,
            order: 0,
            uploadedAt: now,
          },
        ],
        ownerId,
        managerId,
      },
      {
        title: 'Monastir Contemporary Condo',
        description: 'Modern condo with natural light and practical layout.',
        type: PropertyType.CONDO,
        status: PropertyStatus.AVAILABLE,
        category: PropertyCategory.SALE,
        price: 345000,
        currency: 'TND',
        address: {
          street: '14 Rue Ibn Khaldoun',
          city: 'Monastir',
          state: 'Monastir',
          zipCode: '5000',
          country: 'Tunisie',
          coordinates: {
            lat: 35.777,
            lng: 10.8262,
          },
        },
        features: {
          bedrooms: 3,
          bathrooms: 2,
          area: 165,
          parkingSpaces: 2,
          furnished: false,
          petFriendly: true,
          amenities: ['gym access', 'balcony', 'storage'],
        },
        images: [
          {
            url: toPublicImageUrl('tq_ev3u-afbuo-tv-1500h.png'),
            key: 'seed/tq_ev3u-afbuo-tv-1500h.png',
            caption: 'Condo exterior',
            isPrimary: true,
            order: 0,
            uploadedAt: now,
          },
        ],
        ownerId,
        managerId,
      },
      {
        title: 'Djerba Island Garden Villa',
        description:
          'Private island-style villa with greenery and outdoor dining.',
        type: PropertyType.VILLA,
        status: PropertyStatus.AVAILABLE,
        category: PropertyCategory.MANAGEMENT,
        price: 5600,
        currency: 'TND',
        address: {
          street: '3 Rue des Palmiers',
          city: 'Midoun',
          state: 'Médenine',
          zipCode: '4116',
          country: 'Tunisie',
          coordinates: {
            lat: 33.8081,
            lng: 10.9923,
          },
        },
        features: {
          bedrooms: 4,
          bathrooms: 3,
          area: 300,
          parkingSpaces: 2,
          furnished: true,
          petFriendly: true,
          amenities: ['garden', 'outdoor kitchen', 'pool'],
        },
        images: [
          {
            url: toPublicImageUrl('tq_fqz__chb9i-7br-1500h.png'),
            key: 'seed/tq_fqz__chb9i-7br-1500h.png',
            caption: 'Main garden facade',
            isPrimary: true,
            order: 0,
            uploadedAt: now,
          },
        ],
        ownerId,
        managerId,
      },
      {
        title: 'Nabeul Designer Studio',
        description:
          'Compact designer studio for professionals and short stays.',
        type: PropertyType.STUDIO,
        status: PropertyStatus.AVAILABLE,
        category: PropertyCategory.RENTAL,
        price: 980,
        currency: 'TND',
        address: {
          street: '11 Avenue de la République',
          city: 'Nabeul',
          state: 'Nabeul',
          zipCode: '8000',
          country: 'Tunisie',
          coordinates: {
            lat: 36.4561,
            lng: 10.7376,
          },
        },
        features: {
          bedrooms: 1,
          bathrooms: 1,
          area: 58,
          parkingSpaces: 1,
          furnished: true,
          petFriendly: false,
          amenities: ['wifi', 'city view', 'security door'],
          availabilityCalendar: {
            availableFrom: '2026-03-20',
          },
        },
        images: [
          {
            url: toPublicImageUrl('tq_g0llmth1q9-t1v-200h.png'),
            key: 'seed/tq_g0llmth1q9-t1v-200h.png',
            caption: 'Studio preview',
            isPrimary: true,
            order: 0,
            uploadedAt: now,
          },
        ],
        ownerId,
        managerId,
      },
    ];

    // Remove legacy seeded title so the template stays at exactly 8 properties.
    await propertyRepository.deleteMany({
      title: 'Bizerte Coastal Land Lot',
    });

    let insertedCount = 0;
    let updatedCount = 0;

    for (const [index, propertyData] of properties.entries()) {
      const assignedOwner =
        ownersForAssignment[index % ownersForAssignment.length];
      const assignedOwnerId = normalizeUserId(assignedOwner);
      const assignedManagerId = pickResponsibleManagerId(assignedOwner);

      const mergedPropertyData: Partial<Property> = {
        ...propertyData,
        ownerId: assignedOwnerId,
        managerId: assignedManagerId,
      };

      const existing = await propertyRepository.findOne({
        where: { title: propertyData.title },
      });

      if (existing) {
        await propertyRepository.save({
          ...existing,
          ...mergedPropertyData,
          _id: existing._id,
          createdAt: existing.createdAt || now,
          updatedAt: now,
        } as Property);
        updatedCount += 1;
      } else {
        await propertyRepository.save({
          ...mergedPropertyData,
          _id: new ObjectId(),
          createdAt: now,
          updatedAt: now,
        } as Property);
        insertedCount += 1;
      }
    }

    console.log(
      `Property seed complete. Inserted: ${insertedCount}, Updated: ${updatedCount}, Total template properties: ${properties.length}`,
    );

    await dataSource.destroy();
    console.log('Seeding completed');
  } catch (error) {
    console.error('Error seeding properties:', error);
    process.exit(1);
  }
}

void seedProperties();
