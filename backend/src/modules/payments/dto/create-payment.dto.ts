// ===========================================
// SmartProperty - Create Payment DTO
// ===========================================

import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaymentMethod, PaymentType } from '../entities/payment.entity';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsMongoId()
  leaseId: string;

  @IsNotEmpty()
  @IsMongoId()
  tenantId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1) // Minimum 1 millime
  amount: number; // in millimes (TND × 1000)

  @IsOptional()
  @IsString()
  currency: string = 'TND';

  @IsNotEmpty()
  @IsEnum(PaymentType)
  type: PaymentType;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string; // Prevents duplicate charges

  @IsOptional()
  @IsString()
  invoiceId?: string;
}
