// ===========================================
// SmartProperty - Current User Decorator
// ===========================================

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract the current authenticated user from request
 * Use this to get user data in controller methods.
 *
 * @example
 * @Get('me')
 * getProfile(@CurrentUser() user: any) {
 *   return user;
 * }
 *
 * @example
 * @Get('me/id')
 * getUserId(@CurrentUser('id') userId: string) {
 *   return { id: userId };
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user?.[data] : user;
  },
);
