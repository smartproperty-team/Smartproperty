# Payment Testing Workflow with Seeded Accounts

**Goal:** Start from zero → End at payment creation for a lease  
**All passwords:** `Password123!`  
**Base URL:** `http://localhost:3000/api`

---

## Seeded Accounts Reference

| Email                                    | Role                       | Password     | Purpose                                   |
| ---------------------------------------- | -------------------------- | ------------ | ----------------------------------------- |
| `branch-manager@smartproperty.com`       | BRANCH_MANAGER             | Password123! | Creates agency, approves applications     |
| `owner@smartproperty.com`                | OWNER                      | Password123! | Creates properties, receives applications |
| `rental-manager@smartproperty.com`       | RENTAL_MANAGER             | Password123! | Manages rentals, reviews applications     |
| `tenant@smartproperty.com`               | TENANT                     | Password123! | Applies for properties, pays rent         |
| `agent-manager@smartproperty.com`        | REAL_ESTATE_AGENT          | Password123! | Can help manage properties                |
| `service-provider@smartproperty.com`     | SERVICE_PROVIDER           | Password123! | Service worker role                       |
| `accountant-assistant@smartproperty.com` | ACCOUNTANT_ADMIN_ASSISTANT | Password123! | Financial/admin role                      |
| `superadmin@smartproperty.com`           | SUPER_ADMIN                | Password123! | Admin override                            |

---

## Step-by-Step Workflow to Reach Payment

### Step 1: **BRANCH_MANAGER** Creates an Agency

**Who:** `branch-manager@smartproperty.com`

**1a) Login as branch-manager**

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "branch-manager@smartproperty.com",
    "password": "Password123!"
  }' | jq '.tokens.accessToken'
```

→ Save the returned `accessToken` as `$BM_TOKEN`

**1b) Create agency** (as branch-manager, using $BM_TOKEN)

```bash
curl -s -X POST http://localhost:3000/api/agencies \
  -H "Authorization: Bearer $BM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "North Star Agency",
    "region": "North Region",
    "agencyCreationDate": "2026-05-04",
    "description": "Operations branch",
    "phone": "+21612345678",
    "contactEmail": "contact@northstaragency.com",
    "accountant": {"firstName": "Alice", "lastName": "Accountant"},
    "rentalManager": {"firstName": "Ryan", "lastName": "RentalManager"},
    "manager": {"firstName": "Brian", "lastName": "BranchManager"},
    "serviceProvider": {"firstName": "Sam", "lastName": "ServiceProvider"}
  }' | jq '.id'
```

→ Save the returned agency `id` as `$AGENCY_ID`

**Note:** This creates new accounts (alice.accountant@north-star-agency.com, ryan.rentalmanager@north-star-agency.com, etc.) separate from seed accounts. The seeded accounts already exist.

---

### Step 2: **OWNER** Links Self to Agency

**Who:** `owner@smartproperty.com`

**2a) Login as owner**

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@smartproperty.com",
    "password": "Password123!"
  }' | jq '.tokens.accessToken'
```

→ Save the returned `accessToken` as `$OWNER_TOKEN`

**2b) Link owner to agency** (as owner, using $OWNER_TOKEN)

```bash
curl -s -X POST http://localhost:3000/api/agencies/$AGENCY_ID/owners/me \
  -H "Authorization: Bearer $OWNER_TOKEN"
```

→ Owner is now linked to the agency.

---

### Step 3: **OWNER** Creates a Property

**Who:** `owner@smartproperty.com` (using $OWNER_TOKEN from Step 2a)

```bash
curl -s -X POST http://localhost:3000/api/properties \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Cozy 2BR Downtown Apartment",
    "description": "Bright 2-bedroom near downtown.",
    "type": "APARTMENT",
    "price": 1200,
    "currency": "TND",
    "address": {
      "street": "12 Central Ave",
      "city": "Tunis",
      "state": "Tunis",
      "zipCode": "1000",
      "country": "Tunisia"
    },
    "features": {
      "bedrooms": 2,
      "bathrooms": 1,
      "area": 85,
      "furnished": true
    }
  }' | jq '.id'
```

→ Save the returned property `id` as `$PROPERTY_ID`

**✅ Check:** Response should include `managerId` field. If missing, the property will reject applications (this was the issue you encountered).

---

### Step 4: **TENANT** Submits Application for Property

**Who:** `tenant@smartproperty.com`

