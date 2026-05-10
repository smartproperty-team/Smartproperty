// ===========================================
// SmartProperty - Messaging Module
// ===========================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadModule } from '../upload/upload.module';
import { UsersModule } from '../users/users.module';
import { Chat } from './entities/chat.entity';
import { Message } from './entities/message.entity';
import { UserChatState } from './entities/user-chat-state.entity';
import { MessagingController } from './messaging.controller';
import { MessagingGateway } from './messaging.gateway';
import { MessagingService } from './messaging.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chat, Message, UserChatState]),
    UsersModule,
    UploadModule,
  ],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingGateway],
  exports: [MessagingService, MessagingGateway],
})
export class MessagingModule {}
