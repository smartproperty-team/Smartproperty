# SmartProperty Role Use Cases and End-to-End Roadmap

## Why this document

This guide explains:

- what each role does in SmartProperty,
- how agencies and role assignment work,
- the full journey from posting a property to tenant payment,
- what to check when the flow is blocked.

It is aligned with current backend behavior in:

- `backend/src/modules/agencies`
- `backend/src/modules/properties`
- `backend/src/modules/applications`
- `backend/src/modules/leases`
- `backend/src/modules/payments`

## Canonical roles and practical use cases

### 1. Guest (not logged in)

Use cases:

- Browse public property listings.
- Filter by city, budget, type.
- Open property detail pages.
- Register or log in.

Cannot:

- Apply for a property.
- Access private dashboards.

### 2. Super Administrator

Use cases:

- Global governance across users and operations.
- Override sensitive ownership/role operations.
- Support full operational flow when debugging or support is needed.

In property flow:

- Can create or update properties with explicit `ownerId`.
- Can assist with manager assignment and role correction.

### 3. Branch Manager

Use cases:

- Create an agency.
- Provision agency role accounts automatically.
- Manage agency-linked owner relationships.
- Supervise listings and applications.

In property flow:

- Can create and manage properties.
- Commonly acts as review authority.

### 4. Real Estate Agent

Use cases:

- Day-to-day property listing operations.
- Improve listing quality and marketing content.
- Review submitted tenant applications.

In property flow:

- Can be assigned as property manager (`managerId`).
- Can review/approve/reject applications when authorized.

### 5. Rental Manager

Use cases:

- Rental lifecycle operations after listing/application stages.
- Track and process lease actions and payment monitoring.

In property flow:

- Can be assigned as property manager (`managerId`).
- Can review applications and drive lease lifecycle.

### 6. Accountant / Administrative Assistant

Use cases:

- Financial reporting and reconciliation.
- Payment exports and follow-up support.

In payment flow:

- Can view payment history relevant to operations.
- Can execute refunds where role checks allow.

### 7. Owner

Use cases:

- Own and monitor property assets.
- Join an agency.
- Validate decisions around owned properties.

In property flow:

- Can post and manage owned properties.
- Should assign a manager when needed for application routing.
- Can participate in lease decisions/signature path.

### 8. Tenant / Candidate Tenant

Use cases:

- Search properties.
- Submit applications.
- Upload required documents.
- Sign lease.
- Initiate and complete payment.

In flow:

- Must have a property with valid ownership and manager routing to submit successfully.

### 9. Service Provider

Use cases:

- Intervention and maintenance operations.
- Upload job evidence and related reporting.

Not part of primary listing-to-payment path, but active after tenancy begins.

### 10. AI System (technical actor)

Use cases:

- Price suggestion, recommendation, and content assistance.
- Decision support, not final legal authority.

## Core data dependencies in the listing-to-payment flow

- Property requires `ownerId`.
- Application routing requires `managerId`.
- Agency membership is tracked on users via `agencyId`.
- Property can inherit operational context from owner/manager agency relationships.

Important rule:

- If a property has no `managerId`, application submission may fail with:
  - `No responsible agent/manager is assigned to this property yet.`

## End-to-end roadmap: posting property to payment

## Phase 0: Account setup and authentication

Goal:

- Ensure all actors can log in (owner, manager, tenant).

Checklist:

- Seed users in development.
- Confirm CAPTCHA and auth environment variables.
- Verify role accounts exist and are active.

## Phase 1: Agency creation and role provisioning (Branch Manager)

Main endpoint:

- `POST /api/agencies` (Branch Manager)

What happens:

- Branch Manager creates agency.
- System auto-provisions role accounts (manager, rental manager, accountant, service provider).
- Agency members are recorded with `agencyId`.

## Phase 2: Owner joins agency

Main endpoints:

- `POST /api/agencies/:id/owners/me` (Owner self-link)
- `POST /api/agencies/:id/owners/:ownerId` (Branch Manager links owner)

Goal:

- Connect owner account to an agency so operational manager discovery can work better.

## Phase 3: Property posting and manager assignment

Main endpoints:

- `POST /api/properties`
- `PUT /api/properties/:id`

Critical behavior:

- Property creator can set `managerId`.
- For Branch Manager / Agent / Rental Manager creators, `managerId` is auto-assigned to current user if missing.
- For Owner-created properties, manager may be resolved from agency manager if available.

Best practice:

- Always confirm `managerId` is set on rental properties that will receive tenant applications.

## Phase 4: Tenant applies

Main endpoint:

- `POST /api/applications`

Checks performed:

- Property exists and is not deleted.
- Property has `ownerId`.
- A responsible manager can be resolved (`managerId`).
- Tenant has no other active application for same property.

Result:

- Application is created and routed to reviewers.

## Phase 5: Review and decision (manager roles)

Main endpoints:

- `GET /api/applications/received`
- `PATCH /api/applications/:id/request-documents`
- `PATCH /api/applications/:id/schedule-viewing`
- `PATCH /api/applications/:id/approve`
- `PATCH /api/applications/:id/reject`

Goal:

- Move candidate from submitted to approved with full document trail.

## Phase 6: Lease creation and signatures

Main endpoints:

- `POST /api/leases/from-application/:applicationId`
- `PATCH /api/leases/:id/sign`
- `PATCH /api/leases/:id/activate`

Goal:

- Create lease from approved application.
- Collect signatures.
- Activate lease.

## Phase 7: Payment initiation and completion

Main endpoints:

- `POST /api/payments/initiate`
- `GET /api/payments/mine`
- `GET /api/payments/mine/summary`
- `GET /api/payments/mine/export`
- `POST /api/payments/:id/refund` (authorized roles)

Goal:

- Tenant initiates and confirms payment (Stripe flow).
- Team verifies payment history and summary.

## Fast troubleshooting map

### Error: `No responsible agent/manager is assigned to this property yet.`

Meaning:

- The property does not have a usable `managerId`, and fallback resolution did not find one.

Fix:

1. Update property manager via property update flow (`PUT /api/properties/:id`).
2. Assign a valid manager account (example: `rental-manager@smartproperty.com`).
3. Retry tenant application.

### Tenant cannot apply even with manager assigned

Check:

- Property still marked active/available.
- Tenant does not already have active application for same property.
- Property and manager IDs are valid ObjectIds.

### Lease cannot be created

Check:

- Application is approved.
- Requester has lease management role.

### Payment initiation fails

Check:

- Lease is in proper state for payment.
- Stripe keys are configured.
- Tenant has access to lease/payment path.

## Suggested execution checklist for your team

1. Branch Manager creates agency.
2. Owner links to agency.
3. Owner/manager creates property and confirms `managerId`.
4. Tenant applies.
5. Manager reviews and approves.
6. Manager/owner creates lease.
7. Owner and tenant sign.
8. Tenant pays.
9. Accountant/manager verifies payment reports.

## Seed users you can use in development

- Super Admin: `superadmin@smartproperty.com`
- Branch Manager: `branch-manager@smartproperty.com`
- Real Estate Agent: `agent-manager@smartproperty.com`
- Rental Manager: `rental-manager@smartproperty.com`
- Owner: `owner@smartproperty.com`
- Tenant: `tenant@smartproperty.com`
- Password (seed default): `Password123!`
