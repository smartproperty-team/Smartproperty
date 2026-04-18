import { AppSidebar, HomeFooter } from "@/components/layout";
import applicationService from "@/services/application.service";
import leaseService from "@/services/lease.service";
import { useAuthStore } from "@/store";
import { ApplicationStatus, type Application } from "@/types/application";
import {
  LeaseDepositStatus,
  LeaseSignatureMethod,
  LeaseStatus,
  type Lease,
} from "@/types/lease";
import { canManageLeases, isOwner, isPlatformAdmin } from "@/utils";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

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
  const { leaseId: leaseIdFromPath = "" } = useParams<{ leaseId?: string }>();
  const [searchParams] = useSearchParams();
  const leaseIdFromQuery = searchParams.get("leaseId") || leaseIdFromPath;
  const applicationIdFromQuery = searchParams.get("applicationId") || "";

  const { user } = useAuthStore();
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
  });

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

      if (draft.selectedLeaseId) {
        setSelectedLeaseId(draft.selectedLeaseId);
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
        setSignatureForm(draft.signatureForm);
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

  const loadLeases = async () => {
    setLoading(true);
    try {
      const response =
        viewMode === "managed" && managementEnabled
          ? await leaseService.getManaged({ page: 1, limit: 100 })
          : await leaseService.getMine({ page: 1, limit: 100 });
      setLeases(response.items);
      if (
        leaseIdFromQuery &&
        response.items.some((lease) => lease.id === leaseIdFromQuery)
      ) {
        setSelectedLeaseId(leaseIdFromQuery);
      } else if (response.items.length > 0 && !selectedLeaseId) {
        setSelectedLeaseId(response.items[0].id);
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
  }, [viewMode, leaseIdFromQuery]);

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

    try {
      await leaseService.signLease(selectedLease.id, {
        method: signatureForm.method,
        note: signatureForm.note || undefined,
      });
      setNotice("Lease signature recorded.");
      setError(null);
      await loadLeases();
    } catch (signError) {
      setError(getApiErrorMessage(signError, "Failed to sign lease."));
    }
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
                            Property: {lease.propertyId}
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
                <section className="mb-6 rounded-xl border border-gray-200 p-4">
                  <h2 className="mb-2 text-lg font-semibold text-gray-900">
                    Selected Lease
                  </h2>
                  <p className="text-sm text-gray-700">
                    {selectedLease.leaseNumber || selectedLease.id} | status:{" "}
                    {selectedLease.status}
                  </p>
                  <p className="text-sm text-gray-700">
                    Property: {selectedLease.propertyId} | Tenant:{" "}
                    {selectedLease.tenantId}
                  </p>
                  <p className="text-sm text-gray-700">
                    Rent: {selectedLease.monthlyRent ?? "-"}{" "}
                    {selectedLease.currency || ""}
                  </p>
                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Personalized Contract Draft
                    </p>
                    <pre className="whitespace-pre-wrap text-xs text-gray-700">
                      {selectedLease.generatedTemplate ||
                        "No generated contract template available yet."}
                    </pre>
                  </div>
                </section>
              )}

              {managementEnabled && (
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

              {canOwnerValidate && selectedLease && (
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
                  <form
                    className="grid gap-3 md:grid-cols-2"
                    onSubmit={handleSign}
                  >
                    <label className="text-sm text-gray-700">
                      Signature Method
                      <select
                        value={signatureForm.method}
                        onChange={(event) =>
                          setSignatureForm((previous) => ({
                            ...previous,
                            method: event.target.value as LeaseSignatureMethod,
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
