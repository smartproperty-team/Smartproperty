import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserPreferences } from "../types/auth";

export type UserPreferencesData = UserPreferences;

interface PreferencesState {
  preferencesByUser: Record<string, UserPreferencesData>;
  isOnboardingOpen: boolean;
  getUserPreferences: (userId: string) => UserPreferencesData;
  setUserPreferences: (userId: string, data: UserPreferencesData) => void;
  openOnboarding: () => void;
  closeOnboarding: () => void;
  skipOnboarding: (userId: string) => void;
  savePreferences: (userId: string, data: UserPreferencesData) => void;
}

const DEFAULT_PREFERENCES: UserPreferencesData = {
  propertyTypes: [],
  budgetRange: [500, 3000],
  locations: "",
  locationPreference: {
    label: "",
    radiusKm: 11,
  },
  notifications: {
    email: true,
    sms: false,
    push: true,
  },
  completed: false,
  skipped: false,
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      preferencesByUser: {},
      isOnboardingOpen: false,

      getUserPreferences: (userId) =>
        get().preferencesByUser[userId] ?? DEFAULT_PREFERENCES,

      setUserPreferences: (userId, data) =>
        set((state) => ({
          preferencesByUser: {
            ...state.preferencesByUser,
            [userId]: data,
          },
        })),

      openOnboarding: () => set({ isOnboardingOpen: true }),

      closeOnboarding: () => set({ isOnboardingOpen: false }),

      skipOnboarding: (userId) =>
        set((state) => ({
          isOnboardingOpen: false,
          preferencesByUser: {
            ...state.preferencesByUser,
            [userId]: {
              ...(state.preferencesByUser[userId] ?? DEFAULT_PREFERENCES),
              skipped: true,
              completed: false,
            },
          },
        })),

      savePreferences: (userId, data) =>
        set((state) => ({
          isOnboardingOpen: false,
          preferencesByUser: {
            ...state.preferencesByUser,
            [userId]: {
              ...data,
            },
          },
        })),
    }),
    {
      name: "preferences-storage",
      partialize: (state) => ({
        preferencesByUser: state.preferencesByUser,
      }),
    },
  ),
);

export default usePreferencesStore;
