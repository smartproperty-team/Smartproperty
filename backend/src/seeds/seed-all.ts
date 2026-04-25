// ===========================================
// SmartProperty - Full Seed Script (Reset + Seed)
// ===========================================

import { spawnSync } from 'child_process';
import { MongoClient } from 'mongodb';
import { resolve } from 'path';

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://smartproperty_user:smartproperty_pass_2024@localhost:27017/smartproperty?authSource=admin';

const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'smartproperty';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const backendRoot = resolve(__dirname, '../..');

function runSeedScript(scriptName: string) {
  const result = spawnSync(npmCommand, ['run', scriptName], {
    stdio: 'inherit',
    env: process.env,
    cwd: backendRoot,
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    const errorMessage = result.error
      ? `${result.error.name}: ${result.error.message}`
      : `exit status ${result.status}, signal ${result.signal || 'none'}`;
    throw new Error(`Failed running ${scriptName} (${errorMessage})`);
  }
}

async function resetDatabaseData() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  try {
    const db = client.db(MONGODB_DATABASE);
    const collections = await db.listCollections().toArray();

    if (collections.length === 0) {
      console.log(
        'Database has no collections yet. Proceeding with fresh seed.',
      );
      return;
    }

    let clearedCollections = 0;
    let clearedDocuments = 0;

    for (const collection of collections) {
      if (!collection.name || collection.name.startsWith('system.')) {
        continue;
      }

      const deleteResult = await db.collection(collection.name).deleteMany({});
      clearedCollections += 1;
      clearedDocuments += deleteResult.deletedCount || 0;
    }

    console.log(
      `Database reset complete. Cleared collections: ${clearedCollections}, removed documents: ${clearedDocuments}`,
    );
  } finally {
    await client.close();
  }
}

async function seedAll() {
  try {
    console.log('Starting full seed (replace existing data if present)...');

    await resetDatabaseData();

    runSeedScript('seed:users');
    runSeedScript('seed:agencies');
    runSeedScript('seed:properties');

    console.log('Full seed completed successfully.');
  } catch (error) {
    console.error('Full seed failed:', error);
    process.exit(1);
  }
}

void seedAll();
