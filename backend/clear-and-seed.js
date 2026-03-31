const { MongoClient } = require('mongodb');

const mongoUri =
  'mongodb://smartproperty_user:smartproperty_pass_2024@localhost:27017/smartproperty?authSource=admin';

async function clearAndReseed() {
  const client = new MongoClient(mongoUri);

  try {
    console.log('📌 Connecting to MongoDB...');
    await client.connect();

    const db = client.db('smartproperty');

    console.log('🗑️  Clearing users collection...');
    const deleteResult = await db.collection('users').deleteMany({});
    console.log(`✓ Deleted ${deleteResult.deletedCount} users\n`);

    await client.close();
    console.log('✓ Ready to reseed. Run: npm run seed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

clearAndReseed();
