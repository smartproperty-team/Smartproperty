// ===========================================
// SmartProperty - User Seed Script
// ===========================================

import * as bcrypt from 'bcrypt';
import { ObjectId } from 'mongodb';
import { DataSource } from 'typeorm';
import {
  User,
  UserRole,
  UserStatus,
} from '../modules/users/entities/user.entity';

async function seedUsers() {
  console.log('🌱 Starting user seeding...');

  // Create MongoDB connection
  const dataSource = new DataSource({
    type: 'mongodb',
    url:
      process.env.MONGODB_URI ||
      'mongodb://smartproperty_user:smartproperty_pass_2024@localhost:27017/smartproperty?authSource=admin',
    database: process.env.MONGODB_DATABASE || 'smartproperty',
    entities: [User],
    synchronize: false, // Don't sync schema, just insert data
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    const userRepository = dataSource.getMongoRepository(User);

    // Check if users already exist
    const existingCount = await userRepository.count();
    if (existingCount > 0) {
      console.log(
        `⚠️  Database already has ${existingCount} users. Skipping seed.`,
      );
      console.log('   To re-seed, clear the users collection first.');
      await dataSource.destroy();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('Password123!', 10);

    // Sample users to seed
    // Note: MongoDB schema validator only allows roles: admin, owner, manager, tenant
    const users: Partial<User>[] = [
      {
        _id: new ObjectId(),
        email: 'admin@smartproperty.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        phone: '+1234567890',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        email: 'owner@smartproperty.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Owner',
        phone: '+1234567891',
        role: UserRole.OWNER,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        email: 'tenant@smartproperty.com',
        password: hashedPassword,
        firstName: 'Jane',
        lastName: 'Tenant',
        phone: '+1234567892',
        role: UserRole.TENANT,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        email: 'manager@smartproperty.com',
        password: hashedPassword,
        firstName: 'Mike',
        lastName: 'Manager',
        phone: '+1234567893',
        role: UserRole.MANAGER,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Insert users
    const result = await userRepository.insertMany(users as User[]);
    console.log(`✅ Successfully seeded ${result.insertedCount} users`);

    console.log('\n📋 Seeded Users:');
    console.log('================');
    users.forEach((user) => {
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Password: Password123!`);
      console.log('   ---');
    });

    await dataSource.destroy();
    console.log('\n✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  }
}

void seedUsers();
