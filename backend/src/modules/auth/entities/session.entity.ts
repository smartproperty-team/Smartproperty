// ===========================================
// SmartProperty - Session Entity
// ===========================================

import { Exclude } from 'class-transformer';
import { ObjectId } from 'mongodb';
import {
  Column,
  CreateDateColumn,
  Entity,
  ObjectIdColumn,
  UpdateDateColumn,
} from 'typeorm';

// ===========================================
// Session Entity - For multiple device management
// ===========================================

@Entity('sessions')
export class Session {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  userId: string;

  @Column()
  @Exclude()
  refreshTokenHash: string;

  @Column({ nullable: true })
  deviceName?: string;

  @Column({ nullable: true })
  deviceType?: string; // 'desktop', 'mobile', 'tablet'

  @Column({ nullable: true })
  browser?: string;

  @Column({ nullable: true })
  os?: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  location?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  lastActivityAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ===========================================
  // Virtual Properties
  // ===========================================

  get id(): string {
    return this._id.toHexString();
  }

  get isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  // ===========================================
  // Serialization
  // ===========================================

  toJSON() {
    return {
      id: this.id,
      deviceName: this.deviceName,
      deviceType: this.deviceType,
      browser: this.browser,
      os: this.os,
      ipAddress: this.ipAddress,
      location: this.location,
      isActive: this.isActive,
      lastActivityAt: this.lastActivityAt,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
    };
  }
}
