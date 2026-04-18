import { UserRole } from "@/types/auth";
import api from "./api";

export interface RoleSeedInput {
  firstName: string;
  lastName?: string;
  personalEmail?: string;
}

export interface CreateAgencyOnboardingInput {
  name: string;
  region: string;
  agencyCreationDate: string;
  description?: string;
  phone?: string;
  contactEmail?: string;
  accountant: RoleSeedInput;
  rentalManager: RoleSeedInput;
  manager: RoleSeedInput;
  serviceProvider: RoleSeedInput;
}

export interface CreatedProvisionedAccount {
  id: string;
  role: UserRole;
  email: string;
  firstName: string;
  lastName: string;
  temporaryPassword: string;
  notificationEmail?: string;
}

export interface SkippedProvisionedAccount {
  role: UserRole;
  email: string;
  reason: string;
  message: string;
}

export interface AgencyOnboardingResponse {
  agency: {
    id: string;
    name: string;
    slug: string;
    region: string;
    createdAt: string;
  };
  createdAccounts: CreatedProvisionedAccount[];
  skippedAccounts: SkippedProvisionedAccount[];
}

export interface AgencyListItem {
  id: string;
  name: string;
  slug: string;
  region: string;
  description?: string;
  phone?: string;
  contactEmail?: string;
  establishedAt?: string;
  createdAt: string;
  updatedAt: string;
  members?: Array<{
    userId: string;
    role: UserRole;
    email: string;
    firstName: string;
    lastName: string;
    createdAt: string;
  }>;
}

export interface AgencySearchItem {
  id: string;
  name: string;
  slug: string;
  region: string;
  managerName?: string;
}

export interface OwnerAgencyLinkResponse {
  agencyId: string;
  owner: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
  };
}

export interface OwnerAgencyUnlinkResponse {
  agencyId: string;
  ownerId: string;
  unlinked: boolean;
}

export const agencyOnboardingService = {
  async createAgencyWithAccounts(data: CreateAgencyOnboardingInput) {
    const response = await api.post<AgencyOnboardingResponse>(
      "/agencies",
      data,
    );
    return response.data;
  },

  async listMyAgencies() {
    const response = await api.get<AgencyListItem[]>("/agencies/mine");
    return response.data;
  },

  async linkCurrentOwnerToAgency(agencyId: string) {
    const response = await api.post<OwnerAgencyLinkResponse>(
      `/agencies/${agencyId}/owners/me`,
    );
    return response.data;
  },

  async unlinkCurrentOwnerFromAgency(agencyId: string) {
    const response = await api.delete<OwnerAgencyUnlinkResponse>(
      `/agencies/${agencyId}/owners/me`,
    );
    return response.data;
  },

  async searchAgencies(query: string) {
    const response = await api.get<AgencySearchItem[]>("/agencies/search", {
      params: { q: query },
    });
    return response.data;
  },
};
