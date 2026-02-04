// ===========================================
// Auth Service
// ===========================================

import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';

import { User, UserRole } from '../../common/entities/user.entity';
import { MailService } from '../mail/mail.service';
import {
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dtos';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly maxLoginAttempts = 5;
  private readonly lockoutTime = 15 * 60 * 1000; // 15 minutes in milliseconds

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Register a new user
   */
  async register(
    registerDto: RegisterDto,
  ): Promise<{ user: Partial<User>; tokens: any }> {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findOne({
        where: { email: registerDto.email.toLowerCase() },
      });

      if (existingUser) {
        throw new ConflictException('Email already registered');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(registerDto.password, 10);

      // Create new user
      const newUser = this.userRepository.create({
        email: registerDto.email.toLowerCase(),
        password: hashedPassword,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        phone: registerDto.phone,
        role: registerDto.role || UserRole.TENANT,
        isEmailVerified: false,
        isActive: true,
      });

      const savedUser = await this.userRepository.save(newUser);
      this.logger.log(`User registered: ${savedUser.email}`);

      // Generate email verification token
      const emailToken = this.generateToken(24);
      const emailTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await this.userRepository.update(savedUser._id, {
        emailVerificationToken: await bcrypt.hash(emailToken, 10),
        emailVerificationExpires: emailTokenExpiry,
      });

      // Send verification email
      try {
        await this.mailService.sendWelcomeEmail(savedUser.email, {
          firstName: savedUser.firstName,
          verificationLink: `${this.configService.get('app.frontendUrl')}/verify-email?token=${emailToken}`,
        });
      } catch (error) {
        this.logger.error('Failed to send welcome email', error);
        // Don't fail registration if email fails
      }

      // Generate tokens
      const tokens = await this.generateTokens(savedUser);

      return {
        user: this.getUserResponse(savedUser),
        tokens,
      };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Registration error', error);
      throw new InternalServerErrorException('Registration failed');
    }
  }

  /**
   * Login user
   */
  async login(
    loginDto: LoginDto,
  ): Promise<{ user: Partial<User>; tokens: any }> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        'Account is locked due to too many failed login attempts',
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Increment failed attempts
      const newAttempts = (user.failedLoginAttempts || 0) + 1;
      const updateData: any = { failedLoginAttempts: newAttempts };

      // Lock account if max attempts reached
      if (newAttempts >= this.maxLoginAttempts) {
        updateData.lockedUntil = new Date(Date.now() + this.lockoutTime);
      }

      await this.userRepository.update(user._id, updateData);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Reset failed attempts
    await this.userRepository.update(user._id, {
      failedLoginAttempts: 0,
      lockedUntil: undefined,
      lastLogin: new Date(),
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    this.logger.log(`User logged in: ${user.email}`);

    return {
      user: this.getUserResponse(user),
      tokens,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<any> {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      // Find user
      const user = await this.userRepository.findOne({
        where: { _id: payload.sub },
      });

      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if refresh token has expired
      if (
        user.refreshTokenExpiresAt &&
        user.refreshTokenExpiresAt < new Date()
      ) {
        throw new UnauthorizedException('Refresh token has expired');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      return tokens;
    } catch (error) {
      this.logger.error('Token refresh error', error);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Logout user (invalidate refresh token)
   */
  async logout(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      refreshToken: undefined,
      refreshTokenExpiresAt: undefined,
    } as any);
    this.logger.log(`User logged out: ${userId}`);
  }

  /**
   * Change password (authenticated user)
   */
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { _id: userId as any },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.oldPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    await this.userRepository.update(user._id, {
      password: hashedPassword,
    });

    this.logger.log(`Password changed for user: ${user.email}`);
  }

  /**
   * Send password reset email
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    // Always return success for security
    if (!user) {
      return;
    }

    // Generate reset token
    const resetToken = this.generateToken(32);
    const hashedToken = await bcrypt.hash(resetToken, 10);
    const resetExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await this.userRepository.update(user._id, {
      passwordResetToken: hashedToken,
      passwordResetExpires: resetExpiry,
    });

    try {
      await this.mailService.sendPasswordResetEmail(user.email, {
        firstName: user.firstName,
        resetLink: `${this.configService.get('app.frontendUrl')}/reset-password?token=${resetToken}`,
      });
      this.logger.log(`Password reset email sent to: ${user.email}`);
    } catch (error) {
      this.logger.error('Failed to send password reset email', error);
      // Don't fail the request if email fails
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token, newPassword } = resetPasswordDto;

    // Find user with reset token
    const users = await this.userRepository.find();
    let user: User | null = null;

    for (const u of users) {
      if (
        u.passwordResetToken &&
        u.passwordResetExpires &&
        u.passwordResetExpires > new Date()
      ) {
        const isTokenValid = await bcrypt.compare(token, u.passwordResetToken);
        if (isTokenValid) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.userRepository.update(user._id, {
      password: hashedPassword,
      passwordResetToken: undefined,
      passwordResetExpires: undefined,
    } as any);

    this.logger.log(`Password reset for user: ${user.email}`);
  }

  /**
   * Verify email using token
   */
  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<void> {
    const { token } = verifyEmailDto;

    // Find user with verification token
    const users = await this.userRepository.find();
    let user: User | null = null;

    for (const u of users) {
      if (
        u.emailVerificationToken &&
        u.emailVerificationExpires &&
        u.emailVerificationExpires > new Date()
      ) {
        const isTokenValid = await bcrypt.compare(
          token,
          u.emailVerificationToken,
        );
        if (isTokenValid) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.userRepository.update(user._id, {
      isEmailVerified: true,
      emailVerificationToken: undefined,
      emailVerificationExpires: undefined,
    } as any);

    this.logger.log(`Email verified for user: ${user.email}`);
  }

  /**
   * Generate JWT tokens (access and refresh)
   */
  private async generateTokens(user: User): Promise<any> {
    const payload: any = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessTokenExpiresIn =
      this.configService.get<string>('jwt.expiresIn') || '1d';
    const refreshTokenExpiresIn =
      this.configService.get<string>('jwt.refreshExpiresIn') || '7d';

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: accessTokenExpiresIn as any,
    } as any);

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: refreshTokenExpiresIn as any,
    } as any);

    // Calculate refresh token expiry
    const refreshTokenExpiryMs = this.parseExpirationTime(
      refreshTokenExpiresIn,
    );
    const refreshTokenExpiresAt = new Date(Date.now() + refreshTokenExpiryMs);

    // Save refresh token to database
    await this.userRepository.update(user._id, {
      refreshToken,
      refreshTokenExpiresAt,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpirationTime(accessTokenExpiresIn) / 1000,
    };
  }

  /**
   * OAuth Login (Google/Facebook/Apple)
   */
  async oauthLogin(
    oauthUser: any,
  ): Promise<{ user: Partial<User>; tokens: any }> {
    try {
      // Check if user exists by provider
      let user = await this.userRepository.findOne({
        where: {
          provider: oauthUser.provider,
          providerId: oauthUser.providerId,
        },
      });

      // If not found, check by email
      if (!user && oauthUser.email) {
        user = await this.userRepository.findOne({
          where: { email: oauthUser.email.toLowerCase() },
        });

        // If user exists with email, link OAuth account
        if (user) {
          user.provider = oauthUser.provider;
          user.providerId = oauthUser.providerId;
          if (oauthUser.avatar && !user.avatar) {
            user.avatar = oauthUser.avatar;
          }
          user = await this.userRepository.save(user);
        }
      }

      // Create new user if doesn't exist
      if (!user) {
        const newUser = this.userRepository.create({
          email: oauthUser.email?.toLowerCase(),
          firstName: oauthUser.firstName,
          lastName: oauthUser.lastName,
          avatar: oauthUser.avatar,
          provider: oauthUser.provider,
          providerId: oauthUser.providerId,
          password: await bcrypt.hash(randomBytes(32).toString('hex'), 10), // Random password
          isEmailVerified: true, // OAuth emails are pre-verified
          isActive: true,
          role: UserRole.TENANT,
        });
        user = await this.userRepository.save(newUser);
        this.logger.log(
          `New OAuth user created: ${user.email} via ${oauthUser.provider}`,
        );
      }

      // Update last login
      await this.userRepository.update(user._id, {
        lastLogin: new Date(),
      });

      // Generate tokens
      const tokens = await this.generateTokens(user);

      this.logger.log(`OAuth login: ${user.email} via ${oauthUser.provider}`);

      return {
        user: this.getUserResponse(user),
        tokens,
      };
    } catch (error) {
      this.logger.error('OAuth login error', error);
      throw new InternalServerErrorException('OAuth login failed');
    }
  }

  /**
   * Generate random token
   */
  private generateToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Parse JWT expiration time string to milliseconds
   */
  private parseExpirationTime(expiresIn: string): number {
    const units: Record<string, number> = {
      d: 24 * 60 * 60 * 1000,
      h: 60 * 60 * 1000,
      m: 60 * 1000,
      s: 1000,
    };

    const match = expiresIn.match(/(\d+)([dhms])/);
    if (!match) return 24 * 60 * 60 * 1000; // Default 1 day

    const [, value, unit] = match;
    return parseInt(value) * (units[unit] || 1000);
  }

  /**
   * Get user response (without sensitive data)
   */
  private getUserResponse(user: User): Partial<User> {
    const {
      password,
      refreshToken,
      passwordResetToken,
      emailVerificationToken,
      ...safeUser
    } = user;
    return safeUser;
  }
}
