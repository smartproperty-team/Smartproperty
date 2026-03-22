import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  PropertyCategory,
  PropertyStatus,
  PropertyType,
} from '../entities/property.entity';

export class PortfolioSummaryQueryDto {
  @ApiPropertyOptional({ enum: PropertyType })
  @IsOptional()
  @IsEnum(PropertyType)
  type?: PropertyType;

  @ApiPropertyOptional({ enum: PropertyStatus })
  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @ApiPropertyOptional({ example: 'Paris' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional({ example: 'rental' })
  @IsOptional()
  @IsEnum(PropertyCategory)
  category?: PropertyCategory;

  @ApiPropertyOptional({
    description: 'Optional scope. Defaults to current user role scope.',
    enum: ['owner', 'manager', 'all'],
    example: 'owner',
  })
  @IsOptional()
  @IsIn(['owner', 'manager', 'all'])
  scope?: 'owner' | 'manager' | 'all';
}

export class PortfolioExportQueryDto extends PortfolioSummaryQueryDto {}

export class PortfolioImportRowDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(PropertyType)
  type!: PropertyType;

  @IsEnum(PropertyStatus)
  status!: PropertyStatus;

  @IsEnum(PropertyCategory)
  category!: PropertyCategory;

  @IsString()
  price!: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsString()
  city!: string;

  @IsString()
  country!: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  @IsString()
  lat?: string;

  @IsOptional()
  @IsString()
  lng?: string;
}

export class PortfolioImportCommitDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortfolioImportRowDto)
  rows!: PortfolioImportRowDto[];

  @IsOptional()
  @IsBoolean()
  skipDuplicates?: boolean;
}

export enum PortfolioConnectorId {
  SELOGER = 'seloger',
  LEBONCOIN = 'leboncoin',
  WEBHOOK = 'webhook',
}

export class PortfolioConnectorSyncDto extends PortfolioSummaryQueryDto {
  @ApiPropertyOptional({ enum: PortfolioConnectorId, example: 'seloger' })
  @IsEnum(PortfolioConnectorId)
  connectorId!: PortfolioConnectorId;

  @ApiPropertyOptional({
    example: true,
    description:
      'When true, validates/mapping only. When false and connector supports push, dispatches payload.',
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @ApiPropertyOptional({
    example: 'https://partner.example.com/webhooks/listings',
    description: 'Required for webhook connector when dryRun is false.',
  })
  @IsOptional()
  @IsUrl()
  @IsNotEmpty()
  endpointUrl?: string;
}
