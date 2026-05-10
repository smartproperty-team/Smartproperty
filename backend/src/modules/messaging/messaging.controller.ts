// ===========================================
// SmartProperty - Messaging Controller
// ===========================================

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateMessageDto, GetChatsDto } from './dto';
import { MessagingService } from './messaging.service';

@ApiTags('Messaging')
@ApiBearerAuth()
@Controller('messaging')
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post('attachments')
  @ApiOperation({ summary: 'Upload message attachments' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Attachments uploaded successfully',
  })
  @UseInterceptors(FilesInterceptor('files', 5))
  async uploadAttachments(
    @CurrentUser() user: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const attachments = await this.messagingService.uploadAttachments(
      user.id,
      files,
    );

    return { attachments, count: attachments.length };
  }

  /**
   * Get all chats for current user
   */
  @Get('chats')
  @ApiOperation({ summary: 'Get all chats for current user' })
  @ApiResponse({ status: 200, description: 'Chats retrieved successfully' })
  async getChats(@CurrentUser() user: any, @Query() getChatsDto: GetChatsDto) {
    return this.messagingService.getUserChats(user.id, getChatsDto);
  }

  /**
   * Get chat with participants
   */
  @Get('chats/:chatId')
  @ApiOperation({ summary: 'Get chat with participant info' })
  @ApiResponse({ status: 200, description: 'Chat retrieved successfully' })
  async getChat(@CurrentUser() user: any, @Param('chatId') chatId: string) {
    return this.messagingService.getChatWithParticipants(chatId, user.id);
  }

  /**
   * Get messages in a chat
   */
  @Get('chats/:chatId/messages')
  @ApiOperation({ summary: 'Get messages in a chat' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  async getMessages(
    @CurrentUser() user: any,
    @Param('chatId') chatId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;

    return this.messagingService.getMessages(
      user.id,
      chatId,
      pageNum,
      limitNum,
    );
  }

  /**
   * Send a message
   */
  @Post('messages')
  @ApiOperation({ summary: 'Send a message' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(
    @CurrentUser() user: any,
    @Body() createMessageDto: CreateMessageDto,
  ) {
    return this.messagingService.sendMessage(user.id, createMessageDto);
  }

  /**
   * Mark messages as read
   */
  @Post('messages/read')
  @ApiOperation({ summary: 'Mark messages as read' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  async markAsRead(
    @CurrentUser() user: any,
    @Body() body: { chatId: string; messageIds: string[] },
  ) {
    const messageIds = body.messageIds.map((id) => {
      const { ObjectId } = require('mongodb');
      return new ObjectId(id);
    });

    await this.messagingService.markMessagesAsRead(
      user.id,
      body.chatId,
      messageIds,
    );

    return { success: true };
  }

  /**
   * Delete a message
   */
  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  async deleteMessage(
    @CurrentUser() user: any,
    @Param('messageId') messageId: string,
  ) {
    await this.messagingService.deleteMessage(user.id, messageId);
    return { success: true };
  }

  /**
   * Get total unread count
   */
  @Get('unread/count')
  @ApiOperation({ summary: 'Get total unread count' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved' })
  async getUnreadCount(@CurrentUser() user: any) {
    const count = await this.messagingService.getUnreadCount(user.id);
    return { unreadCount: count };
  }

  /**
   * Get available chat partners based on user role
   */
  @Get('partners/available')
  @ApiOperation({
    summary: 'Get available chat partners based on your role',
    description:
      'Returns users whose roles you can chat with according to messaging rules',
  })
  @ApiResponse({
    status: 200,
    description: 'Available partners retrieved successfully',
  })
  async getAvailablePartners(@CurrentUser() user: any) {
    return this.messagingService.getAvailableChatPartners(user.id);
  }
}
