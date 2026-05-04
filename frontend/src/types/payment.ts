// Payment Types

export enum PaymentStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
  REFUNDED = "refunded",
}

export enum PaymentType {
  RENT = "rent",
  DEPOSIT = "deposit",
  MAINTENANCE = "maintenance",
  OTHER = "other",
}

export interface Payment {
  id: string;
  leaseId: string;
  tenantId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  type: PaymentType;
  description?: string;
  transactionId?: string; // Stripe charge ID
  stripePaymentIntentId?: string;
  paidAt?: string;
  refundedAt?: string;
  refundAmount?: number;
  refundReason?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface PaymentListResponse {
  data: Payment[];
  total: number;
  page: number;
  limit: number;
}

export interface PaymentSummary {
  total: number;
  completed: number;
  pending: number;
  failed: number;
  refunded: number;
  totalAmount: number;
  completedAmount: number;
}

export interface InitiatePaymentResponse {
  id: string;
  stripePaymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface InitiatePaymentRequest {
  leaseId: string;
  tenantId: string;
  amount: number;
  currency?: string;
  type: PaymentType;
  description?: string;
}

export interface ConfirmPaymentRequest {
  paymentIntentId: string;
  paymentMethodId: string;
}

export interface RefundPaymentRequest {
  amount?: number;
  reason?: string;
}
