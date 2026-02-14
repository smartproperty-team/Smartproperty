// ===========================================
// SmartProperty - Auth Audit Log Entity
// ===========================================

import { ObjectId } from 'mongodb';
import { Column, CreateDateColumn, Entity, ObjectIdColumn } from 'typeorm';

export enum AuthAuditEventType {
  REGISTER = 'register',
  LOGIN = 'login',
  LOGOUT = 'logout',
  LOGOUT_ALL = 'logout_all',
  TOKEN_REFRESH = 'token_refresh',
  EMAIL_VERIFY = 'email_verify',
  EMAIL_VERIFY_RESEND = 'email_verify_resend',
  PASSWORD_RESET_REQUEST = 'password_reset_request',
  PASSWORD_RESET = 'password_reset',
  PASSWORD_CHANGE = 'password_change',
  ACCOUNT_UPDATE = 'account_update',
  OAUTH_GOOGLE = 'oauth_google',
  OAUTH_FACEBOOK = 'oauth_facebook',
  SESSION_REVOKE = 'session_revoke',
}

@Entity('auth_audit_logs')
export class AuthAuditLog {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({
    type: 'enum',
    enum: AuthAuditEventType,
  })
  eventType!: AuthAuditEventType;

  @Column({ default: true })
  success!: boolean;

  @Column({ nullable: true })
  failureReason?: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  deviceName?: string;

  @Column({ nullable: true })
  deviceType?: string;

  @Column({ nullable: true })
  browser?: string;

  @Column({ nullable: true })
  os?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  sessionId?: string;

  @Column('simple-json', { nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  get id(): string {
    return this._id.toHexString();
  }
}
