// ===========================================
// SmartProperty - Property Seed Script
// ===========================================

import { DataSource } from 'typeorm';
import {
  Property,
  PropertyStatus,
  PropertyType,
} from '../modules/properties/entities/property.entity';
import { User, UserRole } from '../modules/users/entities/user.entity';

async function seedProperties() {
  console.log('Starting property seeding...');

  const dataSource = new DataSource({
    type: 'mongodb',
    url:
      process.env.MONGODB_URI ||
      'mongodb://smartproperty_user:smartproperty_pass_2024@localhost:27017/smartproperty?authSource=admin',
    database: process.env.MONGODB_DATABASE || 'smartproperty',
    entities: [Property, User],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('Database connected');

    const propertyRepository = dataSource.getMongoRepository(Property);
    const userRepository = dataSource.getMongoRepository(User);

    const existingCount = await propertyRepository.count();
    if (existingCount > 0) {
      console.log(
        `Database already has ${existingCount} properties. Skipping seed.`,
      );
      await dataSource.destroy();
      return;
    }

    const ownerUser =
      (await userRepository.findOne({ where: { role: UserRole.OWNER } })) ||
      (await userRepository.findOne({ where: { role: UserRole.ADMIN } }));

    if (!ownerUser) {
      console.log('No owner/admin user found. Run seed:users first.');
      await dataSource.destroy();
      return;
    }

    const ownerId = ownerUser.id || ownerUser._id.toHexString();
    const now = new Date();

    const properties: Partial<Property>[] = [
      {
        title: 'Modern Downtown Apartment',
        description: 'Bright 2-bedroom apartment near city center.',
        type: PropertyType.APARTMENT,
        status: PropertyStatus.AVAILABLE,
        price: 1200,
        currency: 'TND',
        address: {
          street: '12 Avenue Habib Bourguiba',
          city: 'Tunis',
          state: 'Tunis',
          zipCode: '1000',
          country: 'Tunisie',
        },
        features: {
          bedrooms: 2,
          bathrooms: 1,
          area: 85,
          parkingSpaces: 1,
          furnished: true,
          petFriendly: false,
          amenities: ['wifi', 'elevator', 'air conditioning'],
        },
        ownerId,
        createdAt: now,
        updatedAt: now,
      },
      {
        title: 'Cozy Suburban House',
        description: 'Quiet neighborhood, ideal for families.',
        type: PropertyType.HOUSE,
        status: PropertyStatus.AVAILABLE,
        price: 2200,
        currency: 'TND',
        address: {
          street: '45 Rue de Carthage',
          city: 'Ariana',
          state: 'Ariana',
          zipCode: '2080',
          country: 'Tunisie',
        },
        features: {
          bedrooms: 3,
          bathrooms: 2,
          area: 140,
          parkingSpaces: 2,
          furnished: false,
          petFriendly: true,
          amenities: ['garden', 'garage'],
        },
        ownerId,
        createdAt: now,
        updatedAt: now,
      },
      {
        title: 'Seaside Villa with Pool',
        description: 'Spacious villa with private pool and sea view.',
        type: PropertyType.VILLA,
        status: PropertyStatus.AVAILABLE,
        price: 5200,
        currency: 'TND',
        address: {
          street: '7 Route de la Plage',
          city: 'Hammamet',
          state: 'Nabeul',
          zipCode: '8050',
          country: 'Tunisie',
        },
        features: {
          bedrooms: 4,
          bathrooms: 3,
          area: 280,
          parkingSpaces: 2,
          furnished: true,
          petFriendly: true,
          amenities: ['pool', 'terrace', 'sea view'],
        },
        ownerId,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const result = await propertyRepository.insertMany(
      properties as Property[],
    );
    console.log(`Successfully seeded ${result.insertedCount} properties`);

    await dataSource.destroy();
    console.log('Seeding completed');
  } catch (error) {
    console.error('Error seeding properties:', error);
    process.exit(1);
  }
}

void seedProperties();
