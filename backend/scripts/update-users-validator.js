/* eslint-disable no-console */
// Run through npm outside Nest, so nothing else loads backend/.env.
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function updateUsersValidator() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Add it to backend/.env - see backend/.env.example.',
    );
  }
  const databaseName = process.env.MONGODB_DATABASE || 'smartproperty';

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(databaseName);

    const validator = {
      $jsonSchema: {
        bsonType: 'object',
        required: ['email', 'role', 'createdAt'],
        properties: {
          _id: { bsonType: 'objectId' },
          email: { bsonType: 'string' },
          password: { bsonType: ['string', 'null'] },
          firstName: { bsonType: 'string' },
          lastName: { bsonType: 'string' },
          phone: { bsonType: ['string', 'null'] },
          avatar: { bsonType: ['string', 'null'] },
          role: {
            enum: [
              'super_admin',
              'branch_manager',
              'real_estate_agent',
              'rental_manager',
              'accountant_admin_assistant',
              'owner',
              'tenant',
              'service_provider',
            ],
          },
          status: {
            enum: [
              'active',
              'inactive',
              'suspended',
              'pending',
              'pending_verification',
            ],
          },
          authProvider: { enum: ['local', 'google', 'facebook'] },
          googleId: { bsonType: ['string', 'null'] },
          facebookId: { bsonType: ['string', 'null'] },
          isEmailVerified: { bsonType: 'bool' },
          emailVerificationToken: { bsonType: ['string', 'null'] },
          pendingEmail: { bsonType: ['string', 'null'] },
          emailVerificationExpires: { bsonType: ['date', 'null'] },
          passwordResetToken: { bsonType: ['string', 'null'] },
          passwordResetExpires: { bsonType: ['date', 'null'] },
          refreshToken: { bsonType: ['string', 'null'] },
          twoFactorSecret: { bsonType: ['string', 'null'] },
          twoFactorEnabled: { bsonType: 'bool' },
          lastLogin: { bsonType: ['date', 'null'] },
          loginAttempts: { bsonType: 'int' },
          lockUntil: { bsonType: ['date', 'null'] },
          previousPasswords: { bsonType: ['array', 'null'] },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: 'date' },
          deletedAt: { bsonType: ['date', 'null'] },
          permanentlyDeleted: { bsonType: 'bool' },
          address: { bsonType: ['object', 'null'] },
          preferences: { bsonType: ['object', 'null'] },
        },
      },
    };

    const result = await db.command({
      collMod: 'users',
      validator,
      validationLevel: 'strict',
      validationAction: 'error',
    });

    console.log('Users validator updated:', result.ok === 1 ? 'OK' : result);

    const collectionInfo = await db
      .listCollections({ name: 'users' }, { nameOnly: false })
      .toArray();

    console.log(
      'Current required fields:',
      collectionInfo[0]?.options?.validator?.$jsonSchema?.required || [],
    );
    console.log(
      'Current role enum:',
      collectionInfo[0]?.options?.validator?.$jsonSchema?.properties?.role
        ?.enum || [],
    );
  } finally {
    await client.close();
  }
}

updateUsersValidator().catch((error) => {
  console.error('Failed to update users validator:', error);
  process.exit(1);
});
