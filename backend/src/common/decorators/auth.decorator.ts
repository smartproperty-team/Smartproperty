// ===========================================
// Decorators
// ===========================================

import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { UserRole } from '../entities';

/**
 * Require specific roles for a route
 */
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);

/**
 * Extract current user from request
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
