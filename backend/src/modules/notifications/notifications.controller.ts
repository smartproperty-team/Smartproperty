// ===========================================
// SmartProperty - Notifications Controller
// ===========================================

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../users/entities/user.entity';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  private resolveUserId(user: any, userId?: string): string {
    const resolved =
      userId ||
      user?.id ||
      user?._id?.toHexString?.() ||
      user?._id?.toString?.();

    if (!resolved) {
      throw new BadRequestException('Authenticated user id is missing');
    }

    return resolved;
  }

  @Get()
  @ApiOperation({ summary: 'Get all notifications for the current user' })
  async findAll(@CurrentUser() user: any, @CurrentUser('id') userId?: string) {
    return this.notificationsService.findAllForUser(
      this.resolveUserId(user, userId),
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(
    @CurrentUser() user: any,
    @CurrentUser('id') userId?: string,
  ) {
    const count = await this.notificationsService.getUnreadCount(
      this.resolveUserId(user, userId),
    );
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(
      this.resolveUserId(user, userId),
      id,
    );
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(
    @CurrentUser() user: any,
    @CurrentUser('id') userId?: string,
  ) {
    return this.notificationsService.markAllAsRead(
      this.resolveUserId(user, userId),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  async delete(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.notificationsService.delete(
      this.resolveUserId(user, userId),
      id,
    );
  }

  // ═══════════════════════════════════════════════════════
  // PUSH NOTIFICATIONS
  // ═══════════════════════════════════════════════════════

  @Get('push/public-key')
  @ApiOperation({ summary: 'Get VAPID public key for push notifications' })
  getPublicKey() {
    return {
      publicKey: this.notificationsService.getPublicKey(),
    };
  }

  @Post('push/subscribe')
  @ApiOperation({ summary: 'Subscribe to push notifications' })
  @ApiBody({
    description: 'Push subscription object from browser',
    schema: {
      example: {
        endpoint: 'https://...',
        keys: { p256dh: '...', auth: '...' },
      },
    },
  })
  async subscribeToPush(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string | undefined,
    @Body() subscription: any,
  ) {
    const resolvedUserId = this.resolveUserId(user, userId);

    // Validate subscription structure
    if (!subscription) {
      throw new BadRequestException('Subscription body is required');
    }

    if (!subscription.endpoint) {
      throw new BadRequestException('subscription.endpoint is required');
    }

    if (!subscription.keys) {
      throw new BadRequestException('subscription.keys is required');
    }

    if (!subscription.keys.p256dh) {
      throw new BadRequestException('subscription.keys.p256dh is required');
    }

    if (!subscription.keys.auth) {
      throw new BadRequestException('subscription.keys.auth is required');
    }

    this.logger.log(
      `Received push subscription for user ${resolvedUserId}: ${subscription.endpoint}`,
    );

    await this.notificationsService.upsertPushSubscription(
      resolvedUserId,
      subscription,
    );
    return { success: true, message: 'Subscribed to push notifications' };
  }

  @Delete('push/unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe from push notifications' })
  async unsubscribeFromPush(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string | undefined,
    @Body() body: { endpoint: string },
  ) {
    const resolvedUserId = this.resolveUserId(user, userId);
    await this.notificationsService.unsubscribeFromPush(
      resolvedUserId,
      body.endpoint,
    );
    return { success: true, message: 'Unsubscribed from push notifications' };
  }

  @Post('push/test')
  @ApiOperation({ summary: 'Send test push notification to current user' })
  async sendTestPush(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string | undefined,
  ) {
    const resolvedUserId = this.resolveUserId(user, userId);
    return this.notificationsService.sendTestPushToUser(resolvedUserId);
  }

  @Post('push/test-to-user/:userId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BRANCH_MANAGER)
  @ApiOperation({ summary: 'Send test push to specific user (Admin only)' })
  async sendTestPushToUser(
    @CurrentUser() user: any,
    @CurrentUser('id') fromUserId: string | undefined,
    @Param('userId') toUserId: string,
  ) {
    const resolvedFromUserId = this.resolveUserId(user, fromUserId);
    return this.notificationsService.sendPushToUser(
      resolvedFromUserId,
      toUserId,
      '💬 Test Notification from Admin',
      `Test notification sent by ${user?.firstName || 'Administrator'}`,
    );
  }
}
