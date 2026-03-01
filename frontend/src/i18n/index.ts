// ===========================================
// SmartProperty - i18n Language Store (Zustand)
// ===========================================

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { en } from "./translations/en";
import { fr } from "./translations/fr";

export type Language = "en" | "fr";

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: "en",
      setLanguage: (lang) => set({ language: lang }),
      toggleLanguage: () =>
        set({ language: get().language === "en" ? "fr" : "en" }),
    }),
    {
      name: "sp-language",
    },
  ),
);

export const translations = { en, fr };

/**
 * Returns the translation object for the current language.
 * Usage:  const t = useTranslation();  then  t.nav.home
 */
export function useTranslation() {
  const { language } = useLanguageStore();
  return translations[language];
}

