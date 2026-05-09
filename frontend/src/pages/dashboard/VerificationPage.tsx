// ===========================================
// SmartProperty - Tenant Verification Page
// ===========================================

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileImage,
  FileText,
  Lock,
  RefreshCw,
  Shield,
  ShieldCheck,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppSidebar } from "../../components/layout";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui";
import { FraudStatusPill } from "../../components/verification/FraudAnalysisDisplay";
import { verificationService } from "../../services/verification.service";
import { useAuthStore } from "../../store";
import {
  DocumentType,
  TenantVerification,
  VerificationDocument,
  VerificationStatus,
} from "../../types/verification";

// ─── Status helpers ──────────────────────────────────────────
function statusConfig(status: VerificationStatus) {
  const map: Record<
    VerificationStatus,
    { label: string; color: string; bg: string; icon: React.ReactNode }
  > = {
    [VerificationStatus.NOT_SUBMITTED]: {
      label: "Not Submitted",
      color: "text-gray-600",
      bg: "bg-gray-100",
      icon: <AlertCircle className="h-5 w-5 text-gray-500" />,
    },
    [VerificationStatus.PENDING]: {
      label: "Pending Review",
      color: "text-yellow-700",
      bg: "bg-yellow-50",
      icon: <Clock className="h-5 w-5 text-yellow-500" />,
    },
    [VerificationStatus.UNDER_REVIEW]: {
      label: "Under Review",
      color: "text-blue-700",
      bg: "bg-blue-50",
      icon: <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />,
    },
    [VerificationStatus.VERIFIED]: {
      label: "Verified",
      color: "text-green-700",
      bg: "bg-green-50",
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    },
    [VerificationStatus.REJECTED]: {
      label: "Rejected",
      color: "text-red-700",
      bg: "bg-red-50",
      icon: <XCircle className="h-5 w-5 text-red-500" />,
    },
  };
  return map[status];
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// ─── Upload dropzone sub-component ──────────────────────────
interface DropZoneProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  accept: string;
  documents: VerificationDocument[];
  onUpload: (file: File) => Promise<void>;
  onDelete: (docId: string) => Promise<void>;
  uploading: boolean;
  disabled?: boolean;
}

