// ===========================================
// SmartProperty - User Entity
// ===========================================

import * as bcrypt from 'bcrypt';
import { Exclude } from 'class-transformer';
import { ObjectId } from 'mongodb';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  ObjectIdColumn,
  UpdateDateColumn,
} from 'typeorm';

// ===========================================
// Enums
// ===========================================

export enum UserRole {
  ADMIN = 'admin',
  OWNER = 'owner',
  TENANT = 'tenant',
  MANAGER = 'manager',
  AGENT = 'agent',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
}

// ===========================================
// User Entity
// ===========================================

@Entity('users')
export class User {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  @Exclude()
  password?: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.TENANT,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING_VERIFICATION,
  })
  status: UserStatus;

  // OAuth Provider fields
  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  authProvider: AuthProvider;

  @Column({ nullable: true })
  @Exclude()
  googleId?: string;

  @Column({ nullable: true })
  @Exclude()
  facebookId?: string;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true })
  @Exclude()
  emailVerificationToken?: string;

  @Column({ nullable: true })
  emailVerificationExpires?: Date;

  @Column({ nullable: true })
  @Exclude()
  passwordResetToken?: string;

  @Column({ nullable: true })
  passwordResetExpires?: Date;

  @Column({ nullable: true })
  @Exclude()
  refreshToken?: string;

  @Column({ nullable: true })
  lastLogin?: Date;

  @Column({ default: 0 })
  loginAttempts: number;

  @Column({ nullable: true })
  lockUntil?: Date;

  @Column('simple-array', { nullable: true })
  @Exclude()
  previousPasswords?: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  deletedAt?: Date;

  // Address information
  @Column('simple-json', { nullable: true })
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };

  // User preferences
  @Column('simple-json', { nullable: true })
  preferences?: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    smsNotifications?: boolean;
    language?: string;
    timezone?: string;
  };

  // ===========================================
  // Virtual Properties
  // ===========================================

  get id(): string {
    return this._id.toHexString();
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get isLocked(): boolean {
    return !!(this.lockUntil && this.lockUntil > new Date());
  }

  // ===========================================
  // Lifecycle Hooks
  // ===========================================

  @BeforeInsert()
  async hashPasswordBeforeInsert() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  // ===========================================
  // Instance Methods
  // ===========================================

  async validatePassword(password: string): Promise<boolean> {
    if (!this.password) {
      return false;
    }
    return bcrypt.compare(password, this.password);
  }

  async setPassword(password: string): Promise<void> {
    this.password = await bcrypt.hash(password, 12);
  }

  incrementLoginAttempts(): void {
    // Reset attempts if lock has expired
    if (this.lockUntil && this.lockUntil < new Date()) {
      this.loginAttempts = 1;
      this.lockUntil = undefined;
    } else {
      this.loginAttempts += 1;

      // Lock account after 5 failed attempts
      if (this.loginAttempts >= 5) {
        // Lock for 15 minutes
        this.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
    }
  }

  resetLoginAttempts(): void {
    this.loginAttempts = 0;
    this.lockUntil = undefined;
    this.lastLogin = new Date();
  }

  // ===========================================
  // Serialization
  // ===========================================

  toJSON() {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.fullName,
      phone: this.phone,
      avatar: this.avatar,
      role: this.role,
      status: this.status,
      authProvider: this.authProvider,
      isEmailVerified: this.isEmailVerified,
      lastLogin: this.lastLogin,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
