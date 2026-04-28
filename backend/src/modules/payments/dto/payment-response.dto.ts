// ===========================================
// SmartProperty - Payment Response DTOs
// ===========================================

import { Exclude } from 'class-transformer';
import {
  PaymentMethod,
  PaymentStatus,
  PaymentType,
} from '../entities/payment.entity';

export class PaymentResponseDto {
  id: string;
  leaseId: string;
  tenantId: string;
  ownerId: string;
  amount: number;
  currency: string;
  type: PaymentType;
  status: PaymentStatus;
  method?: PaymentMethod;
  dueDate: string;
  paidAt: string | null;
  transactionId?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;

  @Exclude()
  stripePaymentIntentId?: string;

  @Exclude()
  stripeCustomerId?: string;

  @Exclude()
  gatewayResponse?: Record<string, any>;

  @Exclude()
  ipAddress?: string;

  @Exclude()
  userAgent?: string;
}

export class PaymentHistoryResponseDto {
  data: PaymentResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class PaymentInitResponse {
  id: string;
  stripePaymentIntentId: string;
  stripeClientSecret: string;
  stripePublishableKey: string;
  status: PaymentStatus;
  amount: number;
  createdAt: string;
}

export class PaymentSummaryDto {
  totalAmount: number;
  completedAmount: number;
  pendingAmount: number;
  failedAmount: number;
  refundedAmount: number;
  paymentCount: number;
  completedCount: number;
  failedCount: number;
  refundedCount: number;
  averageAmount: number;
}
