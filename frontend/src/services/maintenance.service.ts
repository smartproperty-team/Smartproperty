import type {
  CreateMaintenanceRequestDto,
  MaintenanceRequest,
} from "@/types/maintenance";
import { api } from "./api";

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
};

export default maintenanceService;
