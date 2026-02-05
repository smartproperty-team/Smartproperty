// ===========================================
// SmartProperty - useAuth Hook
// ===========================================

import { useCallback, useEffect } from "react";
import { useAuthStore } from "../store/auth.store";
import type {
  ChangePasswordData,
  LoginCredentials,
  RegisterData,
  ResetPasswordData,
  VerifyEmailData,
} from "../types/auth";

/**
 * Custom hook for auth operations
 * Provides easy access to authentication methods and state
 */
export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    sessions,
    setUser,
    clearError,
    login,
    register,
    logout,
    logoutAll,
    checkAuth,
    changePassword,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerification,
    fetchSessions,
    revokeSession,
  } = useAuthStore();

  // Initialize auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Wrapped methods with better error handling
  const handleLogin = useCallback(
    async (credentials: LoginCredentials) => {
      clearError();
      return login(credentials.email, credentials.password);
    },
    [login, clearError],
  );

  const handleRegister = useCallback(
    async (data: RegisterData) => {
      clearError();
      return register(data);
    },
    [register, clearError],
  );

  const handleLogout = useCallback(
    async (refreshToken?: string) => {
      clearError();
      return logout(refreshToken);
    },
    [logout, clearError],
  );

  const handleLogoutAll = useCallback(
    async (currentSessionId?: string) => {
      clearError();
      return logoutAll(currentSessionId);
    },
    [logoutAll, clearError],
  );

  const handleChangePassword = useCallback(
    async (data: ChangePasswordData) => {
      clearError();
      return changePassword(
        data.currentPassword,
        data.newPassword,
        data.confirmPassword,
      );
    },
    [changePassword, clearError],
  );

  const handleForgotPassword = useCallback(
    async (email: string) => {
      clearError();
      return forgotPassword(email);
    },
    [forgotPassword, clearError],
  );

  const handleResetPassword = useCallback(
    async (data: ResetPasswordData) => {
      clearError();
      return resetPassword(data.token, data.password, data.confirmPassword);
    },
    [resetPassword, clearError],
  );

  const handleVerifyEmail = useCallback(
    async (data: VerifyEmailData) => {
      clearError();
      return verifyEmail(data.token);
    },
    [verifyEmail, clearError],
  );

  const handleResendVerification = useCallback(
    async (email: string) => {
      clearError();
      return resendVerification(email);
    },
    [resendVerification, clearError],
  );

  const handleFetchSessions = useCallback(async () => {
    clearError();
    return fetchSessions();
  }, [fetchSessions, clearError]);

  const handleRevokeSession = useCallback(
    async (sessionId: string) => {
      clearError();
      return revokeSession(sessionId);
    },
    [revokeSession, clearError],
  );

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    sessions,

    // Methods
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    logoutAll: handleLogoutAll,
    checkAuth,
    setUser,
    clearError,

    // Password management
    changePassword: handleChangePassword,
    forgotPassword: handleForgotPassword,
    resetPassword: handleResetPassword,

    // Email verification
    verifyEmail: handleVerifyEmail,
    resendVerification: handleResendVerification,

    // Session management
    fetchSessions: handleFetchSessions,
    revokeSession: handleRevokeSession,
  };
};

export default useAuth;
