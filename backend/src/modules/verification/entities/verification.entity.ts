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

export enum FraudAnalysisStatus {
  NOT_RUN = 'not_run',
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export interface FraudAnalysisResult {
  fraudScore: number; // 0-100, higher = more suspicious
  riskLevel: RiskLevel;
  flags: string[]; // e.g. ["exif_edited_photoshop", "name_mismatch", "low_quality_scan"]
  ocrText?: string;
  ocrFields?: Record<string, string | number | undefined>;
  llmFindings?: string[]; // human-readable findings from Claude/GPT-4V
  analyzedAt: Date;
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

  @Column({
    type: 'enum',
    enum: FraudAnalysisStatus,
    default: FraudAnalysisStatus.NOT_RUN,
  })
  fraudAnalysisStatus: FraudAnalysisStatus;

  @Column({ type: 'json', nullable: true })
  fraudAnalysis?: FraudAnalysisResult;

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

  @Column({ type: 'int', nullable: true })
  riskScore?: number; // aggregate 0-100 across all docs + cross-checks

  @Column({ type: 'enum', enum: RiskLevel, nullable: true })
  riskLevel?: RiskLevel;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual property
  get id(): string {
    return this._id?.toHexString();
  }
}
