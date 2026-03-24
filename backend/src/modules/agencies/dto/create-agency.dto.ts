import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class RoleSeedDto {
  @ApiProperty({
    example: 'John',
    description: 'First name used to generate account email',
  })
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @MinLength(2)
  @MaxLength(50)
  firstName!: string;

  @ApiPropertyOptional({
    example: 'Smith',
    description: 'Optional last name for generated account',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName?: string;
}

export class CreateAgencyDto {
  @ApiProperty({
    example: 'Alpha Immo',
    description: 'Agency name',
  })
  @IsString()
  @IsNotEmpty({ message: 'Agency name is required' })
  @MinLength(2)
  @MaxLength(120)
  @Matches(/^[a-zA-Z0-9\s-]+$/, {
    message:
      'Agency name can only contain letters, numbers, spaces, and hyphens',
  })
  name!: string;

  @ApiProperty({
    example: 'North Region',
    description: 'Agency region',
  })
  @IsString()
  @IsNotEmpty({ message: 'Region is required' })
  @MinLength(2)
  @MaxLength(80)
  region!: string;

  @ApiProperty({
    example: '2026-03-24',
    description: 'Agency creation date',
  })
  @IsDateString()
  agencyCreationDate!: string;

  @ApiPropertyOptional({
    example: 'Operations branch for northern portfolio',
    description: 'Agency description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiPropertyOptional({
    example: '+33123456789',
    description: 'Agency phone number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    example: 'contact@alphaimmo.com',
    description: 'Agency contact email',
  })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiProperty({ description: 'Account seed for accountant role' })
  @ValidateNested()
  @Type(() => RoleSeedDto)
  accountant!: RoleSeedDto;

  @ApiProperty({ description: 'Account seed for rental manager role' })
  @ValidateNested()
  @Type(() => RoleSeedDto)
  rentalManager!: RoleSeedDto;

  @ApiProperty({ description: 'Account seed for manager role' })
  @ValidateNested()
  @Type(() => RoleSeedDto)
  manager!: RoleSeedDto;

  @ApiProperty({ description: 'Account seed for service provider role' })
  @ValidateNested()
  @Type(() => RoleSeedDto)
  serviceProvider!: RoleSeedDto;
}
