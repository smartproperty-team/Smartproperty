// ===========================================
// SmartProperty - AI Description Panel
// ===========================================

import { useEffect, useState } from "react";
import { useTranslation } from "../../i18n";
import {
  propertyService,
  type AiDescriptionLength,
  type AiDescriptionTone,
  type AiPropertySnapshot,
  type GeneratedVariant,
} from "../../services/property.service";

const ALL_LENGTHS: AiDescriptionLength[] = ["short", "medium", "long"];
const TONES: AiDescriptionTone[] = ["professional", "warm", "luxury"];
const COMMON_LANGS = ["en", "fr", "es", "de", "it", "pt", "ar"];

const selectClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100";

const chipBaseClassName =
  "rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide transition";

const toneBadgeClass: Record<AiDescriptionTone, string> = {
  professional: "bg-blue-50 text-blue-700 border border-blue-200",
  warm: "bg-amber-50 text-amber-700 border border-amber-200",
  luxury: "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

interface AiDescriptionPanelProps {
  open: boolean;
  onClose: () => void;
  snapshot: AiPropertySnapshot;
  propertyId?: string;
  onApply: (text: string) => void;
}

export default function AiDescriptionPanel({
  open,
  onClose,
  snapshot,
  propertyId,
  onApply,
}: AiDescriptionPanelProps) {
  const t = useTranslation();
  const formStrings = t.properties.form.aiDescription;

  const [tone, setTone] = useState<AiDescriptionTone>("professional");
  const [lengths, setLengths] = useState<AiDescriptionLength[]>(["medium"]);
  const [sourceLanguage, setSourceLanguage] = useState<string>("en");
  const [targetLanguages, setTargetLanguages] = useState<string[]>(["en"]);
  const [hintKeywords, setHintKeywords] = useState<string>("");
  const [variants, setVariants] = useState<GeneratedVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const toggleLength = (value: AiDescriptionLength) => {
    setLengths((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const toggleTargetLanguage = (lang: string) => {
    setTargetLanguages((prev) =>
      prev.includes(lang) ? prev.filter((v) => v !== lang) : [...prev, lang],
    );
  };

  const handleGenerate = async () => {
    if (lengths.length === 0 || targetLanguages.length === 0) {
      setError(formStrings.errorEmpty);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await propertyService.generateAiDescription({
        propertyId,
        propertySnapshot: snapshot,
        tone,
        lengths,
        sourceLanguage,
        targetLanguages,
        hintKeywords: hintKeywords
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setVariants(response.variants);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      if (status === 504) {
        setError(formStrings.errorTimeout);
      } else {
        setError(formStrings.errorGeneric);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[2px] sm:p-6"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.35)]">
        <div className="pointer-events-none absolute -top-28 right-[-10%] h-72 w-72 rounded-full bg-linear-to-br from-sky-200/55 to-transparent blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-[-10%] h-72 w-72 rounded-full bg-linear-to-tr from-amber-200/50 to-transparent blur-2xl" />

        <div className="relative max-h-[92vh] overflow-y-auto">
          <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-linear-to-r from-sky-50 via-white to-amber-50/70 px-4 py-4 backdrop-blur sm:px-6 sm:py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Smart AI Writer
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                  {formStrings.title}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {formStrings.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={formStrings.close}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 6l12 12M18 6l-12 12"
                  />
                </svg>
              </button>
            </div>
          </header>

          <div className="space-y-5 p-4 sm:p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="ai-description-tone"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {formStrings.tone}
                </label>
                <select
                  id="ai-description-tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value as AiDescriptionTone)}
                  className={selectClassName}
                >
                  {TONES.map((value) => (
                    <option key={value} value={value}>
                      {formStrings.toneOptions[value]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="ai-description-source-language"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {formStrings.sourceLanguage}
                </label>
                <select
                  id="ai-description-source-language"
                  value={sourceLanguage}
                  onChange={(e) => setSourceLanguage(e.target.value)}
                  className={selectClassName}
                >
                  {COMMON_LANGS.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {formStrings.lengths}
              </legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {ALL_LENGTHS.map((value) => {
                  const selected = lengths.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleLength(value)}
                      aria-pressed={selected}
                      className={`${chipBaseClassName} ${
                        selected
                          ? "border-blue-500 bg-blue-500 text-white shadow-sm"
                          : "border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"
                      }`}
                    >
                      {formStrings.lengthOptions[value]}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {formStrings.targetLanguages}
              </legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {COMMON_LANGS.map((lang) => {
                  const selected = targetLanguages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleTargetLanguage(lang)}
                      aria-pressed={selected}
                      className={`${chipBaseClassName} ${
                        selected
                          ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                          : "border-slate-300 bg-white text-slate-700 hover:border-amber-300 hover:text-amber-700"
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label
                htmlFor="ai-description-keywords"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {formStrings.hintKeywords}
              </label>
              <input
                id="ai-description-keywords"
                type="text"
                value={hintKeywords}
                onChange={(e) => setHintKeywords(e.target.value)}
                placeholder={formStrings.hintKeywordsPlaceholder}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-100"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              >
                {error}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-linear-to-r from-blue-600 to-blue-700 px-5 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(37,99,235,0.35)] transition hover:from-blue-700 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? formStrings.generating : formStrings.generate}
              </button>
              {variants.length > 0 && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {formStrings.retry}
                </button>
              )}
            </div>

            {variants.length === 0 && !loading && !error && (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-sm text-slate-500">
                {formStrings.noVariants}
              </p>
            )}

            <div className="space-y-3">
              {variants.map((variant) => (
                <article
                  key={`${variant.length}-${variant.language}`}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  data-testid={`ai-variant-${variant.length}-${variant.language}`}
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                        {variant.length}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                        {variant.language}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                          toneBadgeClass[variant.tone]
                        }`}
                      >
                        {variant.tone}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-slate-500">
                      {formStrings.words.replace(
                        "{{count}}",
                        String(variant.wordCount),
                      )}
                    </span>
                  </div>

                  <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {variant.text}
                  </p>

                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => onApply(variant.text)}
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      {formStrings.apply}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
