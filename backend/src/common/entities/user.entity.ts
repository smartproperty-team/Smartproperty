// ===========================================
// User Entity
// ===========================================

import { ObjectId } from 'mongodb';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ObjectIdColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  ADMIN = 'admin',
  OWNER = 'owner',
  TENANT = 'tenant',
  MANAGER = 'manager',
  AGENT = 'agent',
}

@Entity('users')
export class User {
  @ObjectIdColumn()
  _id: ObjectId;

  @Index('email_1', { unique: true })
  @Column()
  email: string;

  @Column()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.TENANT,
  })
  role: UserRole;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastLogin: Date;

  @Column({ nullable: true })
  refreshToken: string;

  @Column({ nullable: true })
  refreshTokenExpiresAt: Date;

  @Column({ nullable: true })
  passwordResetToken: string;

  @Column({ nullable: true })
  passwordResetExpires: Date;

  @Column({ nullable: true })
  emailVerificationToken: string;

  @Column({ nullable: true })
  emailVerificationExpires: Date;

  @Column({ default: 0 })
  failedLoginAttempts: number;

  @Column({ nullable: true })
  lockedUntil: Date;

  // OAuth fields
  @Column({ nullable: true })
  provider: string; // 'local', 'google', 'facebook', 'apple'

  @Column({ nullable: true })
  providerId: string; // OAuth provider user ID

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
