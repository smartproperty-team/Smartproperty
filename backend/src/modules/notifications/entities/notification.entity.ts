// ===========================================
// SmartProperty - Notification Entity
// ===========================================

import { ObjectId } from 'mongodb';
import {
  Column,
  CreateDateColumn,
  Entity,
  ObjectIdColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum NotificationType {
  VERIFICATION_APPROVED = 'verification_approved',
  VERIFICATION_REJECTED = 'verification_rejected',
  APPLICATION_SUBMITTED = 'application_submitted',
  APPLICATION_STATUS_CHANGED = 'application_status_changed',
  APPLICATION_DOCUMENT_REQUESTED = 'application_document_requested',
  APPLICATION_DEADLINE_REMINDER = 'application_deadline_reminder',
  LEASE_CREATED = 'lease_created',
  LEASE_STATUS_CHANGED = 'lease_status_changed',
  LEASE_DOCUMENT_UPLOADED = 'lease_document_uploaded',
  LEASE_SIGNATURE_REQUESTED = 'lease_signature_requested',
  LEASE_SIGNATURE_COMPLETED = 'lease_signature_completed',
  LEASE_ACTIVATED = 'lease_activated',
  LEASE_RENEWAL_REMINDER = 'lease_renewal_reminder',
  LEASE_RENEWED = 'lease_renewed',
  LEASE_TERMINATED = 'lease_terminated',
  MAINTENANCE_REQUEST_SUBMITTED = 'maintenance_request_submitted',
  MAINTENANCE_ASSIGNED = 'maintenance_assigned',
  MAINTENANCE_STATUS_CHANGED = 'maintenance_status_changed',
  MAINTENANCE_COMPLETED = 'maintenance_completed',
  SYSTEM = 'system',
  INFO = 'info',
}

@Entity('notifications')
export class Notification {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  userId: string;

  @Column()
  title: string;

  @Column()
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.INFO,
  })
  type: NotificationType;

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  link?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
