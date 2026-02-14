// Remove all validation from properties collection
db = db.getSiblingDB("smartproperty");

print("Removing validation from properties collection...");

// Method 1: Set validation to off
db.runCommand({
  collMod: "properties",
  validationLevel: "off",
  validationAction: "warn",
});

print("✅ Validation level set to 'off'");

// Method 2: Drop and recreate
db.properties.drop();
print("✅ Collection dropped");

db.createCollection("properties");
print("✅ Collection recreated without validation");

// Create indexes
db.properties.createIndex({ ownerId: 1 });
db.properties.createIndex({ status: 1 });
db.properties.createIndex({ type: 1 });
db.properties.createIndex({ createdAt: -1 });
print("✅ Indexes created");

print("\n🎉 Properties collection is ready without validation!");
