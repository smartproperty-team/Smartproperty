import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import * as jwt from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  private server: Server;

  constructor(private readonly configService: ConfigService) {}

  private getUserRoom(userId: string): string {
    return `user:${userId}`;
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
      ) as { sub?: string; id?: string };

      const userId = payload.sub || payload.id;
      if (!userId) {
        client.disconnect();
        return;
      }

      client.data.userId = userId;
      await client.join(this.getUserRoom(userId));
    } catch (error) {
      this.logger.warn(`Socket auth failed: ${(error as Error).message}`);
      client.disconnect();
    }
  }

  emitNotification(userId: string, notification: unknown): void {
    this.server
      .to(this.getUserRoom(userId))
      .emit('notification:new', notification);
  }

  emitUnreadCount(userId: string, count: number): void {
    this.server.to(this.getUserRoom(userId)).emit('notification:count', count);
  }
}
