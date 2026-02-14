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

// ===========================================
// Auth Service Object
// ===========================================

export const authService = {
  // ===========================================
  // Authentication - Registration & Login
  // ===========================================

  /**
   * Register a new user
   * @param data User registration data
   * @returns User data with tokens
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/register", data);
    const { tokens } = response.data;
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
    return response.data;
  },

  /**
   * Login user with email and password
   * @param credentials Email and password
   * @returns User data with tokens
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/login", credentials);
    const { tokens } = response.data;
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
    return response.data;
  },

  /**
   * Logout user from current session
   * @param refreshToken Optional refresh token for session-specific logout
   */
  async logout(refreshToken?: string): Promise<void> {
    try {
      await api.post("/auth/logout", {
        ...(refreshToken && { refreshToken }),
      });
    } finally {
      clearTokens();
    }
  },

  // ===========================================
  // Google OAuth
  // ===========================================

  /**
   * Get Google OAuth login URL
   * @returns URL to redirect user to Google OAuth
   */
  getGoogleLoginUrl(): string {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
    return `${apiUrl}/auth/google`;
  },

  /**
   * Handle Google OAuth callback tokens
   * @param accessToken Access token from OAuth callback
   * @param refreshToken Refresh token from OAuth callback
   */
  handleGoogleCallback(accessToken: string, refreshToken: string): void {
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
  },

  /**
   * Get Facebook OAuth login URL
   * @returns URL to redirect user to Facebook OAuth
   */
  getFacebookLoginUrl(): string {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
    return `${apiUrl}/auth/facebook`;
  },

  /**
   * Handle Facebook OAuth callback tokens
   * @param accessToken Access token from OAuth callback
   * @param refreshToken Refresh token from OAuth callback
   */
  handleFacebookCallback(accessToken: string, refreshToken: string): void {
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
  },

  /**
   * Logout from all devices/sessions
   */
  async logoutAll(
    currentSessionId?: string,
  ): Promise<{ message: string; revokedCount: number }> {
    try {
      const response = await api.post<{
        message: string;
        revokedCount: number;
      }>("/auth/logout-all", {
        ...(currentSessionId && { currentSessionId }),
      });
      clearTokens();
      return response.data;
    } catch (error) {
      clearTokens();
      throw error;
    }
  },

  // ===========================================
  // User Information
  // ===========================================

  /**
   * Get current authenticated user information
   */
  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>("/auth/me");
    return response.data;
  },

  // ===========================================
  // Token Management
  // ===========================================

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const response = await api.post("/auth/refresh", { refreshToken });
    const { accessToken, refreshToken: newRefreshToken } = response.data;
    setAccessToken(accessToken);
    setRefreshToken(newRefreshToken);
    return response.data;
  },

  // ===========================================
  // Email Verification
  // ===========================================

  /**
   * Verify email with token from email link
   */
  async verifyEmail(data: VerifyEmailData): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(
      "/auth/verify-email",
      data,
    );
    return response.data;
  },

  /**
   * Resend verification email
   */
  async resendVerification(email: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(
      "/auth/resend-verification",
      { email },
    );
    return response.data;
  },

  // ===========================================
  // Password Management
  // ===========================================

  /**
   * Request password reset email
   */
  async forgotPassword(data: ForgotPasswordData): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(
      "/auth/forgot-password",
      data,
    );
    return response.data;
  },

  /**
   * Reset password with reset token
   */
  async resetPassword(data: ResetPasswordData): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(
      "/auth/reset-password",
      data,
    );
    return response.data;
  },

  /**
   * Change password for authenticated user
   */
  async changePassword(data: ChangePasswordData): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(
      "/auth/change-password",
      data,
    );
    return response.data;
  },

  // ===========================================
  // Session Management
  // ===========================================

  /**
   * Get all active sessions for current user
   */
  async getSessions(): Promise<Session[]> {
    const response = await api.get<Session[]>("/auth/sessions");
    return response.data;
  },

  /**
   * Revoke a specific session by ID
   */
  async revokeSession(sessionId: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(
      `/auth/sessions/${sessionId}`,
    );
    return response.data;
  },

  // ===========================================
  // Two-Factor Authentication
  // ===========================================

  /**
   * Setup two-factor authentication (generates QR code)
   */
  async setup2FA(): Promise<{
    secret: string;
    qrCode: string;
    otpauthUrl: string;
  }> {
    const response = await api.post<{
      secret: string;
      qrCode: string;
      otpauthUrl: string;
    }>("/auth/2fa/setup");
    return response.data;
  },

  /**
   * Enable two-factor authentication with verification code
   */
  async enable2FA(
    code: string,
  ): Promise<{ message: string; twoFactorEnabled: boolean }> {
    const response = await api.post<{
      message: string;
      twoFactorEnabled: boolean;
    }>("/auth/2fa/enable", { code });
    return response.data;
  },

  /**
   * Disable two-factor authentication
   */
  async disable2FA(
    password: string,
  ): Promise<{ message: string; twoFactorEnabled: boolean }> {
    const response = await api.post<{
      message: string;
      twoFactorEnabled: boolean;
    }>("/auth/2fa/disable", { password });
    return response.data;
  },
};

export default authService;
