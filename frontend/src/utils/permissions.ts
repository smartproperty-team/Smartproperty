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
  UserRole.ADMIN,
  UserRole.OWNER,
  UserRole.MANAGER,
];

/**
 * Can the user add, edit, or delete a property?
 *
 * @example
 * const canManage = canManageProperties(user);
 * {canManage && <Link to="/properties/new">Add</Link>}
 */
export function canManageProperties(user: User | null | undefined): boolean {
  if (!user) return false;
  return PROPERTY_MANAGERS.includes(user.role as UserRole);
}

/**
 * Is the user a tenant (read-only access to properties)?
 */
export function isTenant(user: User | null | undefined): boolean {
  return user?.role === UserRole.TENANT;
}

/**
 * Is the user an admin?
 */
export function isAdmin(user: User | null | undefined): boolean {
  return user?.role === UserRole.ADMIN;
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
  return user?.role === UserRole.MANAGER;
}

