// ===========================================
// SmartProperty - Messaging Gateway (WebSocket)
// ===========================================

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import * as jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { Server, Socket } from 'socket.io';

interface ActiveUserMetadata {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  connectedAt: Date;
}

@WebSocketGateway({
  namespace: '/messaging',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class MessagingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(MessagingGateway.name);
  private activeUsers = new Map<
    string,
    ActiveUserMetadata & { socketId: string }
  >();

  @WebSocketServer()
  private server: Server;

  constructor(private readonly configService: ConfigService) {}

  private getUserRoom(userId: string): string {
    return `user:${userId}`;
  }

  private getChatRoom(chatId: string): string {
    return `chat:${chatId}`;
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim().length > 0) {
      return authToken.replace(/^Bearer\s+/i, '').trim();
    }

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.trim().length > 0) {
      return header.replace(/^Bearer\s+/i, '').trim();
    }

    return null;
  }

  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = jwt.verify(
        token,
        this.configService.get<string>('jwt.secret') || 'default_jwt_secret',
      ) as {
        sub?: string;
        id?: string;
        email?: string;
        firstName?: string;
        lastName?: string;
        role?: string;
      };

      const userId = payload.sub || payload.id;
      if (!userId) {
        client.disconnect();
        return;
      }

      client.data.userId = userId;
      await client.join(this.getUserRoom(userId));

      // Track active user
      this.activeUsers.set(userId, {
        userId,
        socketId: client.id,
        email: payload.email || '',
        firstName: payload.firstName || '',
        lastName: payload.lastName || '',
        role: payload.role || '',
        connectedAt: new Date(),
      });

      this.logger.log(`✓ User connected: ${userId} (${client.id})`);

      // Broadcast active users list
      this.broadcastActiveUsers();
    } catch (error) {
      this.logger.warn(`Socket auth failed: ${(error as Error).message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = client.data.userId;
    if (userId) {
      this.activeUsers.delete(userId);
      this.logger.log(`✓ User disconnected: ${userId}`);
      this.broadcastActiveUsers();
    }
  }

  /**
   * User joins a chat room
   */
  @SubscribeMessage('chat:join')
  async handleJoinChat(
    client: Socket,
    data: { chatId: string },
  ): Promise<void> {
    const userId = client.data.userId;
    if (!userId) {
      return;
    }

    const chatRoom = this.getChatRoom(data.chatId);
    await client.join(chatRoom);

    this.logger.log(`✓ User ${userId} joined chat ${data.chatId}`);

    // Notify others in chat that user came online
    this.server.to(chatRoom).emit('chat:user_online', {
      userId,
      chatId: data.chatId,
      timestamp: new Date(),
    });
  }

  /**
   * User leaves a chat room
   */
  @SubscribeMessage('chat:leave')
  async handleLeaveChat(
    client: Socket,
    data: { chatId: string },
  ): Promise<void> {
    const userId = client.data.userId;
    if (!userId) {
      return;
    }

    const chatRoom = this.getChatRoom(data.chatId);
    await client.leave(chatRoom);

    this.logger.log(`✓ User ${userId} left chat ${data.chatId}`);

    // Notify others in chat that user went offline
    this.server.to(chatRoom).emit('chat:user_offline', {
      userId,
      chatId: data.chatId,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast typing indicator
   */
  @SubscribeMessage('message:typing')
  handleTyping(
    client: Socket,
    data: { chatId: string; isTyping: boolean },
  ): void {
    const userId = client.data.userId;
    if (!userId) {
      return;
    }

    const chatRoom = this.getChatRoom(data.chatId);

    // Broadcast to others in chat (not to sender)
    this.server.to(chatRoom).except(client.id).emit('message:typing', {
      userId,
      isTyping: data.isTyping,
      chatId: data.chatId,
      timestamp: new Date(),
    });
  }

  /**
   * Mark messages as read
   */
  @SubscribeMessage('messages:read')
  async handleMarkAsRead(
    client: Socket,
    data: { chatId: string; messageIds: string[] },
  ): Promise<void> {
    const userId = client.data.userId;
    if (!userId) {
      return;
    }

    const chatRoom = this.getChatRoom(data.chatId);

    // Notify others that messages were read
    this.server.to(chatRoom).except(client.id).emit('messages:read', {
      userId,
      messageIds: data.messageIds,
      chatId: data.chatId,
      readAt: new Date(),
    });
  }

  // ─── Public Methods for Service ────────────────────────────

  /**
   * Emit new message to recipient
   */
  emitNewMessage(
    recipientId: string,
    messageData: {
      id: string;
      chatId: string;
      senderId: string;
      senderName: string;
      content: string;
      status: string;
      createdAt: Date;
      attachments?: Array<{
        id: string;
        url: string;
        type: string;
        name: string;
      }>;
    },
  ): void {
    this.server
      .to(this.getUserRoom(recipientId))
      .emit('message:new', messageData);
  }

  /**
   * Emit messages read status
   */
  emitMessagesRead(
    userId: string,
    chatId: string,
    messageIds: ObjectId[],
  ): void {
    this.server
      .to(this.getChatRoom(chatId))
      .except(userId)
      .emit('messages:read', {
        userId,
        messageIds: messageIds.map((id) => id.toHexString()),
        chatId,
        readAt: new Date(),
      });
  }

  /**
   * Emit message deleted
   */
  emitMessageDeleted(userId: string, messageId: string): void {
    this.server.to(this.getUserRoom(userId)).emit('message:deleted', {
      messageId,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast list of active users
   */
  private broadcastActiveUsers(): void {
    const activeUsersList = Array.from(this.activeUsers.values()).map(
      ({ socketId, ...user }) => user,
    );

    this.server.emit('users:active', {
      users: activeUsersList,
      count: activeUsersList.length,
      timestamp: new Date(),
    });
  }

  /**
   * Get active users
   */
  getActiveUsers() {
    return Array.from(this.activeUsers.values()).map(
      ({ socketId, ...user }) => user,
    );
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.activeUsers.has(userId);
  }
}
