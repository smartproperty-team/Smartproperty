// ===========================================
// SmartProperty - Messaging Page
// ===========================================

import { Info, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { getAccessToken } from '../../services';
import { MessageAttachment } from '../../services/messaging.service';
import messagingWebSocket from '../../services/messaging.websocket';
import { useAuthStore } from '../../store/auth.store';
import { useMessagingStore } from '../../stores/messaging.store';
import { HomeFooter, Navbar } from '../layout';
import { ChatList } from './ChatList';
import { MessageInput } from './MessageInput';
import { MessageList } from './MessageList';

const MessagingPageComponent: React.FC = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

  const {
    selectedChatId,
    selectChat,
    chats,
    sendMessage,
    deleteMessage,
    handleNewMessage,
    handleTyping,
    handleMessagesRead,
    handleActiveUsers,
    handleUserOnline,
    handleUserOffline,
    loadChats,
    resetChat,
    availablePartners,
    activeUsers,
  } = useMessagingStore();
  const {
    user: authUser,
    isLoading: isAuthLoading,
    checkAuth,
  } = useAuthStore();

  // Update recipient ID when chat is selected
  useEffect(() => {
    if (!selectedChatId) return;

    const resolvedCurrentUserId =
      currentUserId || authUser?.id || authUser?._id || null;
    if (resolvedCurrentUserId && resolvedCurrentUserId !== currentUserId) {
      setCurrentUserId(resolvedCurrentUserId);
    }

    const chat = chats.find((c) => c._id === selectedChatId);
    if (!chat) return;

    const recipient = resolvedCurrentUserId
      ? chat.participantIds.find((id) => id !== resolvedCurrentUserId)
      : undefined;
    const fallbackRecipient =
      resolvedCurrentUserId &&
      chat.lastMessageSenderId &&
      chat.lastMessageSenderId !== resolvedCurrentUserId
        ? chat.lastMessageSenderId
        : null;

    setRecipientId(recipient || fallbackRecipient || null);
  }, [selectedChatId, currentUserId, authUser?.id, authUser?._id, chats]);

  // Initialize WebSocket on mount
  useEffect(() => {
    let mounted = true;

    const initializeMessaging = async () => {
      try {
        const token = getAccessToken();

        if (!token) {
          console.warn('User not authenticated');
          return;
        }

        if (!authUser?.id && !authUser?._id) {
          if (!isAuthLoading) {
            await checkAuth();
          }
          return;
        }

        if (!mounted) return;
        setCurrentUserId(authUser.id ?? authUser._id);

        // Connect to WebSocket
        await messagingWebSocket.connect(token);
        if (!mounted) return;
        setIsConnected(true);

        // Subscribe to events
        const unsubscribeNewMessage = messagingWebSocket.onNewMessage((msg) => {
          handleNewMessage(msg);
        });

        const unsubscribeTyping = messagingWebSocket.onTyping((data) => {
          handleTyping(data);
        });

        const unsubscribeRead = messagingWebSocket.onMessagesRead((data) => {
          handleMessagesRead(data);
        });

        const unsubscribeActiveUsers = messagingWebSocket.onActiveUsers(
          (data) => {
            handleActiveUsers(data);
          },
        );

        const unsubscribeUserOnline = messagingWebSocket.onUserOnline(
          (data) => {
            handleUserOnline(data);
          },
        );

        const unsubscribeUserOffline = messagingWebSocket.onUserOffline(
          (data) => {
            handleUserOffline(data);
          },
        );

        // Load initial chats
        await loadChats();

        if (mounted) {
          return () => {
            unsubscribeNewMessage();
            unsubscribeTyping();
            unsubscribeRead();
            unsubscribeActiveUsers();
            unsubscribeUserOnline();
            unsubscribeUserOffline();
            messagingWebSocket.disconnect();
          };
        }
      } catch (error) {
        const formatError = (error: unknown): string => {
          if (error instanceof Error) return error.message;
          if (typeof error === 'string') return error;
          try {
            return JSON.stringify(error);
          } catch {
            return String(error);
          }
        };

        if (mounted) {
          console.error('Failed to initialize messaging:', formatError(error));
        }
      }
    };

    const cleanup = initializeMessaging().then((fn) => fn);

    return () => {
      mounted = false;
      cleanup?.then((fn) => fn?.());
    };
  }, [
    authUser?.id ?? authUser?._id,
    isAuthLoading,
    checkAuth,
    loadChats,
    handleNewMessage,
    handleTyping,
    handleMessagesRead,
    handleActiveUsers,
    handleUserOnline,
    handleUserOffline,
  ]);

  const handleSelectChat = (chatId: string, newRecipientId?: string) => {
    if (newRecipientId && !chatId) {
      // Starting a new conversation (chatId empty, recipientId provided)
      setRecipientId(newRecipientId);
      setSelectedChat(null);
      setShowMobileChat(true);
      return;
    }

    if (chatId) {
      // Selecting an existing chat (chatId provided)
      const resolvedCurrentUserId =
        currentUserId || authUser?.id || authUser?._id || '';
      const chat = chats.find((c) => c._id === chatId);
      const recipient = resolvedCurrentUserId
        ? chat?.participantIds.find((id) => id !== resolvedCurrentUserId)
        : undefined;
      const fallbackRecipient =
        resolvedCurrentUserId &&
        chat?.lastMessageSenderId &&
        chat.lastMessageSenderId !== resolvedCurrentUserId
          ? chat.lastMessageSenderId
          : null;

      setRecipientId(recipient || fallbackRecipient || null);
      selectChat(chatId);
      setShowMobileChat(true);
    }
  };

  const handleSendMessage = async (
    content: string,
    attachments?: MessageAttachment[],
  ) => {
    if (!recipientId) {
      console.warn('No recipient selected');
      return;
    }

    await sendMessage(recipientId, content, attachments);
  };

  const handleDeleteMessage = async (messageId: string) => {
    await deleteMessage(messageId);
  };

  const handleCloseChat = () => {
    setShowMobileChat(false);
    resetChat();
  };

  const resolveHeaderName = () => {
    if (!recipientId) return selectedChatId ? 'Chat' : 'New Conversation';
    const partner = availablePartners.find((p) => p.id === recipientId);
    if (partner) {
      return `${partner.firstName} ${partner.lastName}`.trim();
    }
    const activeUser = activeUsers.find((user) => user.userId === recipientId);
    if (activeUser) {
      return `${activeUser.firstName} ${activeUser.lastName}`.trim();
    }
    return 'Chat';
  };

  const isRecipientOnline = () => {
    if (!recipientId) return false;
    return activeUsers.some((user) => user.userId === recipientId);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="pt-24">
        <div
          className="relative flex h-full min-h-[calc(100vh-6rem)] bg-[linear-gradient(135deg,#f8fafc_0%,#fff7ed_45%,#ecfeff_100%)] text-slate-900"
          style={{ fontFamily: '"Space Grotesk", "Segoe UI", sans-serif' }}
        >
          {/* Chat List - Hidden on mobile when chat is open */}
          <div className={`hidden md:flex ${showMobileChat ? 'md:flex' : ''}`}>
            <ChatList
              onSelectChat={handleSelectChat}
              selectedChatId={selectedChatId}
            />
          </div>

          {/* Main Chat Area */}
          {selectedChatId || recipientId ? (
            <div className="flex-1 flex flex-col bg-white/70 backdrop-blur-xl border-l border-white/60 shadow-2xl shadow-slate-200/40">
              {/* Chat Header */}
              <div className="border-b border-white/60 bg-white/70 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCloseChat}
                    className="md:hidden p-2 hover:bg-slate-100 rounded-lg"
                  >
                    <X size={20} />
                  </button>
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                      {resolveHeaderName()}
                    </h2>
                    {recipientId ? (
                      <p
                        className={`text-xs ${
                          isRecipientOnline()
                            ? 'text-emerald-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {isRecipientOnline() ? 'Online' : 'Offline'}
                      </p>
                    ) : isConnected ? (
                      <p className="text-xs text-emerald-600">Connected</p>
                    ) : (
                      <p className="text-xs text-rose-600">Disconnected</p>
                    )}
                  </div>
                </div>

                <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition">
                  <Info size={20} />
                </button>
              </div>

              {/* Messages */}
              {selectedChatId ? (
                <MessageList
                  currentUserId={currentUserId || ''}
                  onDeleteMessage={handleDeleteMessage}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400">
                  <p className="text-sm uppercase tracking-[0.2em]">
                    Start the conversation by sending a message
                  </p>
                </div>
              )}

              {/* Message Input */}
              {recipientId && (
                <MessageInput
                  recipientId={recipientId}
                  chatId={selectedChatId}
                  onSendMessage={handleSendMessage}
                />
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <div className="text-center max-w-md">
                <h2 className="text-2xl font-semibold tracking-tight mb-3">
                  Select or create a chat
                </h2>
                <p className="text-sm text-slate-500">
                  Choose a conversation from the list or start a new one.
                </p>
              </div>
            </div>
          )}

          {/* Mobile Chat List - Overlay */}
          {!showMobileChat && (
            <div className="md:hidden absolute inset-0 z-40">
              <ChatList
                onSelectChat={handleSelectChat}
                selectedChatId={selectedChatId}
              />
            </div>
          )}
        </div>
      </main>
      <HomeFooter />
    </div>
  );
};

export default MessagingPageComponent;
