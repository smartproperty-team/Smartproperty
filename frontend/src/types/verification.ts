// ===========================================
// SmartProperty - Verification Types
// ===========================================

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

export interface FraudAnalysis {
  fraudScore: number;
  riskLevel: RiskLevel;
  flags: string[];
  ocrText?: string | null;
  ocrFields?: Record<string, string | number | undefined>;
  llmFindings?: string[];
  analyzedAt: string;
}

export interface VerificationDocument {
  id: string;
  type: DocumentType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  status: VerificationStatus;
  uploadedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  fraudAnalysisStatus?: FraudAnalysisStatus;
  fraudAnalysis?: FraudAnalysis | null;
}

export interface TenantVerification {
  id: string;
  userId: string;
  identityDocuments: VerificationDocument[];
  incomeDocuments: VerificationDocument[];
  overallStatus: VerificationStatus;
  riskScore?: number;
  riskLevel?: RiskLevel;
  submittedAt?: string;
  verifiedAt?: string;
  updatedAt: string;
}

export interface UploadDocumentResponse {
  document: VerificationDocument;
  message: string;
}

// Admin types
export interface AdminVerificationItem {
  id: string;
  userId: string;
  tenantName?: string | null;
  tenantAvatar?: string | null;
  overallStatus: VerificationStatus;
  riskScore?: number;
  riskLevel?: RiskLevel;
  submittedAt?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
  documents: VerificationDocument[];
}
