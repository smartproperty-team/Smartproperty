import apiClient from "./api";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: "admin" | "owner" | "tenant" | "manager" | "agent";
  phone?: string;
  confirmPassword?: string;
}

export interface AuthResponse {
  user: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    phone?: string;
    isEmailVerified: boolean;
    isActive: boolean;
    createdAt: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface VerifyEmailRequest {
  token: string;
}

const authService = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post("/auth/login", credentials);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post("/auth/register", {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      role: data.role,
      phone: data.phone,
    });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
  },

  getCurrentUser: async () => {
    const response = await apiClient.get("/auth/me");
    return response.data;
  },

  changePassword: async (data: ChangePasswordRequest) => {
    const response = await apiClient.patch("/auth/change-password", {
      oldPassword: data.oldPassword,
      newPassword: data.newPassword,
    });
    return response.data;
  },

  forgotPassword: async (data: ForgotPasswordRequest) => {
    const response = await apiClient.post("/auth/forgot-password", data);
    return response.data;
  },

  resetPassword: async (data: ResetPasswordRequest) => {
    const response = await apiClient.post("/auth/reset-password", {
      token: data.token,
      newPassword: data.newPassword,
    });
    return response.data;
  },

  verifyEmail: async (data: VerifyEmailRequest) => {
    const response = await apiClient.post("/auth/verify-email", data);
    return response.data;
  },

  refreshToken: async (refreshToken: string) => {
    const response = await apiClient.post("/auth/refresh-token", {
      refreshToken,
    });
    return response.data;
  },
};

export default authService;
