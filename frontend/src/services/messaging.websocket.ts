// ===========================================
// SmartProperty - Messaging WebSocket Client
// ===========================================

import { io, Socket } from 'socket.io-client';

// Get backend URL for WebSocket connections
const resolveBackendUrl = (): string => {
  const configuredUrl = import.meta.env.VITE_API_URL?.trim();
  if (
    configuredUrl &&
    (configuredUrl.startsWith('http://') ||
      configuredUrl.startsWith('https://'))
  ) {
    // Remove /api suffix if present
    return configuredUrl.replace(/\/api\s*$/i, '');
  }

  // Fallback: use current hostname with port 3000
  const hostname = window.location.hostname;
  return `http://${hostname}:3000`;
};

const BACKEND_URL = resolveBackendUrl();

// Validate backend URL
if (!BACKEND_URL) {
  console.error('WebSocket: Backend URL could not be resolved');
}

export interface MessageData {
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
}

export interface TypingData {
  userId: string;
  isTyping: boolean;
  chatId: string;
  timestamp: Date;
}

export interface ActiveUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  connectedAt: Date;
}

type MessageHandler = (message: MessageData) => void;
type TypingHandler = (data: TypingData) => void;
type ReadHandler = (data: {
  userId: string;
  messageIds: string[];
  chatId: string;
  readAt: Date;
}) => void;
type ActiveUsersHandler = (data: {
  users: ActiveUser[];
  count: number;
  timestamp: Date;
}) => void;
type UserOnlineHandler = (data: {
  userId: string;
  chatId: string;
  timestamp: Date;
}) => void;
type UserOfflineHandler = (data: {
  userId: string;
  chatId: string;
  timestamp: Date;
}) => void;

class MessagingWebSocketClient {
  private socket: Socket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private typingHandlers: Set<TypingHandler> = new Set();
  private readHandlers: Set<ReadHandler> = new Set();
  private activeUsersHandlers: Set<ActiveUsersHandler> = new Set();
  private userOnlineHandlers: Set<UserOnlineHandler> = new Set();
  private userOfflineHandlers: Set<UserOfflineHandler> = new Set();
  private isConnecting = false;

  /**
   * Connect to messaging WebSocket
   */
  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        // Wait for connection to complete
        const checkInterval = setInterval(() => {
          if (this.socket?.connected) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        return;
      }

      this.isConnecting = true;

      try {
        const socketUrl = `${BACKEND_URL}/messaging`;
        console.log(`🔌 WebSocket connecting to: ${socketUrl}`);

        this.socket = io(socketUrl, {
          auth: {
            token: `Bearer ${token}`,
          },
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
        });

        this.socket.on('connect', () => {
          console.log('✓ Connected to messaging WebSocket');
          this.isConnecting = false;
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ WebSocket connection error:', error);
          this.isConnecting = false;
          reject(error);
        });

        this.socket.on('disconnect', () => {
          console.log('✗ Disconnected from messaging WebSocket');
        });

        this.socket.on('error', (error) => {
          console.error('❌ WebSocket error:', error);
        });

        this.socket.on('message:new', (message: MessageData) => {
          this.messageHandlers.forEach((handler) => handler(message));
        });

        this.socket.on('message:typing', (data: TypingData) => {
          this.typingHandlers.forEach((handler) => handler(data));
        });

        this.socket.on(
          'messages:read',
          (data: {
            userId: string;
            messageIds: string[];
            chatId: string;
            readAt: Date;
          }) => {
            this.readHandlers.forEach((handler) => handler(data));
          },
        );

        this.socket.on(
          'users:active',
          (data: { users: ActiveUser[]; count: number; timestamp: Date }) => {
            this.activeUsersHandlers.forEach((handler) => handler(data));
          },
        );

        this.socket.on(
          'chat:user_online',
          (data: { userId: string; chatId: string; timestamp: Date }) => {
            this.userOnlineHandlers.forEach((handler) => handler(data));
          },
        );

        this.socket.on(
          'chat:user_offline',
          (data: { userId: string; chatId: string; timestamp: Date }) => {
            this.userOfflineHandlers.forEach((handler) => handler(data));
          },
        );

        this.socket.on('error', (error: unknown) => {
          const formatError = (err: unknown): string => {
            if (err instanceof Error) return err.message;
            if (typeof err === 'string') return err;
            try {
              return JSON.stringify(err);
            } catch {
              return String(err);
            }
          };

          console.error('WebSocket error:', formatError(error));
          this.isConnecting = false;
          reject(error);
        });
      } catch (error) {
        const formatError = (err: unknown): string => {
          if (err instanceof Error) return err.message;
          if (typeof err === 'string') return err;
          try {
            return JSON.stringify(err);
          } catch {
            return String(err);
          }
        };

        this.isConnecting = false;
        console.error('WebSocket connection failed:', formatError(error));
        reject(error);
      }
    });
  }

  /**
   * Join a chat room
   */
  joinChat(chatId: string): void {
    if (!this.socket?.connected) {
      console.warn('WebSocket not connected');
      return;
    }

    this.socket.emit('chat:join', { chatId });
  }

  /**
   * Leave a chat room
   */
  leaveChat(chatId: string): void {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('chat:leave', { chatId });
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(chatId: string, isTyping: boolean): void {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('message:typing', { chatId, isTyping });
  }

  /**
   * Mark messages as read
   */
  markMessagesAsRead(chatId: string, messageIds: string[]): void {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('messages:read', { chatId, messageIds });
  }

  /**
   * Subscribe to new messages
   */
  onNewMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Subscribe to typing indicators
   */
  onTyping(handler: TypingHandler): () => void {
    this.typingHandlers.add(handler);
    return () => this.typingHandlers.delete(handler);
  }

  /**
   * Subscribe to read status
   */
  onMessagesRead(handler: ReadHandler): () => void {
    this.readHandlers.add(handler);
    return () => this.readHandlers.delete(handler);
  }

  /**
   * Subscribe to active users list
   */
  onActiveUsers(handler: ActiveUsersHandler): () => void {
    this.activeUsersHandlers.add(handler);
    return () => this.activeUsersHandlers.delete(handler);
  }

  /**
   * Subscribe to user online status
   */
  onUserOnline(handler: UserOnlineHandler): () => void {
    this.userOnlineHandlers.add(handler);
    return () => this.userOnlineHandlers.delete(handler);
  }

  /**
   * Subscribe to user offline status
   */
  onUserOffline(handler: UserOfflineHandler): () => void {
    this.userOfflineHandlers.add(handler);
    return () => this.userOfflineHandlers.delete(handler);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.socket?.connected) {
      this.socket.disconnect();
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export default new MessagingWebSocketClient();
