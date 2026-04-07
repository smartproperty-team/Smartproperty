/* eslint-disable no-console */
const { MongoClient } = require('mongodb');

async function updatePropertiesValidator() {
  const uri =
    process.env.MONGODB_URI ||
    'mongodb://smartproperty_user:smartproperty_pass_2024@localhost:27017/smartproperty?authSource=admin';
  const databaseName = process.env.MONGODB_DATABASE || 'smartproperty';

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(databaseName);

    const validator = {
      $jsonSchema: {
        bsonType: 'object',
        required: ['title', 'type', 'status', 'ownerId', 'createdAt'],
        properties: {
          title: { bsonType: 'string' },
          description: { bsonType: ['string', 'null'] },
          type: {
            enum: ['apartment', 'house', 'condo', 'studio', 'villa', 'land'],
          },
          status: {
            enum: ['available', 'rented', 'maintenance', 'unlisted'],
          },
          category: {
            enum: ['sale', 'rental', 'management'],
          },
          price: { bsonType: ['number', 'double', 'int', 'long', 'decimal'] },
          currency: { bsonType: 'string' },
          address: { bsonType: ['object', 'null'] },
          features: { bsonType: ['object', 'null'] },
          images: { bsonType: ['array', 'null'] },
          virtualTour: { bsonType: ['string', 'null'] },
          ownerId: { bsonType: ['objectId', 'string'] },
          managerId: { bsonType: ['objectId', 'string', 'null'] },
          createdAt: { bsonType: 'date' },
          updatedAt: { bsonType: ['date', 'null'] },
          deletedAt: { bsonType: ['date', 'null'] },
        },
      },
    };

    const result = await db.command({
      collMod: 'properties',
      validator,
      validationLevel: 'moderate',
      validationAction: 'error',
    });

    console.log(
      'Properties validator updated:',
      result.ok === 1 ? 'OK' : result,
    );

    const collectionInfo = await db
      .listCollections({ name: 'properties' }, { nameOnly: false })
      .toArray();

    console.log(
      'Current property type enum:',
      collectionInfo[0]?.options?.validator?.$jsonSchema?.properties?.type
        ?.enum || [],
    );
    console.log(
      'Current property status enum:',
      collectionInfo[0]?.options?.validator?.$jsonSchema?.properties?.status
        ?.enum || [],
    );
    console.log(
      'Current ownerId bsonType:',
      collectionInfo[0]?.options?.validator?.$jsonSchema?.properties?.ownerId
        ?.bsonType || [],
    );
  } finally {
    await client.close();
  }
}

updatePropertiesValidator().catch((error) => {
  console.error('Failed to update properties validator:', error);
  process.exit(1);
});
