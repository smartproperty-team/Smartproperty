// ===========================================
// SmartProperty - Notifications Service
// ===========================================

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectId } from 'mongodb';
import { MongoRepository } from 'typeorm';
import * as webpush from 'web-push';
import { Notification, NotificationType } from './entities/notification.entity';
import { PushSubscription } from './entities/push-subscription.entity';
import { NotificationsGateway } from './notifications.gateway';

export interface CreateNotificationDto {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: MongoRepository<Notification>,
    @InjectRepository(PushSubscription)
    private readonly pushSubscriptionRepo: MongoRepository<PushSubscription>,
    private readonly configService: ConfigService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {
    this.configureWebPush();
  }

  private toResponse(notification: Notification) {
    return {
      id: notification._id?.toHexString(),
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
      link: notification.link,
      createdAt:
        notification.createdAt?.toISOString?.() || notification.createdAt,
    };
  }

  // ─── Configure Web Push ────────────────────────────────
  private configureWebPush(): void {
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.configService.get<string>('VAPID_SUBJECT');

    if (publicKey && privateKey && subject) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.logger.log('✓ Web Push VAPID configured');
    } else {
      this.logger.warn('⚠ Web Push VAPID keys not configured');
    }
  }

  private normalizeId(value: unknown): string | undefined {
    if (!value) {
      return undefined;
    }

    if (typeof value === 'string') {
      return value;
    }

    if (value instanceof ObjectId) {
      return value.toHexString();
    }

    if (
      typeof value === 'object' &&
      value !== null &&
      'toHexString' in value &&
      typeof (value as { toHexString?: unknown }).toHexString === 'function'
    ) {
      return (value as { toHexString: () => string }).toHexString();
    }

    return String(value);
  }

  private buildUserFilter(userId: string): Record<string, unknown> {
    const variants: Array<string | ObjectId> = [userId];

    if (ObjectId.isValid(userId)) {
      variants.push(new ObjectId(userId));
    }

    return {
      userId: {
        $in: variants,
      },
    };
  }

  // ─── Create a notification ─────────────────────────────
  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepo.create({
      userId: dto.userId,
      title: dto.title,
      message: dto.message,
      type: dto.type,
      link: dto.link,
      isRead: false,
    });

    const saved = await this.notificationRepo.save(notification);
    const unreadCount = await this.getUnreadCount(dto.userId);
    this.notificationsGateway.emitNotification(
      dto.userId,
      this.toResponse(saved),
    );
    this.notificationsGateway.emitUnreadCount(dto.userId, unreadCount);
    this.logger.log(
      `Notification created for user ${dto.userId}: ${dto.title}`,
    );
    return saved;
  }

  // ─── Get all notifications for a user ──────────────────
  async findAllForUser(userId: string) {
    const notifications = await this.notificationRepo.find({
      where: this.buildUserFilter(userId),
      order: { createdAt: 'DESC' },
    });

    return notifications.map((n) => this.toResponse(n));
  }

  // ─── Get unread count ──────────────────────────────────
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.count({
      where: {
        ...this.buildUserFilter(userId),
        isRead: false,
      },
    });
  }

  // ─── Mark one notification as read ─────────────────────
  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.notificationRepo.findOne({
      where: { _id: new ObjectId(notificationId) },
    });

    const notificationUserId = this.normalizeId(notification?.userId);
    if (!notification || notificationUserId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    notification.isRead = true;
    await this.notificationRepo.save(notification);
    const unreadCount = await this.getUnreadCount(userId);
    this.notificationsGateway.emitUnreadCount(userId, unreadCount);
    return { success: true };
  }

  // ─── Mark all as read ──────────────────────────────────
  async markAllAsRead(userId: string) {
    const notifications = await this.notificationRepo.find({
      where: {
        ...this.buildUserFilter(userId),
        isRead: false,
      },
    });

    for (const n of notifications) {
      n.isRead = true;
      await this.notificationRepo.save(n);
    }

    this.notificationsGateway.emitUnreadCount(userId, 0);

    return { success: true, count: notifications.length };
  }

  // ─── Delete a notification ─────────────────────────────
  async delete(userId: string, notificationId: string) {
    const notification = await this.notificationRepo.findOne({
      where: { _id: new ObjectId(notificationId) },
    });

    const notificationUserId = this.normalizeId(notification?.userId);
    if (!notification || notificationUserId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    await this.notificationRepo.delete(notification._id);
    const unreadCount = await this.getUnreadCount(userId);
    this.notificationsGateway.emitUnreadCount(userId, unreadCount);
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════
  // PUSH NOTIFICATIONS
  // ═══════════════════════════════════════════════════════

  // ─── Get VAPID Public Key ──────────────────────────────
  getPublicKey(): string {
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    if (!publicKey) {
      throw new BadRequestException('VAPID public key not configured');
    }
    return publicKey;
  }

  // ─── Upsert Push Subscription ──────────────────────────
  async upsertPushSubscription(
    userId: string,
    subscription: any,
  ): Promise<void> {
    try {
      const existing = await this.pushSubscriptionRepo.findOne({
        where: {
          userId: new ObjectId(userId),
          endpoint: subscription.endpoint,
        },
      });

      if (existing) {
        existing.keys = subscription.keys;
        existing.expirationTime = subscription.expirationTime;
        await this.pushSubscriptionRepo.save(existing);
      } else {
        const newSubscription = this.pushSubscriptionRepo.create({
          userId: new ObjectId(userId),
          endpoint: subscription.endpoint,
          keys: subscription.keys,
          expirationTime: subscription.expirationTime,
        });
        await this.pushSubscriptionRepo.save(newSubscription);
      }
      this.logger.log(`✓ Push subscription upserted for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to upsert push subscription: ${error}`);
    }
  }

  // ─── Get Subscriptions for User ────────────────────────
  private async getSubscriptionsForUser(userId: string): Promise<any[]> {
    try {
      const subscriptions = await this.pushSubscriptionRepo.find({
        where: { userId: new ObjectId(userId) },
      });
      return subscriptions.map((sub) => ({
        endpoint: sub.endpoint,
        keys: sub.keys,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get subscriptions for user ${userId}: ${error}`,
      );
      return [];
    }
  }

  // ─── Send Push Notification ────────────────────────────
  async sendPushNotification(
    userId: string,
    title: string,
    message = '',
  ): Promise<void> {
    const subscriptions = await this.getSubscriptionsForUser(userId);

    if (!subscriptions.length) {
      this.logger.warn(`No push subscriptions found for user ${userId}`);
      return;
    }

    const payload = JSON.stringify({
      title,
      body: message,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
    });

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(subscription, payload);
        this.logger.log(`✓ Push sent to ${userId}`);
      } catch (error: any) {
        if (error.statusCode === 410) {
          // Subscription no longer valid
          await this.pushSubscriptionRepo.delete({
            endpoint: subscription.endpoint,
          });
          this.logger.warn(`Removed invalid subscription for user ${userId}`);
        } else {
          this.logger.error(`Failed to send push: ${error.message}`);
        }
      }
    }
  }

  // ─── Send Test Push to Current User ────────────────────
  async sendTestPushToUser(userId: string): Promise<{ success: boolean }> {
    try {
      await this.sendPushNotification(
        userId,
        'Test Notification',
        'This is a test notification from SmartProperty',
      );
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send test push: ${error}`);
      throw error;
    }
  }

  // ─── Send Push to Another User (Admin to Tenant) ───────
  async sendPushToUser(
    fromUserId: string,
    toUserId: string,
    title: string,
    message = '',
  ): Promise<{ success: boolean }> {
    try {
      await this.sendPushNotification(toUserId, title, message);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send push: ${error}`);
      throw error;
    }
  }

  // ─── Unsubscribe from Push ─────────────────────────────
  async unsubscribeFromPush(userId: string, endpoint: string): Promise<void> {
    try {
      await this.pushSubscriptionRepo.delete({
        userId: new ObjectId(userId),
        endpoint,
      });
      this.logger.log(`✓ Unsubscribed user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to unsubscribe: ${error}`);
    }
  }
}
