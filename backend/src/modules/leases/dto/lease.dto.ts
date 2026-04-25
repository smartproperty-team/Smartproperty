// ===========================================
// SmartProperty - Lease DTOs
// ===========================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  LeaseDepositStatus,
  LeaseDocumentType,
  LeaseInventoryPhase,
  LeaseSignatureMethod,
  LeaseStatus,
} from '../entities/lease.entity';

export class CreateLeaseFromApplicationDto {
  @ApiProperty({ example: '2026-06-01T00:00:00.000Z' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2027-05-31T23:59:59.000Z' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ example: 1200 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyRent!: number;

  @ApiPropertyOptional({ example: 2400 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  securityDeposit?: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(12)
  currency?: string;

  @ApiPropertyOptional({ example: 'Lease covers the primary residence only.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  terms?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['No subletting', 'Pets allowed with written consent'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  customTerms?: string[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  templateOnly?: boolean;
}

export class LeaseOwnerDecisionDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  approved!: boolean;

  @ApiPropertyOptional({ example: 'Terms approved after landlord review.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class LeaseSignatureDto {
  @ApiProperty({
    enum: LeaseSignatureMethod,
    example: LeaseSignatureMethod.E_SIGNATURE,
  })
  @IsEnum(LeaseSignatureMethod)
  method!: LeaseSignatureMethod;

  @ApiPropertyOptional({ example: 'Signed using the secure tenant portal.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @ApiPropertyOptional({ example: 'signature-proof-001' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  documentId?: string;
}

export class UploadLeaseDocumentDto {
  @ApiProperty({
    enum: LeaseDocumentType,
    example: LeaseDocumentType.LEASE_AGREEMENT,
  })
  @IsEnum(LeaseDocumentType)
  type!: LeaseDocumentType;

  @ApiPropertyOptional({ example: 'Executed lease agreement.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class LeaseInventoryDto {
  @ApiProperty({ enum: LeaseInventoryPhase })
  @IsEnum(LeaseInventoryPhase)
  phase!: LeaseInventoryPhase;

  @ApiPropertyOptional({ example: 'Kitchen' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  room?: string;

  @ApiProperty({ example: 'Kitchen cabinet and sink' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  item!: string;

  @ApiProperty({ example: 'Good with minor wear.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  condition!: string;

  @ApiPropertyOptional({ example: 'Documented during move-in walkthrough.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class LeaseRenewalDto {
  @ApiProperty({ example: '2028-05-31T23:59:59.000Z' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ example: 1250 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyRent?: number;

  @ApiPropertyOptional({ example: 2500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  securityDeposit?: number;

  @ApiPropertyOptional({
    type: [String],
    example: ['Renewal approved for 12 months.'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  customTerms?: string[];

  @ApiPropertyOptional({
    example: 'Renewal approved with unchanged conditions.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class LeaseTerminationDto {
  @ApiProperty({ example: 'early' })
  @IsString()
  @IsNotEmpty()
  terminationType!: 'early' | 'normal';

  @ApiPropertyOptional({ example: 'Tenant relocated abroad.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @ApiPropertyOptional({ example: '2027-02-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;
}

export class LeaseDepositDto {
  @ApiProperty({ enum: LeaseDepositStatus })
  @IsEnum(LeaseDepositStatus)
  status!: LeaseDepositStatus;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountReleased?: number;

  @ApiPropertyOptional({
    example: 'Deposit partially retained for repainting.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class LeaseListQueryDto {
  @ApiPropertyOptional({ enum: LeaseStatus })
  @IsOptional()
  @IsEnum(LeaseStatus)
  status?: LeaseStatus;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439012' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
