// ===========================================
// Auth Response DTOs
// ===========================================

import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common';

export class AuthTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  accessToken: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT refresh token',
  })
  refreshToken: string;

  @ApiProperty({
    example: 3600,
    description: 'Access token expiration time in seconds',
  })
  expiresIn: number;
}

export class UserResponseDto {
  @ApiProperty({ description: 'User ID' })
  _id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'tenant', enum: UserRole })
  role: UserRole;

  @ApiProperty({ example: '+1234567890', required: false })
  phone?: string;

  @ApiProperty({ example: true })
  isEmailVerified: boolean;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ description: 'User creation date' })
  createdAt: Date;
}

export class LoginResponseDto {
  @ApiProperty()
  user: UserResponseDto;

  @ApiProperty()
  tokens: AuthTokenDto;
}

export class RefreshTokenResponseDto extends AuthTokenDto {}
