import type { User, UserRole, UserStatus } from "@/types/auth";
import api from "./api";

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole | "";
  status?: UserStatus | "";
}

export interface ListUsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

export const adminUsersService = {
  async listUsers(params: ListUsersParams): Promise<ListUsersResponse> {
    const response = await api.get<ListUsersResponse>("/users", { params });
    return response.data;
  },

  async getUserById(id: string): Promise<User> {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  },

  async updateUserStatus(id: string, status: UserStatus): Promise<User> {
    const response = await api.put<User>(`/users/${id}/status`, { status });
    return response.data;
  },

  async updateUserRole(id: string, role: UserRole): Promise<User> {
    const response = await api.put<User>(`/users/${id}/role`, { role });
    return response.data;
  },
};

export default adminUsersService;
