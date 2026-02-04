// ===========================================
// Auth Controller
// ===========================================

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards';
import { AuthService } from './auth.service';
import {
  AuthTokenDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  LoginResponseDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dtos';
import { FacebookOAuthGuard, GoogleOAuthGuard } from './guards/oauth.guard';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async register(@Body() registerDto: RegisterDto) {
    this.logger.debug(`Registration attempt for email: ${registerDto.email}`);
    return this.authService.register(registerDto);
  }

  /**
   * Login user
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or account locked',
  })
  async login(@Body() loginDto: LoginDto) {
    this.logger.debug(`Login attempt for email: ${loginDto.email}`);
    return this.authService.login(loginDto);
  }

  /**
   * Refresh access token
   */
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: AuthTokenDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  /**
   * Logout user
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user (invalidate refresh token)' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@CurrentUser() user: any) {
    this.logger.debug(`Logout for user: ${user.userId}`);
    await this.authService.logout(user.userId);
    return { message: 'Logged out successfully' };
  }

  /**
   * Request password reset
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent (if email exists)',
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    this.logger.debug(
      `Password reset requested for: ${forgotPasswordDto.email}`,
    );
    await this.authService.requestPasswordReset(forgotPasswordDto.email);
    return { message: 'If email exists, password reset link has been sent' };
  }

  /**
   * Reset password with token
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using reset token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    if (!resetPasswordDto.token) {
      throw new BadRequestException('Reset token is required');
    }
    await this.authService.resetPassword(resetPasswordDto);
    return { message: 'Password reset successfully' };
  }

  /**
   * Verify email
   */
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with verification token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    if (!verifyEmailDto.token) {
      throw new BadRequestException('Verification token is required');
    }
    await this.authService.verifyEmail(verifyEmailDto);
    return { message: 'Email verified successfully' };
  }

  /**
   * Change password (authenticated)
   */
  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password (authenticated user)' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid current password' })
  async changePassword(
    @CurrentUser() user: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    this.logger.debug(`Password change for user: ${user.userId}`);
    await this.authService.changePassword(user.userId, changePasswordDto);
    return { message: 'Password changed successfully' };
  }

  /**
   * Get current user (test endpoint)
   */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user info' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@CurrentUser() user: any) {
    return user;
  }

  /**
   * Google OAuth Login
   */
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  async googleAuth() {
    // Guard redirects to Google
  }

  /**
   * Google OAuth Callback
   */
  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const result = await this.authService.oauthLogin(req.user);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(
        `${frontendUrl}/auth/callback?token=${result.tokens.accessToken}&refreshToken=${result.tokens.refreshToken}`,
      );
    } catch (error) {
      res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_failed`,
      );
    }
  }

  /**
   * Facebook OAuth Login
   */
  @Get('facebook')
  @UseGuards(FacebookOAuthGuard)
  @ApiOperation({ summary: 'Initiate Facebook OAuth login' })
  async facebookAuth() {
    // Guard redirects to Facebook
  }

  /**
   * Facebook OAuth Callback
   */
  @Get('facebook/callback')
  @UseGuards(FacebookOAuthGuard)
  @ApiOperation({ summary: 'Facebook OAuth callback' })
  async facebookAuthCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const result = await this.authService.oauthLogin(req.user);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(
        `${frontendUrl}/auth/callback?token=${result.tokens.accessToken}&refreshToken=${result.tokens.refreshToken}`,
      );
    } catch (error) {
      res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_failed`,
      );
    }
  }
}
