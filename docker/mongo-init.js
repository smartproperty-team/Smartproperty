// ===========================================
// MongoDB Initialization Script
// ===========================================
// This script runs on first container startup

// Switch to admin database to authenticate
db = db.getSiblingDB("admin");

// Create the application database
db = db.getSiblingDB("smartproperty");

// Create collections with schema validation
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "role", "createdAt"],
      properties: {
        email: {
          bsonType: "string",
          description: "Email address - required and must be unique",
        },
        password: {
          bsonType: ["string", "null"],
          description: "Hashed password - optional for OAuth users",
        },
        firstName: {
          bsonType: "string",
          description: "User first name",
        },
        lastName: {
          bsonType: "string",
          description: "User last name",
        },
        role: {
          enum: ["admin", "owner", "manager", "tenant"],
          description: "User role - required",
        },
        status: {
          enum: ["active", "inactive", "suspended", "pending"],
          description: "User account status",
        },
        authProvider: {
          enum: ["local", "google"],
          description: "Authentication provider",
        },
        googleId: {
          bsonType: "string",
          description: "Google OAuth ID",
        },
        isEmailVerified: {
          bsonType: "bool",
          description: "Whether email is verified",
        },
        isActive: {
          bsonType: "bool",
          description: "Whether user account is active",
        },
        createdAt: {
          bsonType: "date",
          description: "Account creation timestamp",
        },
        updatedAt: {
          bsonType: "date",
          description: "Last update timestamp",
        },
      },
    },
  },
});

db.createCollection("properties", {
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
          bsonType: "string",
          description: "Property description",
        },
        type: {
          enum: ["apartment", "house", "studio", "villa", "commercial", "land"],
          description: "Property type - required",
        },
        status: {
          enum: ["available", "rented", "maintenance", "unavailable"],
          description: "Property status - required",
        },
        ownerId: {
          bsonType: "objectId",
          description: "Reference to owner user - required",
        },
      },
    },
  },
});

db.createCollection("applications");
db.createCollection("leases");
db.createCollection("payments");
db.createCollection("notifications");
db.createCollection("messages");

// Create indexes for better query performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ createdAt: -1 });

db.properties.createIndex({ ownerId: 1 });
db.properties.createIndex({ status: 1 });
db.properties.createIndex({ type: 1 });
db.properties.createIndex({ "location.coordinates": "2dsphere" });
db.properties.createIndex({ createdAt: -1 });
db.properties.createIndex({
  title: "text",
  description: "text",
  "address.city": "text",
  "address.country": "text",
});

db.applications.createIndex({ propertyId: 1 });
db.applications.createIndex({ tenantId: 1 });
db.applications.createIndex({ status: 1 });

db.leases.createIndex({ propertyId: 1 });
db.leases.createIndex({ tenantId: 1 });
db.leases.createIndex({ status: 1 });

db.payments.createIndex({ leaseId: 1 });
db.payments.createIndex({ tenantId: 1 });
db.payments.createIndex({ status: 1 });
db.payments.createIndex({ dueDate: 1 });

db.notifications.createIndex({ userId: 1 });
db.notifications.createIndex({ isRead: 1 });
db.notifications.createIndex({ createdAt: -1 });

db.messages.createIndex({ senderId: 1 });
db.messages.createIndex({ receiverId: 1 });
db.messages.createIndex({ createdAt: -1 });

print("✅ SmartProperty database initialized successfully!");
print(
  "📊 Collections created: users, properties, applications, leases, payments, notifications, messages",
);
print("🔍 Indexes created for optimal query performance");
