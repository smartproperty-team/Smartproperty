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
  ValidateNested,
} from 'class-validator';
import {
  EntryPermissionOption,
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceStatus,
} from '../entities/maintenance-request.entity';

export class MaintenanceMediaItemDto {
  @ApiProperty({ example: 'kitchen-leak.jpg' })
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @ApiProperty({ example: 451002 })
  @IsInt()
  @Min(1)
  sizeBytes!: number;
}

export class EmergencyContactDto {
  @ApiProperty({ example: 'Sarah Ali' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: '+21655000000' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  phone!: string;

  @ApiPropertyOptional({ example: 'Sister' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  relation?: string;
}

export class CreateMaintenanceRequestDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  propertyId!: string;

  @ApiPropertyOptional({ example: 'Kitchen sink leak' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  issueTitle?: string;

  @ApiPropertyOptional({ enum: MaintenanceCategory })
  @IsOptional()
  @IsEnum(MaintenanceCategory)
  category?: MaintenanceCategory;

  @ApiPropertyOptional({ enum: MaintenancePriority })
  @IsOptional()
  @IsEnum(MaintenancePriority)
  priority?: MaintenancePriority;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  emergency?: boolean;

  @ApiPropertyOptional({
    example: 'Water leaking continuously under the sink.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 'Kitchen under sink cabinet' })
  @IsOptional()
  @IsString()
  @MaxLength(140)
  locationInProperty?: string;

  @ApiPropertyOptional({ example: '2026-03-20T09:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  firstSeenAt?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isBlockingUsage?: boolean;

  @ApiPropertyOptional({ type: [MaintenanceMediaItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => MaintenanceMediaItemDto)
  media?: MaintenanceMediaItemDto[];

  @ApiPropertyOptional({
    type: [String],
    example: ['Mon-Fri 08:00-12:00', 'Sat 14:00-18:00'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  preferredVisitWindows?: string[];

  @ApiPropertyOptional({ example: '+21653000000' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactPhone?: string;

  @ApiPropertyOptional({ enum: EntryPermissionOption })
  @IsOptional()
  @IsEnum(EntryPermissionOption)
  entryPermission?: EntryPermissionOption;

  @ApiPropertyOptional({ type: EmergencyContactDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact?: EmergencyContactDto;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  saveAsDraft?: boolean;
}

export class AssignMaintenanceRequestDto {
  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439012' })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional({ example: '2026-03-25T16:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(720)
  slaTargetHours?: number;

  @ApiPropertyOptional({ example: '2026-03-24T10:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ example: 'Assign to certified plumbing contractor.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  internalNotes?: string;
}

export class UpdateMaintenanceStatusDto {
  @ApiProperty({ enum: MaintenanceStatus })
  @IsEnum(MaintenanceStatus)
  status!: MaintenanceStatus;

  @ApiPropertyOptional({ example: 'Waiting for imported spare part.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class RecordMaintenanceOutcomeDto {
  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  laborCost?: number;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  partsCost?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  otherCost?: number;

  @ApiPropertyOptional({ example: 215 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalCost?: number;

  @ApiPropertyOptional({
    example: 'Leak fixed and pressure tested for 30 min.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolutionNotes?: string;

  @ApiPropertyOptional({ example: 'work_completed' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  closeReason?: string;
}

export class SubmitServiceReportDto {
  @ApiPropertyOptional({ example: '2026-03-24T09:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  interventionStartedAt?: string;

  @ApiPropertyOptional({ example: '2026-03-24T10:20:00.000Z' })
  @IsOptional()
  @IsDateString()
  interventionEndedAt?: string;

  @ApiPropertyOptional({ example: 'Replaced faucet seal and tested flow.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  workPerformedSummary?: string;

  @ApiPropertyOptional({ type: [MaintenanceMediaItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => MaintenanceMediaItemDto)
  reportMedia?: MaintenanceMediaItemDto[];

  @ApiPropertyOptional({ example: 190 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  invoiceAmount?: number;

  @ApiPropertyOptional({ example: 'INV-SP-2026-0031' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  invoiceReference?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  followUpRequired?: boolean;
}

export class UpdateProviderMaintenanceStatusDto {
  @ApiProperty({
    enum: [
      MaintenanceStatus.IN_PROGRESS,
      MaintenanceStatus.WAITING_PARTS,
      MaintenanceStatus.COMPLETED,
      MaintenanceStatus.CANCELED,
    ],
  })
  @IsEnum(MaintenanceStatus)
  status!:
    | MaintenanceStatus.IN_PROGRESS
    | MaintenanceStatus.WAITING_PARTS
    | MaintenanceStatus.COMPLETED
    | MaintenanceStatus.CANCELED;

  @ApiPropertyOptional({
    example: 'Paused while waiting for replacement part.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
