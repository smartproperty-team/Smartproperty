import { AppSidebar, HomeFooter } from "@/components/layout";
import applicationService from "@/services/application.service";
import leaseService from "@/services/lease.service";
import { ApplicationStatus, type Application } from "@/types/application";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const addMonths = (date: Date, months: number): Date => {
  const clone = new Date(date);
  clone.setMonth(clone.getMonth() + months);
  return clone;
};

const toIsoStartOfDay = (value: Date): string => {
  const cloned = new Date(value);
  cloned.setHours(0, 0, 0, 0);
  return cloned.toISOString();
};

export default function ApplicationsReviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetApplicationId = searchParams.get("applicationId") || "";

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [tenantSearch, setTenantSearch] = useState("");

  const [rejectDraft, setRejectDraft] = useState<{
    applicationId: string;
    reason: string;
  } | null>(null);

  const items = useMemo(
    () =>
      [...applications].sort(
        (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      ),
    [applications],
  );

  const propertyOptions = useMemo(() => {
    const uniqueTitles = new Set(
      items.map((item) => item.propertyTitle || "Unknown property"),
    );
    return Array.from(uniqueTitles).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = tenantSearch.trim().toLowerCase();

    return items.filter((item) => {
      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;
      const currentPropertyTitle = item.propertyTitle || "Unknown property";
      const matchesProperty =
        propertyFilter === "all" || currentPropertyTitle === propertyFilter;

      const searchableText = [
        item.tenantName,
        item.tenantEmail,
        item.propertyTitle,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        searchableText.includes(normalizedSearch);

      return matchesStatus && matchesProperty && matchesSearch;
    });
  }, [items, propertyFilter, statusFilter, tenantSearch]);

  const statusLabelMap: Record<ApplicationStatus, string> = {
    [ApplicationStatus.SUBMITTED]: "Submitted",
    [ApplicationStatus.UNDER_REVIEW]: "Under Review",
    [ApplicationStatus.DOCUMENTS_REQUESTED]: "Documents Requested",
    [ApplicationStatus.VIEWING_SCHEDULED]: "Viewing Scheduled",
    [ApplicationStatus.APPROVED]: "Approved",
    [ApplicationStatus.REJECTED]: "Rejected",
    [ApplicationStatus.WITHDRAWN]: "Withdrawn",
  };

  const formatDate = (value?: string) => {
    if (!value) {
      return "Not provided";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Not provided";
    }

    return date.toLocaleDateString();
  };

  const formatBoolean = (value?: boolean) => {
    if (typeof value !== "boolean") {
      return "Not provided";
    }

    return value ? "Yes" : "No";
  };

  const getApiErrorMessage = (error: unknown, fallback: string) => {
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
  };

  const loadApplications = async () => {
    setLoading(true);
    try {
      const response = await applicationService.getReceivedApplications({
        page: 1,
        limit: 50,
      });
      setApplications(response.applications);
      setError(null);
    } catch {
      setError("Failed to load received applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadApplications();
  }, []);

  useEffect(() => {
    if (targetApplicationId && !loading) {
      const element = document.getElementById(
        `review-app-${targetApplicationId}`,
      );
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add("ring-2", "ring-indigo-500", "ring-offset-2");
          setTimeout(() => {
            element.classList.remove(
              "ring-2",
              "ring-indigo-500",
              "ring-offset-2",
            );
          }, 3000);
        }, 100);
      }
    }
  }, [targetApplicationId, loading]);

  const handleApprove = async (application: Application) => {
    try {
      const approved = await applicationService.approveApplication(
        application.id,
      );

      const desiredMoveInDate = application.questionnaire?.desiredMoveInDate
        ? new Date(application.questionnaire.desiredMoveInDate)
        : new Date();
      const startDate = Number.isNaN(desiredMoveInDate.getTime())
        ? new Date()
        : desiredMoveInDate;
      const endDate = addMonths(startDate, 12);

      const monthlyRent =
        application.propertyPrice ??
        application.questionnaire?.monthlyBudgetMax ??
        application.questionnaire?.monthlyBudgetMin ??
        0;

      const terms = [
        `Personalized lease for tenant ${application.tenantName || application.tenantEmail || application.tenantId}.`,
        `Owner account: ${application.ownerName || application.ownerId}.`,
        application.questionnaire?.reasonForMoving
          ? `Tenant reason for moving: ${application.questionnaire.reasonForMoving}`
          : null,
      ]
        .filter((value): value is string => !!value)
        .join(" ");

      const createdLease = await leaseService.createFromApprovedApplication(
        approved.id,
        {
          startDate: toIsoStartOfDay(startDate),
          endDate: toIsoStartOfDay(endDate),
          monthlyRent,
          securityDeposit: monthlyRent,
          terms,
          customTerms: [
            "This contract must be digitally signed by tenant and owner.",
            application.questionnaire?.hasPets
              ? "Pets are declared in the tenant questionnaire."
              : "No pets declared in questionnaire.",
          ],
        },
      );

      setNotice(
        "Application approved. Personalized lease draft was created and shared for digital signatures.",
      );
      await loadApplications();

      navigate(
        `/leases?leaseId=${createdLease.id}&applicationId=${approved.id}`,
      );
    } catch {
      setError("Failed to approve application and create lease contract.");
    }
  };

  const openRejectPopup = (id: string) => {
    setRejectDraft({ applicationId: id, reason: "" });
  };

  const handleReject = async () => {
    if (!rejectDraft) {
      return;
    }

    const reason = rejectDraft.reason.trim();
    if (!reason) {
      setError("Please provide a rejection reason.");
      return;
    }

    try {
      await applicationService.rejectApplication(
        rejectDraft.applicationId,
        reason,
      );
      setNotice("Application rejected.");
      setRejectDraft(null);
      await loadApplications();
    } catch (error) {
      setError(getApiErrorMessage(error, "Failed to reject application."));
    }
  };

  const handleContactTenant = (application: Application) => {
    if (!application.tenantEmail) {
      setError("Tenant email is not available for this application.");
      return;
    }

    const propertyTitle = application.propertyTitle || "your selected property";
    const subject = `About your application - ${propertyTitle}`;
    const body = [
      `Hello ${application.tenantName || "tenant"},`,
      "",
      `I am reviewing your application for ${propertyTitle}.`,
      "",
      "Best regards,",
      "SmartProperty Team",
    ].join("\n");

    const mailtoUrl = `mailto:${encodeURIComponent(application.tenantEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  return (
    <>
      <AppSidebar />
      <main className="min-h-screen bg-gray-50 px-4 pb-12 pt-20 lg:px-8 lg:pt-28">
        <div className="mx-auto max-w-7xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Received Applications
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Review tenant applications and decide to approve or reject.
              </p>
            </div>
            <button
              type="button"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => void loadApplications()}
            >
              Refresh
            </button>
          </div>

          {error && (
            <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </p>
          )}
          {notice && (
            <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
              {notice}
            </p>
          )}

          {!loading && items.length > 0 && (
            <div className="mb-4 grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-3">
              <label className="text-sm text-gray-700">
                <span className="mb-1 block font-medium">Status</span>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">All statuses</option>
                  {Object.values(ApplicationStatus).map((status) => (
                    <option key={status} value={status}>
                      {statusLabelMap[status]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-gray-700">
                <span className="mb-1 block font-medium">Property</span>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={propertyFilter}
                  onChange={(event) => setPropertyFilter(event.target.value)}
                >
                  <option value="all">All properties</option>
                  {propertyOptions.map((propertyName) => (
                    <option key={propertyName} value={propertyName}>
                      {propertyName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-gray-700">
                <span className="mb-1 block font-medium">Search tenant</span>
                <input
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  placeholder="Name or email"
                  value={tenantSearch}
                  onChange={(event) => setTenantSearch(event.target.value)}
                />
              </label>
            </div>
          )}

          {loading ? (
            <p className="text-sm text-gray-600">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-600">
              No applications received yet.
            </p>
          ) : filteredItems.length === 0 ? (
            <p className="text-sm text-gray-600">
              No applications match your current filters.
            </p>
          ) : (
            <div className="space-y-6">
              {filteredItems.map((application) => {
                const canDecide =
                  application.status === ApplicationStatus.SUBMITTED ||
                  application.status === ApplicationStatus.UNDER_REVIEW ||
                  application.status ===
                    ApplicationStatus.DOCUMENTS_REQUESTED ||
                  application.status === ApplicationStatus.VIEWING_SCHEDULED;

                const statusColors: Record<
                  string,
                  { bg: string; text: string; label: string }
                > = {
                  submitted: {
                    bg: "bg-blue-50",
                    text: "text-blue-700",
                    label: "📋 Submitted",
                  },
                  under_review: {
                    bg: "bg-amber-50",
                    text: "text-amber-700",
                    label: "👀 Under Review",
                  },
                  documents_requested: {
                    bg: "bg-orange-50",
                    text: "text-orange-700",
                    label: "📄 Documents Requested",
                  },
                  viewing_scheduled: {
                    bg: "bg-purple-50",
                    text: "text-purple-700",
                    label: "📅 Viewing Scheduled",
                  },
                  approved: {
                    bg: "bg-emerald-50",
                    text: "text-emerald-700",
                    label: "✅ Approved",
                  },
                  rejected: {
                    bg: "bg-rose-50",
                    text: "text-rose-700",
                    label: "❌ Rejected",
                  },
                  withdrawn: {
                    bg: "bg-gray-50",
                    text: "text-gray-700",
                    label: "⏸️ Withdrawn",
                  },
                };

                const colors =
                  statusColors[application.status] || statusColors.submitted;

                return (
                  <article
                    key={application.id}
                    id={`review-app-${application.id}`}
                    className={`rounded-xl border-2 border-gray-200 p-6 transition-all ${colors.bg}`}
                  >
                    {/* Header with tenant name and status */}
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex-1">
                        <h2 className="text-lg font-bold text-gray-900">
                          {application.tenantName || "Tenant"}
                        </h2>
                        <p className="mt-1 text-sm text-gray-600">
                          {application.tenantEmail}
                          {application.tenantPhone &&
                            ` • ${application.tenantPhone}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1.5 text-sm font-semibold ${colors.text}`}
                        >
                          {colors.label}
                        </span>
                      </div>
                    </div>

                    {/* Property and employment info */}
                    <div className="mt-4 grid gap-4 rounded-lg bg-white p-4 md:grid-cols-3">
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">
                          Property
                        </p>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                          {application.propertyTitle || "Property"}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-600">
                          {application.propertyAddress}
                        </p>
                        {typeof application.propertyPrice === "number" && (
                          <p className="mt-1 text-xs text-gray-700">
                            💰 €{application.propertyPrice.toLocaleString()}
                            /month
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">
                          Employment
                        </p>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                          {application.employmentInfo.jobTitle}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-600">
                          {application.employmentInfo.companyName}
                        </p>
                        <p className="mt-1 text-xs text-gray-700">
                          💼 €
                          {application.employmentInfo.monthlyIncome.toLocaleString()}
                          /month
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">
                          Application details
                        </p>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                          Move-in:{" "}
                          {formatDate(
                            application.questionnaire?.desiredMoveInDate,
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-600">
                          Message:{" "}
                          {application.messageToOwner || "Not provided"}
                        </p>
                        <p className="mt-1 text-xs text-gray-700">
                          Submitted: {formatDate(application.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <section className="rounded-lg border border-gray-200 bg-white p-4">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Tenant Form Details
                        </h3>
                        <div className="mt-3 grid gap-x-4 gap-y-2 text-sm md:grid-cols-2">
                          <p className="text-gray-600">Adults</p>
                          <p className="font-medium text-gray-900">
                            {application.questionnaire?.occupantsAdults ??
                              "Not provided"}
                          </p>

                          <p className="text-gray-600">Children</p>
                          <p className="font-medium text-gray-900">
                            {application.questionnaire?.occupantsChildren ??
                              "Not provided"}
                          </p>

                          <p className="text-gray-600">Pets</p>
                          <p className="font-medium text-gray-900">
                            {formatBoolean(application.questionnaire?.hasPets)}
                          </p>

                          <p className="text-gray-600">Smoking status</p>
                          <p className="font-medium text-gray-900">
                            {application.questionnaire?.smokingStatus ||
                              "Not provided"}
                          </p>

                          <p className="text-gray-600">Lease preference</p>
                          <p className="font-medium text-gray-900">
                            {application.questionnaire
                              ?.leaseDurationPreference || "Not provided"}
                          </p>

                          <p className="text-gray-600">Current address</p>
                          <p className="font-medium text-gray-900">
                            {application.questionnaire?.currentAddress ||
                              "Not provided"}
                          </p>

                          <p className="text-gray-600">Reason for moving</p>
                          <p className="font-medium text-gray-900">
                            {application.questionnaire?.reasonForMoving ||
                              "Not provided"}
                          </p>
                        </div>
                      </section>

                      <section className="rounded-lg border border-gray-200 bg-white p-4">
                        <h3 className="text-sm font-semibold text-gray-900">
                          References
                        </h3>
                        {!application.references ||
                        application.references.length === 0 ? (
                          <p className="mt-3 text-sm text-gray-600">
                            No references provided.
                          </p>
                        ) : (
                          <div className="mt-3 space-y-3">
                            {application.references.map((reference, index) => (
                              <div
                                key={`${application.id}-ref-${index}`}
                                className="rounded-md border border-gray-200 bg-gray-50 p-3"
                              >
                                <p className="text-sm font-semibold text-gray-900">
                                  {reference.name}
                                </p>
                                <p className="text-sm text-gray-700">
                                  {reference.relation}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {reference.email ||
                                    reference.phone ||
                                    "No contact shared"}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    </div>

                    {/* Uploaded Documents Section */}
                    {application.documents &&
                      application.documents.length > 0 && (
                        <div className="mt-4 rounded-lg bg-blue-50 p-4">
                          <p className="mb-3 font-semibold text-blue-900">
                            📂 Uploaded Documents
                          </p>
                          <div className="space-y-2">
                            {application.documents.map((doc) => (
                              <a
                                key={doc.id}
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Open document ${doc.name} (opens in new tab)`}
                                className="flex items-center gap-2 rounded border border-blue-200 bg-white px-3 py-2 text-sm text-blue-700 transition-colors hover:bg-blue-100"
                              >
                                <span>📄</span>
                                <span className="flex-1 truncate font-medium">
                                  {doc.name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {(doc.size / 1024).toFixed(1)} KB
                                </span>
                                <span>↗️</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Requested Documents Status */}
                    {application.requestedDocuments &&
                      application.requestedDocuments.length > 0 && (
                        <div className="mt-4 rounded-lg bg-yellow-50 p-4">
                          <p className="mb-2 font-semibold text-yellow-900">
                            ⏳ Documents Requested
                          </p>
                          <p className="text-sm text-yellow-800">
                            {application.requestedDocuments.join(", ")}
                          </p>
                        </div>
                      )}

                    {/* Action Buttons */}
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        className="flex-1 rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                        onClick={() => handleContactTenant(application)}
                      >
                        📧 Contact Tenant
                      </button>
                      <button
                        type="button"
                        className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => void handleApprove(application)}
                        disabled={!canDecide}
                      >
                        ✅ Approve Application
                      </button>
                      <button
                        type="button"
                        className="flex-1 rounded-lg border-2 border-rose-400 bg-rose-50 px-4 py-3 font-semibold text-rose-700 transition-colors hover:bg-rose-100 active:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => openRejectPopup(application.id)}
                        disabled={!canDecide}
                      >
                        ❌ Reject Application
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
      {rejectDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-rose-900">
              Reject Application
            </h3>
            <p className="mt-2 text-sm text-rose-800">
              Please provide a rejection reason.
            </p>

            <label className="mt-4 block text-sm font-semibold text-gray-900">
              Rejection reason
              <textarea
                className="mt-2 min-h-24 w-full rounded-lg border border-rose-200 px-3 py-2 text-sm text-gray-700 focus:border-rose-400 focus:outline-none"
                value={rejectDraft.reason}
                onChange={(event) =>
                  setRejectDraft((previous) =>
                    previous
                      ? { ...previous, reason: event.target.value }
                      : previous,
                  )
                }
                placeholder="Explain why this application is rejected."
              />
            </label>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                onClick={() => setRejectDraft(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                onClick={() => void handleReject()}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
      <HomeFooter />
    </>
  );
}
