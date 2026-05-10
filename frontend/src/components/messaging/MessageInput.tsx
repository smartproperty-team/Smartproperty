// ===========================================
// SmartProperty - Message Input Component
// ===========================================

import { Paperclip, Send, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { MessageAttachment } from '../../services/messaging.service';
import { useMessagingStore } from '../../stores/messaging.store';

interface MessageInputProps {
  recipientId: string;
  chatId: string;
  onSendMessage: (content: string, attachments?: MessageAttachment[]) => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  recipientId,
  chatId,
  onSendMessage,
}) => {
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { startTyping, stopTyping, uploadAttachments } = useMessagingStore();

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Send typing indicator
    if (!isTyping) {
      setIsTyping(true);
      startTyping(chatId);
    }

    // Clear and reset timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      stopTyping(chatId);
    }, 2000);
  };

  const handleSend = () => {
    const trimmedContent = content.trim();
    if (trimmedContent || attachments.length > 0) {
      onSendMessage(
        trimmedContent,
        attachments.length ? attachments : undefined,
      );
      setContent('');
      setAttachments([]);
      setIsTyping(false);
      stopTyping(chatId);
      setUploadError(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePickAttachment = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const uploaded = await uploadAttachments(files);
      setAttachments((prev) => [...prev, ...uploaded]);
    } catch {
      setUploadError('Failed to upload attachments.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping) {
        stopTyping(chatId);
      }
    };
  }, [chatId, isTyping, stopTyping]);

  return (
    <div className="border-t border-white/70 p-4 bg-white/70 backdrop-blur-xl">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handlePickAttachment}
          className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition"
          title="Add attachment"
        >
          <Paperclip size={20} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={handleFilesSelected}
          className="hidden"
        />

        <textarea
          value={content}
          onChange={handleTyping}
          onKeyPress={handleKeyPress}
          placeholder="Type a message... (Ctrl+Enter to send)"
          className="flex-1 resize-none rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
          rows={3}
        />

        <button
          onClick={handleSend}
          disabled={
            (!content.trim() && attachments.length === 0) || isUploading
          }
          className="bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600 disabled:bg-slate-300 text-white p-3 rounded-2xl transition flex items-center justify-center shadow-lg shadow-emerald-200/60"
          title="Send message (Ctrl+Enter)"
        >
          <Send size={20} />
        </button>
      </div>

      {(attachments.length > 0 || uploadError) && (
        <div className="mt-3 space-y-2">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-600"
                >
                  <span className="max-w-[180px] truncate">
                    {attachment.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(attachment.id)}
                    className="text-slate-400 hover:text-rose-500"
                    title="Remove attachment"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {uploadError && (
            <p className="text-xs text-rose-600">{uploadError}</p>
          )}
        </div>
      )}

      <div className="text-xs text-slate-500 mt-2">
        {isUploading
          ? 'Uploading attachments...'
          : 'Press Ctrl+Enter or click the send button'}
      </div>
    </div>
  );
};
