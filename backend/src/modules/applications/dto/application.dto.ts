// ===========================================
// SmartProperty - Application DTOs
// ===========================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApplicationStatus } from '../entities/application.entity';

export class EmploymentInfoDto {
  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  companyName!: string;

  @ApiProperty({ example: 'Software Engineer' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  jobTitle!: string;

  @ApiProperty({ example: 5500 })
  @IsNumber()
  @Min(0)
  monthlyIncome!: number;

  @ApiPropertyOptional({ example: 'full_time' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  employmentType?: string;

  @ApiPropertyOptional({ example: '2024-01-10' })
  @IsOptional()
  @IsDateString()
  startDate?: string;
}

export class ReferenceInfoDto {
  @ApiProperty({ example: 'Jane Smith' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'Former landlord' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  relation!: string;

  @ApiPropertyOptional({ example: '+14155550101' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ example: 'jane@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Always paid rent on time.' })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  notes?: string;
}

export class ApplicationQuestionnaireDto {
  @ApiPropertyOptional({ example: '1994-08-21' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: '12 Rue des Lilas, Paris' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  currentAddress?: string;

  @ApiPropertyOptional({ example: 'email' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  preferredContactChannel?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  occupantsAdults?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  occupantsChildren?: number;

  @ApiPropertyOptional({ example: 'partner, dependent' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  occupantRelationshipSummary?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  hasPets?: boolean;

  @ApiPropertyOptional({ example: 'cat' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  petType?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  petCount?: number;

  @ApiPropertyOptional({ example: 'non_smoker' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  smokingStatus?: string;

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @IsDateString()
  desiredMoveInDate?: string;

  @ApiPropertyOptional({ example: '12 months' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  leaseDurationPreference?: string;

  @ApiPropertyOptional({ example: 1200 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyBudgetMin?: number;

  @ApiPropertyOptional({ example: 1600 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyBudgetMax?: number;

  @ApiPropertyOptional({
    example: 'Ground floor preferred due to accessibility needs.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  mandatoryPropertySpecificAnswers?: string;

  @ApiPropertyOptional({ example: 'employee' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  employmentStatus?: string;

  @ApiPropertyOptional({ example: 'permanent' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  contractType?: string;

  @ApiPropertyOptional({ example: 2800 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  netMonthlyIncomeMin?: number;

  @ApiPropertyOptional({ example: 3400 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  netMonthlyIncomeMax?: number;

  @ApiPropertyOptional({ example: 1200 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  coApplicantIncome?: number;

  @ApiPropertyOptional({ example: 450 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyDebtPayments?: number;

  @ApiPropertyOptional({ example: 980 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentRentAmount?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  guarantorNeeded?: boolean;

  @ApiPropertyOptional({ example: 'Alex Martin' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  guarantorName?: string;

  @ApiPropertyOptional({ example: 3500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  guarantorIncome?: number;

  @ApiPropertyOptional({ example: 'landlord@example.com / +33123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  previousLandlordContact?: string;

  @ApiPropertyOptional({ example: 'Need larger space for growing family.' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reasonForMoving?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  hadRentPaymentIncidents?: boolean;

  @ApiPropertyOptional({ example: 'Late once in 2023 due to bank delay.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rentPaymentIncidentsExplanation?: string;
}

export class SubmitApplicationDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  propertyId!: string;

  @ApiProperty({ type: EmploymentInfoDto })
  @ValidateNested()
  @Type(() => EmploymentInfoDto)
  employmentInfo!: EmploymentInfoDto;

  @ApiPropertyOptional({ type: [ReferenceInfoDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => ReferenceInfoDto)
  references?: ReferenceInfoDto[];

  @ApiPropertyOptional({
    example: 'Looking to move in at the start of next month.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  messageToOwner?: string;

  @ApiPropertyOptional({ example: '2026-05-01T17:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  applicationDeadline?: string;

  @ApiPropertyOptional({ type: ApplicationQuestionnaireDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ApplicationQuestionnaireDto)
  questionnaire?: ApplicationQuestionnaireDto;
}

export class UploadApplicationDocumentDto {
  @ApiPropertyOptional({ example: 'pay_stub' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;
}

export class RequestAdditionalDocumentsDto {
  @ApiProperty({ example: ['bank_statement', 'government_id'] })
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  requestedDocuments!: string[];

  @ApiPropertyOptional({ example: 'Please upload clear scans within 48h.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @ApiPropertyOptional({ example: '2026-04-10T17:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  applicationDeadline?: string;
}

export class RejectApplicationDto {
  @ApiProperty({ example: 'Insufficient income documentation.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;
}

export class WithdrawApplicationDto {
  @ApiPropertyOptional({ example: 'I found another property.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class ScheduleViewingDto {
  @ApiProperty({ example: '2026-04-02T14:30:00.000Z' })
  @IsDateString()
  scheduledAt!: string;

  @ApiPropertyOptional({ example: 'Building entrance lobby' })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  location?: string;

  @ApiPropertyOptional({ example: 'Bring ID for building access.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class ListApplicationsQueryDto {
  @ApiPropertyOptional({ enum: ApplicationStatus })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
