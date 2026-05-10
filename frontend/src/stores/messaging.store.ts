// ===========================================
// SmartProperty - Messaging Store (Zustand)
// ===========================================

import { create } from 'zustand';
import { getAccessToken } from '../services';
import messagingService, {
  Chat,
  Message,
  MessageAttachment,
} from '../services/messaging.service';
import messagingWebSocket, {
  ActiveUser,
} from '../services/messaging.websocket';
import { useAuthStore } from '../store/auth.store';

const formatError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null) {
    try {
      return JSON.stringify(error);
    } catch {
      try {
        return Object.prototype.toString.call(error);
      } catch {
        return '[object]';
      }
    }
  }
  return String(error);
};

const normalizeId = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (
    value &&
    typeof (value as { toString?: () => string }).toString === 'function'
  ) {
    return (value as { toString: () => string }).toString();
  }
  return '';
};

export interface TypingUser {
  userId: string;
  chatId: string;
}

export interface ChatPartner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  hasActiveChat: boolean;
}

interface MessagingState {
  // Chats
  chats: Chat[];
  selectedChatId: string | null;
  currentMessages: Message[];
  totalMessages: number;
  isLoadingChats: boolean;
  isLoadingMessages: boolean;

  // Available partners
  availablePartners: ChatPartner[];
  isLoadingPartners: boolean;

  // Active state
  activeUsers: ActiveUser[];
  typingUsers: Set<string>; // userId
  unreadCount: number;

  // Actions
  loadChats: (page?: number, limit?: number, search?: string) => Promise<void>;
  loadAvailablePartners: () => Promise<void>;
  selectChat: (chatId: string) => Promise<void>;
  loadMessages: (page?: number, limit?: number) => Promise<void>;
  sendMessage: (
    recipientId: string,
    content: string,
    attachments?: MessageAttachment[],
    mentions?: string[],
    replyToId?: string,
  ) => Promise<void>;
  uploadAttachments: (files: File[]) => Promise<MessageAttachment[]>;
  addMessageToCurrentChat: (message: Message) => void;
  markMessagesAsRead: (messageIds: string[]) => Promise<void>;
  handleNewMessage: (message: any) => void;
  handleTyping: (data: any) => void;
  handleMessagesRead: (data: any) => void;
  handleActiveUsers: (data: any) => void;
  handleUserOnline: (data: any) => void;
  handleUserOffline: (data: any) => void;
  deleteMessage: (messageId: string) => Promise<void>;
  updateUnreadCount: () => Promise<void>;
  startTyping: (chatId: string) => void;
  stopTyping: (chatId: string) => void;
  resetChat: () => void;
}

