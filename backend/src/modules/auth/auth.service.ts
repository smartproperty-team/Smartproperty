// ===========================================
// SmartProperty - Auth Service
// ===========================================
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { MailerService } from '@nestjs-modules/mailer';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { ObjectId } from 'mongodb';
import { Repository } from 'typeorm';

import {
  AuthProvider,
  User,
  UserRole,
  UserStatus,
} from '../users/entities/user.entity';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  RequestEmailChangeDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/auth.dto';
import { Session } from './entities/session.entity';
import { DeviceInfo, SessionService } from './session.service';
import { FacebookProfile } from './strategies/facebook.strategy';
import { GoogleProfile } from './strategies/google.strategy';

// ===========================================
// Types
// ===========================================

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: Partial<User>;
  tokens: AuthTokens;
  sessionId?: string;
}

// ===========================================
// Auth Service
// ===========================================

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
    private readonly sessionService: SessionService,
  ) {}

  private async verifyRecaptcha(
    token?: string,
    ipAddress?: string,
  ): Promise<void> {
    const secretKey = this.configService.get<string>('recaptcha.secretKey');

    if (!secretKey) {
      return;
    }

    if (!token) {
      throw new BadRequestException('CAPTCHA token is required');
    }

    const verifyUrl =
      this.configService.get<string>('recaptcha.verifyUrl') ||
      'https://www.google.com/recaptcha/api/siteverify';

    const params = new URLSearchParams();
    params.append('secret', secretKey);
    params.append('response', token);
    if (ipAddress) {
      params.append('remoteip', ipAddress);
    }

    const { data } = await axios.post<{
      success: boolean;
      challenge_ts?: string;
      hostname?: string;
      'error-codes'?: string[];
    }>(verifyUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 5000,
    });

    if (!data?.success) {
      throw new BadRequestException('CAPTCHA verification failed');
    }
  }

  // ===========================================
  // Registration
  // ===========================================

  async register(
    registerDto: RegisterDto,
    deviceInfo?: DeviceInfo,
  ): Promise<AuthResponse> {
    await this.verifyRecaptcha(registerDto.captchaToken, deviceInfo?.ipAddress);
    const {
      email,
      password,
      confirmPassword,
      firstName,
      lastName,
      phone,
      role,
    } = registerDto;

    // Validate password confirmation
    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Generate email verification token
    const emailVerificationToken = this.generateToken();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create new user
    const user = this.userRepository.create({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      phone,
      role: role || UserRole.TENANT,
      status: UserStatus.PENDING_VERIFICATION,
      isEmailVerified: false,
      emailVerificationToken,
      emailVerificationExpires,
    });

    await this.userRepository.save(user);

    // Send verification email
    await this.sendVerificationEmail(user, emailVerificationToken);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Create session for this device
    const session = await this.sessionService.createSession(
      user._id.toHexString(),
      tokens.refreshToken,
      deviceInfo || { deviceName: 'Unknown Device' },
    );

    return {
      user: user.toJSON(),
      tokens,
      sessionId: session.id,
    };
  }

  // ===========================================
  // Login
  // ===========================================

  async login(
    loginDto: LoginDto,
    deviceInfo?: DeviceInfo,
  ): Promise<AuthResponse> {
    // @Type(() => Boolean) in LoginDto ensures reactivateAccount is already boolean
    const reactivateAccount = loginDto.reactivateAccount ?? false;

    if (!reactivateAccount) {
      await this.verifyRecaptcha(loginDto.captchaToken, deviceInfo?.ipAddress);
    }

    const { email, password } = loginDto;
    const twoFactorCode = (loginDto as LoginDto & { twoFactorCode?: string })
      .twoFactorCode;

    // Find user
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Additional safety: reject if email follows the deleted account pattern
    if (
      user.email.includes('deleted-') &&
      user.email.includes('@smartproperty.local')
    ) {
      throw new UnauthorizedException(
        'This account has been permanently deleted and cannot be recovered',
      );
    }

    // Check if account is permanently deleted BEFORE password validation
    // This prevents timing attacks and improves security
    // Check both the flag and defensive markers (deletedAt + no password)
    if (user.permanentlyDeleted || (user.deletedAt && !user.password)) {
      throw new UnauthorizedException(
        'This account has been permanently deleted and cannot be recovered',
      );
    }

    // Check if account is locked
    if (user.isLocked) {
      const lockTime = Math.ceil(
        (user.lockUntil!.getTime() - Date.now()) / 60000,
      );
      throw new UnauthorizedException(
        `Account is locked. Try again in ${lockTime} minutes`,
      );
    }

    // Validate password
    const isPasswordValid = await user.validatePassword(password);

    if (!isPasswordValid) {
      // Increment login attempts
      user.incrementLoginAttempts();
      await this.userRepository.save(user);

      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if account is suspended
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account is suspended');
    }

    // Check if account is inactive and user is not trying to reactivate
    if (user.status === UserStatus.INACTIVE && !reactivateAccount) {
      throw new UnauthorizedException(
        'Account is inactive. Please reactivate your account to proceed.',
      );
    }

    const shouldReactivate =
      user.status === UserStatus.INACTIVE && reactivateAccount;

    // Check if 2FA is enabled
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!twoFactorCode) {
        // Return a special response indicating 2FA is required
        throw new UnauthorizedException(
          'Two-factor authentication code required',
        );
      }

      // Verify 2FA code
      const isValid = this.verifyTwoFactorCode(
        user.twoFactorSecret,
        twoFactorCode,
      );

      if (!isValid) {
        throw new UnauthorizedException(
          'Invalid two-factor authentication code',
        );
      }
    }

    if (shouldReactivate) {
      user.status = user.isEmailVerified
        ? UserStatus.ACTIVE
        : UserStatus.PENDING_VERIFICATION;
      user.deletedAt = undefined;
    }

    // Reset login attempts on successful login
    user.resetLoginAttempts();
    await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Create session for this device
    const session = await this.sessionService.createSession(
      user._id.toHexString(),
      tokens.refreshToken,
      deviceInfo || { deviceName: 'Unknown Device' },
    );

    return {
      user: user.toJSON(),
      tokens,
      sessionId: session.id,
    };
  }

  // ===========================================
  // Token Refresh
  // ===========================================

  async refreshTokens(
    refreshToken: string,
  ): Promise<AuthTokens & { sessionId?: string }> {
    try {
      // Verify refresh token JWT
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      // Find user
      const user = await this.userRepository.findOne({
        where: { _id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Validate session
      const session = await this.sessionService.validateSession(
        user._id.toHexString(),
        refreshToken,
      );

      if (!session) {
        throw new UnauthorizedException('Invalid or expired session');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Update session with new refresh token
      await this.sessionService.updateSessionToken(
        session.id,
        tokens.refreshToken,
      );

      return {
        ...tokens,
        sessionId: session.id,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ===========================================
  // Logout
  // ===========================================

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Revoke specific session
      await this.sessionService.revokeSessionByToken(userId, refreshToken);
    } else {
      // Revoke all sessions for the user
      await this.sessionService.revokeAllSessions(userId);
    }
  }

  // ===========================================
  // Session Management
  // ===========================================

  async getSessions(userId: string): Promise<Session[]> {
    return this.sessionService.getUserSessions(userId);
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    return this.sessionService.revokeSession(userId, sessionId);
  }

  async revokeAllSessions(
    userId: string,
    currentSessionId?: string,
  ): Promise<{ revokedCount: number }> {
    const revokedCount = await this.sessionService.revokeAllSessions(
      userId,
      currentSessionId,
    );
    return { revokedCount };
  }

  // ===========================================
  // Email Verification
  // ===========================================

  async verifyEmail(
    verifyEmailDto: VerifyEmailDto,
  ): Promise<{ message: string }> {
    const { token } = verifyEmailDto;

    const user = await this.userRepository.findOne({
      where: {
        emailVerificationToken: token,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    if (
      user.emailVerificationExpires &&
      user.emailVerificationExpires < new Date()
    ) {
      throw new BadRequestException('Verification token has expired');
    }

    if (user.pendingEmail) {
      const normalizedPendingEmail = user.pendingEmail.toLowerCase();
      const existingUser = await this.userRepository.findOne({
        where: { email: normalizedPendingEmail },
      });

      if (
        existingUser &&
        existingUser._id.toHexString() !== user._id.toHexString()
      ) {
        throw new ConflictException('Email already registered');
      }

      user.email = normalizedPendingEmail;
      user.pendingEmail = undefined;
    }

    // Update user
    user.isEmailVerified = true;
    user.status = UserStatus.ACTIVE;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await this.userRepository.save(user);

    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const logger = new Logger(AuthService.name);
    logger.log(`resendVerificationEmail called for: ${email}`);

    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    logger.log(
      `user found: ${!!user}` +
        (user ? `, isEmailVerified=${user.isEmailVerified}` : ''),
    );

    if (!user) {
      // Don't reveal if email exists
      return {
        message: 'If the email exists, a verification email has been sent',
      };
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new token
    const emailVerificationToken = this.generateToken();
    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.userRepository.save(user);

    // Send verification email
    await this.sendVerificationEmail(user, emailVerificationToken);

    return { message: 'Verification email sent' };
  }

  async requestEmailChange(
    userId: string,
    requestEmailChangeDto: RequestEmailChangeDto,
  ): Promise<{ message: string }> {
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(userId);
    } catch {
      throw new NotFoundException('User not found');
    }

    const user = await this.userRepository.findOne({
      where: { _id: objectId as any },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const normalizedNewEmail = requestEmailChangeDto.newEmail
      .toLowerCase()
      .trim();
    if (normalizedNewEmail === user.email.toLowerCase()) {
      throw new BadRequestException(
        'New email must be different from current email',
      );
    }

    const existingUser = await this.userRepository.findOne({
      where: { email: normalizedNewEmail },
    });

    if (
      existingUser &&
      existingUser._id.toHexString() !== user._id.toHexString()
    ) {
      throw new ConflictException('Email already registered');
    }

    const emailVerificationToken = this.generateToken();
    user.pendingEmail = normalizedNewEmail;
    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.userRepository.save(user);

    await this.sendVerificationEmail(user, emailVerificationToken, {
      toEmail: normalizedNewEmail,
      subject: 'SmartProperty - Confirm your new email address',
    });

    return {
      message:
        'Verification link sent to your new email address. Please verify to complete the email change.',
    };
  }

  // ===========================================
  // Password Reset
  // ===========================================

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    // Don't reveal if email exists
    if (!user) {
      return {
        message: 'If the email exists, a password reset link has been sent',
      };
    }

    // Generate reset token
    const resetToken = this.generateToken();
    user.passwordResetToken = await bcrypt.hash(resetToken, 10);
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.userRepository.save(user);

    // Send password reset email
    await this.sendPasswordResetEmail(user, resetToken);

    return {
      message: 'If the email exists, a password reset link has been sent',
    };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const { token, password, confirmPassword } = resetPasswordDto;

    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Find user with valid reset token
    const users = await this.userRepository.find({
      where: {
        passwordResetExpires: { $gt: new Date() } as any,
      },
    });

    // Find user with matching token
    let targetUser: User | null = null;
    for (const user of users) {
      if (user.passwordResetToken) {
        const isTokenValid = await bcrypt.compare(
          token,
          user.passwordResetToken,
        );
        if (isTokenValid) {
          targetUser = user;
          break;
        }
      }
    }

    if (!targetUser) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check password history (prevent reuse of last 5 passwords)
    if (
      targetUser.previousPasswords &&
      targetUser.previousPasswords.length > 0
    ) {
      for (const prevPassword of targetUser.previousPasswords) {
        const isReused = await bcrypt.compare(password, prevPassword);
        if (isReused) {
          throw new BadRequestException(
            'Cannot reuse a recent password. Please choose a different password.',
          );
        }
      }
    }

    // Update password
    await targetUser.setPassword(password);

    // Store in password history
    const previousPasswords = targetUser.previousPasswords || [];
    if (targetUser.password) {
      previousPasswords.unshift(targetUser.password);
    }
    targetUser.previousPasswords = previousPasswords.slice(0, 5); // Keep last 5

    // Clear reset token
    targetUser.passwordResetToken = undefined;
    targetUser.passwordResetExpires = undefined;

    await this.userRepository.save(targetUser);

    return { message: 'Password reset successfully' };
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const { currentPassword, newPassword, confirmPassword } = changePasswordDto;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.userRepository.findOne({
      where: { _id: userId as any },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate current password
    const isCurrentPasswordValid = await user.validatePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Check password history
    if (user.previousPasswords && user.previousPasswords.length > 0) {
      for (const prevPassword of user.previousPasswords) {
        const isReused = await bcrypt.compare(newPassword, prevPassword);
        if (isReused) {
          throw new BadRequestException(
            'Cannot reuse a recent password. Please choose a different password.',
          );
        }
      }
    }

    // Update password
    await user.setPassword(newPassword);

    // Store in password history
    const previousPasswords = user.previousPasswords || [];
    if (user.password) {
      previousPasswords.unshift(user.password);
    }
    user.previousPasswords = previousPasswords.slice(0, 5);

    await this.userRepository.save(user);

    return { message: 'Password changed successfully' };
  }

  // ===========================================
  // Helper Methods
  // ===========================================

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload = {
      sub: user._id.toHexString(),
      email: user.email,
      role: user.role,
    };

    const accessTokenExpirySeconds =
      this.configService.get<number>('jwt.expiresInSeconds') || 3600;
    const refreshTokenExpirySeconds = 7 * 24 * 60 * 60; // 7 days in seconds

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: accessTokenExpirySeconds,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: refreshTokenExpirySeconds,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTokenExpirySeconds,
    };
  }

  private async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await this.userRepository.update(
      { _id: userId as any },
      { refreshToken: hashedRefreshToken },
    );
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private async sendVerificationEmail(
    user: User,
    token: string,
    options?: {
      toEmail?: string;
      subject?: string;
    },
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('app.corsOrigin');
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;
    const recipientEmail = options?.toEmail || user.email;
    const subject =
      options?.subject || 'Welcome to SmartProperty - Verify Your Email';

    try {
      await this.mailerService.sendMail({
        to: recipientEmail,
        subject,
        template: 'verification',
        context: {
          name: user.firstName,
          verificationUrl,
        },
      });
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Don't throw - email failure shouldn't block registration
    }
  }

  private async sendPasswordResetEmail(
    user: User,
    token: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('app.corsOrigin');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'SmartProperty - Password Reset Request',
        template: 'password-reset',
        context: {
          name: user.firstName,
          resetUrl,
        },
      });
    } catch (error) {
      console.error('Failed to send password reset email:', error);
    }
  }

  // ===========================================
  // Google OAuth Login
  // ===========================================

  async googleLogin(
    googleProfile: GoogleProfile,
    deviceInfo?: DeviceInfo,
  ): Promise<AuthResponse> {
    const { email, firstName, lastName, avatar, googleId } = googleProfile;

    // Validate required fields
    if (!email || !googleId) {
      throw new BadRequestException(
        'Email and Google ID are required for Google login',
      );
    }

    // Check if user exists with this Google ID
    let user = await this.userRepository.findOne({
      where: { googleId },
    });

    if (!user) {
      // Check if user exists with the same email
      user = await this.userRepository.findOne({
        where: { email: email.toLowerCase() },
      });

      if (user) {
        // Link Google account to existing user
        user.googleId = googleId;
        user.authProvider = AuthProvider.GOOGLE;
        if (!user.avatar && avatar) {
          user.avatar = avatar;
        }
        // Google accounts are pre-verified
        user.isEmailVerified = true;
        if (user.status === UserStatus.PENDING_VERIFICATION) {
          user.status = UserStatus.ACTIVE;
        }
        await this.userRepository.save(user);
      } else {
        // Create new user with Google account
        user = this.userRepository.create({
          email: email.toLowerCase(),
          firstName,
          lastName,
          avatar,
          googleId,
          authProvider: AuthProvider.GOOGLE,
          role: UserRole.TENANT,
          status: UserStatus.ACTIVE,
          isEmailVerified: true, // Google accounts are pre-verified
        });

        await this.userRepository.save(user);
      }
    }

    // Check if account is suspended
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account is suspended');
    }

    // Update last login
    user.resetLoginAttempts();
    await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Create session for this device
    const session = await this.sessionService.createSession(
      user._id.toHexString(),
      tokens.refreshToken,
      deviceInfo || { deviceName: 'Google OAuth Login' },
    );

    return {
      user: user.toJSON(),
      tokens,
      sessionId: session.id,
    };
  }

  // ===========================================
  // Facebook OAuth Login
  // ===========================================

  async facebookLogin(
    facebookProfile: FacebookProfile,
    deviceInfo?: DeviceInfo,
  ): Promise<AuthResponse> {
    const { email, firstName, lastName, avatar, facebookId } = facebookProfile;

    // Validate required fields
    if (!email || !facebookId) {
      throw new BadRequestException(
        'Email and Facebook ID are required for Facebook login',
      );
    }

    // Check if user exists with this Facebook ID
    let user = await this.userRepository.findOne({
      where: { facebookId },
    });

    if (!user) {
      // Check if user exists with the same email
      user = await this.userRepository.findOne({
        where: { email: email.toLowerCase() },
      });

      if (user) {
        // Link Facebook account to existing user
        user.facebookId = facebookId;
        user.authProvider = AuthProvider.FACEBOOK;
        if (!user.avatar && avatar) {
          user.avatar = avatar;
        }
        // Facebook accounts are pre-verified
        user.isEmailVerified = true;
        if (user.status === UserStatus.PENDING_VERIFICATION) {
          user.status = UserStatus.ACTIVE;
        }
        await this.userRepository.save(user);
      } else {
        // Create new user with Facebook account
        user = this.userRepository.create({
          email: email.toLowerCase(),
          firstName,
          lastName,
          avatar,
          facebookId,
          authProvider: AuthProvider.FACEBOOK,
          role: UserRole.TENANT,
          status: UserStatus.ACTIVE,
          isEmailVerified: true, // Facebook accounts are pre-verified
        });

        await this.userRepository.save(user);
      }
    }

    // Check if account is suspended
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account is suspended');
    }

    // Update last login
    user.resetLoginAttempts();
    await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Create session for this device
    const session = await this.sessionService.createSession(
      user._id.toHexString(),
      tokens.refreshToken,
      deviceInfo || { deviceName: 'Facebook OAuth Login' },
    );

    return {
      user: user.toJSON(),
      tokens,
      sessionId: session.id,
    };
  }

  // ===========================================
  // User Lookup (for strategies)
  // ===========================================

  async validateUser(userId: string): Promise<User | null> {
    try {
      const objectId = new ObjectId(userId);
      return this.userRepository.findOne({
        where: { _id: objectId as any },
      });
    } catch {
      // Invalid ObjectId format
      return null;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  // ===========================================
  // Two-Factor Authentication
  // ===========================================

  generateTwoFactorSecret(email: string): {
    secret: string;
    otpauthUrl: string;
    qrCode: string;
  } {
    const secret = speakeasy.generateSecret({
      name: `SmartProperty (${email})`,
      issuer: 'SmartProperty',
      length: 32,
    });

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url!,
      qrCode: '', // Will be generated separately
    };
  }

  async generateTwoFactorQRCode(otpauthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpauthUrl);
  }

  verifyTwoFactorCode(secret: string, code: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2, // Allow 2 time steps before/after for clock drift
    });
  }

  async enableTwoFactor(userId: string, code: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { _id: new ObjectId(userId) as any },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException(
        'Two-factor authentication is already enabled',
      );
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException(
        'Two-factor secret not found. Please setup 2FA first',
      );
    }

    // Verify the code
    const isValid = this.verifyTwoFactorCode(user.twoFactorSecret, code);

    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    // Enable 2FA
    user.twoFactorEnabled = true;
    await this.userRepository.save(user);

    return user;
  }

  async disableTwoFactor(userId: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { _id: new ObjectId(userId) as any },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    // Verify password
    const isPasswordValid = await user.validatePassword(password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await this.userRepository.save(user);

    return user;
  }

  async setupTwoFactor(userId: string): Promise<{
    secret: string;
    qrCode: string;
    otpauthUrl: string;
  }> {
    const user = await this.userRepository.findOne({
      where: { _id: new ObjectId(userId) as any },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException(
        'Two-factor authentication is already enabled. Disable it first to set up again.',
      );
    }

    // Generate secret
    const { secret, otpauthUrl } = this.generateTwoFactorSecret(user.email);

    // Generate QR code
    const qrCode = await this.generateTwoFactorQRCode(otpauthUrl);

    // Save secret (but don't enable yet)
    user.twoFactorSecret = secret;
    await this.userRepository.save(user);

    return {
      secret,
      qrCode,
      otpauthUrl,
    };
  }
}
