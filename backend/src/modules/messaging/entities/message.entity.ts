// ===========================================
// SmartProperty - Message Entity
// ===========================================

import { ObjectId } from 'mongodb';
import {
  Column,
  CreateDateColumn,
  Entity,
  ObjectIdColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  SEEN = 'seen',
}

@Entity('messages')
export class Message {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  chatId: ObjectId; // Reference to Chat

  @Column()
  senderId: string; // User ID of sender

  @Column()
  content: string; // Message content

  @Column({ default: MessageStatus.SENT })
  status: MessageStatus = MessageStatus.SENT; // sent, delivered, seen

  @Column({ default: false })
  isDeleted = false;

  @Column({ nullable: true })
  deletedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Metadata for read status per participant
  @Column({ default: {} })
  readBy: Record<
    string,
    {
      readAt: Date;
    }
  > = {};

  // Optional: Media attachments, mentions, etc.
  @Column({ nullable: true })
  attachments?: Array<{
    id: string;
    url: string;
    type: string; // 'image', 'file', etc.
    name: string;
  }>;

  @Column({ nullable: true })
  mentions?: string[]; // Array of mentioned user IDs

  @Column({ nullable: true })
  replyToId?: ObjectId; // Reference to message being replied to
}
