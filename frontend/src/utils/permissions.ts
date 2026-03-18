// ===========================================
// SmartProperty - Permission Utilities
// ===========================================
// Single source of truth for all role-based
// permission checks. Import these helpers
// instead of doing inline role comparisons
// across components.
// ===========================================

import type { User } from '@/types/auth';
import { UserRole } from '@/types/auth';

/**
 * Roles that can create, update, and delete properties.
 * Tenant is intentionally excluded — read-only.
 */
const PROPERTY_MANAGERS: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.OWNER,
  UserRole.BRANCH_MANAGER,
  UserRole.MANAGER,
  UserRole.REAL_ESTATE_AGENT,
  UserRole.AGENT,
  UserRole.RENTAL_MANAGER,
];

/**
 * Roles that can create properties.
 */
const PROPERTY_CREATORS: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.OWNER,
  UserRole.BRANCH_MANAGER,
  UserRole.MANAGER,
  UserRole.REAL_ESTATE_AGENT,
  UserRole.AGENT,
];

/**
 * Roles that can access user administration.
 */
const USER_ADMIN_ROLES: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

/**
 * Roles that can review verifications.
 */
const VERIFICATION_REVIEW_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.BRANCH_MANAGER,
];

function hasRole(
  user: User | null | undefined,
  allowedRoles: UserRole[],
): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role as UserRole);
}

/**
 * Can the user add, edit, or delete a property?
 *
 * @example
 * const canManage = canManageProperties(user);
 * {canManage && <Link to="/properties/new">Add</Link>}
 */
export function canManageProperties(user: User | null | undefined): boolean {
  return hasRole(user, PROPERTY_MANAGERS);
}

/**
 * Can the user create a property?
 */
export function canCreateProperties(user: User | null | undefined): boolean {
  return hasRole(user, PROPERTY_CREATORS);
}

/**
 * Is the user a tenant (read-only access to properties)?
 */
export function isTenant(user: User | null | undefined): boolean {
  return user?.role === UserRole.TENANT;
}

/**
 * Is the user a platform admin?
 */
export function isPlatformAdmin(user: User | null | undefined): boolean {
  return hasRole(user, USER_ADMIN_ROLES);
}

/**
 * Backward-compatible alias.
 */
export function isAdmin(user: User | null | undefined): boolean {
  return isPlatformAdmin(user);
}

/**
 * Can access admin users page.
 */
export function canAccessAdminUsers(user: User | null | undefined): boolean {
  return hasRole(user, USER_ADMIN_ROLES);
}

/**
 * Can access verification review pages.
 */
export function canReviewVerifications(
  user: User | null | undefined,
): boolean {
  return hasRole(user, VERIFICATION_REVIEW_ROLES);
}

/**
 * Is the user an owner?
 */
export function isOwner(user: User | null | undefined): boolean {
  return user?.role === UserRole.OWNER;
}

/**
 * Is the user a manager?
 */
export function isManager(user: User | null | undefined): boolean {
  return (
    user?.role === UserRole.MANAGER ||
    user?.role === UserRole.BRANCH_MANAGER ||
    user?.role === UserRole.RENTAL_MANAGER
  );
}

