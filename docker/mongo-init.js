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
        _id: {
          bsonType: "objectId",
          description: "User ID",
        },
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
        phone: {
          bsonType: ["string", "null"],
          description: "Phone number",
        },
        avatar: {
          bsonType: ["string", "null"],
          description: "Profile image URL",
        },
        role: {
          enum: ["admin", "owner", "manager", "tenant", "agent"],
          description: "User role - required",
        },
        status: {
          enum: [
            "active",
            "inactive",
            "suspended",
            "pending",
            "pending_verification",
          ],
          description: "User account status",
        },
        authProvider: {
          enum: ["local", "google", "facebook"],
          description: "Authentication provider",
        },
        googleId: {
          bsonType: ["string", "null"],
          description: "Google OAuth ID",
        },
        facebookId: {
          bsonType: ["string", "null"],
          description: "Facebook OAuth ID",
        },
        isEmailVerified: {
          bsonType: "bool",
          description: "Whether email is verified",
        },
        emailVerificationToken: {
          bsonType: ["string", "null"],
          description: "Email verification token",
        },
        pendingEmail: {
          bsonType: ["string", "null"],
          description: "Pending email change",
        },
        emailVerificationExpires: {
          bsonType: ["date", "null"],
          description: "Email verification token expiration",
        },
        passwordResetToken: {
          bsonType: ["string", "null"],
          description: "Password reset token",
        },
        passwordResetExpires: {
          bsonType: ["date", "null"],
          description: "Password reset token expiration",
        },
        refreshToken: {
          bsonType: ["string", "null"],
          description: "JWT refresh token",
        },
        twoFactorSecret: {
          bsonType: ["string", "null"],
          description: "2FA secret key",
        },
        twoFactorEnabled: {
          bsonType: "bool",
          description: "Whether 2FA is enabled",
        },
        lastLogin: {
          bsonType: ["date", "null"],
          description: "Last login timestamp",
        },
        loginAttempts: {
          bsonType: "int",
          description: "Failed login count",
        },
        lockUntil: {
          bsonType: ["date", "null"],
          description: "Account lock expiration time",
        },
        previousPasswords: {
          bsonType: ["array", "null"],
          description: "History of previous passwords",
        },
        createdAt: {
          bsonType: "date",
          description: "Account creation timestamp",
        },
        updatedAt: {
          bsonType: "date",
          description: "Last update timestamp",
        },
        deletedAt: {
          bsonType: ["date", "null"],
          description: "Deactivation/deletion timestamp",
        },
        permanentlyDeleted: {
          bsonType: "bool",
          description: "Whether account is permanently deleted (GDPR)",
        },
        address: {
          bsonType: ["object", "null"],
          description: "User address information",
        },
        preferences: {
          bsonType: ["object", "null"],
          description: "User preferences",
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
