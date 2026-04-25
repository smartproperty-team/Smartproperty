import type {
  CreateLeaseFromApplicationDto,
  Lease,
  LeaseDepositDto,
  LeaseDocumentType,
  LeaseExpiringReport,
  LeaseListQuery,
  LeaseListResponse,
  LeaseOccupancyReport,
  LeaseOwnerDecisionDto,
  LeaseRenewalDto,
  LeaseRevenueReport,
  LeaseSignatureDto,
  LeaseTerminationDto,
} from "@/types/lease";
import { api } from "./api";

export const leaseService = {
  async createFromApprovedApplication(
    applicationId: string,
    payload: CreateLeaseFromApplicationDto,
  ): Promise<Lease> {
    const response = await api.post<Lease>(
      `/leases/from-application/${applicationId}`,
      payload,
    );
    return response.data;
  },

  async getMine(query: LeaseListQuery = {}): Promise<LeaseListResponse> {
    const response = await api.get<LeaseListResponse>("/leases/mine", {
      params: query,
    });
    return response.data;
  },

  async getManaged(query: LeaseListQuery = {}): Promise<LeaseListResponse> {
    const response = await api.get<LeaseListResponse>("/leases/managed", {
      params: query,
    });
    return response.data;
  },

  async getById(leaseId: string): Promise<Lease> {
    const response = await api.get<Lease>(`/leases/${leaseId}`);
    return response.data;
  },

  async reviewOwnerDecision(
    leaseId: string,
    payload: LeaseOwnerDecisionDto,
  ): Promise<Lease> {
    const response = await api.patch<Lease>(
      `/leases/${leaseId}/owner-decision`,
      payload,
    );
    return response.data;
  },

  async signLease(leaseId: string, payload: LeaseSignatureDto): Promise<Lease> {
    const response = await api.patch<Lease>(`/leases/${leaseId}/sign`, payload);
    return response.data;
  },

  async activateLease(leaseId: string): Promise<Lease> {
    const response = await api.patch<Lease>(`/leases/${leaseId}/activate`);
    return response.data;
  },

  async renewLease(leaseId: string, payload: LeaseRenewalDto): Promise<Lease> {
    const response = await api.patch<Lease>(
      `/leases/${leaseId}/renew`,
      payload,
    );
    return response.data;
  },

  async terminateLease(
    leaseId: string,
    payload: LeaseTerminationDto,
  ): Promise<Lease> {
    const response = await api.patch<Lease>(
      `/leases/${leaseId}/terminate`,
      payload,
    );
    return response.data;
  },

  async updateDeposit(
    leaseId: string,
    payload: LeaseDepositDto,
  ): Promise<Lease> {
    const response = await api.patch<Lease>(
      `/leases/${leaseId}/security-deposit`,
      payload,
    );
    return response.data;
  },

  async uploadDocument(
    leaseId: string,
    file: File,
    type: LeaseDocumentType,
    description?: string,
  ): Promise<Lease> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    if (description) {
      formData.append("description", description);
    }

    const response = await api.post<Lease>(
      `/leases/${leaseId}/documents`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response.data;
  },

  async getExpiring(days = 90): Promise<LeaseExpiringReport> {
    const response = await api.get<LeaseExpiringReport>(
      "/leases/reports/expiring",
      {
        params: { days },
      },
    );
    return response.data;
  },

  async getOccupancyReport(): Promise<LeaseOccupancyReport> {
    const response = await api.get<LeaseOccupancyReport>(
      "/leases/reports/occupancy",
    );
    return response.data;
  },

  async getRevenueReport(): Promise<LeaseRevenueReport> {
    const response = await api.get<LeaseRevenueReport>(
      "/leases/reports/revenue",
    );
    return response.data;
  },

  async triggerRenewalReminders(): Promise<{ sent: number }> {
    const response = await api.post<{ sent: number }>(
      "/leases/admin/reminders",
    );
    return response.data;
  },
};

export default leaseService;