**4a) Login as tenant**

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tenant@smartproperty.com",
    "password": "Password123!"
  }' | jq '.tokens.accessToken'
```

→ Save the returned `accessToken` as `$TENANT_TOKEN`

**4b) Submit application** (as tenant, using $TENANT_TOKEN)

```bash
curl -s -X POST http://localhost:3000/api/applications \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "'$PROPERTY_ID'",
    "employmentInfo": {
      "companyName": "Acme Corp",
      "jobTitle": "Software Engineer",
      "monthlyIncome": 3000
    },
    "messageToOwner": "Very interested in this property!"
  }' | jq '.id'
```

→ Save the returned application `id` as `$APPLICATION_ID`

**✅ Check:** If you get error "No responsible agent/manager is assigned to this property yet", go back to Step 3 and verify the property has `managerId` set.

---

### Step 5: **BRANCH_MANAGER** Approves Application

**Who:** `branch-manager@smartproperty.com` (using $BM_TOKEN from Step 1a)

```bash
curl -s -X PATCH http://localhost:3000/api/applications/$APPLICATION_ID/approve \
  -H "Authorization: Bearer $BM_TOKEN"
```

→ Application is now **APPROVED**.

---

### Step 6: **BRANCH_MANAGER** Creates Lease from Approved Application

**Who:** `branch-manager@smartproperty.com` (using $BM_TOKEN from Step 1a)

```bash
curl -s -X POST http://localhost:3000/api/leases/from-application/$APPLICATION_ID \
  -H "Authorization: Bearer $BM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2026-06-01",
    "endDate": "2027-05-31",
    "monthlyRent": 1200,
    "securityDeposit": 1200
  }' | jq '.id'
```

→ Save the returned lease `id` as `$LEASE_ID`

---

### Step 7: **TENANT** Initiates Payment

**Who:** `tenant@smartproperty.com` (using $TENANT_TOKEN from Step 4a)

**Note on amounts:** All payment amounts are in **millimes** (TND × 1000)

- 1200 TND = 1,200,000 millimes
- This prevents floating-point errors in financial calculations.

```bash
curl -s -X POST http://localhost:3000/api/payments/initiate \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leaseId": "'$LEASE_ID'",
    "tenantId": "TENANT_USER_ID",
    "amount": 1200000,
    "currency": "TND",
    "type": "RENT"
  }'
```

**⚠️ TODO:** Replace `TENANT_USER_ID` with tenant's actual ObjectId. You can get it by calling:

```bash
curl -s -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq '.id'
```

→ Response includes:

- `clientSecret` → Use on frontend with Stripe Elements to confirm payment
- `paymentIntentId` → Stripe payment intent id
- `status` → "INITIATED" or "PENDING"

---

## Quick Copy-Paste Command Sequence

Save this as a script and run in order:

```bash
#!/bin/bash

# Step 1a: Login branch-manager
BM_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"branch-manager@smartproperty.com","password":"Password123!"}' | jq -r '.tokens.accessToken')
echo "BM_TOKEN=$BM_TOKEN"

# Step 1b: Create agency
AGENCY_ID=$(curl -s -X POST http://localhost:3000/api/agencies \
  -H "Authorization: Bearer $BM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"North Star Agency",
    "region":"North Region",
    "agencyCreationDate":"2026-05-04",
    "description":"Operations",
    "accountant":{"firstName":"Alice","lastName":"Accountant"},
    "rentalManager":{"firstName":"Ryan","lastName":"RentalManager"},
    "manager":{"firstName":"Brian","lastName":"BranchManager"},
    "serviceProvider":{"firstName":"Sam","lastName":"ServiceProvider"}
  }' | jq -r '.id')
echo "AGENCY_ID=$AGENCY_ID"

# Step 2a: Login owner
OWNER_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@smartproperty.com","password":"Password123!"}' | jq -r '.tokens.accessToken')
echo "OWNER_TOKEN=$OWNER_TOKEN"

# Step 2b: Link owner to agency
curl -s -X POST http://localhost:3000/api/agencies/$AGENCY_ID/owners/me \
  -H "Authorization: Bearer $OWNER_TOKEN"
echo "Owner linked to agency"

# Step 3: Owner creates property
PROPERTY_ID=$(curl -s -X POST http://localhost:3000/api/properties \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Cozy 2BR Downtown Apartment",
    "description":"Bright 2-bedroom near downtown.",
    "type":"APARTMENT",
    "price":1200,
    "currency":"TND",
    "address":{"street":"12 Central Ave","city":"Tunis","state":"Tunis","zipCode":"1000","country":"Tunisia"},
    "features":{"bedrooms":2,"bathrooms":1,"area":85,"furnished":true}
  }' | jq -r '.id')
