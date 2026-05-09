// ===========================================
// SmartProperty - Fraud Analysis Display Components
// ===========================================

import {
  AlertTriangle,
  Info,
  Loader2,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import {
  FraudAnalysis,
  FraudAnalysisStatus,
  RiskLevel,
} from '../../types/verification';

// ─── Risk level styling ──────────────────────────────────
function riskStyle(level: RiskLevel | undefined) {
  switch (level) {
    case RiskLevel.HIGH:
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        dot: 'bg-red-500',
        label: 'High risk',
      };
    case RiskLevel.MEDIUM:
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-700',
        dot: 'bg-yellow-500',
        label: 'Medium risk',
      };
    case RiskLevel.LOW:
    default:
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        dot: 'bg-green-500',
        label: 'Low risk',
      };
  }
}

// ─── Flag → human-readable description ──────────────────
type FlagSeverity = 'critical' | 'warning' | 'info';

interface FlagInfo {
  label: string;
  description: string;
  severity: FlagSeverity;
}

function describeFlag(rawFlag: string): FlagInfo {
  // Some flags carry a payload after a colon, e.g. "exif_edited_software:adobe photoshop"
  const [key, ...rest] = rawFlag.split(':');
  const payload = rest.join(':');

  switch (key) {
    case 'exif_edited_software':
      return {
        label: `Edited with ${payload || 'photo editor'}`,
        description:
          'EXIF metadata reveals the image was saved by photo-editing software (Photoshop, GIMP, etc.). Strong fraud signal.',
        severity: 'critical',
      };
    case 'exif_modified_date_differs':
      return {
        label: 'Modified date differs from original',
        description:
          'The "modified" timestamp in the EXIF metadata differs from the "original capture" date — possible tampering.',
        severity: 'warning',
      };
    case 'exif_missing':
      return {
        label: 'No camera metadata',
        description:
          'The image has no EXIF metadata. Common for scans, screenshots, and messages sent via WhatsApp/Telegram, but can also hide tampering. Mild signal.',
        severity: 'info',
      };
    case 'exif_unreadable':
      return {
        label: 'Cannot read image',
        description: 'The image file could not be opened to inspect metadata.',
        severity: 'warning',
      };
    case 'very_low_resolution':
      return {
        label: `Very low resolution (${payload})`,
        description:
          'The image is below 500px on its longest side — typical of photos of computer screens or heavily downscaled images that hide details.',
        severity: 'critical',
      };
    case 'low_resolution':
      return {
        label: `Low resolution (${payload})`,
        description:
          'Long side under 900px — real ID/document scans are usually higher resolution.',
        severity: 'warning',
      };
    case 'heavy_compression':
      return {
        label: 'Heavy compression',
        description:
          'File size is unusually small for the image dimensions, suggesting aggressive recompression that can hide tampering.',
        severity: 'warning',
      };
    case 'unusual_aspect_ratio':
      return {
        label: `Unusual aspect ratio (${payload})`,
        description:
          'Aspect ratio doesn\'t match a typical ID card or document — could be a screenshot of an unrelated screen.',
        severity: 'warning',
      };
    case 'name_mismatch':
      return {
        label: 'Name mismatch',
        description: `Name extracted from the document doesn't match the user's profile. ${payload}`,
        severity: 'critical',
      };
    case 'llm_skipped':
      return {
        label: 'AI vision check skipped',
        description:
          payload === 'no_api_key'
            ? 'No AI provider key is configured (set GEMINI_API_KEY or ANTHROPIC_API_KEY in ai-services/.env). Analysis is incomplete.'
            : 'The AI vision check was disabled. Analysis is incomplete.',
        severity: 'info',
      };
    case 'llm_unavailable':
      return {
        label: 'AI vision call failed',
        description: `The AI provider call failed (${payload}). The score is based on other layers only.`,
        severity: 'info',
      };
    case 'ocr_skipped':
      return {
        label: 'OCR skipped',
        description:
          payload === 'tesseract_not_installed'
            ? 'Tesseract OCR is not installed on the AI service. Text extraction and name cross-validation were not performed.'
            : 'OCR was disabled. Text extraction and name cross-validation were not performed.',
        severity: 'info',
      };
    case 'ocr_failed':
      return {
        label: 'OCR failed',
        description: `Text extraction failed (${payload}).`,
        severity: 'info',
      };
    default:
      return {
        label: rawFlag,
        description: 'Unrecognized signal.',
        severity: 'info',
      };
  }
}

function severityClasses(severity: FlagSeverity) {
  switch (severity) {
    case 'critical':
      return 'border-red-300 bg-red-50 text-red-800';
    case 'warning':
      return 'border-yellow-300 bg-yellow-50 text-yellow-800';
    case 'info':
    default:
      return 'border-blue-200 bg-blue-50 text-blue-800';
  }
}

// ─── Compact score badge ─────────────────────────────────
interface FraudScoreBadgeProps {
  score: number;
  riskLevel: RiskLevel;
  size?: 'sm' | 'md';
}

