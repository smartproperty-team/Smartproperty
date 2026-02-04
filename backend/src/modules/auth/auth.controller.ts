// ===========================================
// SmartProperty - Auth Controller
// ===========================================

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';
import { AuthResponse, AuthService, AuthTokens } from './auth.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResendVerificationDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/auth.dto';
import { Session } from './entities/session.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshAuthGuard } from './guards/jwt-refresh-auth.guard';
import { SessionService } from './session.service';

// ===========================================
// Auth Controller
// ===========================================

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  // ===========================================
  // Helper: Extract Device Info from Request
  // ===========================================

  private getDeviceInfo(req: Request) {
    const userAgent = req.headers['user-agent'] || '';
    const deviceInfo = this.sessionService.parseUserAgent(userAgent);
    deviceInfo.ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket?.remoteAddress ||
      'Unknown';
    return deviceInfo;
  }

  // ===========================================
  // Registration
  // ===========================================

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already registered',
  })
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: Request,
  ): Promise<AuthResponse> {
    const deviceInfo = this.getDeviceInfo(req);
    return this.authService.register(registerDto, deviceInfo);
  }

  // ===========================================
  // Login
  // ===========================================

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or account locked',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
  ): Promise<AuthResponse> {
    const deviceInfo = this.getDeviceInfo(req);
    return this.authService.login(loginDto, deviceInfo);
  }

  // ===========================================
  // Token Refresh
  // ===========================================

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshAuthGuard)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid refresh token',
  })
  async refreshTokens(@Req() req: Request): Promise<AuthTokens> {
    const refreshToken = (req.body as { refreshToken?: string })?.refreshToken;
    if (!refreshToken) {
      throw new BadRequestException(
        'Refresh token is required in request body',
      );
    }
    return this.authService.refreshTokens(refreshToken);
  }

  // ===========================================
  // Logout
  // ===========================================

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current session' })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
  })
  async logout(
    @CurrentUser('id') userId: string,
    @Body() body?: { refreshToken?: string },
  ): Promise<{ message: string }> {
    await this.authService.logout(userId, body?.refreshToken);
    return { message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({
    status: 200,
    description: 'Logged out from all devices',
  })
  async logoutAll(
    @CurrentUser('id') userId: string,
    @Body() body?: { currentSessionId?: string },
  ): Promise<{ message: string; revokedCount: number }> {
    const { revokedCount } = await this.authService.revokeAllSessions(
      userId,
      body?.currentSessionId,
    );
    return {
      message: `Logged out from ${revokedCount} device(s)`,
      revokedCount,
    };
  }

  // ===========================================
  // Email Verification
  // ===========================================

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with token' })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired verification token',
  })
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
  ): Promise<{ message: string }> {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent',
  })
  async resendVerification(
    @Body() resendDto: ResendVerificationDto,
  ): Promise<{ message: string }> {
    return this.authService.resendVerificationEmail(resendDto.email);
  }

  // ===========================================
  // Password Management
  // ===========================================

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({
    status: 200,
    description: 'If email exists, reset link sent',
  })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired reset token',
  })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password for authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Current password incorrect or passwords do not match',
  })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.changePassword(userId, changePasswordDto);
  }

  // ===========================================
  // Current User
  // ===========================================

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Current user data',
  })
  @ApiResponse({
    status: 401,
    description: 'Not authenticated',
  })
  getCurrentUser(@CurrentUser() user: Partial<User>) {
    return user;
  }

  // ===========================================
  // Session Management
  // ===========================================

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all active sessions for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of active sessions',
  })
  async getSessions(@CurrentUser('id') userId: string): Promise<Session[]> {
    return this.authService.getSessions(userId);
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiParam({ name: 'sessionId', description: 'ID of the session to revoke' })
  @ApiResponse({
    status: 200,
    description: 'Session revoked successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async revokeSession(
    @CurrentUser('id') userId: string,
    @Param('sessionId') sessionId: string,
  ): Promise<{ message: string }> {
    await this.authService.revokeSession(userId, sessionId);
    return { message: 'Session revoked successfully' };
  }
}
