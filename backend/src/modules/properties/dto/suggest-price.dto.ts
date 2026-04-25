// ===========================================
// SmartProperty - AI Price Suggestion DTO
// ===========================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PropertyType } from '../entities/property.entity';

export class SuggestPriceDto {
  @ApiProperty({ enum: PropertyType })
  @IsEnum(PropertyType)
  propertyType: PropertyType;

  @ApiProperty({ description: 'Tunisian city / delegation' })
  @IsString()
  city: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  governorate?: string;

  @ApiProperty({ description: 'Area in square metres', minimum: 10 })
  @IsNumber()
  @Min(10)
  areaSqm: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  bedrooms?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  bathrooms?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  parkingSpaces?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  furnished?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  petFriendly?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];
}

export interface PriceSuggestionResponse {
  predictedPrice: number;
  rentalPrice: number;
  salePrice: number;
  currency: string;
  confidence: number;
  priceRange: { low: number; high: number };
  salePriceRange: { low: number; high: number };
  baseRatePerSqm: number;
  method: string;
  factors: Array<{
    factor: string;
    impact: string;
    direction: string;
    description: string;
  }>;
}
