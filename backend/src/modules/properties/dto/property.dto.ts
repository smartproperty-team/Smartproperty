// ===========================================
// SmartProperty - Property DTOs
// ===========================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  PropertyCategory,
  PropertyStatus,
  PropertyType,
} from '../entities/property.entity';

// ===========================================
// Nested DTOs
// ===========================================

export class VirtualTourHotspotDto {
  @ApiProperty({ example: 'hs-abc123' })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ example: 'image-key-living-room' })
  @IsString()
  @IsNotEmpty()
  sourceRoomKey!: string;

  @ApiProperty({ example: 'image-key-kitchen' })
  @IsString()
  @IsNotEmpty()
  targetRoomKey!: string;

  @ApiProperty({ example: 1.57, description: 'Horizontal angle in radians' })
  @IsNumber()
  @Min(-Math.PI)
  @Max(Math.PI)
  yaw!: number;

  @ApiProperty({ example: 0, description: 'Vertical angle in radians' })
  @IsNumber()
  @Min(-Math.PI / 2)
  @Max(Math.PI / 2)
  pitch!: number;

  @ApiProperty({ example: 'Kitchen' })
  @IsString()
  @IsNotEmpty()
  label!: string;
}

export class VirtualTourConfigDto {
  @ApiProperty({ type: [VirtualTourHotspotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VirtualTourHotspotDto)
  hotspots!: VirtualTourHotspotDto[];

  @ApiPropertyOptional({ example: 'image-key-living-room' })
  @IsOptional()
  @IsString()
  defaultRoomKey?: string;
}

export class PropertyCoordinatesDto {
  @ApiProperty({ example: 40.7128 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ example: -74.006 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
}

export class PropertyAddressDto {
  @ApiProperty({ example: '123 Main St' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  street!: string;

  @ApiProperty({ example: 'New York' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  city!: string;

  @ApiProperty({ example: 'NY' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  state!: string;

  @ApiProperty({ example: '10001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  zipCode!: string;

  @ApiProperty({ example: 'USA' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  country!: string;

  @ApiPropertyOptional({ type: PropertyCoordinatesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PropertyCoordinatesDto)
  coordinates?: PropertyCoordinatesDto;
}

export class PropertyAvailabilityCalendarDto {
  @ApiPropertyOptional({ example: '2026-04-01' })
  @IsOptional()
  @IsDateString()
  availableFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  availableTo?: string;
}

export class PropertyFeaturesDto {
  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bedrooms?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bathrooms?: number;

  @ApiPropertyOptional({ example: 950 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  area?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  parkingSpaces?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  furnished?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  petFriendly?: boolean;

  @ApiPropertyOptional({ example: ['wifi', 'gym'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiPropertyOptional({ type: PropertyAvailabilityCalendarDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PropertyAvailabilityCalendarDto)
  availabilityCalendar?: PropertyAvailabilityCalendarDto;
}

export class PropertyImageDto {
  @ApiProperty({ example: 'https://example.com/image.jpg' })
  @IsUrl()
  url!: string;

  @ApiPropertyOptional({ example: 'Living room' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  caption?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

// ===========================================
// Create DTO
// ===========================================

export class CreatePropertyDto {
  @ApiProperty({ example: 'Modern Downtown Apartment' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: 'Spacious 2-bedroom with city views.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ enum: PropertyType })
  @IsEnum(PropertyType)
  type!: PropertyType;

  @ApiPropertyOptional({ enum: PropertyStatus })
  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @ApiPropertyOptional({ enum: PropertyCategory })
  @IsOptional()
  @IsEnum(PropertyCategory)
  category?: PropertyCategory;

  @ApiProperty({ example: 1800 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency?: string;

  @ApiProperty({ type: PropertyAddressDto })
  @ValidateNested()
  @Type(() => PropertyAddressDto)
  address!: PropertyAddressDto;

  @ApiPropertyOptional({ type: PropertyFeaturesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PropertyFeaturesDto)
  features?: PropertyFeaturesDto;

  @ApiPropertyOptional({ type: [PropertyImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertyImageDto)
  images?: PropertyImageDto[];

  @ApiPropertyOptional({ example: 'https://example.com/virtual-tour' })
  @IsOptional()
  @IsUrl()
  virtualTour?: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439012' })
  @IsOptional()
  @IsString()
  managerId?: string;
}

// ===========================================
// Update DTO
// ===========================================

export class UpdatePropertyAddressDto {
  @ApiPropertyOptional({ example: '123 Main St' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  street?: string;

  @ApiPropertyOptional({ example: 'New York' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional({ example: 'NY' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  state?: string;

  @ApiPropertyOptional({ example: '10001' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  zipCode?: string;

  @ApiPropertyOptional({ example: 'USA' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @ApiPropertyOptional({ type: PropertyCoordinatesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PropertyCoordinatesDto)
  coordinates?: PropertyCoordinatesDto;
}

export class UpdatePropertyDto {
  @ApiPropertyOptional({ example: 'Modern Downtown Apartment' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'Spacious 2-bedroom with city views.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ enum: PropertyType })
  @IsOptional()
  @IsEnum(PropertyType)
  type?: PropertyType;

  @ApiPropertyOptional({ enum: PropertyStatus })
  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @ApiPropertyOptional({ enum: PropertyCategory })
  @IsOptional()
  @IsEnum(PropertyCategory)
  category?: PropertyCategory;

  @ApiPropertyOptional({ example: 1800 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ type: UpdatePropertyAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePropertyAddressDto)
  address?: UpdatePropertyAddressDto;

  @ApiPropertyOptional({ type: PropertyFeaturesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PropertyFeaturesDto)
  features?: PropertyFeaturesDto;

  @ApiPropertyOptional({ type: [PropertyImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertyImageDto)
  images?: PropertyImageDto[];

  @ApiPropertyOptional({ example: 'https://example.com/virtual-tour' })
  @IsOptional()
  @IsUrl()
  virtualTour?: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439012' })
  @IsOptional()
  @IsString()
  managerId?: string;
}
