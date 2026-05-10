// ===========================================
// SmartProperty - Messaging Service
// ===========================================

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectId } from 'mongodb';
import { MongoRepository } from 'typeorm';
import { MinioService } from '../upload/minio.service';
import { UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { CreateMessageDto, GetChatsDto } from './dto';
import { Chat } from './entities/chat.entity';
import { Message, MessageStatus } from './entities/message.entity';
import { UserChatState } from './entities/user-chat-state.entity';
import {
  canSendMessage,
  getAllowedChatPartnerRoles,
} from './messaging.access-rules';
import { MessagingGateway } from './messaging.gateway';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    @InjectRepository(Chat)
    private readonly chatRepo: MongoRepository<Chat>,
    @InjectRepository(Message)
    private readonly messageRepo: MongoRepository<Message>,
    @InjectRepository(UserChatState)
    private readonly userChatStateRepo: MongoRepository<UserChatState>,
    private readonly usersService: UsersService,
    private readonly messagingGateway: MessagingGateway,
    private readonly minioService: MinioService,
  ) {}

  private resolveAttachmentType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    return 'file';
  }

  async uploadAttachments(
    userId: string,
    files: Express.Multer.File[],
  ): Promise<
    Array<{
      id: string;
      url: string;
      type: string;
      name: string;
    }>
  > {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
    ];

    for (const file of files) {
      if (!allowedTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `Invalid file type: ${file.mimetype}. Allowed: ${allowedTypes.join(', ')}`,
        );
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new BadRequestException('File size exceeds 10MB limit');
      }
    }

    const uploads = await this.minioService.uploadFiles(files, {
      folder: `messages/${userId}`,
      metadata: {
        'Uploaded-By': userId,
      },
    });

    return uploads.map((upload) => ({
      id: upload.key,
      url: upload.url,
      type: this.resolveAttachmentType(upload.mimeType),
      name: upload.originalName,
    }));
  }

  private async getLastOpenedChatId(userId: string): Promise<string | null> {
    const state = await this.userChatStateRepo.findOne({ where: { userId } });
    return state?.lastOpenedChatId || null;
  }

  private async setLastOpenedChatId(
    userId: string,
    chatId: string,
  ): Promise<void> {
    const existing = await this.userChatStateRepo.findOne({
      where: { userId },
    });

    if (existing) {
      await this.userChatStateRepo.updateOne(
        { _id: existing._id },
        { $set: { lastOpenedChatId: chatId, updatedAt: new Date() } },
      );
      return;
    }

    const created = this.userChatStateRepo.create({
      userId,
      lastOpenedChatId: chatId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.userChatStateRepo.save(created);
  }

  /**
   * Get or create a chat between two users
   */
  async getOrCreateChat(userId: string, recipientId: string): Promise<Chat> {
    if (!ObjectId.isValid(userId) || !ObjectId.isValid(recipientId)) {
      throw new BadRequestException('Invalid user ID');
    }

    // Find existing chats between the same two users (any order)
    const existingChats = await this.chatRepo.find({
      where: {
        participantIds: { $all: [userId, recipientId] },
      },
      order: { createdAt: 'ASC' },
    });

    if (existingChats.length > 0) {
      const activeChat = existingChats.find((item) => !item.isDeleted);
      const chatToUse = activeChat || existingChats[0];

      if (chatToUse.isDeleted) {
        await this.chatRepo.updateOne(
          { _id: chatToUse._id },
          { $set: { isDeleted: false }, $unset: { deletedAt: '' } },
        );
      }

      return chatToUse;
    }

    // Create new chat
    const chat = this.chatRepo.create({
      participantIds: [userId, recipientId],
      lastMessageAt: new Date(),
      participantMetadata: {
        [userId]: {
          unreadCount: 0,
          lastReadAt: new Date(),
          isActive: false,
        },
        [recipientId]: {
          unreadCount: 0,
          lastReadAt: new Date(),
          isActive: false,
        },
      },
    });

    return this.chatRepo.save(chat);
  }

  /**
   * Send a message with role-based access control
   */
  async sendMessage(
    senderId: string,
    createMessageDto: CreateMessageDto,
  ): Promise<Message> {
    const { recipientId, content } = createMessageDto;
    const trimmedContent = content?.trim() || '';
    const hasAttachments =
      Array.isArray(createMessageDto.attachments) &&
      createMessageDto.attachments.length > 0;

    if (!trimmedContent && !hasAttachments) {
      throw new BadRequestException('Message content cannot be empty');
    }

    if (!ObjectId.isValid(recipientId)) {
      throw new BadRequestException('Invalid recipient ID');
    }

    // Get sender and recipient
    const [sender, recipient] = await Promise.all([
      this.usersService.findById(senderId),
      this.usersService.findById(recipientId),
    ]);

    if (!sender) {
      throw new NotFoundException('Sender not found');
    }

    if (!recipient) {
      throw new NotFoundException('Recipient not found');
    }

    // Check role-based access
    if (!canSendMessage(sender.role, recipient.role)) {
      this.logger.warn(
        `Access denied: ${sender.role} cannot chat with ${recipient.role}`,
      );
      throw new ForbiddenException(
        'You do not have permission to chat with this user based on your roles',
      );
    }

    // Get or create chat
    const chat = await this.getOrCreateChat(senderId, recipientId);

    // Create message
    const message = this.messageRepo.create({
      chatId: chat._id,
      senderId,
      content: trimmedContent,
      status: MessageStatus.SENT,
      readBy: {
        [senderId]: {
          readAt: new Date(),
        },
      },
      attachments: createMessageDto.attachments,
      mentions: createMessageDto.mentions,
      replyToId: createMessageDto.replyToId
        ? new ObjectId(createMessageDto.replyToId)
        : undefined,
    });

    const savedMessage = await this.messageRepo.save(message);

    // Update chat metadata
    await this.chatRepo.updateOne(
      { _id: chat._id },
      {
        $set: {
          lastMessageAt: new Date(),
          lastMessageContent: trimmedContent
            ? trimmedContent.substring(0, 100)
            : hasAttachments
              ? 'Attachment'
              : '',
          lastMessageSenderId: senderId,
          [`participantMetadata.${recipientId}.unreadCount`]: 1,
        },
      },
    );

    // Emit via WebSocket
    this.messagingGateway.emitNewMessage(recipientId, {
      id: savedMessage._id.toHexString(),
      chatId: chat._id.toHexString(),
      senderId,
      senderName: `${sender.firstName} ${sender.lastName}`,
      content: savedMessage.content,
      status: savedMessage.status,
      createdAt: savedMessage.createdAt,
      attachments: savedMessage.attachments,
    });

    // Return formatted message
    return this.formatMessageForResponse(savedMessage);
  }

  /**
   * Get all chats for a user
   */
  async getUserChats(
    userId: string,
    getChatsDto: GetChatsDto,
  ): Promise<{
    chats: any[];
    total: number;
    lastOpenedChatId: string | null;
  }> {
    const { page = 1, limit = 20, search } = getChatsDto;
    const skip = (page - 1) * limit;

    const baseQuery = {
      participantIds: userId,
      isDeleted: false,
    };

    const query =
      search && search.trim()
        ? {
            $or: [
              baseQuery,
              {
                lastMessageContent: {
                  $regex: search.trim(),
                  $options: 'i',
                },
              },
            ],
          }
        : baseQuery;

    const [chats, total, lastOpenedChatId] = await Promise.all([
      this.chatRepo.find({
        where: query,
        order: { lastMessageAt: -1 },
        skip,
        take: limit,
      }),
      this.chatRepo.count({ where: query }),
      this.getLastOpenedChatId(userId),
    ]);

    this.logger.debug(
      `User ${userId}: loaded ${chats.length} chats (total: ${total})`,
    );

    const formattedChats = chats.map((chat) =>
      this.formatChatForResponse(chat),
    );

    return { chats: formattedChats, total, lastOpenedChatId };
  }

  /**
   * Format chat for API response - convert ObjectId to hex string
   */
  private formatChatForResponse(chat: Chat): any {
    return {
      _id: chat._id.toHexString(),
      participantIds: chat.participantIds,
      lastMessageAt: chat.lastMessageAt,
      lastMessageContent: chat.lastMessageContent,
      lastMessageSenderId: chat.lastMessageSenderId,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      isDeleted: chat.isDeleted,
      participantMetadata: chat.participantMetadata,
    };
  }

  private formatMessageForResponse(message: Message): any {
    return {
      id: message._id.toHexString(),
      _id: message._id.toHexString(),
      chatId: message.chatId.toHexString(),
      senderId: message.senderId,
      content: message.content,
      status: message.status,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      readBy: message.readBy || {},
      isDeleted: message.isDeleted,
      attachments: message.attachments,
      mentions: message.mentions,
      replyToId: message.replyToId?.toHexString(),
    };
  }

  /**
   * Get messages in a chat
   */
  async getMessages(
    userId: string,
    chatId: string,
    page = 1,
    limit = 50,
  ): Promise<{ messages: any[]; total: number }> {
    if (!ObjectId.isValid(chatId)) {
      throw new BadRequestException('Invalid chat ID');
    }

    const objectChatId = new ObjectId(chatId);
    const skip = (page - 1) * limit;

    // Verify user is participant
    const chat = await this.chatRepo.findOne({
      where: { _id: objectChatId },
    });

    if (!chat || !chat.participantIds.includes(userId)) {
      throw new ForbiddenException('You are not a participant in this chat');
    }

    this.logger.debug(`Loading messages for chat ${chatId} (user: ${userId})`);

    await this.setLastOpenedChatId(userId, chatId);

    const [messages, total] = await Promise.all([
      this.messageRepo.find({
        where: { chatId: objectChatId, isDeleted: false },
        order: { createdAt: -1 },
        skip,
        take: limit,
      }),
      this.messageRepo.count({
        where: { chatId: objectChatId, isDeleted: false },
      }),
    ]);

    this.logger.debug(`Found ${messages.length} messages for chat ${chatId}`);

    // Mark messages as read
    const messageIds = messages.map((m) => m._id);
    if (messageIds.length > 0) {
      this.logger.debug(
        `Marking ${messageIds.length} messages as read for user ${userId}`,
      );
      await this.markMessagesAsRead(userId, chatId, messageIds);
    }

    // Format messages for API response
    const formattedMessages = messages
      .reverse()
      .map((msg) => this.formatMessageForResponse(msg));

    return { messages: formattedMessages, total };
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(
    userId: string,
    chatId: string,
    messageIds: ObjectId[],
  ): Promise<void> {
    if (messageIds.length === 0) {
      return;
    }

    const readAt = new Date();

    // Update multiple messages
    await this.messageRepo.updateMany(
      { _id: { $in: messageIds } },
      {
        $set: {
          [`readBy.${userId}`]: { readAt },
          status: MessageStatus.SEEN,
        },
      },
    );

    // Emit read status via WebSocket
    this.messagingGateway.emitMessagesRead(userId, chatId, messageIds);
  }

  /**
   * Get unread count for all chats
   */
  async getUnreadCount(userId: string): Promise<number> {
    const chats = await this.chatRepo.find({
      where: { participantIds: userId, isDeleted: false },
    });

    return chats.reduce((sum, chat) => {
      const metadata = chat.participantMetadata?.[userId];
      return sum + (metadata?.unreadCount || 0);
    }, 0);
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(userId: string, messageId: string): Promise<void> {
    if (!ObjectId.isValid(messageId)) {
      throw new BadRequestException('Invalid message ID');
    }

    const objectMessageId = new ObjectId(messageId);
    const message = await this.messageRepo.findOne({
      where: { _id: objectMessageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.messageRepo.updateOne(
      { _id: objectMessageId },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          content: '[Message deleted]',
        },
      },
    );

    // Emit deletion via WebSocket
    this.messagingGateway.emitMessageDeleted(userId, messageId);
  }

  /**
   * Get chat with participant info
   */
  async getChatWithParticipants(chatId: string, userId: string) {
    if (!ObjectId.isValid(chatId)) {
      throw new BadRequestException('Invalid chat ID');
    }

    const chat = await this.chatRepo.findOne({
      where: { _id: new ObjectId(chatId) },
    });

    if (!chat || !chat.participantIds.includes(userId)) {
      throw new ForbiddenException('You are not a participant in this chat');
    }

    const otherUserId = chat.participantIds.find((id) => id !== userId);

    if (!otherUserId) {
      throw new NotFoundException('Other participant not found in chat');
    }

    const otherUser = await this.usersService.findById(otherUserId);

    return {
      chat: this.formatChatForResponse(chat),
      participant: {
        id: otherUser._id?.toHexString?.() || otherUserId,
        firstName: otherUser.firstName,
        lastName: otherUser.lastName,
        email: otherUser.email,
        role: otherUser.role,
      },
    };
  }

  /**
   * Get available chat partners based on user's role
   * Returns users whose roles the current user can chat with
   */
  async getAvailableChatPartners(userId: string): Promise<
    Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
      hasActiveChat: boolean;
    }>
  > {
    const currentUser = await this.usersService.findById(userId);
    if (!currentUser) {
      throw new NotFoundException('Current user not found');
    }

    // Get allowed roles for this user's role
    const allowedRoles = getAllowedChatPartnerRoles(currentUser.role);
    this.logger.debug(
      `User ${currentUser.email} (${currentUser.role}) can chat with roles:`,
      allowedRoles,
    );

    if (allowedRoles.length === 0) {
      return [];
    }

    // Find all users and filter by allowed roles (MongoDB workaround)
    const { users: allUsers } = await this.usersService.findAll();
    const partners = allUsers.filter((u) =>
      allowedRoles.includes(u.role as UserRole),
    );
    this.logger.debug(`Found ${partners.length} potential partners`);

    // Filter partners: exclude current user and ensure _id exists
    const filteredPartners = partners.filter((user) => {
      const userIdStr = user._id?.toHexString?.() || user.id;
      return userIdStr && userIdStr !== userId;
    });

    // Get active chats to mark which partners have existing conversations
    const activeChats = await this.chatRepo.find({
      where: { participantIds: userId, isDeleted: false },
    });

    const chatPartnerIds = new Set<string>();
    for (const chat of activeChats) {
      for (const participantId of chat.participantIds) {
        if (participantId !== userId) {
          chatPartnerIds.add(participantId);
        }
      }
    }

    return filteredPartners.map((user) => {
      const userIdStr = user._id?.toHexString?.() || user.id;
      return {
        id: userIdStr,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        hasActiveChat: chatPartnerIds.has(userIdStr),
      };
    });
  }
}