function DropZone({
  label,
  description,
  icon,
  accept,
  documents,
  onUpload,
  onDelete,
  uploading,
  disabled,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      await onUpload(files[0]);
    },
    [onUpload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleDelete = async (docId: string) => {
    setDeletingId(docId);
    try {
      await onDelete(docId);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{label}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>

      {/* Drop area */}
      <div
        className={`relative rounded-xl border-2 border-dashed transition-colors ${
          dragActive
            ? "border-indigo-400 bg-indigo-50"
            : "border-gray-300 bg-gray-50 hover:border-gray-400"
        } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={disabled ? undefined : handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || uploading}
        aria-label={`Upload ${label}`}
        onKeyDown={(e) => {
          if (disabled || uploading) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <div className="flex flex-col items-center justify-center py-8 px-4">
          {uploading ? (
            <>
              <RefreshCw className="h-10 w-10 text-indigo-400 animate-spin mb-3" />
              <p className="text-sm font-medium text-indigo-600">
                Uploading...
              </p>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-gray-400 mb-3" />
              <p className="text-sm font-medium text-gray-700">
                Drag & drop your file here or{" "}
                <span className="text-indigo-600 underline">browse</span>
              </p>
              <p className="mt-1 text-xs text-gray-500">
                PDF, JPG, PNG up to 10MB
              </p>
            </>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Uploaded documents */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => {
            const st = statusConfig(doc.status);
            return (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                    {doc.mimeType.startsWith("image/") ? (
                      <FileImage className="h-5 w-5 text-indigo-500" />
                    ) : (
                      <FileText className="h-5 w-5 text-indigo-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {doc.fileName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatBytes(doc.fileSize)} •{" "}
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${st.bg} ${st.color}`}
                  >
                    {st.icon}
                    {st.label}
                  </span>
                  <FraudStatusPill status={doc.fraudAnalysisStatus} />
                  {/* Note: full fraud score is admin-only — do not leak signals to tenants. */}
                  {doc.status !== VerificationStatus.VERIFIED && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(doc.id);
                      }}
                      disabled={deletingId === doc.id}
                      aria-label={`Delete ${doc.fileName}`}
                      title={`Delete ${doc.fileName}`}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                    >
                      {deletingId === doc.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────
export default function VerificationPage() {
  const { user } = useAuthStore();

  const [verification, setVerification] = useState<TenantVerification | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [uploadingIdentity, setUploadingIdentity] = useState(false);
  const [uploadingIncome, setUploadingIncome] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Fetch verification status
  const fetchStatus = useCallback(async () => {
    try {
      const data = await verificationService.getVerificationStatus();
      setVerification(data);
    } catch {
      // If no verification record, set a default empty one
      setVerification({
        id: "",
        userId: user?.id || "",
        identityDocuments: [],
        incomeDocuments: [],
        overallStatus: VerificationStatus.NOT_SUBMITTED,
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll while AI analysis is running so the tenant sees the pending pill
  // disappear without a manual refresh.
  useEffect(() => {
    const docs = [
      ...(verification?.identityDocuments || []),
      ...(verification?.incomeDocuments || []),
    ];
    const hasPending = docs.some((d) => d.fraudAnalysisStatus === "pending");
    if (!hasPending) return;
    const id = window.setInterval(() => void fetchStatus(), 5000);
    return () => window.clearInterval(id);
  }, [verification, fetchStatus]);

  // Upload handler
  const handleUpload = async (file: File, type: DocumentType) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setMessage({ type: "error", text: "File size exceeds 10MB limit." });
      return;
    }

    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    if (!allowed.includes(file.type)) {
      setMessage({
        type: "error",
        text: "Only PDF, JPG, PNG, and WebP files are accepted.",
      });
      return;
    }

    const setUploading =
      type === DocumentType.IDENTITY
        ? setUploadingIdentity
        : setUploadingIncome;
    setUploading(true);
    setMessage(null);

    try {
      await verificationService.uploadDocument(file, type);
      setMessage({ type: "success", text: "Document uploaded successfully!" });
      await fetchStatus();
    } catch {
      setMessage({
        type: "error",
        text: "Failed to upload document. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  // Delete handler
  const handleDelete = async (docId: string) => {
    setMessage(null);
    try {
      await verificationService.deleteDocument(docId);
      await fetchStatus();
      setMessage({ type: "success", text: "Document removed." });
    } catch {
      setMessage({ type: "error", text: "Failed to remove document." });
    }
  };

  // Submit for review
  const handleSubmit = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      await verificationService.submitForReview();
      await fetchStatus();
      setMessage({
        type: "success",
        text: "Documents submitted for review! We will verify them shortly.",
      });
    } catch {
      setMessage({
        type: "error",
        text: "Failed to submit. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const overall =
    verification?.overallStatus || VerificationStatus.NOT_SUBMITTED;
  const allDocs = [
    ...(verification?.identityDocuments || []),
    ...(verification?.incomeDocuments || []),
  ];
  const pendingAnalysisCount = allDocs.filter(
    (d) => d.fraudAnalysisStatus === "pending",
  ).length;
  const overallConf = statusConfig(overall);
  const hasIdentity = (verification?.identityDocuments.length || 0) > 0;
  const hasIncome = (verification?.incomeDocuments.length || 0) > 0;
  const canSubmit =
    hasIdentity &&
    hasIncome &&
    overall !== VerificationStatus.VERIFIED &&
    overall !== VerificationStatus.UNDER_REVIEW;
  const isVerified = overall === VerificationStatus.VERIFIED;

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar />

      <main className="mx-auto max-w-4xl px-4 py-8 pt-16 sm:px-6 lg:px-8 lg:pt-24">
        {/* Message */}
        {message && (
          <div className="mb-6">
            <Alert
              type={message.type}
              message={message.text}
              onClose={() => setMessage(null)}
            />
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
            <p className="mt-4 text-gray-500">Loading verification status...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overall status banner */}
            <div
              className={`rounded-xl border p-6 ${
                isVerified
                  ? "border-green-200 bg-linear-to-r from-green-50 to-emerald-50"
                  : overall === VerificationStatus.REJECTED
                    ? "border-red-200 bg-linear-to-r from-red-50 to-rose-50"
                    : overall === VerificationStatus.UNDER_REVIEW ||
                        overall === VerificationStatus.PENDING
                      ? "border-yellow-200 bg-linear-to-r from-yellow-50 to-amber-50"
                      : "border-indigo-200 bg-linear-to-r from-indigo-50 to-purple-50"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                    isVerified
                      ? "bg-green-100"
                      : overall === VerificationStatus.REJECTED
                        ? "bg-red-100"
                        : overall === VerificationStatus.UNDER_REVIEW ||
                            overall === VerificationStatus.PENDING
                          ? "bg-yellow-100"
                          : "bg-indigo-100"
                  }`}
                >
                  {isVerified ? (
                    <ShieldCheck className="h-7 w-7 text-green-600" />
                  ) : (
                    <Shield className="h-7 w-7 text-indigo-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">
                    {isVerified
                      ? "Your identity is verified!"
                      : "Verify your identity"}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {isVerified
                      ? "Your documents have been reviewed and approved. You now have full access to all tenant features."
                      : "Upload your identity documents and proof of income to get verified. This helps landlords trust your profile and speeds up rental applications."}
                  </p>
                  <div className="mt-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${overallConf.bg} ${overallConf.color}`}
                    >
                      {overallConf.icon}
                      {overallConf.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress checklist */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Verification Checklist
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      done: hasIdentity,
                      label: "Upload identity document",
                      desc: "Passport, national ID, or driver's license",
                    },
                    {
                      done: hasIncome,
                      label: "Upload proof of income",
                      desc: "Pay stubs, bank statements, or employment letter",
                    },
                    {
                      done:
                        overall === VerificationStatus.PENDING ||
                        overall === VerificationStatus.UNDER_REVIEW ||
                        overall === VerificationStatus.VERIFIED,
                      label: "Submit for review",
                      desc: "Send your documents for verification",
                    },
                    {
                      done: isVerified,
                      label: "Identity verified",
                      desc: "Your profile is now trusted",
                    },
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                          step.done
                            ? "bg-green-100 text-green-600"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {step.done ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <span className="text-xs font-bold">{i + 1}</span>
                        )}
                      </div>
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            step.done ? "text-green-700" : "text-gray-900"
                          }`}
                        >
                          {step.label}
                        </p>
                        <p className="text-xs text-gray-500">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI verification info card */}
            {!isVerified && (
              <Card className="border-blue-100 bg-blue-50/40">
                <CardContent className="flex items-start gap-4 p-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">
                      AI-assisted verification
                    </h4>
                    <p className="mt-1 text-sm text-gray-600">
                      To speed up your review, we run automated checks on your
                      documents the moment you upload them — image quality,
                      metadata, and visual authenticity. If everything looks
                      good, your verification can be approved in minutes
                      instead of days.
                    </p>
                    <ul className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-3">
                      {[
                        {
                          label: "Metadata check",
                          desc: "We inspect EXIF/file data for signs of editing",
                        },
                        {
                          label: "Visual analysis",
                          desc: "AI vision verifies document authenticity",
                        },
                        {
                          label: "Profile matching",
                          desc: "Names extracted from your docs are matched to your profile",
                        },
                      ].map((item) => (
                        <li
                          key={item.label}
                          className="rounded-lg border border-blue-100 bg-white p-3"
                        >
                          <p className="font-medium text-gray-900">
                            {item.label}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {item.desc}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* In-progress AI analysis banner */}
            {pendingAnalysisCount > 0 && (
              <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                <RefreshCw className="h-5 w-5 shrink-0 animate-spin text-blue-600" />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-blue-900">
                    Running AI checks on your{' '}
                    {pendingAnalysisCount === 1
                      ? 'document'
                      : `${pendingAnalysisCount} documents`}
                    ...
                  </p>
                  <p className="mt-0.5 text-xs text-blue-700/80">
                    This usually takes 5-15 seconds. You can keep using the app
                    — we'll update this page automatically.
                  </p>
                </div>
              </div>
            )}

            {/* Upload sections */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Identity documents */}
              <Card>
                <CardContent className="p-6">
                  <DropZone
                    label="Identity Document"
                    description="Passport, national ID, or driver's license"
                    icon={<Shield className="h-5 w-5 text-indigo-600" />}
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    documents={verification?.identityDocuments || []}
                    onUpload={(file) =>
                      handleUpload(file, DocumentType.IDENTITY)
                    }
                    onDelete={handleDelete}
                    uploading={uploadingIdentity}
                    disabled={isVerified}
                  />
                </CardContent>
              </Card>

              {/* Proof of income */}
              <Card>
                <CardContent className="p-6">
                  <DropZone
                    label="Proof of Income"
                    description="Pay stubs, bank statements, or employment letter"
                    icon={<FileText className="h-5 w-5 text-indigo-600" />}
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    documents={verification?.incomeDocuments || []}
                    onUpload={(file) =>
                      handleUpload(file, DocumentType.PROOF_OF_INCOME)
                    }
                    onDelete={handleDelete}
                    uploading={uploadingIncome}
                    disabled={isVerified}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Submit button */}
            {!isVerified && (
              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={handleSubmit}
                  isLoading={submitting}
                  disabled={!canSubmit}
                  className="w-full gap-2 sm:w-auto sm:min-w-60"
                >
                  <ShieldCheck className="h-5 w-5" />
                  Submit for Verification
                </Button>
              </div>
            )}

            {/* Secure storage notice */}
            <Card className="border-indigo-100 bg-indigo-50/50">
              <CardContent className="flex items-start gap-4 p-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                  <Lock className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">
                    Your documents are secure
                  </h4>
                  <p className="mt-1 text-sm text-gray-600">
                    All uploaded documents are encrypted and stored securely
                    using industry-standard cloud storage (AWS S3). Only
                    authorized personnel can access your documents during the
                    verification process. Files are automatically deleted after
                    verification is complete.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {[
                      "AES-256 Encryption",
                      "Secure Cloud Storage",
                      "Auto-deletion",
                      "General Data Protection Regulation (GDPR) Compliant",
                    ].map((badge) => (
                      <span
                        key={badge}
                        className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
