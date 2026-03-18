// ===========================================
// MongoDB Users Collection Schema Update
// ===========================================
// Run this script to update the users collection validator
// mongosh smartproperty < update-users-schema.js

db = db.getSiblingDB("smartproperty");

// Drop old validator and recreate with new schema
db.runCommand({
  collMod: "users",
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
          enum: [
            "super_admin",
            "admin",
            "branch_manager",
            "real_estate_agent",
            "rental_manager",
            "accountant_admin_assistant",
            "owner",
            "tenant",
            "service_provider",
            "ai_system",
            "manager",
            "agent",
          ],
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

print("✅ Users collection schema updated successfully!");
