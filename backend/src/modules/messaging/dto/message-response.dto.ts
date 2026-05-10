// ===========================================
// SmartProperty - Message Response DTO
// ===========================================

import { Expose } from 'class-transformer';
import { MessageStatus } from '../entities/message.entity';

export class SenderDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export class MessageResponseDto {
  @Expose({ name: '_id' })
  id: string;

  chatId: string;
  sender: SenderDto;
  content: string;
  status: MessageStatus;
  createdAt: Date;
  updatedAt: Date;
  readBy: Record<
    string,
    {
      readAt: Date;
    }
  >;
  attachments?: Array<{
    id: string;
    url: string;
    type: string;
    name: string;
  }>;
  mentions?: string[];
  replyToId?: string;
}
