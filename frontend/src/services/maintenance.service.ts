import type {
  CreateMaintenanceRequestDto,
  MaintenanceRequest,
} from "@/types/maintenance";
import { api } from "./api";

interface UpdateProviderStatusDto {
  status: "in_progress" | "waiting_parts" | "completed" | "canceled";
  reason?: string;
}

interface SubmitServiceReportDto {
  interventionStartedAt?: string;
  interventionEndedAt?: string;
  workPerformedSummary?: string;
  invoiceAmount?: number;
  invoiceReference?: string;
  followUpRequired?: boolean;
}

export const maintenanceService = {
  async createRequest(
    payload: CreateMaintenanceRequestDto,
  ): Promise<MaintenanceRequest> {
    const response = await api.post<MaintenanceRequest>(
      "/maintenance/requests",
      payload,
    );
    return response.data;
  },

  async getMyRequests(): Promise<MaintenanceRequest[]> {
    const response = await api.get<MaintenanceRequest[]>(
      "/maintenance/requests/mine",
    );
    return response.data;
  },

  async getAssignedRequests(): Promise<MaintenanceRequest[]> {
    const response = await api.get<MaintenanceRequest[]>(
      "/maintenance/requests/assigned",
    );
    return response.data;
  },

  async getAvailableRequests(): Promise<MaintenanceRequest[]> {
    const response = await api.get<MaintenanceRequest[]>(
      "/maintenance/requests/available",
    );
    return response.data;
  },

  async claimRequest(requestId: string): Promise<MaintenanceRequest> {
    const response = await api.patch<MaintenanceRequest>(
      `/maintenance/requests/${requestId}/claim`,
    );
    return response.data;
  },

  async updateProviderStatus(
    requestId: string,
    payload: UpdateProviderStatusDto,
  ): Promise<MaintenanceRequest> {
    const response = await api.patch<MaintenanceRequest>(
      `/maintenance/requests/${requestId}/provider-status`,
      payload,
    );
    return response.data;
  },

  async submitServiceReport(
    requestId: string,
    payload: SubmitServiceReportDto,
  ): Promise<MaintenanceRequest> {
    const response = await api.patch<MaintenanceRequest>(
      `/maintenance/requests/${requestId}/service-report`,
      payload,
    );
    return response.data;
  },
};

export default maintenanceService;
