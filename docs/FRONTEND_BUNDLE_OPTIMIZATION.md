# Frontend Bundle Optimization Log

## Overview

This document records the frontend bundle optimization work completed in April 2026.
The goal was to reduce first-load JavaScript, remove build-time chunk warnings, and improve route transition performance without changing product behavior.

## Scope

The optimization focused on:

- Build chunking strategy (Vite manual chunks)
- Route-level lazy loading for large pages
- Removing static imports that blocked chunk splitting
- Route prefetch on hover/focus for high-traffic navigation paths
- Fixing related TypeScript/build blockers discovered during optimization

## What Was Implemented

### 1) Build Chunking Strategy

Updated Vite build output chunking with `manualChunks` to separate major dependency groups:

- `react-vendor`
- `maps-3d-vendor`
- `ui-vendor`
- `state-query-vendor`
- fallback `vendor`

File:

- `frontend/vite.config.ts`

### 2) Route-Level Lazy Loading

Added `React.lazy` + `Suspense` route loading for heavy route groups.

First pass:

- Dashboard routes:
  - DashboardPage
  - VerificationPage
  - AdminVerificationPage
  - AdminUsersPage
  - BranchManagerAgenciesPage
  - BranchManagerAgencyOnboardingPage
- Property routes:
  - PropertiesPage
  - MyPropertiesPage
  - PropertyDetailPage
  - PropertyFormPage

Second pass:

- Settings route:
  - SettingsPage
- Maintenance routes:
  - MaintenanceRequestFormPage
  - MyMaintenanceRequestsPage
  - ServiceProviderMaintenancePage

File:

- `frontend/src/App.tsx`

### 3) Import Cleanup To Enable Splitting

Removed or replaced static imports that prevented dynamic chunks from being emitted.

- Replaced dynamic import of service barrel with direct `authService` import in app bootstrap.
- Switched settings page import from dashboard barrel to direct `SessionsPage` import.

Files:

- `frontend/src/App.tsx`
- `frontend/src/pages/settings/SettingsPage.tsx`

### 4) Route Prefetch On Hover/Focus

Added a reusable route prefetch utility that preloads route chunks when users hover/focus high-traffic links.

Behavior:

- Prefetches only once per chunk key (in-memory cache)
- Matches route path patterns and imports the right page module
- Supports dashboard, properties, settings/profile/security, and maintenance routes

Files:

- `frontend/src/utils/routePrefetch.ts` (new)
- `frontend/src/utils/index.ts`
- `frontend/src/components/layout/HomeNavbar.tsx`
- `frontend/src/components/layout/AppSidebar.tsx`

## Build and Size Results

### Baseline (before optimization)

- Main app chunk: about `1090.43 kB`
- Warnings:
  - Large chunk warning (over 500 kB)
  - Mixed dynamic/static import warnings for services

### After optimization passes

- Pass 1 (chunk strategy + service import cleanup):
  - Main app chunk: about `477.16 kB`
- Pass 2 (dashboard/properties lazy loading):
  - Main app chunk: about `266.95 kB`
- Pass 3 (settings/maintenance lazy loading + prefetch):
  - Main app chunk: about `206.49 kB`

Current status:

- `npm run build --prefix frontend` passes
- No large main-chunk warning in final result
- Route chunks are emitted for dashboard/properties/settings/maintenance pages

## Additional Build Fixes Completed During Optimization

To keep optimization work buildable, a few compile blockers were fixed:

- TypeScript config deprecation/blocking options adjusted in `frontend/tsconfig.json`
- Translation typing improved to keep key safety while allowing localized string values
- Minor TypeScript hygiene fixes in auth, notification, and dashboard UI code

These fixes were required for successful builds and did not change route behavior.

## Files Touched (Optimization Work)

- `frontend/vite.config.ts`
- `frontend/tsconfig.json`
- `frontend/src/App.tsx`
- `frontend/src/pages/settings/SettingsPage.tsx`
- `frontend/src/utils/routePrefetch.ts`
- `frontend/src/utils/index.ts`
- `frontend/src/components/layout/HomeNavbar.tsx`
- `frontend/src/components/layout/AppSidebar.tsx`

## Validation Command

```bash
npm run build --prefix frontend
```

## Suggested Next Steps

- Add lightweight route prefetch after successful login for likely first destinations.
- Consider prefetch throttling by connection quality (`navigator.connection`) for low-bandwidth users.
- Add bundle-size budgets in CI to prevent regressions.
- Optionally audit CSS size and split non-critical style payloads.