export function FraudScoreBadge({
  score,
  riskLevel,
  size = 'sm',
}: FraudScoreBadgeProps) {
  const s = riskStyle(riskLevel);
  const sizeClass = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${s.bg} ${s.border} ${s.text} ${sizeClass}`}
      title={`Fraud score ${score}/100 — ${s.label}`}
    >
      <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden />
      {s.label} · {score}/100
    </span>
  );
}

// ─── Pending / failed status pill ────────────────────────
export function FraudStatusPill({
  status,
}: {
  status?: FraudAnalysisStatus;
}) {
  if (!status || status === FraudAnalysisStatus.NOT_RUN) {
    return null;
  }
  if (status === FraudAnalysisStatus.PENDING) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
        <Loader2 className="h-3 w-3 animate-spin" />
        AI analyzing...
      </span>
    );
  }
  if (status === FraudAnalysisStatus.FAILED) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600">
        <AlertTriangle className="h-3 w-3" />
        Analysis failed
      </span>
    );
  }
  return null;
}

// ─── Detailed analysis panel ─────────────────────────────
interface FraudAnalysisPanelProps {
  analysis: FraudAnalysis;
}

export function FraudAnalysisPanel({ analysis }: FraudAnalysisPanelProps) {
  const s = riskStyle(analysis.riskLevel);
  const ocrFieldEntries = Object.entries(analysis.ocrFields ?? {});

  // Classify flags
  const describedFlags = analysis.flags.map((f) => ({
    raw: f,
    info: describeFlag(f),
  }));
  const realSignals = describedFlags.filter(
    (f) => f.info.severity !== 'info' || f.raw.startsWith('exif_missing'),
  );
  const skippedLayers = describedFlags.filter(
    (f) =>
      f.raw.startsWith('llm_skipped') ||
      f.raw.startsWith('llm_unavailable') ||
      f.raw.startsWith('ocr_skipped') ||
      f.raw.startsWith('ocr_failed'),
  );

  return (
    <div className={`rounded-lg border ${s.border} ${s.bg} p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {analysis.riskLevel === RiskLevel.HIGH ? (
            <ShieldAlert className={`h-4 w-4 ${s.text}`} />
          ) : analysis.riskLevel === RiskLevel.MEDIUM ? (
            <AlertTriangle className={`h-4 w-4 ${s.text}`} />
          ) : (
            <ShieldCheck className={`h-4 w-4 ${s.text}`} />
          )}
          <h5 className={`text-sm font-semibold ${s.text}`}>
            AI Fraud Analysis
          </h5>
        </div>
        <FraudScoreBadge
          score={analysis.fraudScore}
          riskLevel={analysis.riskLevel}
          size="sm"
        />
      </div>

      {/* Incomplete-analysis warning */}
      {skippedLayers.length > 0 && (() => {
        const noKey = skippedLayers.some((f) =>
          f.raw.startsWith('llm_skipped:no_api_key'),
        );
        return (
          <div className="mb-3 flex items-start gap-2 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold">
                {noKey
                  ? 'AI vision check disabled'
                  : 'Analysis incomplete'}
              </p>
              {noKey ? (
                <p>
                  No API key configured. Set{' '}
                  <code className="rounded bg-amber-100 px-1 font-mono">
                    GEMINI_API_KEY
                  </code>{' '}
                  in{' '}
                  <code className="rounded bg-amber-100 px-1 font-mono">
                    ai-services/.env
                  </code>{' '}
                  to enable fraud detection and OCR. Get a free key at{' '}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline"
                  >
                    aistudio.google.com/apikey
                  </a>
                  .
                </p>
              ) : (
                <p>
                  Some checks were skipped — the score may understate actual
                  risk. See details below.
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Detected signals */}
      {realSignals.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-medium text-gray-600">
            Detected signals
          </p>
          <ul className="space-y-1">
            {realSignals.map(({ raw, info }, idx) => (
              <li
                key={`${raw}-${idx}`}
                className={`rounded border px-2 py-1 text-xs ${severityClasses(info.severity)}`}
                title={info.description}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{info.label}</span>
                  <span className="text-[10px] uppercase tracking-wide opacity-60">
                    {info.severity}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] opacity-80">
                  {info.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* LLM findings */}
      {analysis.llmFindings && analysis.llmFindings.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-medium text-gray-600">
            AI vision findings
          </p>
          <ul className="list-disc space-y-0.5 pl-5 text-xs text-gray-800">
            {analysis.llmFindings.map((finding, idx) => (
              <li key={`finding-${idx}`}>{finding}</li>
            ))}
          </ul>
        </div>
      )}

      {/* OCR fields */}
      {ocrFieldEntries.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-medium text-gray-600">
            Extracted fields (OCR)
          </p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {ocrFieldEntries.map(([key, value]) => (
              <div key={key} className="flex gap-1">
                <dt className="font-medium text-gray-600">{key}:</dt>
                <dd className="truncate text-gray-900">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Skipped layers (collapsed) */}
      {skippedLayers.length > 0 && (
        <details className="mb-2">
          <summary className="cursor-pointer text-xs font-medium text-gray-600">
            Skipped layers ({skippedLayers.length})
          </summary>
          <ul className="mt-1 space-y-1">
            {skippedLayers.map(({ raw, info }, idx) => (
              <li
                key={`skipped-${raw}-${idx}`}
                className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
              >
                <span className="font-medium">{info.label}</span>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  {info.description}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* No flags case */}
      {realSignals.length === 0 &&
        skippedLayers.length === 0 &&
        (!analysis.llmFindings || analysis.llmFindings.length === 0) && (
          <p className="text-xs text-gray-600">
            No suspicious signals detected.
          </p>
        )}

      <p className="mt-2 text-[10px] text-gray-500">
        Analyzed {new Date(analysis.analyzedAt).toLocaleString()}
      </p>
    </div>
  );
}
