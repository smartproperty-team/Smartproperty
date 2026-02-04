// ===========================================
// Auth DTOs (Data Transfer Objects)
// ===========================================

import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../../common';

// =====================
// Registration DTO
// =====================
export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'SecurePassword123!',
    description:
      'Password (min 8 chars, 1 uppercase, 1 number, 1 special char)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least 1 uppercase letter, 1 number, and 1 special character',
  })
  password: string;

  @ApiProperty({ example: 'John', description: 'User first name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'User last name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Last name must be at least 2 characters' })
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ example: 'tenant', description: 'User role', enum: UserRole })
  @IsEnum(UserRole, {
    message: 'Role must be one of: admin, owner, tenant, manager, agent',
  })
  @IsOptional()
  role?: UserRole;

  @ApiProperty({
    example: '+1234567890',
    description: 'User phone number',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;
}

// =====================
// Login DTO
// =====================
export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!', description: 'User password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

// =====================
// Refresh Token DTO
// =====================
export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

// =====================
// Password Change DTO
// =====================
export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassword123!', description: 'Current password' })
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({
    example: 'NewPassword123!',
    description:
      'New password (min 8 chars, 1 uppercase, 1 number, 1 special char)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least 1 uppercase letter, 1 number, and 1 special character',
  })
  newPassword: string;
}

// =====================
// Forgot Password DTO
// =====================
export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address to receive reset link',
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsNotEmpty()
  email: string;
}

// =====================
// Reset Password DTO
// =====================
export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token from email' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: 'NewPassword123!',
    description:
      'New password (min 8 chars, 1 uppercase, 1 number, 1 special char)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least 1 uppercase letter, 1 number, and 1 special character',
  })
  newPassword: string;
}

// =====================
// Verify Email DTO
// =====================
export class VerifyEmailDto {
  @ApiProperty({ description: 'Email verification token' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
