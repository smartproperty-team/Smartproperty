import { AppSidebar, HomeFooter } from "@/components/layout";
import applicationService from "@/services/application.service";
import leaseService from "@/services/lease.service";
import { useAuthStore } from "@/store";
import { ApplicationStatus, type Application } from "@/types/application";
import {
  LeaseDepositStatus,
  LeaseDocumentType,
  LeaseSignatureMethod,
  LeaseStatus,
  type Lease,
} from "@/types/lease";
import { canManageLeases, isOwner, isPlatformAdmin, isTenant } from "@/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const LEASE_WORKSPACE_DRAFT_PREFIX = "lease-workspace-draft";

type LeaseWorkspaceDraft = {
  viewMode?: "mine" | "managed";
  statusFilter?: string;
  selectedLeaseId?: string;
  createForm?: {
    applicationId: string;
    startDate: string;
    endDate: string;
    monthlyRent: string;
    securityDeposit: string;
    currency: string;
    terms: string;
  };
  ownerDecision?: {
    approved: boolean;
    note: string;
  };
  signatureForm?: {
    method: LeaseSignatureMethod;
    note: string;
    signerName?: string;
    acceptedTerms?: boolean;
  };
  renewalForm?: {
    endDate: string;
    monthlyRent: string;
    securityDeposit: string;
    note: string;
  };
  terminationForm?: {
    terminationType: "normal" | "early";
    reason: string;
    effectiveDate: string;
  };
  depositForm?: {
    status: LeaseDepositStatus;
    amountReleased: string;
    note: string;
  };
};

function readDraft(key: string): LeaseWorkspaceDraft | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as LeaseWorkspaceDraft;
  } catch {
    return null;
  }
}

function writeDraft(key: string, draft: LeaseWorkspaceDraft): void {
  try {
    localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // Ignore persistence issues to keep UI responsive.
  }
}

function toIsoDate(value: string): string {
  if (!value) {
    return "";
  }
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function toDisplayDate(value?: string): string {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString();
}

function toDisplayDateFr(value?: string): string {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("fr-FR");
}

function toDisplayMoney(amount?: number, currency?: string): string {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return "-";
  }

  return `${amount} ${currency || ""}`.trim();
}

function toDisplayMoneyFr(amount?: number, currency?: string): string {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return "-";
  }

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency || "EUR",
    currencyDisplay: "symbol",
    maximumFractionDigits: 2,
  }).format(amount);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function looksLikeObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value.trim());
}

function toReadableTemplate(lease: Lease): string {
  const raw =
    lease.generatedTemplate || "No generated contract template available yet.";
  const lines = raw.split("\n");

  const replaceLine = (prefix: string, nextValue?: string) => {
    const index = lines.findIndex((line) => line.startsWith(prefix));
    if (index === -1 || !nextValue?.trim()) {
      return;
    }

    const currentValue = lines[index].slice(prefix.length).trim();
    if (looksLikeObjectId(currentValue) || currentValue === "N/A") {
      lines[index] = `${prefix}${nextValue.trim()}`;
    }
  };

  replaceLine(
    "Property: ",
    lease.propertyTitle || lease.propertyAddress || lease.propertyLocation,
  );
  replaceLine("Tenant: ", lease.tenantName);
  replaceLine("Owner: ", lease.ownerName);
  replaceLine("Manager: ", lease.managerName);

  return lines.join("\n");
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as {
        response?: { data?: { message?: string | string[] } };
      }
    ).response;
    const message = response?.data?.message;

    if (Array.isArray(message)) {
      const firstMessage = message.find(
        (item) => typeof item === "string" && item.trim().length > 0,
      );
      if (firstMessage) {
        return firstMessage;
      }
    }

    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return fallback;
}