echo "PROPERTY_ID=$PROPERTY_ID"

# Step 4a: Login tenant
TENANT_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tenant@smartproperty.com","password":"Password123!"}' | jq -r '.tokens.accessToken')
echo "TENANT_TOKEN=$TENANT_TOKEN"

# Get tenant user ID
TENANT_USER_ID=$(curl -s -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq -r '.id')
echo "TENANT_USER_ID=$TENANT_USER_ID"

# Step 4b: Tenant submits application
APPLICATION_ID=$(curl -s -X POST http://localhost:3000/api/applications \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId":"'$PROPERTY_ID'",
    "employmentInfo":{"companyName":"Acme Corp","jobTitle":"Software Engineer","monthlyIncome":3000},
    "messageToOwner":"Interested!"
  }' | jq -r '.id')
echo "APPLICATION_ID=$APPLICATION_ID"

# Step 5: Branch manager approves
curl -s -X PATCH http://localhost:3000/api/applications/$APPLICATION_ID/approve \
  -H "Authorization: Bearer $BM_TOKEN"
echo "Application approved"

# Step 6: Branch manager creates lease
LEASE_ID=$(curl -s -X POST http://localhost:3000/api/leases/from-application/$APPLICATION_ID \
  -H "Authorization: Bearer $BM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate":"2026-06-01",
    "endDate":"2027-05-31",
    "monthlyRent":1200,
    "securityDeposit":1200
  }' | jq -r '.id')
echo "LEASE_ID=$LEASE_ID"

# Step 7: Tenant initiates payment
echo "Creating payment..."
curl -s -X POST http://localhost:3000/api/payments/initiate \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leaseId":"'$LEASE_ID'",
    "tenantId":"'$TENANT_USER_ID'",
    "amount":1200000,
    "currency":"TND",
    "type":"RENT"
  }' | jq .

echo "✅ Payment creation complete!"
```

Save as `test-payment-flow.sh`, then:

```bash
bash test-payment-flow.sh
```

---

## Troubleshooting

| Error                                         | Cause                                     | Fix                                                                        |
| --------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------- |
| "No responsible agent/manager is assigned..." | Property missing managerId                | Ensure property response has `managerId` field set                         |
| "Email already registered"                    | Agency creation tries to create duplicate | Skip agency creation, use existing or delete and retry                     |
| "Invalid email or password"                   | Wrong seed account                        | Check spelling; all seed accounts have email format user@smartproperty.com |
| CAPTCHA verification failed                   | Backend env missing RECAPTCHA_SECRET_KEY  | Verify backend/.env has RECAPTCHA_SECRET_KEY set                           |

---

## What Each Role Does

- **BRANCH_MANAGER** → Creates agencies, approves applications, creates leases
- **OWNER** → Creates properties, receives applications on properties they own
- **TENANT** → Applies for properties, initiates payments
- **RENTAL_MANAGER** → Can review/manage applications and leases
- **REAL_ESTATE_AGENT** → Can manage properties (optional in this flow)

---

## Owner Use Case

### Owner's Full Workflow

**Owner** (`owner@smartproperty.com`) manages rental properties and receives tenant applications.

#### 1. Login

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@smartproperty.com",
    "password": "Password123!"
  }' | jq '.tokens.accessToken'
```

#### 2. View Profile

```bash
curl -s -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer $OWNER_TOKEN" | jq .
```

→ Response includes owner's user ID, email, properties count, etc.

#### 3. Link to Agency (Optional but Required for Manager Assignment)

```bash
curl -s -X POST http://localhost:3000/api/agencies/$AGENCY_ID/owners/me \
  -H "Authorization: Bearer $OWNER_TOKEN"
```

→ Once linked, properties created will auto-assign a manager from the agency.

#### 4. Create a Rental Property

