export enum LeaseStatus {
  DRAFT = "draft",
  PENDING_OWNER_APPROVAL = "pending_owner_approval",
  PENDING_SIGNATURE = "pending_signature",
  ACTIVE = "active",
  RENEWAL_PENDING = "renewal_pending",
  EXPIRED = "expired",
  TERMINATED = "terminated",
  REJECTED = "rejected",
  CLOSED = "closed",
}

export enum LeaseDocumentType {
  LEASE_AGREEMENT = "lease_agreement",
  ADDENDUM = "addendum",
  ENDORSEMENT = "endorsement",
  INVENTORY = "inventory",
  SIGNATURE_PROOF = "signature_proof",
  OTHER = "other",
}

export enum LeaseSignatureMethod {
  MANUAL = "manual",
  E_SIGNATURE = "e_signature",
  OTP = "otp",
}

export enum LeaseInventoryPhase {
  MOVE_IN = "move_in",
  MOVE_OUT = "move_out",
}

export enum LeaseDepositStatus {
  HELD = "held",
  PARTIALLY_REFUNDED = "partially_refunded",
  REFUNDED = "refunded",
  APPLIED = "applied",
  FORFEITED = "forfeited",
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
  uploadedAt: string;
}

export interface LeaseSignature {
  id: string;
  signerId: string;
  signerName?: string;
  signerRole: string;
  method: LeaseSignatureMethod;
  signedAt: string;
  note?: string;
  documentId?: string;
}

export interface LeaseStatusEvent {
  status: LeaseStatus;
  note?: string;
  changedBy: string;
  changedAt: string;
}

export interface LeaseInventoryPhoto {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  key: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface LeaseInventoryRecord {
  id: string;
  phase: LeaseInventoryPhase;
  room?: string;
  item: string;
  condition: string;
  notes?: string;
  recordedBy: string;
  recordedAt: string;
  photos: LeaseInventoryPhoto[];
}

export interface Lease {
  id: string;
  applicationId?: string;
  propertyId: string;
  tenantId: string;
  tenantName?: string;
  ownerId: string;
  ownerName?: string;
  managerId?: string;
  managerName?: string;
  propertyTitle?: string;
  propertyAddress?: string;
  propertyLocation?: string;
  leaseNumber?: string;
  startDate?: string;
  endDate?: string;
  monthlyRent?: number;
  currency: string;
  securityDeposit?: number;
  securityDepositStatus?: LeaseDepositStatus;
  securityDepositHandledAt?: string;
  securityDepositHandledBy?: string;
  securityDepositAmountReleased?: number;
  terms?: string;
  customTerms: string[];
  generatedTemplate?: string;
  status: LeaseStatus;
  documents: LeaseDocument[];
  signatures: LeaseSignature[];
  statusHistory: LeaseStatusEvent[];
  moveInInventory: LeaseInventoryRecord[];
  moveOutInventory: LeaseInventoryRecord[];
  renewalReminderAt?: string;
  renewalRequestedAt?: string;
  ownerDecisionAt?: string;
  ownerDecisionBy?: string;
  ownerDecisionNote?: string;
  terminationRequestedAt?: string;
  terminationReason?: string;
  terminationType?: "early" | "normal";
  terminatedAt?: string;
  activatedAt?: string;
  closedAt?: string;
  renewedFromLeaseId?: string;
  renewedToLeaseId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaseListQuery {
  status?: LeaseStatus;
  propertyId?: string;
  tenantId?: string;
  page?: number;
  limit?: number;
}

export interface LeaseListResponse {
  items: Lease[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateLeaseFromApplicationDto {
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit?: number;
  currency?: string;
  terms?: string;
  customTerms?: string[];
  templateOnly?: boolean;
}

export interface LeaseOwnerDecisionDto {
  approved: boolean;
  note?: string;
}

export interface LeaseSignatureDto {
  method: LeaseSignatureMethod;
  note?: string;
  documentId?: string;
}

export interface LeaseRenewalDto {
  endDate: string;
  monthlyRent?: number;
  securityDeposit?: number;
  customTerms?: string[];
  note?: string;
}

export interface LeaseTerminationDto {
  terminationType: "early" | "normal";
  reason?: string;
  effectiveDate?: string;
}

export interface LeaseDepositDto {
  status: LeaseDepositStatus;
  amountReleased?: number;
  note?: string;
}

export interface LeaseExpiringReport {
  items: Lease[];
  count: number;
  cutoff: string;
}

export interface LeaseOccupancyReport {
  totalProperties: number;
  occupiedProperties: number;
  vacantProperties: number;
  occupancyRate: number;
  vacancyRate: number;
}

export interface LeaseRevenueReport {
  count: number;
  totalMonthlyRent: number;
  currencies: Record<string, number>;
  projectedAnnualRent: number;
}

export interface UploadLeaseDocumentDto {
  type: LeaseDocumentType;
  description?: string;
}
