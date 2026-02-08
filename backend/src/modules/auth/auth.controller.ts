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
  Res,
  ServiceUnavailableException,
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

import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';
import { AuthAuditService } from './auth-audit.service';
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
import { AuthAuditEventType } from './entities/auth-audit-log.entity';
import { Session } from './entities/session.entity';
import { FacebookOAuthGuard } from './guards/facebook-oauth.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshAuthGuard } from './guards/jwt-refresh-auth.guard';
import { DeviceInfo, SessionService } from './session.service';
import { FacebookProfile } from './strategies/facebook.strategy';
import { GoogleProfile } from './strategies/google.strategy';

// ===========================================
// Auth Controller
// ===========================================

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly authAuditService: AuthAuditService,
    private readonly configService: ConfigService,
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

  private async logAuthEvent(
    req: Request,
    details: {
      eventType: AuthAuditEventType;
      success: boolean;
      userId?: string;
      email?: string;
      sessionId?: string;
      failureReason?: string;
      metadata?: Record<string, unknown>;
    },
    deviceInfo?: DeviceInfo,
  ): Promise<void> {
    const userAgent = req.headers['user-agent'] || '';
    const resolvedDeviceInfo = deviceInfo || this.getDeviceInfo(req);
    await this.authAuditService.logEvent({
      ...details,
      deviceInfo: resolvedDeviceInfo,
      userAgent,
    });
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

    try {
      const authResponse = await this.authService.register(
        registerDto,
        deviceInfo,
      );
      const user = authResponse.user as { id?: string; email?: string };

      await this.logAuthEvent(
        req,
        {
          eventType: AuthAuditEventType.REGISTER,
          success: true,
          userId: user?.id,
          email: user?.email || registerDto.email,
          sessionId: authResponse.sessionId,
        },
        deviceInfo,
      );

      return authResponse;
    } catch (error) {
      await this.logAuthEvent(
        req,
        {
          eventType: AuthAuditEventType.REGISTER,
          success: false,
          email: registerDto.email,
          failureReason:
            error instanceof Error ? error.message : 'Unknown error',
        },
        deviceInfo,
      );
      throw error;
    }
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

    try {
      const authResponse = await this.authService.login(loginDto, deviceInfo);
      const user = authResponse.user as { id?: string; email?: string };

      await this.logAuthEvent(
        req,
        {
          eventType: AuthAuditEventType.LOGIN,
          success: true,
          userId: user?.id,
          email: user?.email || loginDto.email,
          sessionId: authResponse.sessionId,
        },
        deviceInfo,
      );

      return authResponse;
    } catch (error) {
      await this.logAuthEvent(
        req,
        {
          eventType: AuthAuditEventType.LOGIN,
          success: false,
          email: loginDto.email,
          failureReason:
            error instanceof Error ? error.message : 'Unknown error',
        },
        deviceInfo,
      );
      throw error;
    }
  }

  // ===========================================
  // Google OAuth
  // ===========================================

  private isGoogleOAuthConfigured(): boolean {
    const clientId = this.configService.get<string>('google.clientId');
    const clientSecret = this.configService.get<string>('google.clientSecret');
    return !!(clientId && clientSecret);
  }

  @Public()
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google OAuth consent screen',
  })
  @ApiResponse({
    status: 503,
    description: 'Google OAuth is not configured',
  })
  async googleAuth(): Promise<void> {
    if (!this.isGoogleOAuthConfigured()) {
      throw new ServiceUnavailableException(
        'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.',
      );
    }
    // Guard redirects to Google
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend with auth tokens',
  })
  async googleAuthCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!this.isGoogleOAuthConfigured()) {
      throw new ServiceUnavailableException('Google OAuth is not configured.');
    }

    const googleProfile = req.user as GoogleProfile;
    const deviceInfo = this.getDeviceInfo(req);

    try {
      const authResponse = await this.authService.googleLogin(
        googleProfile,
        deviceInfo,
      );
      const user = authResponse.user as { id?: string; email?: string };

      await this.logAuthEvent(
        req,
        {
          eventType: AuthAuditEventType.OAUTH_GOOGLE,
          success: true,
          userId: user?.id,
          email: user?.email,
          sessionId: authResponse.sessionId,
        },
        deviceInfo,
      );

      // Redirect to frontend with tokens in URL params
      const frontendCallbackUrl = this.configService.get<string>(
        'google.frontendCallbackUrl',
      );

      const params = new URLSearchParams({
        accessToken: authResponse.tokens.accessToken,
        refreshToken: authResponse.tokens.refreshToken,
        expiresIn: authResponse.tokens.expiresIn.toString(),
      });

      res.redirect(`${frontendCallbackUrl}?${params.toString()}`);
    } catch (error) {
      await this.logAuthEvent(
        req,
        {
          eventType: AuthAuditEventType.OAUTH_GOOGLE,
          success: false,
          email: googleProfile?.email,
          failureReason:
            error instanceof Error ? error.message : 'Unknown error',
        },
        deviceInfo,
      );
      throw error;
    }
  }

  // ===========================================
  // Facebook OAuth
  // ===========================================

  private isFacebookOAuthConfigured(): boolean {
    const clientId = this.configService.get<string>('facebook.clientId');
    const clientSecret = this.configService.get<string>(
      'facebook.clientSecret',
    );
    return !!(clientId && clientSecret);
  }

  @Public()
  @Get('facebook')
  @UseGuards(FacebookOAuthGuard)
  @ApiOperation({ summary: 'Initiate Facebook OAuth login' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Facebook OAuth consent screen',
  })
  @ApiResponse({
    status: 503,
    description: 'Facebook OAuth is not configured',
  })
  async facebookAuth(): Promise<void> {
    if (!this.isFacebookOAuthConfigured()) {
      throw new ServiceUnavailableException(
        'Facebook OAuth is not configured. Please set FACEBOOK_CLIENT_ID and FACEBOOK_CLIENT_SECRET environment variables.',
      );
    }
    // Guard redirects to Facebook
  }

  @Public()
  @Get('facebook/callback')
  @UseGuards(FacebookOAuthGuard)
  @ApiOperation({ summary: 'Facebook OAuth callback' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend with auth tokens',
  })
  async facebookAuthCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!this.isFacebookOAuthConfigured()) {
      throw new ServiceUnavailableException(
        'Facebook OAuth is not configured.',
      );
    }

    const facebookProfile = req.user as FacebookProfile;
    const deviceInfo = this.getDeviceInfo(req);

    try {
      const authResponse = await this.authService.facebookLogin(
        facebookProfile,
        deviceInfo,
      );
      const user = authResponse.user as { id?: string; email?: string };

      await this.logAuthEvent(
        req,
        {
          eventType: AuthAuditEventType.OAUTH_FACEBOOK,
          success: true,
          userId: user?.id,
          email: user?.email,
          sessionId: authResponse.sessionId,
        },
        deviceInfo,
      );

      // Redirect to frontend with tokens in URL params
      const frontendCallbackUrl = this.configService.get<string>(
        'facebook.frontendCallbackUrl',
      );

      const params = new URLSearchParams({
        accessToken: authResponse.tokens.accessToken,
        refreshToken: authResponse.tokens.refreshToken,
        expiresIn: authResponse.tokens.expiresIn.toString(),
      });

      res.redirect(`${frontendCallbackUrl}?${params.toString()}`);
    } catch (error) {
      await this.logAuthEvent(
        req,
        {
          eventType: AuthAuditEventType.OAUTH_FACEBOOK,
          success: false,
          email: facebookProfile?.email,
          failureReason:
            error instanceof Error ? error.message : 'Unknown error',
        },
        deviceInfo,
      );
      throw error;
    }
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
    const deviceInfo = this.getDeviceInfo(req);
    const currentUser = req.user as { id?: string; email?: string };

    try {
      const authResponse = await this.authService.refreshTokens(refreshToken);

      await this.logAuthEvent(
        req,
        {
          eventType: AuthAuditEventType.TOKEN_REFRESH,
          success: true,
          userId: currentUser?.id,
          email: currentUser?.email,
          sessionId: authResponse.sessionId,
        },
        deviceInfo,
      );

      return authResponse;
    } catch (error) {
      await this.logAuthEvent(
        req,
        {
          eventType: AuthAuditEventType.TOKEN_REFRESH,
          success: false,
          userId: currentUser?.id,
          email: currentUser?.email,
          failureReason:
            error instanceof Error ? error.message : 'Unknown error',
        },
        deviceInfo,
      );
      throw error;
    }
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
    @Req() req?: Request,
  ): Promise<{ message: string }> {
    const deviceInfo = req ? this.getDeviceInfo(req) : undefined;

    try {
      await this.authService.logout(userId, body?.refreshToken);
      if (req) {
        await this.logAuthEvent(
          req,
          {
            eventType: AuthAuditEventType.LOGOUT,
            success: true,
            userId,
            metadata: { hasRefreshToken: !!body?.refreshToken },
          },
          deviceInfo,
        );
      }
      return { message: 'Logged out successfully' };
    } catch (error) {
      if (req) {
        await this.logAuthEvent(
          req,
          {
            eventType: AuthAuditEventType.LOGOUT,
            success: false,
            userId,
            failureReason:
              error instanceof Error ? error.message : 'Unknown error',
          },
          deviceInfo,
        );
      }
      throw error;
    }
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
    @Req() req?: Request,
  ): Promise<{ message: string; revokedCount: number }> {
    const deviceInfo = req ? this.getDeviceInfo(req) : undefined;

    try {
      const { revokedCount } = await this.authService.revokeAllSessions(
        userId,
        body?.currentSessionId,
      );
      if (req) {
        await this.logAuthEvent(
          req,
          {
            eventType: AuthAuditEventType.LOGOUT_ALL,
            success: true,
            userId,
            metadata: {
              revokedCount,
              currentSessionId: body?.currentSessionId,
            },
          },
          deviceInfo,
        );
      }
      return {
        message: `Logged out from ${revokedCount} device(s)`,
        revokedCount,
      };
    } catch (error) {
      if (req) {
        await this.logAuthEvent(
          req,
          {
            eventType: AuthAuditEventType.LOGOUT_ALL,
            success: false,
            userId,
            failureReason:
              error instanceof Error ? error.message : 'Unknown error',
          },
          deviceInfo,
        );
      }
      throw error;
    }
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
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const deviceInfo = this.getDeviceInfo(req);

    try {
      const result = await this.authService.verifyEmail(verifyEmailDto);
      await this.logAuthEvent(
        req,
        {
          eventType: AuthAuditEventType.EMAIL_VERIFY,
          success: true,
          metadata: { tokenProvided: !!verifyEmailDto?.token },
        },
        deviceInfo,
      );
      return result;
    } catch (error) {
      await this.logAuthEvent(
        req,
        {
          eventType: AuthAuditEventType.EMAIL_VERIFY,
          success: false,
          metadata: { tokenProvided: !!verifyEmailDto?.token },
          failureReason:
            error instanceof Error ? error.message : 'Unknown error',
        },
        deviceInfo,
      );
      throw error;
    }
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
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const deviceInfo = this.getDeviceInfo(req);

    try {
      const result = await this.authService.resendVerificationEmail(
        resendDto.email,
      );
      await this.logAuthEvent(
        req,
        {
          eventType: AuthAuditEventType.EMAIL_VERIFY_RESEND,
          success: true,
          email: resendDto.email,
        },
        deviceInfo,
      );
      return result;
    } catch (error) {
      await this.logAuthEvent(
        req,
        {
          eventType: AuthAuditEventType.EMAIL_VERIFY_RESEND,
          success: false,
          email: resendDto.email,
          failureReason:
            error instanceof Error ? error.message : 'Unknown error',
        },
        deviceInfo,
      );
      throw error;
    }
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
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const deviceInfo = this.getDeviceInfo(req);

    try {
      const result = await this.authService.forgotPassword(forgotPasswordDto);
      await this.logAuthEvent(
        req,
        {
          eventType: AuthAuditEventType.PASSWORD_RESET_REQUEST,
          success: true,
          email: forgotPasswordDto.email,
        },
        deviceInfo,
      );
      return result;
    } catch (error) {
      await this.logAuthEvent(
        req,
        {
          eventType: AuthAuditEventType.PASSWORD_RESET_REQUEST,
          success: false,
          email: forgotPasswordDto.email,
          failureReason:
            error instanceof Error ? error.message : 'Unknown error',
        },
        deviceInfo,
      );
      throw error;
    }
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
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const deviceInfo = this.getDeviceInfo(req);

    try {
      const result = await this.authService.resetPassword(resetPasswordDto);
      await this.logAuthEvent(
        req,
        {
          eventType: AuthAuditEventType.PASSWORD_RESET,
          success: true,
          metadata: { tokenProvided: !!resetPasswordDto?.token },
        },
        deviceInfo,
      );
      return result;
    } catch (error) {
      await this.logAuthEvent(
        req,
        {
          eventType: AuthAuditEventType.PASSWORD_RESET,
          success: false,
          metadata: { tokenProvided: !!resetPasswordDto?.token },
          failureReason:
            error instanceof Error ? error.message : 'Unknown error',
        },
        deviceInfo,
      );
      throw error;
    }
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
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const deviceInfo = this.getDeviceInfo(req);

    try {
      const result = await this.authService.changePassword(
        userId,
        changePasswordDto,
      );
      await this.logAuthEvent(
        req,
        {
          eventType: AuthAuditEventType.PASSWORD_CHANGE,
          success: true,
          userId,
        },
        deviceInfo,
      );
      return result;
    } catch (error) {
      await this.logAuthEvent(
        req,
        {
          eventType: AuthAuditEventType.PASSWORD_CHANGE,
          success: false,
          userId,
          failureReason:
            error instanceof Error ? error.message : 'Unknown error',
        },
        deviceInfo,
      );
      throw error;
    }
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
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const deviceInfo = this.getDeviceInfo(req);

    try {
      await this.authService.revokeSession(userId, sessionId);
      await this.logAuthEvent(
        req,
        {
          eventType: AuthAuditEventType.SESSION_REVOKE,
          success: true,
          userId,
          sessionId,
        },
        deviceInfo,
      );
      return { message: 'Session revoked successfully' };
    } catch (error) {
      await this.logAuthEvent(
        req,
        {
          eventType: AuthAuditEventType.SESSION_REVOKE,
          success: false,
          userId,
          sessionId,
          failureReason:
            error instanceof Error ? error.message : 'Unknown error',
        },
        deviceInfo,
      );
      throw error;
    }
  }
}
