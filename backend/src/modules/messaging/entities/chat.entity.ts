// ===========================================
// SmartProperty - Chat Entity
// ===========================================

import { ObjectId } from 'mongodb';
import {
  Column,
  CreateDateColumn,
  Entity,
  ObjectIdColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('chats')
export class Chat {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  participantIds: string[]; // Array of user IDs in the chat

  @Column()
  lastMessageAt: Date;

  @Column({ nullable: true })
  lastMessageContent?: string;

  @Column({ nullable: true })
  lastMessageSenderId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ nullable: true })
  deletedAt?: Date;

  // Metadata for participants (unread counts, etc.)
  @Column()
  participantMetadata: Record<
    string,
    {
      unreadCount: number;
      lastReadAt: Date;
      isActive: boolean;
    }
  >;
}
