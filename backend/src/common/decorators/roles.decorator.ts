// ===========================================
// SmartProperty - Roles Decorator
// ===========================================

import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../modules/users/entities/user.entity';

export const ROLES_KEY = 'roles';

/**
 * Decorator to restrict access to specific user roles
 * Use with RolesGuard to enforce role-based access control.
 *
 * @param roles - Array of UserRole values allowed to access the route
 *
 * @example
 * @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
 * @Get('admin/users')
 * getAdminUsers() {
 *   return this.userService.findAll();
 * }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
