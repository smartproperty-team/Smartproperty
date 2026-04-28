// ===========================================
// SmartProperty - Payment Query DTOs
// ===========================================

import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PaymentStatus, PaymentType } from '../entities/payment.entity';

export class PaymentQueryDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsEnum(PaymentType)
  type?: PaymentType;

  @IsOptional()
  @IsISO8601()
  startDate?: string; // 'YYYY-MM-DD'

  @IsOptional()
  @IsISO8601()
  endDate?: string; // 'YYYY-MM-DD'

  @IsOptional()
  @IsString()
  leaseId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Page must be at least 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit: number = 10;

  @IsOptional()
  @IsString()
  sortBy: string = 'createdAt';

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toLowerCase())
  sortOrder: 'asc' | 'desc' = 'desc';
}

export class ExportPaymentQueryDto extends PaymentQueryDto {
  @IsOptional()
  @IsString()
  format: 'excel' | 'csv' = 'excel';
}
