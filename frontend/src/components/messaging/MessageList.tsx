// ===========================================
// SmartProperty - Message List Component
// ===========================================

import { Loader } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { useMessagingStore } from '../../stores/messaging.store';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  currentUserId: string;
  onDeleteMessage: (messageId: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  currentUserId,
  onDeleteMessage,
}) => {
  const { currentMessages, isLoadingMessages, typingUsers } =
    useMessagingStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[radial-gradient(circle_at_top,_#fef3c7,_transparent_45%),radial-gradient(circle_at_bottom,_#e0f2fe,_transparent_40%)]">
      {isLoadingMessages && (
        <div className="flex justify-center py-8">
          <Loader className="animate-spin text-blue-500" size={24} />
        </div>
      )}

      {currentMessages.length === 0 && !isLoadingMessages && (
        <div className="text-center py-8 text-slate-500">
          <p className="text-sm uppercase tracking-[0.2em]">No messages yet</p>
          <p className="text-xs mt-2">
            Start a conversation to see messages here.
          </p>
        </div>
      )}

      {currentMessages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          isSent={message.senderId === currentUserId}
          isCurrentUser={message.senderId === currentUserId}
          onDelete={onDeleteMessage}
        />
      ))}

      {typingUsers.size > 0 && (
        <div className="flex items-center space-x-2 text-slate-500 py-2">
          <div className="space-x-1">
            <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
            <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
            <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
          </div>
          <span className="text-sm">Someone is typing...</span>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
