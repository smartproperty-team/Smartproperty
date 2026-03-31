// ===========================================
// SmartProperty - Clear Users Collection
// ===========================================

import { DataSource } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';

async function clearUsers() {
  console.log('🧹 Clearing users collection...');

  // Create MongoDB connection
  const dataSource = new DataSource({
    type: 'mongodb',
    url:
      process.env.MONGODB_URI ||
      'mongodb://smartproperty_user:smartproperty_pass_2024@localhost:27017/smartproperty?authSource=admin',
    database: process.env.MONGODB_DATABASE || 'smartproperty',
    entities: [User],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    const userRepository = dataSource.getMongoRepository(User);

    // Clear all users
    const result = await userRepository.deleteMany({});
    console.log(`✅ Cleared ${result.deletedCount} users from the database`);

    await dataSource.destroy();
    console.log('✅ Done!');
  } catch (error) {
    console.error('❌ Error clearing users:', error);
    process.exit(1);
  }
}

void clearUsers();
