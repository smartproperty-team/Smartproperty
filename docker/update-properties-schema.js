// ===========================================
// Update MongoDB Properties Schema Validation
// ===========================================
// Run this script to update the validation schema for the properties collection

db = db.getSiblingDB("smartproperty");

// Drop the existing validator and recreate with updated schema
db.runCommand({
  collMod: "properties",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "type", "status", "ownerId", "createdAt"],
      properties: {
        title: {
          bsonType: "string",
          description: "Property title - required",
        },
        description: {
          bsonType: ["string", "null"],
          description: "Property description - optional",
        },
        type: {
          enum: ["apartment", "house", "condo", "studio", "villa", "land"],
          description: "Property type - required",
        },
        status: {
          enum: ["available", "rented", "maintenance", "unlisted"],
          description: "Property status - required",
        },
        price: {
          bsonType: ["number", "double", "int"],
          description: "Property price",
        },
        currency: {
          bsonType: "string",
          description: "Currency code",
        },
        address: {
          bsonType: ["object", "null"],
          description: "Property address",
        },
        features: {
          bsonType: ["object", "null"],
          description: "Property features - optional",
        },
        images: {
          bsonType: ["array", "null"],
          description: "Property images - optional",
        },
        virtualTour: {
          bsonType: ["string", "null"],
          description: "Virtual tour URL - optional",
        },
        ownerId: {
          bsonType: ["objectId", "string"],
          description: "Reference to owner user - required",
        },
        managerId: {
          bsonType: ["objectId", "string", "null"],
          description: "Reference to manager user - optional",
        },
        createdAt: {
          bsonType: "date",
          description: "Creation timestamp",
        },
        updatedAt: {
          bsonType: ["date", "null"],
          description: "Last update timestamp",
        },
        deletedAt: {
          bsonType: ["date", "null"],
          description: "Deletion timestamp - for soft deletes",
        },
      },
    },
  },
  validationLevel: "moderate",
  validationAction: "error",
});

print("✅ Properties collection schema validation updated successfully!");
