import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;

  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setHasHydrated: (hydrated: boolean) => void;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      hasHydrated: false,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setTokens: (accessToken, refreshToken) =>
        set({
          accessToken,
          refreshToken,
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),

      login: (user, accessToken, refreshToken) =>
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          error: null,
        }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        }),

      initializeAuth: () => {
        const accessToken = localStorage.getItem("accessToken");
        const refreshToken = localStorage.getItem("refreshToken");
        const user = localStorage.getItem("user");

        if (accessToken && user) {
          try {
            const parsedUser = JSON.parse(user);
            set({
              user: parsedUser,
              accessToken,
              refreshToken,
              isAuthenticated: true,
            });
          } catch (e) {
            set({
              user: null,
              accessToken: null,
              refreshToken: null,
              isAuthenticated: false,
            });
          }
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
