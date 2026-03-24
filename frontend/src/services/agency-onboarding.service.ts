import { UserRole } from "@/types/auth";
import api from "./api";

export interface RoleSeedInput {
  firstName: string;
  lastName?: string;
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
};
