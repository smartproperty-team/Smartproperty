// ===========================================
// SmartProperty - Create Message DTO
// ===========================================

import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class MessageAttachmentDto {
  @IsString()
  id: string;

  @IsString()
  url: string;

  @IsString()
  type: string;

  @IsString()
  name: string;
}

export class CreateMessageDto {
  @IsNotEmpty()
  @IsString()
  recipientId: string; // Target user ID

  @ValidateIf((value) => !value.attachments || value.attachments.length === 0)
  @IsNotEmpty()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageAttachmentDto)
  attachments?: MessageAttachmentDto[];

  @IsOptional()
  @IsArray()
  mentions?: string[];

  @IsOptional()
  @IsString()
  replyToId?: string;
}
