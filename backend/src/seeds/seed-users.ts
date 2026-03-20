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

    // Sample users to seed (2 users per role)
    const users: Partial<User>[] = [
      {
        _id: new ObjectId(),
        email: 'superadmin@smartproperty.com',
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'User',
        phone: '+1234567890',
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        email: 'superadmin2@smartproperty.com',
        password: hashedPassword,
        firstName: 'Sarah',
        lastName: 'SuperAdmin',
        phone: '+1234567800',
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        email: 'branch-manager@smartproperty.com',
        password: hashedPassword,
        firstName: 'Brian',
        lastName: 'BranchManager',
        phone: '+1234567804',
        role: UserRole.BRANCH_MANAGER,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        email: 'branch-manager2@smartproperty.com',
        password: hashedPassword,
        firstName: 'Bella',
        lastName: 'BranchManager',
        phone: '+1234567805',
        role: UserRole.BRANCH_MANAGER,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        email: 'agent-manager@smartproperty.com',
        password: hashedPassword,
        firstName: 'Mike',
        lastName: 'AgentManager',
        phone: '+1234567806',
        role: UserRole.REAL_ESTATE_AGENT,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        email: 'agent-manager2@smartproperty.com',
        password: hashedPassword,
        firstName: 'Mia',
        lastName: 'AgentManager',
        phone: '+1234567807',
        role: UserRole.REAL_ESTATE_AGENT,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        email: 'rental-manager@smartproperty.com',
        password: hashedPassword,
        firstName: 'Ryan',
        lastName: 'RentalManager',
        phone: '+1234567808',
        role: UserRole.RENTAL_MANAGER,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        email: 'rental-manager2@smartproperty.com',
        password: hashedPassword,
        firstName: 'Rita',
        lastName: 'RentalManager',
        phone: '+1234567809',
        role: UserRole.RENTAL_MANAGER,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        email: 'accountant-assistant@smartproperty.com',
        password: hashedPassword,
        firstName: 'Alice',
        lastName: 'AccountantAssistant',
        phone: '+1234567810',
        role: UserRole.ACCOUNTANT_ADMIN_ASSISTANT,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        email: 'accountant-assistant2@smartproperty.com',
        password: hashedPassword,
        firstName: 'Aaron',
        lastName: 'AccountantAssistant',
        phone: '+1234567811',
        role: UserRole.ACCOUNTANT_ADMIN_ASSISTANT,
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
        phone: '+1234567812',
        role: UserRole.OWNER,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        email: 'owner2@smartproperty.com',
        password: hashedPassword,
        firstName: 'Olivia',
        lastName: 'Owner',
        phone: '+1234567813',
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
        phone: '+1234567814',
        role: UserRole.TENANT,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        email: 'tenant2@smartproperty.com',
        password: hashedPassword,
        firstName: 'Tom',
        lastName: 'Tenant',
        phone: '+1234567815',
        role: UserRole.TENANT,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        email: 'service-provider@smartproperty.com',
        password: hashedPassword,
        firstName: 'Sam',
        lastName: 'ServiceProvider',
        phone: '+1234567816',
        role: UserRole.SERVICE_PROVIDER,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        email: 'service-provider2@smartproperty.com',
        password: hashedPassword,
        firstName: 'Sophie',
        lastName: 'ServiceProvider',
        phone: '+1234567817',
        role: UserRole.SERVICE_PROVIDER,
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
