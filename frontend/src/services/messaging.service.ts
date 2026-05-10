// ===========================================
// SmartProperty - Messaging API Service
// ===========================================

// API Base URL configuration
const resolveApiBaseUrl = (): string => {
  const configuredUrl = import.meta.env.VITE_API_URL?.trim();
  if (
    configuredUrl &&
    (configuredUrl.startsWith('http://') ||
      configuredUrl.startsWith('https://') ||
      configuredUrl.startsWith('/'))
  ) {
    return configuredUrl;
  }

  return 'http://localhost:3000/api';
};

const API_BASE_URL = resolveApiBaseUrl();

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  status: 'sent' | 'delivered' | 'seen';
  createdAt: Date;
  updatedAt: Date;
  readBy: Record<string, { readAt: Date }>;
  attachments?: MessageAttachment[];
  mentions?: string[];
  replyToId?: string;
}

export interface MessageAttachment {
  id: string;
  url: string;
  type: string;
  name: string;
}

export interface Chat {
  _id: string;
  participantIds: string[];
  lastMessageAt: Date;
  lastMessageContent?: string;
  lastMessageSenderId?: string;
  participantMetadata: Record<
    string,
    {
      unreadCount: number;
      lastReadAt: Date;
      isActive: boolean;
    }
  >;
}

export interface ChatParticipant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

class MessagingService {
  private baseUrl = `${API_BASE_URL}/messaging`;
  private token: string | null = null;

  setToken(token: string): void {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  private getUploadHeaders(): HeadersInit {
    const headers: HeadersInit = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * Get all chats
   */
  async getChats(
    page = 1,
    limit = 20,
    search?: string,
  ): Promise<{
    chats: Chat[];
    total: number;
    lastOpenedChatId: string | null;
  }> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search && { search }),
    });

    try {
      const response = await fetch(`${this.baseUrl}/chats?${params}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch chats: ${response.status} ${errorText?.slice(0, 100) || ''}`,
        );
      }

      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Chats API error: ${message}`);
    }
  }

  /**
   * Get chat with participants
   */
  async getChat(
    chatId: string,
  ): Promise<{ chat: Chat; participant: ChatParticipant }> {
    const response = await fetch(`${this.baseUrl}/chats/${chatId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch chat');
    }

    return response.json();
  }

  /**
   * Get messages in a chat
   */
  async getMessages(
    chatId: string,
    page = 1,
    limit = 50,
  ): Promise<{ messages: Message[]; total: number }> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    const response = await fetch(
      `${this.baseUrl}/chats/${chatId}/messages?${params}`,
      {
        headers: this.getHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }

    return response.json();
  }

  /**
   * Send a message
   */
  async sendMessage(
    recipientId: string,
    content: string,
    attachments?: MessageAttachment[],
    mentions?: string[],
    replyToId?: string,
  ): Promise<Message> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        recipientId,
        content,
        attachments,
        mentions,
        replyToId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return response.json();
  }

  /**
   * Upload message attachments
   */
  async uploadAttachments(files: File[]): Promise<MessageAttachment[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const response = await fetch(`${this.baseUrl}/attachments`, {
      method: 'POST',
      headers: this.getUploadHeaders(),
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload attachments');
    }

    const data = await response.json();
    return data.attachments || [];
  }

  /**
   * Mark messages as read
   */
  async markAsRead(chatId: string, messageIds: string[]): Promise<void> {
    const response = await fetch(`${this.baseUrl}/messages/read`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ chatId, messageIds }),
    });

    if (!response.ok) {
      throw new Error('Failed to mark messages as read');
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/messages/${messageId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete message');
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(): Promise<number> {
    const response = await fetch(`${this.baseUrl}/unread/count`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch unread count');
    }

    const data = await response.json();
    return data.unreadCount;
  }

  /**
   * Get available chat partners based on user role
   */
  async getAvailablePartners(): Promise<
    Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
      hasActiveChat: boolean;
    }>
  > {
    const response = await fetch(`${this.baseUrl}/partners/available`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch available partners');
    }

    return response.json();
  }
}

export default new MessagingService();