```bash
curl -s -X POST http://localhost:3000/api/properties \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Spacious 3BR Family Home",
    "description": "Modern home with garden and parking.",
    "type": "HOUSE",
    "status": "AVAILABLE",
    "category": "RESIDENTIAL",
    "price": 1500,
    "currency": "TND",
    "address": {
      "street": "45 Oak Street",
      "city": "Sfax",
      "state": "Sfax",
      "zipCode": "3000",
      "country": "Tunisia",
      "coordinates": {
        "lat": 34.7397,
        "lng": 10.7605
      }
    },
    "features": {
      "bedrooms": 3,
      "bathrooms": 2,
      "area": 150,
      "parkingSpaces": 1,
      "furnished": false,
      "petFriendly": true,
      "amenities": ["wifi", "heating", "garden"]
    },
    "images": [
      {
        "url": "https://example.com/property-image.jpg",
        "caption": "Front view",
        "isPrimary": true
      }
    ]
  }' | jq .
```

→ Response includes property ID and auto-assigned `managerId`.

#### 5. View My Properties

```bash
curl -s -X GET "http://localhost:3000/api/properties?ownerId=$OWNER_USER_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN" | jq .
```

#### 6. View Applications Received (Delegated to Manager)

```bash
curl -s -X GET http://localhost:3000/api/applications/received \
  -H "Authorization: Bearer $OWNER_TOKEN" | jq .
```

→ Lists all applications for properties owned by this owner (manager can review/approve).

#### 7. Update Property Details

```bash
curl -s -X PUT http://localhost:3000/api/properties/$PROPERTY_ID \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 1400,
    "status": "RENTED",
    "features": {
      "bedrooms": 3,
      "bathrooms": 2,
      "furnished": true
    }
  }' | jq .
```

#### 8. View Leases for My Properties

```bash
curl -s -X GET http://localhost:3000/api/leases/mine \
  -H "Authorization: Bearer $OWNER_TOKEN" | jq .
```

→ Shows active leases, tenants, monthly rent, payment history.

#### 9. View Payments Received

```bash
curl -s -X GET http://localhost:3000/api/payments/mine \
  -H "Authorization: Bearer $OWNER_TOKEN" | jq .
```

→ Shows all rent payments, deposits, refunds linked to owner's properties.

#### 10. View Payment Summary

```bash
curl -s -X GET http://localhost:3000/api/payments/mine/summary \
  -H "Authorization: Bearer $OWNER_TOKEN" | jq .
```

→ Summary metrics: total collected, pending, average rent, etc.

---

## Tenant Use Case

### Tenant's Full Workflow

**Tenant** (`tenant@smartproperty.com`) searches for properties, applies, signs leases, and pays rent.

#### 1. Login

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tenant@smartproperty.com",
    "password": "Password123!"
  }' | jq '.tokens.accessToken'
```

#### 2. View Profile

```bash
curl -s -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq .
```

#### 3. Search for Available Properties (Public)

```bash
curl -s -X GET "http://localhost:3000/api/properties?status=AVAILABLE&city=Tunis&minPrice=1000&maxPrice=1500" \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq .
```

→ Returns paginated list of available properties.

#### 4. View Property Details (Public)

```bash
curl -s -X GET http://localhost:3000/api/properties/$PROPERTY_ID \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq .
```

→ Full property info: description, images, features, address, price, manager contact.

#### 5. Set Search Preferences (Optional)

```bash
curl -s -X PUT http://localhost:3000/api/users/preferences \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budgetMin": 1000,
    "budgetMax": 1500,
    "bedrooms": 2,
    "bathrooms": 1,
    "petFriendly": true,
    "furnished": true,
    "preferredCities": ["Tunis", "Sfax"],
    "moveInDatePreference": "2026-06-01"
  }' | jq .
```

#### 6. Get Property Recommendations (AI-Powered)

```bash
curl -s -X GET "http://localhost:3000/api/properties/ai/recommendations/best-match?limit=5" \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq .
```

→ Returns AI-matched properties based on tenant preferences.

#### 7. Submit Application for a Property

```bash
curl -s -X POST http://localhost:3000/api/applications \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "'$PROPERTY_ID'",
    "employmentInfo": {
      "companyName": "Tech Solutions Inc",
      "jobTitle": "Senior Developer",
      "monthlyIncome": 3500,
      "employmentType": "full_time",
      "startDate": "2023-01-15"
    },
    "references": [
      {
        "name": "Mohamed Ben Ali",
        "relation": "Previous landlord",
        "phone": "+21698765432",
        "email": "landlord@example.com",
        "notes": "Always paid rent on time"
      }
    ],
    "messageToOwner": "Professional software developer seeking 12-month lease. Stable income, excellent references.",
    "questionnaire": {
      "dateOfBirth": "1994-08-21",
      "currentAddress": "12 Rue des Lilas, Tunis",
      "occupantsAdults": 2,
      "occupantsChildren": 1,
      "hasPets": false,
      "smokingStatus": "non_smoker",
      "desiredMoveInDate": "2026-06-01",
      "leaseDurationPreference": "12 months",
      "monthlyBudgetMin": 1000,
      "monthlyBudgetMax": 1500,
      "employmentStatus": "employee",
      "netMonthlyIncomeMin": 3000,
      "netMonthlyIncomeMax": 4000
    }
  }' | jq .
