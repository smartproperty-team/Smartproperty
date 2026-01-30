// ===========================================
// SmartProperty - Sessions Store (Zustand)
// ===========================================

import { create } from "zustand";
import { authService } from "../services";
import type { Session } from "../types/auth";

interface SessionsState {
  sessions: Session[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchSessions: () => Promise<void>;
  revokeSession: (sessionId: string) => Promise<void>;
  revokeAllSessions: () => Promise<void>;
  clearError: () => void;
}

export const useSessionsStore = create<SessionsState>()((set, get) => ({
  sessions: [],
  isLoading: false,
  error: null,

  fetchSessions: async () => {
    set({ isLoading: true, error: null });
    try {
      const sessions = await authService.getSessions();
      set({ sessions, isLoading: false });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || "Failed to fetch sessions";
      set({ isLoading: false, error: message });
    }
  },

  revokeSession: async (sessionId: string) => {
    set({ isLoading: true, error: null });
    try {
      await authService.revokeSession(sessionId);
      // Remove the revoked session from the list
      const sessions = get().sessions.filter((s) => s.id !== sessionId);
      set({ sessions, isLoading: false });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || "Failed to revoke session";
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  revokeAllSessions: async () => {
    set({ isLoading: true, error: null });
    try {
      await authService.logoutAll();
      set({ sessions: [], isLoading: false });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || "Failed to logout from all devices";
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

export default useSessionsStore;
