// ===========================================
// SmartProperty - Auth Service
// ===========================================

import type {
  AuthResponse,
  ChangePasswordData,
  ForgotPasswordData,
  LoginCredentials,
  RegisterData,
  ResetPasswordData,
  Session,
  User,
  VerifyEmailData,
} from "../types/auth";
import api, { clearTokens, setAccessToken, setRefreshToken } from "./api";

export const authService = {
  // Register new user
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/register", data);
    const { tokens } = response.data;
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
    return response.data;
  },

  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/login", credentials);
    const { tokens } = response.data;
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
    return response.data;
  },

  // Logout user
  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } finally {
      clearTokens();
    }
  },

  // Get current user
  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>("/auth/me");
    return response.data;
  },

  // Verify email
  async verifyEmail(data: VerifyEmailData): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(
      "/auth/verify-email",
      data,
    );
    return response.data;
  },

  // Resend verification email
  async resendVerification(email: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(
      "/auth/resend-verification",
      { email },
    );
    return response.data;
  },

  // Forgot password
  async forgotPassword(data: ForgotPasswordData): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(
      "/auth/forgot-password",
      data,
    );
    return response.data;
  },

  // Reset password
  async resetPassword(data: ResetPasswordData): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(
      "/auth/reset-password",
      data,
    );
    return response.data;
  },

  // Change password
  async changePassword(data: ChangePasswordData): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(
      "/auth/change-password",
      data,
    );
    return response.data;
  },

  // Refresh tokens
  async refreshTokens(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const response = await api.post("/auth/refresh", { refreshToken });
    return response.data;
  },

  // ===========================================
  // Session Management
  // ===========================================

  // Get all active sessions
  async getSessions(): Promise<Session[]> {
    const response = await api.get<Session[]>("/auth/sessions");
    return response.data;
  },

  // Revoke a specific session
  async revokeSession(sessionId: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(
      `/auth/sessions/${sessionId}`,
    );
    return response.data;
  },

  // Logout from all devices
  async logoutAll(): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>("/auth/logout-all");
    clearTokens();
    return response.data;
  },
};

export default authService;