export const useMessagingStore = create<MessagingState>((set, get) => ({
  // State
  chats: [],
  selectedChatId: null,
  currentMessages: [],
  totalMessages: 0,
  isLoadingChats: false,
  isLoadingMessages: false,
  availablePartners: [],
  isLoadingPartners: false,
  activeUsers: [],
  typingUsers: new Set(),
  unreadCount: 0,

  // Actions
  loadChats: async (page = 1, limit = 20, search?: string) => {
    set({ isLoadingChats: true });
    try {
      messagingService.setToken(getAccessToken() || '');
      const { chats, total, lastOpenedChatId } =
        await messagingService.getChats(page, limit, search);
      const normalizedChats = chats.map((chat) => ({
        ...chat,
        _id: normalizeId(chat._id),
        participantIds: Array.isArray(chat.participantIds)
          ? chat.participantIds.map((id) => normalizeId(id))
          : [],
        lastMessageSenderId: normalizeId(chat.lastMessageSenderId),
      }));
      set({ chats: normalizedChats, isLoadingChats: false });

      const currentSelectedChatId = get().selectedChatId;
      if (!currentSelectedChatId && normalizedChats.length > 0) {
        const normalizedLastOpened = lastOpenedChatId
          ? normalizeId(lastOpenedChatId)
          : null;
        const restoredChatId = normalizedLastOpened
          ? normalizedChats.find((chat) => chat._id === normalizedLastOpened)
            ? normalizedLastOpened
            : null
          : null;
        const chatToSelect = restoredChatId || normalizedChats[0]._id;

        set({
          selectedChatId: chatToSelect,
          currentMessages: [],
          totalMessages: 0,
        });
        messagingWebSocket.joinChat(chatToSelect);
        await get().loadMessages(1, 50);
      }
    } catch (error) {
      console.error('Failed to load chats:', formatError(error));
      set({ isLoadingChats: false });
    }
  },

  loadAvailablePartners: async () => {
    set({ isLoadingPartners: true });
    try {
      messagingService.setToken(getAccessToken() || '');
      const partners = await messagingService.getAvailablePartners();
      set({ availablePartners: partners, isLoadingPartners: false });
    } catch (error) {
      console.error('Failed to load available partners:', formatError(error));
      set({ isLoadingPartners: false });
    }
  },

  selectChat: async (chatId: string) => {
    set({ selectedChatId: chatId, currentMessages: [], totalMessages: 0 });
    messagingWebSocket.joinChat(chatId);
    await get().loadMessages(1, 50);
  },

  loadMessages: async (page = 1, limit = 50) => {
    const state = get();
    if (!state.selectedChatId) return;

    set({ isLoadingMessages: true });
    try {
      messagingService.setToken(getAccessToken() || '');
      const { messages, total } = await messagingService.getMessages(
        state.selectedChatId,
        page,
        limit,
      );
      const normalizedMessages = messages.map((message) => ({
        ...message,
        id: message.id || normalizeId((message as { _id?: unknown })._id),
        chatId: normalizeId(message.chatId),
      }));
      set({
        currentMessages: normalizedMessages,
        totalMessages: total,
        isLoadingMessages: false,
      });

      // Mark as read
      if (normalizedMessages.length > 0) {
        const currentUserId =
          useAuthStore.getState().user?.id ||
          useAuthStore.getState().user?._id ||
          '';
        const messageIds = normalizedMessages
          .filter((m) => !m.readBy[currentUserId])
          .map((m) => m.id);

        if (messageIds.length > 0) {
          await state.markMessagesAsRead(messageIds);
          set({
            chats: state.chats.map((chat) => {
              if (chat._id !== state.selectedChatId || !currentUserId) {
                return chat;
              }
              const currentMeta = chat.participantMetadata?.[currentUserId] || {
                unreadCount: 0,
                lastReadAt: new Date(),
                isActive: false,
              };
              return {
                ...chat,
                participantMetadata: {
                  ...chat.participantMetadata,
                  [currentUserId]: {
                    ...currentMeta,
                    unreadCount: 0,
                    lastReadAt: new Date(),
                  },
                },
              };
            }),
          });
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', formatError(error));
      set({ isLoadingMessages: false });
    }
  },

  sendMessage: async (
    recipientId: string,
    content: string,
    attachments?: MessageAttachment[],
    mentions?: string[],
    replyToId?: string,
  ) => {
    try {
      messagingService.setToken(getAccessToken() || '');
      const message = await messagingService.sendMessage(
        recipientId,
        content,
        attachments,
        mentions,
        replyToId,
      );

      const normalizedMessage = {
        ...message,
        id: message.id || normalizeId((message as { _id?: unknown })._id),
        chatId: normalizeId(message.chatId),
        recipientId,
      };

      // Ensure the new chat is selected and joined for first messages
      const state = get();
      if (state.selectedChatId !== normalizedMessage.chatId) {
        set({ selectedChatId: normalizedMessage.chatId, currentMessages: [] });
        messagingWebSocket.joinChat(normalizedMessage.chatId);
      }

      // Update chats + current messages immediately
      get().handleNewMessage(normalizedMessage);
    } catch (error) {
      console.error('Failed to send message:', formatError(error));
    }
  },

  uploadAttachments: async (files: File[]) => {
    try {
      messagingService.setToken(getAccessToken() || '');
      return await messagingService.uploadAttachments(files);
    } catch (error) {
      console.error('Failed to upload attachments:', formatError(error));
      throw error;
    }
  },

  addMessageToCurrentChat: (message: Message) => {
    const state = get();
    if (message.chatId === state.selectedChatId) {
      set({
        currentMessages: [...state.currentMessages, message],
      });
    }
  },

  markMessagesAsRead: async (messageIds: string[]) => {
    const state = get();
    if (!state.selectedChatId || messageIds.length === 0) return;

    try {
      messagingService.setToken(getAccessToken() || '');
      await messagingService.markAsRead(state.selectedChatId, messageIds);
    } catch (error) {
      console.error('Failed to mark messages as read:', formatError(error));
    }
  },

  handleNewMessage: (message: any) => {
    const state = get();
    const currentUserId =
      useAuthStore.getState().user?.id ||
      useAuthStore.getState().user?._id ||
      '';
    const isFromCurrentUser = message.senderId === currentUserId;
    const normalizedChatId = normalizeId(message.chatId);
    const normalizedMessage = {
      ...message,
      id: message.id || normalizeId(message._id),
      chatId: normalizedChatId,
    };

    // Update or create chat in the list
    const chatExists = state.chats.some(
      (chat) => chat._id === normalizedChatId,
    );
    let updatedChats = state.chats.map((chat) => {
      if (chat._id !== normalizedChatId) {
        return chat;
      }

      const nextChat = {
        ...chat,
        lastMessageAt: new Date(normalizedMessage.createdAt),
        lastMessageContent: normalizedMessage.content,
        lastMessageSenderId: normalizedMessage.senderId,
      };

      if (!currentUserId || isFromCurrentUser) {
        return nextChat;
      }

      const currentMeta = nextChat.participantMetadata?.[currentUserId] || {
        unreadCount: 0,
        lastReadAt: new Date(),
        isActive: false,
      };
      const shouldClearUnread = normalizedChatId === state.selectedChatId;

      return {
        ...nextChat,
        participantMetadata: {
          ...nextChat.participantMetadata,
          [currentUserId]: {
            ...currentMeta,
            unreadCount: shouldClearUnread
              ? 0
              : (currentMeta.unreadCount || 0) + 1,
            lastReadAt: shouldClearUnread
              ? new Date(normalizedMessage.createdAt)
              : currentMeta.lastReadAt,
          },
        },
      };
    });

    // If chat doesn't exist, add it (new conversation)
    if (!chatExists) {
      const participantIds = new Set<string>();
      if (normalizedMessage.senderId)
        participantIds.add(normalizedMessage.senderId);
      if (normalizedMessage.recipientId)
        participantIds.add(normalizedMessage.recipientId);
      if (currentUserId) participantIds.add(currentUserId);

      const unreadCount =
        !isFromCurrentUser && normalizedChatId !== state.selectedChatId ? 1 : 0;
      const newChat = {
        _id: normalizedChatId,
        participantIds: Array.from(participantIds),
        lastMessageAt: new Date(normalizedMessage.createdAt),
        lastMessageContent: normalizedMessage.content,
        lastMessageSenderId: normalizedMessage.senderId,
        participantMetadata: currentUserId
          ? {
              [currentUserId]: {
                unreadCount,
                lastReadAt: new Date(normalizedMessage.createdAt),
                isActive: false,
              },
            }
          : {},
      };
      updatedChats = [newChat, ...updatedChats];

      // Auto-select first conversation if none selected
      if (!state.selectedChatId) {
        set({ selectedChatId: normalizedChatId, currentMessages: [] });
        messagingWebSocket.joinChat(normalizedChatId);
      }
    }

    set({ chats: updatedChats });

    // Add to current messages if in selected chat
    if (normalizedChatId === state.selectedChatId) {
      get().addMessageToCurrentChat(normalizedMessage);
    } else if (!isFromCurrentUser) {
      // Increment unread count
      set({ unreadCount: state.unreadCount + 1 });
    }
  },

  handleTyping: (data: any) => {
    const state = get();
    const { userId, isTyping } = data;

    if (isTyping) {
      const newTypingUsers = new Set(state.typingUsers);
      newTypingUsers.add(userId);
      set({ typingUsers: newTypingUsers });
    } else {
      const newTypingUsers = new Set(state.typingUsers);
      newTypingUsers.delete(userId);
      set({ typingUsers: newTypingUsers });
    }
  },

  handleMessagesRead: (data: any) => {
    const state = get();

    // Update messages with read status
    const updatedMessages = state.currentMessages.map((msg) =>
      data.messageIds.includes(msg.id)
        ? {
            ...msg,
            readBy: {
              ...msg.readBy,
              [data.userId]: { readAt: new Date(data.readAt) },
            },
            status: 'seen',
          }
        : msg,
    );

    set({ currentMessages: updatedMessages });
  },

  handleActiveUsers: (data: any) => {
    set({ activeUsers: data.users });
  },

  handleUserOnline: (data: any) => {
    console.log('User online:', data.userId);
  },

  handleUserOffline: (data: any) => {
    console.log('User offline:', data.userId);
  },

  deleteMessage: async (messageId: string) => {
    try {
      messagingService.setToken(getAccessToken() || '');
      await messagingService.deleteMessage(messageId);

      // Update local state
      const state = get();
      const updatedMessages = state.currentMessages.map((msg) =>
        msg.id === messageId
          ? { ...msg, content: '[Message deleted]', isDeleted: true }
          : msg,
      );

      set({ currentMessages: updatedMessages });
    } catch (error) {
      console.error('Failed to delete message:', formatError(error));
    }
  },

  updateUnreadCount: async () => {
    try {
      messagingService.setToken(getAccessToken() || '');
      const count = await messagingService.getUnreadCount();
      set({ unreadCount: count });
    } catch (error) {
      console.error('Failed to update unread count:', formatError(error));
    }
  },

  startTyping: (chatId: string) => {
    messagingWebSocket.sendTypingIndicator(chatId, true);
  },

  stopTyping: (chatId: string) => {
    messagingWebSocket.sendTypingIndicator(chatId, false);
  },

  resetChat: () => {
    set({
      selectedChatId: null,
      currentMessages: [],
      totalMessages: 0,
      typingUsers: new Set(),
    });
  },
}));
