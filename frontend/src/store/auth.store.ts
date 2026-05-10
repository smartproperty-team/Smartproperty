// ===========================================
// SmartProperty - Auth Store (Zustand)
// ===========================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  authService,
  clearTokens,
  getAccessToken,
  getRefreshToken,
} from '../services';
import type { RegisterData, Session, User } from '../types/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessions: Session[];

  // User Actions
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Authentication Methods
  login: (
    email: string,
    password: string,
    captchaToken?: string,
    twoFactorCode?: string,
    reactivateAccount?: boolean,
  ) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: (refreshToken?: string) => Promise<void>;
  logoutAll: (currentSessionId?: string) => Promise<void>;
  checkAuth: () => Promise<void>;

  // Password Management
  changePassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (
    token: string,
    password: string,
    confirmPassword: string,
  ) => Promise<void>;

  // Email Verification
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;

  // Session Management
  setSessions: (sessions: Session[]) => void;
  fetchSessions: () => Promise<void>;
  revokeSession: (sessionId: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      sessions: [],

      // ===========================================
      // State Setters
      // ===========================================

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      setSessions: (sessions) => set({ sessions }),

      // ===========================================
      // Authentication Methods
      // ===========================================

      login: async (
        email,
        password,
        captchaToken,
        twoFactorCode,
        reactivateAccount,
      ) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login({
            email,
            password,
            captchaToken,
            twoFactorCode,
            reactivateAccount,
          });
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: unknown) {
          const apiError = error as {
            response?: { data?: { message?: string | string[] } };
            message?: string;
          };
          const backendMessage = apiError?.response?.data?.message;
          const message =
            (Array.isArray(backendMessage)
              ? backendMessage.join(', ')
              : backendMessage || apiError?.message) ?? 'Login failed';
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.register(data);
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: unknown) {
          const message =
            error instanceof Error
              ? error.message
              : (error as { response?: { data?: { message?: string } } })
                  ?.response?.data?.message || 'Registration failed';
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      logout: async (refreshToken?: string) => {
        set({ isLoading: true });
        try {
          await authService.logout(refreshToken);
        } finally {
          clearTokens();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            sessions: [],
          });
        }
      },

      logoutAll: async (currentSessionId?: string) => {
        set({ isLoading: true });
        try {
          await authService.logoutAll(currentSessionId);
        } finally {
          clearTokens();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            sessions: [],
          });
        }
      },

      checkAuth: async () => {
        let token = getAccessToken();

        if (!token) {
          const refreshToken = getRefreshToken();
          if (refreshToken) {
            try {
              const refreshed = await authService.refreshTokens(refreshToken);
              token = refreshed.accessToken;
            } catch {
              clearTokens();
              set({ user: null, isAuthenticated: false });
              return;
            }
          } else {
            set({ user: null, isAuthenticated: false });
            return;
          }
        }

        set({ isLoading: true });
        try {
          const user = await authService.getCurrentUser();
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          clearTokens();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      // ===========================================
      // Password Management
      // ===========================================

      changePassword: async (currentPassword, newPassword, confirmPassword) => {
        set({ isLoading: true, error: null });
        try {
          await authService.changePassword({
            currentPassword,
            newPassword,
            confirmPassword,
          });
          set({ isLoading: false, error: null });
        } catch (error: unknown) {
          const message =
            error instanceof Error
              ? error.message
              : (error as { response?: { data?: { message?: string } } })
                  ?.response?.data?.message || 'Failed to change password';
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      forgotPassword: async (email) => {
        set({ isLoading: true, error: null });
        try {
          await authService.forgotPassword({ email });
          set({ isLoading: false, error: null });
        } catch (error: unknown) {
          const message =
            error instanceof Error
              ? error.message
              : (error as { response?: { data?: { message?: string } } })
                  ?.response?.data?.message ||
                'Failed to process forgot password';
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      resetPassword: async (token, password, confirmPassword) => {
        set({ isLoading: true, error: null });
        try {
          await authService.resetPassword({
            token,
            password,
            confirmPassword,
          });
          set({ isLoading: false, error: null });
        } catch (error: unknown) {
          const message =
            error instanceof Error
              ? error.message
              : (error as { response?: { data?: { message?: string } } })
                  ?.response?.data?.message || 'Failed to reset password';
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      // ===========================================
      // Email Verification
      // ===========================================

      verifyEmail: async (token) => {
        set({ isLoading: true, error: null });
        try {
          await authService.verifyEmail({ token });
          set({ isLoading: false, error: null });
          // Update user email verified status if needed
          if (set) {
            const currentUser = (useAuthStore.getState() as AuthState).user;
            if (currentUser) {
              set({
                user: { ...currentUser, isEmailVerified: true },
              });
            }
          }
        } catch (error: unknown) {
          const message =
            error instanceof Error
              ? error.message
              : (error as { response?: { data?: { message?: string } } })
                  ?.response?.data?.message || 'Failed to verify email';
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      resendVerification: async (email) => {
        set({ isLoading: true, error: null });
        try {
          await authService.resendVerification(email);
          set({ isLoading: false, error: null });
        } catch (error: unknown) {
          const message =
            error instanceof Error
              ? error.message
              : (error as { response?: { data?: { message?: string } } })
                  ?.response?.data?.message ||
                'Failed to resend verification email';
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      // ===========================================
      // Session Management
      // ===========================================

      fetchSessions: async () => {
        set({ isLoading: true, error: null });
        try {
          const sessions = await authService.getSessions();
          set({ sessions, isLoading: false, error: null });
        } catch (error: unknown) {
          const message =
            error instanceof Error
              ? error.message
              : (error as { response?: { data?: { message?: string } } })
                  ?.response?.data?.message || 'Failed to fetch sessions';
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      revokeSession: async (sessionId) => {
        set({ isLoading: true, error: null });
        try {
          await authService.revokeSession(sessionId);
          // Remove the revoked session from the list
          set((state) => ({
            sessions: state.sessions.filter((s) => s.id !== sessionId),
            isLoading: false,
            error: null,
          }));
        } catch (error: unknown) {
          const message =
            error instanceof Error
              ? error.message
              : (error as { response?: { data?: { message?: string } } })
                  ?.response?.data?.message || 'Failed to revoke session';
          set({ isLoading: false, error: message });
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

export default useAuthStore;
