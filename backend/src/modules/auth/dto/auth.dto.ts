// ===========================================
// SmartProperty - Auth DTOs
// ===========================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
import { UserRole } from '../../users/entities/user.entity';

// ===========================================
// Register DTO
// ===========================================

export class RegisterDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Password (min 8 chars, 1 uppercase, 1 lowercase, 1 number)',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(50, { message: 'Password must not exceed 50 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character',
  })
  password: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Password confirmation',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password confirmation is required' })
  confirmPassword: string;

  @ApiProperty({
    example: 'John',
    description: 'First name',
  })
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name',
  })
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @MinLength(2, { message: 'Last name must be at least 2 characters' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  lastName: string;

  @ApiPropertyOptional({
    example: '+1234567890',
    description: 'Phone number',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Please provide a valid phone number',
  })
  phone?: string;

  @ApiPropertyOptional({
    example: 'tenant',
    description: 'User role',
    enum: UserRole,
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Invalid role' })
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'reCAPTCHA token (v2 checkbox)',
  })
  @IsOptional()
  @IsString()
  captchaToken?: string;
}

// ===========================================
// Login DTO
// ===========================================

export class LoginDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'User password',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @ApiPropertyOptional({
    description: 'reCAPTCHA token (v2 checkbox)',
  })
  @IsNotEmpty({ message: 'Captcha token is required' })
  @IsString()
  captchaToken?: string;
}

// ===========================================
// Refresh Token DTO
// ===========================================

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token',
  })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}

// ===========================================
// Forgot Password DTO
// ===========================================

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}

// ===========================================
// Reset Password DTO
// ===========================================

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token',
  })
  @IsString()
  @IsNotEmpty({ message: 'Token is required' })
  token: string;

  @ApiProperty({
    example: 'NewSecurePass123!',
    description: 'New password',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(50, { message: 'Password must not exceed 50 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character',
  })
  password: string;

  @ApiProperty({
    example: 'NewSecurePass123!',
    description: 'Password confirmation',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password confirmation is required' })
  confirmPassword: string;
}

// ===========================================
// Change Password DTO
// ===========================================

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
  })
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword: string;

  @ApiProperty({
    example: 'NewSecurePass123!',
    description: 'New password',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(50, { message: 'Password must not exceed 50 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character',
  })
  newPassword: string;

  @ApiProperty({
    description: 'New password confirmation',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password confirmation is required' })
  confirmPassword: string;
}

// ===========================================
// Verify Email DTO
// ===========================================

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Email verification token',
  })
  @IsString()
  @IsNotEmpty({ message: 'Token is required' })
  token: string;
}

// ===========================================
// Resend Verification DTO
// ===========================================

export class ResendVerificationDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}
