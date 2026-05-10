// ===========================================
// SmartProperty - Message Item Component
// ===========================================

import { format } from 'date-fns';
import { Check, CheckCheck, Trash2 } from 'lucide-react';
import React, { useMemo } from 'react';
import { Message } from '../../services/messaging.service';

interface MessageItemProps {
  message: Message;
  isSent: boolean;
  isCurrentUser: boolean;
  onDelete: (messageId: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isSent,
  isCurrentUser,
  onDelete,
}) => {
  const readByCount = useMemo(() => {
    return Object.keys(message.readBy ?? {}).length;
  }, [message.readBy]);

  const messageTime = useMemo(() => {
    try {
      return format(new Date(message.createdAt), 'HH:mm');
    } catch {
      return '';
    }
  }, [message.createdAt]);

  return (
    <div className={`flex mb-3 ${isSent ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`group max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm backdrop-blur ${
          isSent
            ? 'bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 text-white rounded-br-md shadow-emerald-200/60'
            : 'bg-white/90 text-slate-900 rounded-bl-md border border-slate-200/80'
        }`}
      >
        {message.content && (
          <p className="text-sm leading-relaxed break-words">
            {message.content}
          </p>
        )}

        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.attachments.map((attachment) => {
              const isImage = attachment.type === 'image';
              return (
                <a
                  key={attachment.id}
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`block rounded-lg border ${
                    isSent
                      ? 'border-white/40 bg-white/10'
                      : 'border-slate-200 bg-white'
                  } p-2 text-xs hover:opacity-90 transition`}
                >
                  {isImage ? (
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="max-h-40 w-full rounded-md object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="block truncate">{attachment.name}</span>
                  )}
                </a>
              );
            })}
          </div>
        )}

        <div
          className={`flex items-center justify-between gap-2 mt-2 text-xs ${
            isSent ? 'text-emerald-50' : 'text-slate-500'
          }`}
        >
          <span>{messageTime}</span>

          {isSent && (
            <div className="flex items-center gap-1">
              {message.status === 'seen' ? (
                <CheckCheck size={14} className="text-emerald-100" />
              ) : message.status === 'delivered' ? (
                <Check size={14} className="text-emerald-100" />
              ) : (
                <Check size={14} className="text-emerald-50" />
              )}
              {readByCount > 1 && (
                <span className="text-xs">{readByCount}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {isCurrentUser && (
        <button
          onClick={() => onDelete(message.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-1 text-red-500 hover:bg-red-50 rounded"
          title="Delete message"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
};
