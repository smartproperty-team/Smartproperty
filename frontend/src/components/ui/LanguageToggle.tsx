// ===========================================
// SmartProperty - Language Toggle Button
// ===========================================

import { useLanguageStore, useTranslation } from "@/i18n";

interface LanguageToggleProps {
  /** "pill" = rounded full pill (for Navbar), "icon" = compact icon button */
  variant?: "pill" | "icon";
  className?: string;
}

export default function LanguageToggle({
  variant = "pill",
  className = "",
}: LanguageToggleProps) {
  const { language, toggleLanguage } = useLanguageStore();
  const t = useTranslation();

  if (variant === "icon") {
    return (
      <button
        onClick={toggleLanguage}
        title={t.common.language}
        aria-label={`Switch to ${language === "en" ? "French" : "English"}`}
        className={`flex items-center justify-center gap-1 w-10 h-10 rounded-full border border-gray-300 hover:border-indigo-500 hover:bg-indigo-50 text-sm font-semibold text-gray-700 hover:text-indigo-600 transition-all duration-200 ${className}`}
      >
        <span className="text-base leading-none">
          {language === "en" ? "🇫🇷" : "🇬🇧"}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleLanguage}
      title={t.common.language}
      aria-label={`Switch to ${language === "en" ? "French" : "English"}`}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-300 hover:border-indigo-500 hover:bg-indigo-50 text-sm font-semibold text-gray-700 hover:text-indigo-600 transition-all duration-200 select-none ${className}`}
    >
      <span className="text-base leading-none">
        {language === "en" ? "🇫🇷" : "🇬🇧"}
      </span>
      <span>{t.common.switchLang}</span>
    </button>
  );
}

