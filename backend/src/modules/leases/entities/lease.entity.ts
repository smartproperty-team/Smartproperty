// ===========================================
// SmartProperty - Lease Entity
// ===========================================

import { ObjectId } from 'mongodb';
import {
  Column,
  CreateDateColumn,
  Entity,
  ObjectIdColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LeaseStatus {
  DRAFT = 'draft',
  PENDING_OWNER_APPROVAL = 'pending_owner_approval',
  PENDING_SIGNATURE = 'pending_signature',
  ACTIVE = 'active',
  RENEWAL_PENDING = 'renewal_pending',
  EXPIRED = 'expired',
  TERMINATED = 'terminated',
  REJECTED = 'rejected',
  CLOSED = 'closed',
}

export enum LeaseDocumentType {
  LEASE_AGREEMENT = 'lease_agreement',
  ADDENDUM = 'addendum',
  ENDORSEMENT = 'endorsement',
  INVENTORY = 'inventory',
  SIGNATURE_PROOF = 'signature_proof',
  OTHER = 'other',
}

export enum LeaseSignatureMethod {
  MANUAL = 'manual',
  E_SIGNATURE = 'e_signature',
  OTP = 'otp',
}

export enum LeaseInventoryPhase {
  MOVE_IN = 'move_in',
  MOVE_OUT = 'move_out',
}

export enum LeaseDepositStatus {
  HELD = 'held',
  PARTIALLY_REFUNDED = 'partially_refunded',
  REFUNDED = 'refunded',
  APPLIED = 'applied',
  FORFEITED = 'forfeited',
}

export interface LeaseDocument {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  key: string;
  url: string;
  type: LeaseDocumentType;
  description?: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface LeaseSignature {
  id: string;
  signerId: string;
  signerRole: string;
  method: LeaseSignatureMethod;
  signedAt: Date;
  note?: string;
  documentId?: string;
}

export interface LeaseStatusEvent {
  status: LeaseStatus;
  note?: string;
  changedBy: string;
  changedAt: Date;
}

export interface LeaseInventoryPhoto {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  key: string;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface LeaseInventoryRecord {
  id: string;
  phase: LeaseInventoryPhase;
  room?: string;
  item: string;
  condition: string;
  notes?: string;
  recordedBy: string;
  recordedAt: Date;
  photos: LeaseInventoryPhoto[];
}

@Entity('leases')
export class Lease {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column({ nullable: true })
  applicationId?: string;

  @Column()
  propertyId!: string;

  @Column()
  tenantId!: string;

  @Column()
  ownerId!: string;

  @Column({ nullable: true })
  managerId?: string;

  @Column({ nullable: true })
  leaseNumber?: string;

  @Column({ nullable: true })
  startDate?: Date;

  @Column({ nullable: true })
  endDate?: Date;

  @Column({ nullable: true })
  monthlyRent?: number;

  @Column({ default: 'USD' })
  currency!: string;

  @Column({ nullable: true })
  securityDeposit?: number;

  @Column({ nullable: true })
  securityDepositStatus?: LeaseDepositStatus;

  @Column({ nullable: true })
  securityDepositHandledAt?: Date;

  @Column({ nullable: true })
  securityDepositHandledBy?: string;

  @Column({ nullable: true })
  securityDepositAmountReleased?: number;

  @Column({ nullable: true })
  terms?: string;

  @Column('simple-json', { nullable: true })
  customTerms?: string[];

  @Column({ nullable: true })
  generatedTemplate?: string;

  @Column({
    type: 'enum',
    enum: LeaseStatus,
    default: LeaseStatus.DRAFT,
  })
  status!: LeaseStatus;

  @Column('simple-json', { nullable: true })
  documents?: LeaseDocument[];

  @Column('simple-json', { nullable: true })
  signatures?: LeaseSignature[];

  @Column('simple-json', { nullable: true })
  statusHistory?: LeaseStatusEvent[];

  @Column('simple-json', { nullable: true })
  moveInInventory?: LeaseInventoryRecord[];

  @Column('simple-json', { nullable: true })
  moveOutInventory?: LeaseInventoryRecord[];

  @Column({ nullable: true })
  renewalReminderAt?: Date;

  @Column({ nullable: true })
  renewalRequestedAt?: Date;

  @Column({ nullable: true })
  ownerDecisionAt?: Date;

  @Column({ nullable: true })
  ownerDecisionBy?: string;

  @Column({ nullable: true })
  ownerDecisionNote?: string;

  @Column({ nullable: true })
  terminationRequestedAt?: Date;

  @Column({ nullable: true })
  terminationReason?: string;

  @Column({ nullable: true })
  terminationType?: 'early' | 'normal';

  @Column({ nullable: true })
  terminatedAt?: Date;

  @Column({ nullable: true })
  activatedAt?: Date;

  @Column({ nullable: true })
  closedAt?: Date;

  @Column({ nullable: true })
  renewedFromLeaseId?: string;

  @Column({ nullable: true })
  renewedToLeaseId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ nullable: true })
  deletedAt?: Date;

  get id(): string {
    return this._id.toHexString();
  }

  toJSON() {
    return {
      id: this.id,
      applicationId: this.applicationId,
      propertyId: this.propertyId,
      tenantId: this.tenantId,
      ownerId: this.ownerId,
      managerId: this.managerId,
      leaseNumber: this.leaseNumber,
      startDate: this.startDate,
      endDate: this.endDate,
      monthlyRent: this.monthlyRent,
      currency: this.currency,
      securityDeposit: this.securityDeposit,
      securityDepositStatus: this.securityDepositStatus,
      securityDepositHandledAt: this.securityDepositHandledAt,
      securityDepositHandledBy: this.securityDepositHandledBy,
      securityDepositAmountReleased: this.securityDepositAmountReleased,
      terms: this.terms,
      customTerms: this.customTerms || [],
      generatedTemplate: this.generatedTemplate,
      status: this.status,
      documents: this.documents || [],
      signatures: this.signatures || [],
      statusHistory: this.statusHistory || [],
      moveInInventory: this.moveInInventory || [],
      moveOutInventory: this.moveOutInventory || [],
      renewalReminderAt: this.renewalReminderAt,
      renewalRequestedAt: this.renewalRequestedAt,
      ownerDecisionAt: this.ownerDecisionAt,
      ownerDecisionBy: this.ownerDecisionBy,
      ownerDecisionNote: this.ownerDecisionNote,
      terminationRequestedAt: this.terminationRequestedAt,
      terminationReason: this.terminationReason,
      terminationType: this.terminationType,
      terminatedAt: this.terminatedAt,
      activatedAt: this.activatedAt,
      closedAt: this.closedAt,
      renewedFromLeaseId: this.renewedFromLeaseId,
      renewedToLeaseId: this.renewedToLeaseId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
