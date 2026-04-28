// ===========================================
// SmartProperty - Payment Entity
// ===========================================
//
// CURRENCY: All amounts stored in MILLIMES (TND × 1000)
// - Avoids float precision issues
// - 1 TND = 1000 millimes
// - Use: tndToMillimes() and millimesToTnd() from currency.constants
//
// AUDIT TRAIL: Tracks who did what, when, and why
// - createdBy/updatedBy: Which user made changes
// - ipAddress/userAgent: From where (fraud detection)
// - refundedBy/refundReason: Complete refund history
//
// ===================================================

import { ObjectId } from 'mongodb';
import {
  Column,
  CreateDateColumn,
  Entity,
  ObjectIdColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PaymentType {
  RENT = 'rent',
  DEPOSIT = 'deposit',
  UTILITY = 'utility',
  LATE_FEE = 'late_fee',
  MAINTENANCE = 'maintenance',
  COMMISSION = 'commission',
  OTHER = 'other',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  DISPUTED = 'disputed',
}

export enum PaymentMethod {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  WALLET = 'wallet',
  DIGITAL_WALLET = 'digital_wallet',
  BNPL = 'buy_now_pay_later',
  OTHER = 'other',
}

// Improvements:
// 1. Idempotency key to prevent duplicate charges
// 2. Stripe integration IDs for tracking
// 3. Soft delete support (deletedAt)
// 4. Comprehensive audit trail
// 5. Retry mechanism for failed payments

@Entity('payments')
export class Payment {
  @ObjectIdColumn()
  _id?: ObjectId;

  @Column()
  id?: string;

  // ─────────────────────────────────────────────────────────
  // Relationship Fields
  // ─────────────────────────────────────────────────────────

  @Column()
  leaseId: ObjectId | string = '';

  @Column()
  tenantId: ObjectId | string = '';

  @Column()
  ownerId: ObjectId | string = '';

  @Column()
  agencyId?: ObjectId | string;

  // ─────────────────────────────────────────────────────────
  // Payment Details
  // ─────────────────────────────────────────────────────────

  @Column()
  amount: number = 0; // In millimes (TND × 1000 to avoid float precision)

  @Column()
  currency: string = 'TND'; // Default: Tunisian Dinar

  @Column()
  type: PaymentType = PaymentType.OTHER;

  @Column()
  status: PaymentStatus = PaymentStatus.PENDING;

  @Column()
  method: PaymentMethod = PaymentMethod.OTHER;

  @Column()
  description?: string;

  @Column()
  invoiceId?: string;

  // ─────────────────────────────────────────────────────────
  // Stripe Integration
  // ─────────────────────────────────────────────────────────

  @Column()
  stripePaymentIntentId?: string; // Payment Intent ID

  @Column()
  stripeCustomerId?: string; // Stripe Customer ID

  @Column()
  transactionId?: string; // Charge ID or transaction reference

  @Column()
  gatewayRefId?: string; // For reconciliation

  @Column()
  gatewayResponse?: Record<string, any>; // Store raw response

  // ─────────────────────────────────────────────────────────
  // Idempotency & Deduplication (IMPROVEMENT #1)
  // ─────────────────────────────────────────────────────────

  @Column()
  idempotencyKey?: string; // Prevent duplicate charges

  // ─────────────────────────────────────────────────────────
  // Timestamps & Due Dates
  // ─────────────────────────────────────────────────────────

  @Column()
  dueDate: Date = new Date();

  @Column()
  paidAt?: Date;

  @Column()
  scheduledFor?: Date; // For scheduled/recurring payments

  // ─────────────────────────────────────────────────────────
  // Financial Breakdown
  // ─────────────────────────────────────────────────────────

  @Column()
  fee?: number; // Processing fee in millimes (TND × 1000)

  @Column()
  feeType?: string; // 'platform_fee' | 'gateway_fee'

  @Column()
  netAmount?: number; // amount - fees (in millimes)

  // ─────────────────────────────────────────────────────────
  // Failure Handling (IMPROVEMENT #2)
  // ─────────────────────────────────────────────────────────

  @Column()
  failureReason?: string;

  @Column()
  failureCount: number = 0; // Retry attempts

  @Column()
  lastFailedAt?: Date;

  @Column()
  nextRetryAt?: Date; // Exponential backoff

  // ─────────────────────────────────────────────────────────
  // Audit Trail (IMPROVEMENT #3)
  // Who made changes? From where? Why?
  // Used for: Compliance, Security, Debugging, Accountability
  // ─────────────────────────────────────────────────────────

  @Column()
  createdBy: ObjectId | string = ''; // USER: Who created this payment?

  @Column()
  updatedBy?: ObjectId | string; // USER: Who last updated it?

  @Column()
  ipAddress?: string; // LOCATION: What IP created/updated it? (fraud detection)

  @Column()
  userAgent?: string; // DEVICE: What browser/device? (fraud detection)

  @Column()
  refundedAmount?: number; // Amount refunded in millimes (TND × 1000)

  @Column()
  refundedAt?: Date; // When was it refunded?

  @Column()
  refundedBy?: ObjectId | string; // USER: Who authorized the refund?

  @Column()
  refundReason?: string; // WHY: Reason for refund (required for accountability)

  // ─────────────────────────────────────────────────────────
  // Timestamps
  // ─────────────────────────────────────────────────────────

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;

  @Column()
  deletedAt?: Date; // Soft delete for compliance
}

// ─────────────────────────────────────────────────────────
// MongoDB Indexes for Performance
// ─────────────────────────────────────────────────────────

/*
db.payments.createIndex({ tenantId: 1, createdAt: -1 })
db.payments.createIndex({ ownerId: 1, createdAt: -1 })
db.payments.createIndex({ leaseId: 1, createdAt: -1 })
db.payments.createIndex({ status: 1, dueDate: 1 })
db.payments.createIndex({ transactionId: 1 })
db.payments.createIndex({ idempotencyKey: 1 })
db.payments.createIndex({ stripePaymentIntentId: 1 })
db.payments.createIndex({ nextRetryAt: 1, status: 1 })
db.payments.createIndex({ createdAt: -1 })
*/
