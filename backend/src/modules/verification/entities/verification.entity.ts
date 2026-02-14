// ===========================================
// SmartProperty - Verification Document Entity
// ===========================================

import { ObjectId } from 'mongodb';
import {
  Column,
  CreateDateColumn,
  Entity,
  ObjectIdColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DocumentType {
  IDENTITY = 'identity',
  PROOF_OF_INCOME = 'proof_of_income',
}

export enum VerificationStatus {
  NOT_SUBMITTED = 'not_submitted',
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

@Entity('verification_documents')
export class VerificationDocument {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: DocumentType })
  type: DocumentType;

  @Column()
  fileName: string;

  @Column()
  fileSize: number;

  @Column()
  mimeType: string;

  @Column()
  key: string; // S3/MinIO storage key

  @Column()
  url: string;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  status: VerificationStatus;

  @Column({ nullable: true })
  rejectionReason?: string;

  @Column({ nullable: true })
  reviewedAt?: Date;

  @CreateDateColumn()
  uploadedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual property
  get id(): string {
    return this._id?.toHexString();
  }
}

@Entity('tenant_verifications')
export class TenantVerification {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column({ unique: true })
  userId: string;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.NOT_SUBMITTED,
  })
  overallStatus: VerificationStatus;

  @Column({ nullable: true })
  submittedAt?: Date;

  @Column({ nullable: true })
  verifiedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual property
  get id(): string {
    return this._id?.toHexString();
  }
}
