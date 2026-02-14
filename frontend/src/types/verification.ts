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
}

export interface TenantVerification {
  id: string;
  userId: string;
  identityDocuments: VerificationDocument[];
  incomeDocuments: VerificationDocument[];
  overallStatus: VerificationStatus;
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
  overallStatus: VerificationStatus;
  submittedAt?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
  documents: VerificationDocument[];
}