```

→ Response includes application ID and status (usually PENDING_REVIEW).

#### 8. Upload Application Documents

```bash
curl -s -X POST http://localhost:3000/api/applications/$APPLICATION_ID/documents \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -F "file=@/path/to/pay_stub.pdf" \
  -F "category=pay_stub" | jq .
```

→ Upload: pay stubs, tax returns, ID, bank statements, employment letter, etc.

#### 9. View My Applications (Status)

```bash
curl -s -X GET http://localhost:3000/api/applications/my \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq .
```

→ Lists all applications (PENDING, APPROVED, REJECTED, WITHDRAWN).

#### 10. View Application Details

```bash
curl -s -X GET http://localhost:3000/api/applications/$APPLICATION_ID \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq .
```

→ Shows application status, manager comments, requested documents, next steps.

#### 11. Withdraw Application (If Desired)

```bash
curl -s -X PATCH http://localhost:3000/api/applications/$APPLICATION_ID/withdraw \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Found another property"
  }' | jq .
```

#### 12. Application Approved → Lease Created (Manager creates lease)

(Tenant receives notification; lease ID provided in response)

#### 13. View My Leases

```bash
curl -s -X GET http://localhost:3000/api/leases/mine \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq .
```

→ Shows all active and past leases with owner, property, rent amount, dates, status.

#### 14. View Lease Details

```bash
curl -s -X GET http://localhost:3000/api/leases/$LEASE_ID \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq .
```

→ Full lease: terms, rent, deposit, start/end dates, payment schedule, signatures.

#### 15. Sign Lease (Digital Signature)

```bash
curl -s -X PATCH http://localhost:3000/api/leases/$LEASE_ID/sign \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "signature": "Jane Doe",
    "signedAt": "2026-05-04T15:30:00.000Z"
  }' | jq .
```

#### 16. Initiate Rent Payment

```bash
curl -s -X POST http://localhost:3000/api/payments/initiate \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leaseId": "'$LEASE_ID'",
    "tenantId": "'$TENANT_USER_ID'",
    "amount": 1200000,
    "currency": "TND",
    "type": "RENT"
  }' | jq .
```

→ Response includes `clientSecret` for Stripe payment confirmation on frontend.

#### 17. View Payment History

```bash
curl -s -X GET http://localhost:3000/api/payments/mine \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq .
```

→ All payments: rent, deposits, refunds with dates, amounts, status.

#### 18. Export Payment History (CSV)

```bash
curl -s -X GET http://localhost:3000/api/payments/mine/export \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Accept: text/csv" > payment_history.csv
```

#### 19. Record Move-In Inventory with Photos

```bash
curl -s -X POST http://localhost:3000/api/leases/$LEASE_ID/inventory \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -F "phase=move_in" \
  -F "room=living_room" \
  -F "item=sofa" \
  -F "condition=good" \
  -F "photos=@/path/to/photo1.jpg" \
  -F "photos=@/path/to/photo2.jpg" | jq .
```

→ Documents property condition at move-in for dispute resolution.

#### 20. Deactivate Account

```bash
curl -s -X DELETE http://localhost:3000/api/users/deactivate \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq .
```

→ Soft-delete account (can be reactivated).

#### 21. Permanently Delete Account (GDPR)

```bash
curl -s -X DELETE http://localhost:3000/api/users/permanent-delete \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq .
```

→ Anonymizes all personal data, cannot be recovered.

---

## Next Step After Payment

Once you reach Step 7 and get a `clientSecret` and `paymentIntentId`:

1. **Frontend:** Use `clientSecret` with Stripe Elements to confirm payment on client
2. **Backend:** Payment status moves from PENDING → COMPLETED after Stripe webhook
3. **Test mode:** Use Stripe test card: `4242 4242 4242 4242`, any expiry, any CVC

---

## Seed Database with Users

If users aren't seeded yet:

```bash
cd backend
npm run seed:users
```

All seeded accounts will be created and ready to use.
