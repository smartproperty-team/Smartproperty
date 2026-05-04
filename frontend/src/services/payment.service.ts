import type {
  InitiatePaymentRequest,
  InitiatePaymentResponse,
  Payment,
  PaymentListResponse,
  PaymentSummary,
  RefundPaymentRequest,
} from "@/types/payment";
import { api } from "./api";

export const paymentService = {
  async initiate(
    payload: InitiatePaymentRequest,
  ): Promise<InitiatePaymentResponse> {
    const response = await api.post<InitiatePaymentResponse>(
      "/payments/initiate",
      payload,
    );
    return response.data;
  },

  async confirm(paymentId: string, paymentIntentId: string): Promise<Payment> {
    const response = await api.post<Payment>(`/payments/${paymentId}/confirm`, {
      paymentIntentId,
    });
    return response.data;
  },

  async getMine(
    page: number = 1,
    limit: number = 10,
    status?: string,
  ): Promise<PaymentListResponse> {
    const response = await api.get<PaymentListResponse>("/payments/mine", {
      params: { page, limit, ...(status && { status }) },
    });
    return response.data;
  },

  async getSummary(): Promise<PaymentSummary> {
    const response = await api.get<PaymentSummary>("/payments/mine/summary");
    return response.data;
  },

  async getById(paymentId: string): Promise<Payment> {
    const response = await api.get<Payment>(`/payments/${paymentId}`);
    return response.data;
  },

  async export(format: "csv" | "json" = "csv"): Promise<Blob> {
    const response = await api.get("/payments/mine/export", {
      params: { format },
      responseType: "blob",
    });
    return response.data;
  },

  async refund(
    paymentId: string,
    payload: RefundPaymentRequest,
  ): Promise<Payment> {
    const response = await api.post<Payment>(
      `/payments/${paymentId}/refund`,
      payload,
    );
    return response.data;
  },
  async clearMine(): Promise<{ clearedCount: number }> {
    const response = await api.post<{ clearedCount: number }>(
      "/payments/mine/clear",
    );
    return response.data;
  },
  async delete(paymentId: string): Promise<{ deleted: boolean }> {
    const response = await api.delete<{ deleted: boolean }>(
      `/payments/${paymentId}`,
    );
    return response.data;
  },
};

export default paymentService;
