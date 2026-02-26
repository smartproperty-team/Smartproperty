import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class NotificationPreferencesDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  email: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  sms: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  push: boolean;
}

export class UserPreferencesDto {
  @ApiPropertyOptional({
    type: [String],
    example: ['Apartment', 'Studio'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  propertyTypes?: string[];

  @ApiPropertyOptional({
    type: [Number],
    example: [800, 3500],
    minItems: 2,
    maxItems: 2,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  budgetRange?: [number, number];

  @ApiPropertyOptional({ example: 'Casablanca, Rabat' })
  @IsOptional()
  @IsString()
  locations?: string;

  @ApiPropertyOptional({ type: NotificationPreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notifications?: NotificationPreferencesDto;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  skipped?: boolean;
}
