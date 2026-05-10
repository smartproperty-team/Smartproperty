// ===========================================
// SmartProperty - Chat List Component
// ===========================================

import { format } from 'date-fns';
import {
  Check,
  CheckCheck,
  MessageSquarePlus,
  Search,
  UserPlus,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Chat } from '../../services/messaging.service';
import { useAuthStore } from '../../store/auth.store';
import { useMessagingStore } from '../../stores/messaging.store';

interface ChatListProps {
  onSelectChat: (chatId: string, recipientId?: string) => void;
  selectedChatId: string | null;
}

export const ChatList: React.FC<ChatListProps> = ({
  onSelectChat,
  selectedChatId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [displayedChats, setDisplayedChats] = useState<Chat[]>([]);
  const [activeTab, setActiveTab] = useState<'chats' | 'partners'>('chats');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'groups'>(
    'all',
  );
  const {
    chats,
    isLoadingChats,
    loadChats,
    activeUsers,
    availablePartners,
    isLoadingPartners,
    loadAvailablePartners,
  } = useMessagingStore();
  const { user: authUser } = useAuthStore();

  const formatError = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  };

  useEffect(() => {
    loadChats(1, 50, searchTerm || undefined).catch((err) => {
      console.error('Chat list load failed:', formatError(err));
    });
  }, [searchTerm, loadChats]);

  useEffect(() => {
    loadAvailablePartners().catch((err) => {
      console.error('Available partners load failed:', formatError(err));
    });
  }, [loadAvailablePartners]);

  useEffect(() => {
    const filtered = chats.filter((chat) => {
      if (activeFilter === 'groups') {
        return chat.participantIds.length > 2;
      }

      if (activeFilter === 'unread') {
        const currentMeta = getCurrentUserMeta(chat);
        return (currentMeta?.unreadCount || 0) > 0;
      }

      return true;
    });

    setDisplayedChats(filtered);
  }, [chats, activeFilter]);

  const getOtherParticipantInfo = (chat: Chat) => {
    const currentUserId = authUser?.id || authUser?._id || '';
    const otherId = chat.participantIds.find((id) => id !== currentUserId);
    const metadata = otherId
      ? chat.participantMetadata?.[otherId]
      : Object.values(chat.participantMetadata || {})[0];
    const isActive = !!activeUsers.find((user) => user.userId === otherId);
    return {
      isActive,
      unreadCount: metadata?.unreadCount || 0,
    };
  };

  const getCurrentUserMeta = (chat: Chat) => {
    const currentUserId = authUser?.id || authUser?._id || '';
    return currentUserId
      ? chat.participantMetadata?.[currentUserId]
      : undefined;
  };

  const getReadStatus = (chat: Chat) => {
    const currentUserId = authUser?.id || authUser?._id || '';
    if (!currentUserId || chat.lastMessageSenderId !== currentUserId) {
      return null;
    }

    const otherId = chat.participantIds.find((id) => id !== currentUserId);
    const otherMeta = otherId ? chat.participantMetadata?.[otherId] : undefined;
    const lastMessageAt = chat.lastMessageAt
      ? new Date(chat.lastMessageAt)
      : null;

    if (lastMessageAt && otherMeta?.lastReadAt) {
      const lastRead = new Date(otherMeta.lastReadAt);
      if (lastRead >= lastMessageAt) {
        return 'seen';
      }
      return 'delivered';
    }

    return 'sent';
  };

  const formatTime = (value?: Date) => {
    if (!value) return '';
    try {
      return format(new Date(value), 'HH:mm');
    } catch {
      return '';
    }
  };

  const handleStartConversation = (partnerId: string) => {
    // Call with recipientId to trigger chat creation
    onSelectChat('', partnerId);
  };

  const resolveChatName = (chat: Chat) => {
    const currentUserId = authUser?.id || authUser?._id || '';
    const otherId = chat.participantIds.find((id) => id !== currentUserId);
    if (!otherId) return 'Conversation';

    const partner = availablePartners.find((p) => p.id === otherId);
    if (partner) {
      return `${partner.firstName} ${partner.lastName}`.trim();
    }

    const activeUser = activeUsers.find((user) => user.userId === otherId);
    if (activeUser) {
      return `${activeUser.firstName} ${activeUser.lastName}`.trim();
    }

    return 'Conversation';
  };

  const isUserOnline = (userId?: string) => {
    if (!userId) return false;
    return activeUsers.some((user) => user.userId === userId);
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ').filter(Boolean);
    const first = parts[0]?.[0] || '';
    const second = parts[1]?.[0] || '';
    return `${first}${second}`.toUpperCase() || 'C';
  };

  return (
    <div className="w-full md:w-80 border-r border-slate-200 bg-slate-50 flex flex-col">
      {/* Search Bar */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            id="chat-search"
            name="chatSearch"
            placeholder={
              activeTab === 'chats' ? 'Search chats...' : 'Search users...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
          />
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs">
          {(['all', 'unread', 'groups'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`rounded-full px-3 py-1 transition ${
                activeFilter === filter
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filter === 'all'
                ? 'All'
                : filter === 'unread'
                  ? 'Unread'
                  : 'Groups'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white">
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'chats'
              ? 'border-b-2 border-emerald-500 text-emerald-700'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <MessageSquarePlus size={16} />
            Conversations ({chats.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('partners')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'partners'
              ? 'border-b-2 border-emerald-500 text-emerald-700'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <UserPlus size={16} />
            Users ({availablePartners.length})
          </div>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'chats' ? (
          <>
            {isLoadingChats ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : displayedChats.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No conversations yet</p>
                <p className="text-xs mt-2">Start by selecting a user</p>
              </div>
            ) : (
              displayedChats.map((chat) => {
                const { unreadCount, isActive } = getOtherParticipantInfo(chat);
                const currentMeta = getCurrentUserMeta(chat);
                const isUnread = (currentMeta?.unreadCount || 0) > 0;
                const readStatus = getReadStatus(chat);
                const isSelected = selectedChatId === chat._id;
                const nameLabel = resolveChatName(chat);
                const lastMessage = chat.lastMessageContent || '';
                const timestamp = formatTime(chat.lastMessageAt);

                return (
                  <button
                    key={chat._id}
                    onClick={() => onSelectChat(chat._id)}
                    className={`group w-full px-4 py-3 text-left transition ${
                      isSelected
                        ? 'bg-emerald-50'
                        : 'bg-transparent hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
                        {getInitials(nameLabel)}
                        {isActive && (
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3
                            className={`truncate text-sm ${
                              isUnread
                                ? 'font-semibold text-slate-900'
                                : 'font-medium text-slate-700'
                            }`}
                          >
                            {nameLabel}
                          </h3>
                          <span
                            className={`text-[11px] ${
                              isUnread ? 'text-emerald-600' : 'text-slate-400'
                            }`}
                          >
                            {timestamp}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center gap-2">
                          {readStatus && (
                            <span
                              className={`flex items-center ${
                                readStatus === 'seen'
                                  ? 'text-sky-500'
                                  : 'text-slate-400'
                              }`}
                            >
                              {readStatus === 'sent' ? (
                                <Check size={14} />
                              ) : (
                                <CheckCheck size={14} />
                              )}
                            </span>
                          )}
                          <p
                            className={`truncate text-xs ${
                              isUnread
                                ? 'font-semibold text-slate-700'
                                : 'text-slate-500'
                            }`}
                          >
                            {lastMessage || 'No messages yet'}
                          </p>
                          {unreadCount > 0 && (
                            <span className="ml-auto inline-flex items-center justify-center h-5 min-w-[1.25rem] rounded-full bg-emerald-500 px-1.5 text-[11px] font-semibold text-white">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </>
        ) : (
          <>
            {isLoadingPartners ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : availablePartners.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No available contacts</p>
              </div>
            ) : (
              availablePartners
                .filter((partner) => {
                  if (!searchTerm) return true;
                  const fullName =
                    `${partner.firstName} ${partner.lastName}`.toLowerCase();
                  return fullName.includes(searchTerm.toLowerCase());
                })
                .map((partner) => (
                  <button
                    key={partner.id}
                    onClick={() => handleStartConversation(partner.id)}
                    className="mx-3 my-2 rounded-2xl px-4 py-3 text-left transition border border-transparent bg-white/80 hover:border-slate-200 hover:bg-white"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-slate-900 truncate">
                            {partner.firstName} {partner.lastName}
                          </h3>
                          {isUserOnline(partner.id) && (
                            <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full"></span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 truncate">
                          {partner.role}
                        </p>
                      </div>
                      {!partner.hasActiveChat && (
                        <UserPlus
                          size={16}
                          className="ml-2 text-slate-400 flex-shrink-0"
                        />
                      )}
                    </div>
                  </button>
                ))
            )}
          </>
        )}
      </div>
    </div>
  );
};
