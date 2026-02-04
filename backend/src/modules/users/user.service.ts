// ===========================================
// User Service
// ===========================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from '../../common/entities/user-profile.entity';
import { User } from '../../common/entities/user.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
  ) {}

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { _id: userId as any },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * Get user profile by user ID
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    const profile = await this.userProfileRepository.findOne({
      where: { userId: userId as any },
    });

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    return profile;
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string,
    updateData: Partial<UserProfile>,
  ): Promise<UserProfile> {
    let profile = await this.userProfileRepository.findOne({
      where: { userId: userId as any },
    });

    if (!profile) {
      // Create new profile if it doesn't exist
      profile = this.userProfileRepository.create({
        userId,
        ...updateData,
      });
    } else {
      // Update existing profile
      Object.assign(profile, updateData);
    }

    return this.userProfileRepository.save(profile);
  }

  /**
   * Update user basic info
   */
  async updateUser(userId: string, updateData: Partial<User>): Promise<User> {
    const user = await this.getUserById(userId);

    // Prevent updating sensitive fields
    const {
      password,
      email,
      role,
      refreshToken,
      passwordResetToken,
      emailVerificationToken,
      ...safeUpdateData
    } = updateData;

    Object.assign(user, safeUpdateData);
    return this.userRepository.save(user);
  }

  /**
   * Deactivate user account
   */
  async deactivateAccount(userId: string): Promise<void> {
    const user = await this.getUserById(userId);

    await this.userRepository.update(user._id, {
      isActive: false,
      refreshToken: undefined,
    } as any);

    this.logger.log(`Account deactivated for user: ${user.email}`);
  }

  /**
   * Delete user account (hard delete)
   */
  async deleteAccount(userId: string): Promise<void> {
    const user = await this.getUserById(userId);

    // Delete user profile
    await this.userProfileRepository.delete({ userId: userId as any } as any);

    // Delete user
    await this.userRepository.delete(user._id);

    this.logger.log(`Account deleted for user: ${user.email}`);
  }

  /**
   * Get user response (without sensitive data)
   */
  getUserResponse(user: User): Partial<User> {
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
