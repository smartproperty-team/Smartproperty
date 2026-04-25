import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PropertyReviewStatus } from '../entities/property-review.entity';

export class CreatePropertyReviewDto {
  @ApiProperty({ example: 4.5, minimum: 0.5, maximum: 5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ example: 'Great apartment and responsive owner' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiProperty({ example: 'Clean property, accurate listing, smooth process.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  comment!: string;
}

export class UpdatePropertyReviewDto {
  @ApiPropertyOptional({ example: 4.5, minimum: 0.5, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ example: 'Updated after move-in month one' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ example: 'Still happy with the experience.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class ModeratePropertyReviewDto {
  @ApiProperty({
    enum: [
      PropertyReviewStatus.APPROVED,
      PropertyReviewStatus.REJECTED,
      PropertyReviewStatus.HIDDEN,
    ],
  })
  @IsEnum(PropertyReviewStatus)
  status!:
    | PropertyReviewStatus.APPROVED
    | PropertyReviewStatus.REJECTED
    | PropertyReviewStatus.HIDDEN;

  @ApiPropertyOptional({ example: 'Contains personal data.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class RespondToReviewDto {
  @ApiProperty({ example: 'Thank you for your feedback and trust.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message!: string;
}

export class ReviewModerationQueryDto {
  @ApiPropertyOptional({
    enum: [
      PropertyReviewStatus.PENDING,
      PropertyReviewStatus.REJECTED,
      PropertyReviewStatus.HIDDEN,
      PropertyReviewStatus.APPROVED,
    ],
    default: PropertyReviewStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(PropertyReviewStatus)
  status?: PropertyReviewStatus;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  @IsOptional()
  @IsString()
  propertyId?: string;
}
