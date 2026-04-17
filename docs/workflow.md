# Workflow: Property Assignment and Applications (Backend As-Is)

This document describes the current backend workflow for property assignment and rental applications, based on the NestJS modules in the backend.

## Scope

- Property ownership and manager assignment
- Agency provisioning and how it connects to property management
- Rental application submission and review routing

## Key Entities and Fields

- Property: `ownerId`, optional `managerId`
- Application: `tenantId`, `ownerId`, optional `managerId`
- User: optional `agencyId`

## Role Gates (Current)

- Property create: Owner, Branch Manager, Real Estate Agent, Rental Manager, Super Admin
- Property update/delete and portfolio access: Owner, Branch Manager, Real Estate Agent, Rental Manager, Super Admin
- Application submit: Tenant only
- Application review: Branch Manager, Real Estate Agent, Rental Manager, Super Admin
- Agency creation: Branch Manager only

## Property Assignment Flow

### Create Property

Endpoint: `POST /properties`

Rules:

- If `ownerId` is provided and the user is not a Super Admin, the request is rejected.
- Tenants cannot set `managerId`.
- `ownerId` defaults to the current user.
- `managerId` is set from the request if provided, otherwise it auto-assigns to the current user when the creator is a Branch Manager, Real Estate Agent, or Rental Manager.

Result:

- Property is saved with `ownerId` and optional `managerId`.

### Update Property (Reassignment)

Endpoint: `PUT /properties/:id`

Rules:

- Only users who can manage the property (Super Admin, owner, or assigned manager) can update it.
- Only Super Admins can change `ownerId`.
- `managerId` can be updated by users who can manage the property.

### Soft Delete Property

Endpoint: `DELETE /properties/:id`

Rules:

- Same access rules as update.
- Property is marked `UNLISTED` and `deletedAt` is set.

## Agency Provisioning and Association

### Create Agency

Endpoint: `POST /agencies`

Rules:

- Branch Manager creates an agency and auto-provisions role accounts.
- Provisioned accounts receive `agencyId` on the user record.

Notes:

- Properties do not store `agencyId` directly.
- Assigning a property to an agency is done indirectly by setting `managerId` to a user whose `agencyId` belongs to that agency.

## Rental Application Flow

### Submit Application (Tenant)

Endpoint: `POST /applications`

Rules:

- Tenant can submit only one active application per property (submitted, under_review, documents_requested, viewing_scheduled).
- The property must exist and not be soft-deleted.
- `ownerId` is read from the property; if missing, the request fails.
- `managerId` is required for application routing:
  - If `managerId` exists on the property, it is used.
  - If not, and the property owner is a Branch Manager, Real Estate Agent, or Rental Manager, the owner is auto-assigned as `managerId` on the property.
  - If no manager can be resolved, submission fails.

Result:

- Application is created with `tenantId`, `ownerId`, and `managerId`.
- Reviewer notifications are routed to `managerId`.

### Review and Decision

Endpoints:

- `GET /applications/received`
- `GET /applications/:id`
- `PATCH /applications/:id/approve`
- `PATCH /applications/:id/reject`
- `PATCH /applications/:id/request-documents`
- `PATCH /applications/:id/schedule-viewing`

Rules:

- Review access is based on `managerId` and role. Owners do not receive review access unless they are also a manager role or platform admin.
- Notifications go to the manager; tenant updates are sent on status changes.

## Common Backend Errors (Apply Flow)

- Property not found
- Property owner is missing
- No responsible agent/manager is assigned to this property yet
- You already have an active application for this property

## Summary of Assignment Responsibility

- Owners can create properties for themselves and may set a manager if allowed by role gates.
- Branch Managers, Real Estate Agents, and Rental Managers often act as both creator and manager (auto-assigned).
- Agencies are linked via `User.agencyId`; properties link to agencies only through the selected manager user.