export default function LeasesWorkspacePage() {
  const [searchParams] = useSearchParams();
  const applicationIdFromQuery = searchParams.get("applicationId") || "";

  const { user } = useAuthStore();
  const navigate = useNavigate();
  const draftStorageKey = useMemo(
    () => `${LEASE_WORKSPACE_DRAFT_PREFIX}:${user?.id || "anonymous"}`,
    [user?.id],
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);

  const [viewMode, setViewMode] = useState<"mine" | "managed">("mine");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [leases, setLeases] = useState<Lease[]>([]);
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>("");

  const [approvedApplications, setApprovedApplications] = useState<
    Application[]
  >([]);

  const [createForm, setCreateForm] = useState({
    applicationId: applicationIdFromQuery,
    startDate: "",
    endDate: "",
    monthlyRent: "",
    securityDeposit: "",
    currency: "USD",
    terms: "",
  });

  const [ownerDecision, setOwnerDecision] = useState({
    approved: true,
    note: "",
  });

  const [signatureForm, setSignatureForm] = useState({
    method: LeaseSignatureMethod.E_SIGNATURE,
    note: "",
    signerName: "",
    acceptedTerms: false,
  });
  const [signatureProofFile, setSignatureProofFile] = useState<File | null>(
    null,
  );
  const [isDrawingSignature, setIsDrawingSignature] = useState(false);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);
  const signaturePadRef = useRef<HTMLCanvasElement | null>(null);

  const [renewalForm, setRenewalForm] = useState({
    endDate: "",
    monthlyRent: "",
    securityDeposit: "",
    note: "",
  });

  const [terminationForm, setTerminationForm] = useState({
    terminationType: "normal" as "normal" | "early",
    reason: "",
    effectiveDate: "",
  });

  const [depositForm, setDepositForm] = useState({
    status: LeaseDepositStatus.HELD,
    amountReleased: "",
    note: "",
  });

  const [reports, setReports] = useState<{
    occupancyRate?: number;
    vacancyRate?: number;
    projectedAnnualRent?: number;
    expiringCount?: number;
  }>({});

  const managementEnabled = canManageLeases(user);

  const filteredLeases = useMemo(() => {
    if (statusFilter === "all") {
      return leases;
    }
    return leases.filter((lease) => lease.status === statusFilter);
  }, [leases, statusFilter]);

  const selectedLease = useMemo(
    () => leases.find((lease) => lease.id === selectedLeaseId),
    [leases, selectedLeaseId],
  );

  const canOwnerValidate =
    !!user && (isOwner(user) || isPlatformAdmin(user)) && !!selectedLease;

  const latestSignatureProofDocument = useMemo(() => {
    if (!selectedLease?.documents?.length) {
      return undefined;
    }

    return selectedLease.documents
      .filter((document) => document.type === LeaseDocumentType.SIGNATURE_PROOF)
      .slice(-1)[0];
  }, [selectedLease]);

  const ownerSignature = useMemo(() => {
    if (!selectedLease?.signatures?.length) {
      return undefined;
    }

    return selectedLease.signatures
      .filter((signature) => signature.signerId === selectedLease.ownerId)
      .slice(-1)[0];
  }, [selectedLease]);

  const tenantSignature = useMemo(() => {
    if (!selectedLease?.signatures?.length) {
      return undefined;
    }

    return selectedLease.signatures
      .filter((signature) => signature.signerId === selectedLease.tenantId)
      .slice(-1)[0];
  }, [selectedLease]);

  const bothPartiesSigned = useMemo(() => {
    if (!selectedLease?.signatures?.length) {
      return false;
    }

    const normalizedOwnerId = (selectedLease.ownerId || "").toString();
    const normalizedTenantId = (selectedLease.tenantId || "").toString();

    const signedByOwner = selectedLease.signatures.some((signature) => {
      const signerId = (signature.signerId || "").toString();
      const signerRole = (signature.signerRole || "").toString().toLowerCase();
      return signerId === normalizedOwnerId || signerRole === "owner";
    });

    const signedByTenant = selectedLease.signatures.some((signature) => {
      const signerId = (signature.signerId || "").toString();
      const signerRole = (signature.signerRole || "").toString().toLowerCase();
      return signerId === normalizedTenantId || signerRole === "tenant";
    });

    return signedByOwner && signedByTenant;
  }, [selectedLease]);

  const ownerSignatureStatus = useMemo(() => {
    if (!selectedLease) {
      return "Select a lease to see the owner signature status.";
    }

    if (ownerSignature) {
      return `Signed by owner on ${toDisplayDate(ownerSignature.signedAt)}.`;
    }

    return "Missing owner signature.";
  }, [ownerSignature, selectedLease]);

  const tenantSignatureStatus = useMemo(() => {
    if (!selectedLease) {
      return "Select a lease to see the tenant signature status.";
    }

    if (tenantSignature) {
      return `Signed by tenant on ${toDisplayDate(tenantSignature.signedAt)}.`;
    }

    return "Missing tenant signature.";
  }, [selectedLease, tenantSignature]);

  const canShowPaymentDue = !!selectedLease && bothPartiesSigned;

  const showOwnerDecisionForm =
    canOwnerValidate &&
    !!selectedLease &&
    !bothPartiesSigned &&
    selectedLease.status === LeaseStatus.PENDING_OWNER_APPROVAL;

  const initializeSignaturePad = () => {
    const canvas = signaturePadRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.lineJoin = "round";
    context.lineCap = "round";
    context.strokeStyle = "#111827";
    context.lineWidth = 2;
  };

  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = signaturePadRef.current;
    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const clearSignaturePad = () => {
    initializeSignaturePad();
    setHasDrawnSignature(false);
    setSignatureProofFile(null);
  };

  const handleSignaturePointerDown = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    const canvas = signaturePadRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    const point = getCanvasPoint(event);
    if (!context || !point) {
      return;
    }

    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
    setIsDrawingSignature(true);
    setHasDrawnSignature(true);
  };

  const handleSignaturePointerMove = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    if (!isDrawingSignature) {
      return;
    }

    const context = signaturePadRef.current?.getContext("2d");
    const point = getCanvasPoint(event);
    if (!context || !point) {
      return;
    }

    event.preventDefault();
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const handleSignaturePointerUp = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    if (!isDrawingSignature) {
      return;
    }

    const canvas = signaturePadRef.current;
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    setIsDrawingSignature(false);
  };

  const canvasToSignatureFile = async (): Promise<File | null> => {
    const canvas = signaturePadRef.current;
    if (!canvas || !hasDrawnSignature) {
      return null;
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/png");
    });

    if (!blob) {
      return null;
    }

    const signerSlug = signatureForm.signerName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    return new File(
      [blob],
      `lease-signature-${signerSlug || "signer"}-${Date.now()}.png`,
      {
        type: "image/png",
      },
    );
  };

  useEffect(() => {
    const draft = readDraft(draftStorageKey);

    if (draft) {
      if (draft.viewMode) {
        setViewMode(draft.viewMode);
      } else if (managementEnabled) {
        setViewMode("managed");
      }

      if (draft.statusFilter) {
        setStatusFilter(draft.statusFilter);
      }

      if (draft.createForm) {
        setCreateForm((previous) => ({
          ...previous,
          ...draft.createForm,
          applicationId:
            previous.applicationId || draft.createForm?.applicationId || "",
        }));
      } else if (managementEnabled) {
        setViewMode("managed");
      }

      if (draft.ownerDecision) {
        setOwnerDecision(draft.ownerDecision);
      }
      if (draft.signatureForm) {
        setSignatureForm({
          method: draft.signatureForm.method,
          note: draft.signatureForm.note || "",
          signerName: draft.signatureForm.signerName || "",
          acceptedTerms: !!draft.signatureForm.acceptedTerms,
        });
      }
      if (draft.renewalForm) {
        setRenewalForm(draft.renewalForm);
      }
      if (draft.terminationForm) {
        setTerminationForm(draft.terminationForm);
      }
      if (draft.depositForm) {
        setDepositForm(draft.depositForm);
      }

      setNotice("Draft restored. You can continue where you left off.");
    } else if (managementEnabled) {
      setViewMode("managed");
    }

    setDraftReady(true);
  }, [draftStorageKey, managementEnabled]);

  useEffect(() => {
    if (!draftReady) {
      return;
    }

    writeDraft(draftStorageKey, {
      viewMode,
      statusFilter,
      selectedLeaseId,
      createForm,
      ownerDecision,
      signatureForm,
      renewalForm,
      terminationForm,
      depositForm,
    });
  }, [
    createForm,
    depositForm,
    draftReady,
    draftStorageKey,
    ownerDecision,
    renewalForm,
    selectedLeaseId,
    signatureForm,
    statusFilter,
    terminationForm,
    viewMode,
  ]);

  useEffect(() => {
    if (!user || signatureForm.signerName?.trim()) {
      return;
    }

    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    if (!fullName) {
      return;
    }

    setSignatureForm((previous) => ({
      ...previous,
      signerName: fullName,
    }));
  }, [signatureForm.signerName, user]);

  useEffect(() => {
    initializeSignaturePad();
    setHasDrawnSignature(false);
  }, [selectedLeaseId]);

  const loadLeases = async () => {
    setLoading(true);
    try {
      const response =
        viewMode === "managed" && managementEnabled
          ? await leaseService.getManaged({ page: 1, limit: 100 })
          : await leaseService.getMine({ page: 1, limit: 100 });
      setLeases(response.items);
      if (
        selectedLeaseId &&
        !response.items.some((lease) => lease.id === selectedLeaseId)
      ) {
        setSelectedLeaseId("");
      }
      setError(null);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to load leases."));
    } finally {
      setLoading(false);
    }
  };

  const loadApprovedApplications = async () => {
    if (!managementEnabled) {
      return;
    }

    try {
      const response = await applicationService.getReceivedApplications({
        status: ApplicationStatus.APPROVED,
        page: 1,
        limit: 100,
      });
      setApprovedApplications(response.applications);
    } catch {
      setApprovedApplications([]);
    }
  };

  const loadReports = async () => {
    if (!managementEnabled) {
      return;
    }

    try {
      const [occupancy, revenue, expiring] = await Promise.all([
        leaseService.getOccupancyReport(),
        leaseService.getRevenueReport(),
        leaseService.getExpiring(90),
      ]);

      setReports({
        occupancyRate: occupancy.occupancyRate,
        vacancyRate: occupancy.vacancyRate,
        projectedAnnualRent: revenue.projectedAnnualRent,
        expiringCount: expiring.count,
      });
    } catch {
      setReports({});
    }
  };

  useEffect(() => {
    void loadLeases();
  }, [viewMode]);

  useEffect(() => {
    void loadApprovedApplications();
    void loadReports();
  }, [managementEnabled]);

  const handleCreateLease = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!createForm.applicationId.trim()) {
      setError("Please provide an approved application ID.");
      return;
    }

    if (
      createForm.startDate &&
      createForm.endDate &&
      new Date(createForm.endDate) <= new Date(createForm.startDate)
    ) {
      setError("End date must be after start date.");
      return;
    }

    try {
      await leaseService.createFromApprovedApplication(
        createForm.applicationId,
        {
          startDate: toIsoDate(createForm.startDate),
          endDate: toIsoDate(createForm.endDate),
          monthlyRent: Number(createForm.monthlyRent),
          securityDeposit: createForm.securityDeposit
            ? Number(createForm.securityDeposit)
            : undefined,
          currency: createForm.currency || undefined,
          terms: createForm.terms || undefined,
        },
      );

      setNotice("Lease created successfully.");
      setError(null);
      await loadLeases();
    } catch (createError) {
      setError(getApiErrorMessage(createError, "Failed to create lease."));
    }
  };

  const handleOwnerDecision = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedLease) {
      return;
    }

    try {
      await leaseService.reviewOwnerDecision(selectedLease.id, ownerDecision);
      setNotice("Owner decision saved.");
      setError(null);
      await loadLeases();
    } catch (decisionError) {
      setError(
        getApiErrorMessage(decisionError, "Failed to save owner decision."),
      );
    }
  };

  const handleSign = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedLease) {
      return;
    }

    if (!signatureForm.signerName.trim()) {
      setError("Please type your full name before signing.");
      return;
    }

    if (!signatureForm.acceptedTerms) {
      setError(
        "Please confirm agreement with the contract terms before signing.",
      );
      return;
    }

    try {
      let signatureProofDocumentId: string | undefined;
      const generatedSignatureFile = await canvasToSignatureFile();
      const proofFileToUpload = signatureProofFile || generatedSignatureFile;

      if (proofFileToUpload) {
        const leaseWithUploadedProof = await leaseService.uploadDocument(
          selectedLease.id,
          proofFileToUpload,
          LeaseDocumentType.SIGNATURE_PROOF,
          `Signature proof uploaded by ${signatureForm.signerName.trim()}`,
        );

        const proofDocuments = (leaseWithUploadedProof.documents || []).filter(
          (document) => document.type === LeaseDocumentType.SIGNATURE_PROOF,
        );
        signatureProofDocumentId = proofDocuments.slice(-1)[0]?.id;
      }

      await leaseService.signLease(selectedLease.id, {
        method: signatureForm.method,
        note:
          signatureForm.note ||
          `Signed digitally by ${signatureForm.signerName.trim()}`,
        documentId: signatureProofDocumentId,
      });
      setNotice("Lease signature recorded.");
      setError(null);
      setSignatureForm((previous) => ({
        ...previous,
        note: "",
        acceptedTerms: false,
      }));
      clearSignaturePad();
      setSignatureProofFile(null);
      await loadLeases();
    } catch (signError) {
      setError(getApiErrorMessage(signError, "Failed to sign lease."));
    }
  };

  const handleExportContractPdf = () => {
    if (!selectedLease) {
      return;
    }

    const contractText =
      toReadableTemplate(selectedLease) ||
      "Aucun modèle de contrat généré pour le moment.";

    const findLatestProofForUser = (userId?: string) => {
      if (!userId || !selectedLease.documents?.length) {
        return undefined;
      }

      return selectedLease.documents
        .filter(
          (document) =>
            document.type === LeaseDocumentType.SIGNATURE_PROOF &&
            document.uploadedBy === userId,
        )
        .slice(-1)[0];
    };

    const renderSignatureBlock = (
      title: string,
      signerName?: string,
      signedAt?: string,
      proof?: {
        name: string;
        url: string;
        mimeType: string;
      },
    ) => {
      const proofMarkup = proof
        ? proof.mimeType?.startsWith("image/")
          ? `<img src="${escapeHtml(proof.url)}" alt="${escapeHtml(title)}" />`
          : `<p>Justificatif: ${escapeHtml(proof.name)}</p><p>${escapeHtml(proof.url)}</p>`
        : "<p>Aucune preuve de signature jointe.</p>";

      return `
        <div class="signature-party">
          <p class="signature-title">${escapeHtml(title)}</p>
          <p>Nom: ${escapeHtml(signerName || "Non signé")}</p>
          <p>Date de signature: ${escapeHtml(toDisplayDateFr(signedAt))}</p>
          <div class="signature-proof">${proofMarkup}</div>
        </div>
      `;
    };

    const ownerProof = findLatestProofForUser(selectedLease.ownerId);
    const tenantProof = findLatestProofForUser(selectedLease.tenantId);

    const ownerSignatureBlock = renderSignatureBlock(
      "Signature du propriétaire",
      ownerSignature?.signerName ||
        selectedLease.ownerName ||
        selectedLease.ownerId,
      ownerSignature?.signedAt,
      ownerProof,
    );

    const tenantSignatureBlock = renderSignatureBlock(
      "Signature du locataire",
      tenantSignature?.signerName ||
        selectedLease.tenantName ||
        selectedLease.tenantId,
      tenantSignature?.signedAt,
      tenantProof,
    );

    const printableHtml = `
      <html>
        <head>
          <title>Contrat de bail ${selectedLease.leaseNumber || selectedLease.id}</title>
          <style>
            @page { size: A4; margin: 18mm; }
            body { font-family: "Times New Roman", serif; color: #111827; line-height: 1.4; }
            h1 { margin: 0 0 6px; text-align: center; letter-spacing: 0.5px; font-size: 22px; }
            h2 { margin: 18px 0 8px; font-size: 16px; border-bottom: 1px solid #9ca3af; padding-bottom: 2px; }
            p { margin: 6px 0; font-size: 13px; }
            .meta { text-align: center; color: #4b5563; margin-bottom: 14px; }
            .article { margin-top: 10px; }
            .article-title { font-weight: 700; text-transform: uppercase; }
            .box { border: 1px solid #9ca3af; padding: 12px; white-space: pre-wrap; background: #fafafa; }
            .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .party { border: 1px solid #d1d5db; padding: 10px; }
            .signatures { margin-top: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .signature-party { border: 1px solid #9ca3af; padding: 10px; min-height: 180px; }
            .signature-title { margin: 0 0 6px; font-weight: 700; font-size: 13px; }
            .signature-proof { margin-top: 8px; }
            .signature-proof img { max-width: 100%; max-height: 120px; border: 1px solid #d1d5db; display: block; }
            .footer { margin-top: 18px; font-size: 11px; color: #4b5563; text-align: center; }
          </style>
        </head>
        <body>
          <h1>CONTRAT DE BAIL D'HABITATION</h1>
          <p class="meta">Référence: ${escapeHtml(selectedLease.leaseNumber || selectedLease.id)}</p>

          <h2>Identification des parties</h2>
          <div class="parties">
            <div class="party">
              <p><strong>Bailleur (Propriétaire)</strong></p>
              <p>Nom: ${escapeHtml(selectedLease.ownerName || selectedLease.ownerId)}</p>
              <p>Rôle: Propriétaire</p>
            </div>
            <div class="party">
              <p><strong>Preneur (Locataire)</strong></p>
              <p>Nom: ${escapeHtml(selectedLease.tenantName || selectedLease.tenantId)}</p>
              <p>Rôle: Locataire</p>
            </div>
          </div>

          <h2>Désignation du bien loué</h2>
          <p>Bien: ${escapeHtml(selectedLease.propertyTitle || selectedLease.propertyId)}</p>
          <p>Adresse: ${escapeHtml(selectedLease.propertyAddress || selectedLease.propertyLocation || "-")}</p>

          <h2>Conditions financières et durée</h2>
          <p>Loyer mensuel: ${escapeHtml(toDisplayMoneyFr(selectedLease.monthlyRent, selectedLease.currency))}</p>
          <p>Dépôt de garantie: ${escapeHtml(toDisplayMoneyFr(selectedLease.securityDeposit, selectedLease.currency))}</p>
          <p>Date de début: ${escapeHtml(toDisplayDateFr(selectedLease.startDate))}</p>
          <p>Date de fin: ${escapeHtml(toDisplayDateFr(selectedLease.endDate))}</p>

          <h2>Clauses contractuelles</h2>
          <div class="box">${escapeHtml(contractText)}</div>

          <h2>Signatures des parties</h2>
          <div class="signatures">
            ${ownerSignatureBlock}
            ${tenantSignatureBlock}
          </div>

          <p class="footer">Document généré depuis SmartProperty. Veuillez choisir "Enregistrer en PDF" dans la boîte d'impression.</p>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);

    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setNotice(
          'Boîte d\'impression ouverte. Choisissez "Enregistrer en PDF".',
        );
      } catch {
        setError(
          "Impossible d'ouvrir l'impression automatiquement. Utilisez Ctrl+P.",
        );
      } finally {
        window.setTimeout(() => {
          iframe.remove();
        }, 1500);
      }
    };

    const documentRef = iframe.contentDocument;
    if (!documentRef) {
      iframe.remove();
      setError("Impossible de préparer le document PDF.");
      return;
    }

    documentRef.open();
    documentRef.write(printableHtml);
    documentRef.close();
  };

  const handleActivate = async () => {
    if (!selectedLease) {
      return;
    }

    try {
      await leaseService.activateLease(selectedLease.id);
      setNotice("Lease activated.");
      setError(null);
      await loadLeases();
    } catch (activateError) {
      setError(getApiErrorMessage(activateError, "Failed to activate lease."));
    }
  };

  const handleRenew = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedLease) {
      return;
    }

    try {
      await leaseService.renewLease(selectedLease.id, {
        endDate: toIsoDate(renewalForm.endDate),
        monthlyRent: renewalForm.monthlyRent
          ? Number(renewalForm.monthlyRent)
          : undefined,
        securityDeposit: renewalForm.securityDeposit
          ? Number(renewalForm.securityDeposit)
          : undefined,
        note: renewalForm.note || undefined,
      });
      setNotice("Lease renewed.");
      setError(null);
      await loadLeases();
    } catch (renewError) {
      setError(getApiErrorMessage(renewError, "Failed to renew lease."));
    }
  };

  const handleTerminate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedLease) {
      return;
    }

    try {
      await leaseService.terminateLease(selectedLease.id, {
        terminationType: terminationForm.terminationType,
        reason: terminationForm.reason || undefined,
        effectiveDate: terminationForm.effectiveDate
          ? toIsoDate(terminationForm.effectiveDate)
          : undefined,
      });
      setNotice("Lease terminated.");
      setError(null);
      await loadLeases();
    } catch (terminationError) {
      setError(
        getApiErrorMessage(terminationError, "Failed to terminate lease."),
      );
    }
  };

  const handleUpdateDeposit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedLease) {
      return;
    }

    try {
      await leaseService.updateDeposit(selectedLease.id, {
        status: depositForm.status,
        amountReleased: depositForm.amountReleased
          ? Number(depositForm.amountReleased)
          : undefined,
        note: depositForm.note || undefined,
      });
      setNotice("Deposit status updated.");
      setError(null);
      await loadLeases();
    } catch (depositError) {
      setError(
        getApiErrorMessage(depositError, "Failed to update deposit status."),
      );
    }
  };

  return (
    <>
      <AppSidebar />
      <main className="min-h-screen bg-gray-50 px-4 pb-10 pt-20 lg:px-8 lg:pt-28">
        <div className="mx-auto max-w-7xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Leases Workspace
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage approvals, signatures, activation, renewals, and lease
                reports.
              </p>
            </div>
            <button
              type="button"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => void loadLeases()}
            >
              Refresh
            </button>
          </div>

          {error && (
            <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
          {notice && (
            <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {notice}
            </p>
          )}

          <div className="mb-4 grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-3">
            <label className="text-sm text-gray-700">
              <span className="mb-1 block font-medium">Scope</span>
              <select
                value={viewMode}
                onChange={(event) =>
                  setViewMode(event.target.value as "mine" | "managed")
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
              >
                <option value="mine">My Leases</option>
                {managementEnabled && (
                  <option value="managed">Managed Leases</option>
                )}
              </select>
            </label>

            <label className="text-sm text-gray-700">
              <span className="mb-1 block font-medium">Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
              >
                <option value="all">All statuses</option>
                {Object.values(LeaseStatus).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-gray-700">
              <span className="mb-1 block font-medium">Lease</span>
              <select
                value={selectedLeaseId}
                onChange={(event) => setSelectedLeaseId(event.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
              >
                <option value="">Select lease</option>
                {filteredLeases.map((lease) => (
                  <option key={lease.id} value={lease.id}>
                    {lease.leaseNumber || lease.id} - {lease.status}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="mb-4 text-xs text-gray-500">
            Your workspace is auto-saved as draft in this browser. Refresh will
            not lose form progress.
          </p>
          {!selectedLease && (
            <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Select a specific lease to display decision, signature, and
              management sections.
            </p>
          )}

          {loading ? (
            <p className="text-sm text-gray-600">Loading leases...</p>
          ) : (
            <>
              <section className="mb-6 rounded-xl border border-gray-200 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    All Leases
                  </h2>
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                    {filteredLeases.length} item(s)
                  </span>
                </div>

                {filteredLeases.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    No leases found for this scope and filter.
                  </p>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    {filteredLeases.map((lease) => {
                      const isSelected = lease.id === selectedLeaseId;

                      return (
                        <button
                          key={lease.id}
                          type="button"
                          onClick={() => setSelectedLeaseId(lease.id)}
                          className={`rounded-lg border p-3 text-left transition-colors ${
                            isSelected
                              ? "border-indigo-300 bg-indigo-50"
                              : "border-gray-200 bg-white hover:bg-gray-50"
                          }`}
                        >
                          <p className="text-sm font-semibold text-gray-900">
                            {lease.leaseNumber || lease.id}
                          </p>
                          <p className="mt-1 text-xs text-gray-600">
                            Status: {lease.status}
                          </p>
                          <p className="text-xs text-gray-600">
                            Property: {lease.propertyTitle || lease.propertyId}
                          </p>
                          <p className="text-xs text-gray-600">
                            Tenant: {lease.tenantName || lease.tenantId}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {managementEnabled && (
                <section className="mb-6 grid gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4 md:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase text-indigo-500">
                      Occupancy
                    </p>
                    <p className="text-xl font-semibold text-indigo-900">
                      {reports.occupancyRate ?? "-"}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-indigo-500">Vacancy</p>
                    <p className="text-xl font-semibold text-indigo-900">
                      {reports.vacancyRate ?? "-"}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-indigo-500">
                      Annual Projection
                    </p>
                    <p className="text-xl font-semibold text-indigo-900">
                      {reports.projectedAnnualRent ?? "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-indigo-500">
                      Expiring (90d)
                    </p>
                    <p className="text-xl font-semibold text-indigo-900">
                      {reports.expiringCount ?? "-"}
                    </p>
                  </div>
                </section>
              )}

              {selectedLease && (
                <>
                  <section className="mb-6 rounded-xl border border-gray-200 p-4">
                    <h2 className="mb-2 text-lg font-semibold text-gray-900">
                      Selected Lease
                    </h2>
                    <p className="text-sm text-gray-700">
                      {selectedLease.leaseNumber || selectedLease.id} | status:{" "}
                      {selectedLease.status}
                    </p>
                    <p className="text-sm text-gray-700">
                      Property:{" "}
                      {selectedLease.propertyTitle || selectedLease.propertyId}
                      {selectedLease.propertyLocation
                        ? ` (${selectedLease.propertyLocation})`
                        : ""}
                    </p>
                    <p className="text-sm text-gray-700">
                      Tenant:{" "}
                      {selectedLease.tenantName || selectedLease.tenantId} |
                      Owner: {selectedLease.ownerName || selectedLease.ownerId}
                      {selectedLease.managerId
                        ? ` | Manager: ${selectedLease.managerName || selectedLease.managerId}`
                        : ""}
                    </p>
                    <p className="text-sm text-gray-700">
                      Period: {toDisplayDate(selectedLease.startDate)} to{" "}
                      {toDisplayDate(selectedLease.endDate)}
                    </p>
                    <p className="text-sm text-gray-700">
                      Rent:{" "}
                      {toDisplayMoney(
                        selectedLease.monthlyRent,
                        selectedLease.currency,
                      )}
                    </p>
                    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Personalized Contract Draft
                      </p>
                      <pre className="whitespace-pre-wrap text-xs text-gray-700">
                        {toReadableTemplate(selectedLease)}
                      </pre>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleExportContractPdf}
                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Export Contract PDF
                      </button>
                    </div>
                    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Latest Signature Proof
                      </p>
                      {latestSignatureProofDocument ? (
                        latestSignatureProofDocument.mimeType?.startsWith(
                          "image/",
                        ) ? (
                          <img
                            src={latestSignatureProofDocument.url}
                            alt="Latest signature proof"
                            className="max-h-24 rounded border border-gray-200"
                          />
                        ) : (
                          <a
                            href={latestSignatureProofDocument.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-indigo-600 hover:text-indigo-700"
                          >
                            {latestSignatureProofDocument.name}
                          </a>
                        )
                      ) : (
                        <p className="text-xs text-gray-600">
                          No signature proof attached yet.
                        </p>
                      )}
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-gray-200 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                          Owner Signature
                        </p>
                        <p className="mt-1 text-sm text-gray-700">
                          {ownerSignatureStatus}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                          Tenant Signature
                        </p>
                        <p className="mt-1 text-sm text-gray-700">
                          {tenantSignatureStatus}
                        </p>
                      </div>
                    </div>
                  </section>

                  {isTenant(user) && selectedLease && canShowPaymentDue && (
                    <section className="mb-6 rounded-xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">
                            💳 Payment Due
                          </h2>
                          <p className="mt-2 text-sm text-gray-700">
                            Monthly rent:{" "}
                            <span className="font-semibold text-green-700">
                              {toDisplayMoney(
                                selectedLease.monthlyRent,
                                selectedLease.currency,
                              )}
                            </span>
                          </p>
                          <p className="mt-1 text-xs text-gray-600">
                            Property:{" "}
                            {selectedLease.propertyTitle ||
                              selectedLease.propertyId}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/payments/initiate?leaseId=${selectedLease.id}`,
                            )
                          }
                          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-3 text-lg font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:from-green-700 hover:to-emerald-700"
                        >
                          💰 Pay Now
                        </button>
                      </div>
                    </section>
                  )}
                </>
              )}

              {managementEnabled && !selectedLease && (
                <section className="mb-6 rounded-xl border border-gray-200 p-4">
                  <h2 className="mb-3 text-lg font-semibold text-gray-900">
                    Create Lease From Approved Application
                  </h2>
                  <form
                    className="grid gap-3 md:grid-cols-2"
                    onSubmit={handleCreateLease}
                  >
                    <label className="text-sm text-gray-700">
                      Application ID
                      <input
                        value={createForm.applicationId}
                        onChange={(event) =>
                          setCreateForm((previous) => ({
                            ...previous,
                            applicationId: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        placeholder="Paste approved application ID"
                      />
                    </label>
                    <label className="text-sm text-gray-700">
                      Approved Applications
                      <select
                        value={createForm.applicationId}
                        onChange={(event) =>
                          setCreateForm((previous) => ({
                            ...previous,
                            applicationId: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                      >
                        <option value="">Select approved application</option>
                        {approvedApplications.map((application) => (
                          <option key={application.id} value={application.id}>
                            {application.id} -{" "}
                            {application.propertyTitle ||
                              application.propertyId}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm text-gray-700">
                      Start Date
                      <input
                        type="date"
                        value={createForm.startDate}
                        onChange={(event) =>
                          setCreateForm((previous) => ({
                            ...previous,
                            startDate: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        required
                      />
                    </label>
                    <label className="text-sm text-gray-700">
                      End Date
                      <input
                        type="date"
                        value={createForm.endDate}
                        onChange={(event) =>
                          setCreateForm((previous) => ({
                            ...previous,
                            endDate: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        required
                      />
                    </label>
                    <label className="text-sm text-gray-700">
                      Monthly Rent
                      <input
                        type="number"
                        value={createForm.monthlyRent}
                        onChange={(event) =>
                          setCreateForm((previous) => ({
                            ...previous,
                            monthlyRent: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        required
                      />
                    </label>
                    <label className="text-sm text-gray-700">
                      Security Deposit
                      <input
                        type="number"
                        value={createForm.securityDeposit}
                        onChange={(event) =>
                          setCreateForm((previous) => ({
                            ...previous,
                            securityDeposit: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                    </label>
                    <label className="text-sm text-gray-700">
                      Currency
                      <input
                        value={createForm.currency}
                        onChange={(event) =>
                          setCreateForm((previous) => ({
                            ...previous,
                            currency: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                    </label>
                    <label className="text-sm text-gray-700 md:col-span-2">
                      Terms
                      <textarea
                        value={createForm.terms}
                        onChange={(event) =>
                          setCreateForm((previous) => ({
                            ...previous,
                            terms: event.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        rows={3}
                      />
                    </label>
                    <div className="md:col-span-2">
                      <button
                        type="submit"
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                      >
                        Create Lease
                      </button>
                    </div>
                  </form>
                </section>
              )}

              {showOwnerDecisionForm && selectedLease && (
                <section className="mb-6 rounded-xl border border-gray-200 p-4">
                  <h2 className="mb-3 text-lg font-semibold text-gray-900">
                    Owner Decision
                  </h2>
                  <form
                    className="grid gap-3 md:grid-cols-2"
                    onSubmit={handleOwnerDecision}
                  >
                    <label className="text-sm text-gray-700">
                      Decision
                      <select
                        value={ownerDecision.approved ? "approved" : "rejected"}
                        onChange={(event) =>
                          setOwnerDecision({
                            ...ownerDecision,
                            approved: event.target.value === "approved",
                          })
                        }
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                      >
                        <option value="approved">Approve</option>
                        <option value="rejected">Reject</option>
                      </select>
                    </label>
                    <label className="text-sm text-gray-700">
                      Note
                      <input
                        value={ownerDecision.note}
                        onChange={(event) =>
                          setOwnerDecision({
                            ...ownerDecision,
                            note: event.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                    </label>
                    <div className="md:col-span-2">
                      <button
                        type="submit"
                        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
                      >
                        Save Owner Decision
                      </button>
                    </div>
                  </form>
                </section>
              )}

              {selectedLease && (
                <section className="mb-6 rounded-xl border border-gray-200 p-4">
                  <h2 className="mb-3 text-lg font-semibold text-gray-900">
                    Sign Lease
                  </h2>
                  {bothPartiesSigned ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-sm font-semibold text-emerald-900">
                        Lease signed by both parties.
                      </p>
                      <p className="mt-1 text-sm text-emerald-800">
                        Owner signed on{" "}
                        {toDisplayDate(ownerSignature?.signedAt)}. Tenant signed
                        on {toDisplayDate(tenantSignature?.signedAt)}.
                      </p>
                      {managementEnabled &&
                        selectedLease.status !== LeaseStatus.ACTIVE && (
                          <button
                            type="button"
                            onClick={() => void handleActivate()}
                            className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                          >
                            Activate Lease
                          </button>
                        )}
                    </div>
                  ) : (
                    <form
                      className="grid gap-3 md:grid-cols-2"
                      onSubmit={handleSign}
                    >
                      <label className="text-sm text-gray-700">
                        Full Name
                        <input
                          value={signatureForm.signerName || ""}
                          onChange={(event) =>
                            setSignatureForm((previous) => ({
                              ...previous,
                              signerName: event.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                          placeholder="Type your legal full name"
                          required
                        />
                      </label>
                      <label className="text-sm text-gray-700">
                        Signature Method
                        <select
                          value={signatureForm.method}
                          onChange={(event) =>
                            setSignatureForm((previous) => ({
                              ...previous,
                              method: event.target
                                .value as LeaseSignatureMethod,
                            }))
                          }
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        >
                          {Object.values(LeaseSignatureMethod).map((method) => (
                            <option key={method} value={method}>
                              {method}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm text-gray-700">
                        Note
                        <input
                          value={signatureForm.note}
                          onChange={(event) =>
                            setSignatureForm((previous) => ({
                              ...previous,
                              note: event.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                        />
                      </label>
                      <label className="text-sm text-gray-700 md:col-span-2">
                        Signature Proof (optional)
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(event) =>
                            setSignatureProofFile(
                              event.target.files?.[0] ?? null,
                            )
                          }
                          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2"
                        />
                      </label>
                      <div className="text-sm text-gray-700 md:col-span-2">
                        <div className="mb-1 flex items-center justify-between">
                          <span>Draw Signature (mouse or touch)</span>
                          <button
                            type="button"
                            onClick={clearSignaturePad}
                            className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                          >
                            Clear Signature
                          </button>
                        </div>
                        <canvas
                          ref={signaturePadRef}
                          width={900}
                          height={220}
                          onPointerDown={handleSignaturePointerDown}
                          onPointerMove={handleSignaturePointerMove}
                          onPointerUp={handleSignaturePointerUp}
                          onPointerLeave={handleSignaturePointerUp}
                          style={{ touchAction: "none" }}
                          className="w-full rounded-md border border-gray-300 bg-white"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          If you draw here, it will be uploaded as signature
                          proof and shown in the exported PDF.
                        </p>
                      </div>
                      <label className="flex items-start gap-2 text-sm text-gray-700 md:col-span-2">
                        <input
                          type="checkbox"
                          checked={!!signatureForm.acceptedTerms}
                          onChange={(event) =>
                            setSignatureForm((previous) => ({
                              ...previous,
                              acceptedTerms: event.target.checked,
                            }))
                          }
                          className="mt-1"
                        />
                        <span>
                          I confirm I have reviewed the contract terms and I
                          agree to sign this lease.
                        </span>
                      </label>
                      <div className="md:col-span-2 flex gap-2">
                        <button
                          type="submit"
                          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                        >
                          Sign
                        </button>
                        {managementEnabled && (
                          <button
                            type="button"
                            onClick={() => void handleActivate()}
                            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                          >
                            Activate Lease
                          </button>
                        )}
                      </div>
                    </form>
                  )}
                </section>
              )}

              {managementEnabled && selectedLease && (
                <section className="grid gap-4 md:grid-cols-2">
                  <form
                    className="rounded-xl border border-gray-200 p-4"
                    onSubmit={handleRenew}
                  >
                    <h3 className="mb-2 text-base font-semibold text-gray-900">
                      Renew Lease
                    </h3>
                    <div className="grid gap-2">
                      <input
                        type="date"
                        value={renewalForm.endDate}
                        onChange={(event) =>
                          setRenewalForm((previous) => ({
                            ...previous,
                            endDate: event.target.value,
                          }))
                        }
                        className="rounded-md border border-gray-300 px-3 py-2"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Monthly rent"
                        value={renewalForm.monthlyRent}
                        onChange={(event) =>
                          setRenewalForm((previous) => ({
                            ...previous,
                            monthlyRent: event.target.value,
                          }))
                        }
                        className="rounded-md border border-gray-300 px-3 py-2"
                      />
                      <input
                        type="number"
                        placeholder="Security deposit"
                        value={renewalForm.securityDeposit}
                        onChange={(event) =>
                          setRenewalForm((previous) => ({
                            ...previous,
                            securityDeposit: event.target.value,
                          }))
                        }
                        className="rounded-md border border-gray-300 px-3 py-2"
                      />
                      <input
                        placeholder="Renewal note"
                        value={renewalForm.note}
                        onChange={(event) =>
                          setRenewalForm((previous) => ({
                            ...previous,
                            note: event.target.value,
                          }))
                        }
                        className="rounded-md border border-gray-300 px-3 py-2"
                      />
                    </div>
                    <button
                      type="submit"
                      className="mt-3 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                      Renew Lease
                    </button>
                  </form>

                  <form
                    className="rounded-xl border border-gray-200 p-4"
                    onSubmit={handleTerminate}
                  >
                    <h3 className="mb-2 text-base font-semibold text-gray-900">
                      Terminate Lease
                    </h3>
                    <div className="grid gap-2">
                      <select
                        value={terminationForm.terminationType}
                        onChange={(event) =>
                          setTerminationForm((previous) => ({
                            ...previous,
                            terminationType: event.target.value as
                              | "normal"
                              | "early",
                          }))
                        }
                        className="rounded-md border border-gray-300 px-3 py-2"
                      >
                        <option value="normal">Normal</option>
                        <option value="early">Early</option>
                      </select>
                      <input
                        placeholder="Reason"
                        value={terminationForm.reason}
                        onChange={(event) =>
                          setTerminationForm((previous) => ({
                            ...previous,
                            reason: event.target.value,
                          }))
                        }
                        className="rounded-md border border-gray-300 px-3 py-2"
                      />
                      <input
                        type="date"
                        value={terminationForm.effectiveDate}
                        onChange={(event) =>
                          setTerminationForm((previous) => ({
                            ...previous,
                            effectiveDate: event.target.value,
                          }))
                        }
                        className="rounded-md border border-gray-300 px-3 py-2"
                      />
                    </div>
                    <button
                      type="submit"
                      className="mt-3 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
                    >
                      Terminate Lease
                    </button>
                  </form>

                  <form
                    className="rounded-xl border border-gray-200 p-4 md:col-span-2"
                    onSubmit={handleUpdateDeposit}
                  >
                    <h3 className="mb-2 text-base font-semibold text-gray-900">
                      Security Deposit
                    </h3>
                    <div className="grid gap-2 md:grid-cols-3">
                      <select
                        value={depositForm.status}
                        onChange={(event) =>
                          setDepositForm((previous) => ({
                            ...previous,
                            status: event.target.value as LeaseDepositStatus,
                          }))
                        }
                        className="rounded-md border border-gray-300 px-3 py-2"
                      >
                        {Object.values(LeaseDepositStatus).map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Amount released"
                        value={depositForm.amountReleased}
                        onChange={(event) =>
                          setDepositForm((previous) => ({
                            ...previous,
                            amountReleased: event.target.value,
                          }))
                        }
                        className="rounded-md border border-gray-300 px-3 py-2"
                      />
                      <input
                        placeholder="Note"
                        value={depositForm.note}
                        onChange={(event) =>
                          setDepositForm((previous) => ({
                            ...previous,
                            note: event.target.value,
                          }))
                        }
                        className="rounded-md border border-gray-300 px-3 py-2"
                      />
                    </div>
                    <button
                      type="submit"
                      className="mt-3 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
                    >
                      Update Deposit
                    </button>
                  </form>
                </section>
              )}
            </>
          )}
        </div>
      </main>
      <HomeFooter />
    </>
  );
}
