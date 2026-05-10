// ===========================================
// SmartProperty - Application History Page
// ===========================================

import { AppSidebar, HomeFooter } from "@/components/layout";
import {
  Alert,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { useTranslation } from "@/i18n";
import applicationService from "@/services/application.service";
import { ApplicationStatus, type Application } from "@/types/application";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

type HistoryView = "all" | "current" | "completed";

const ACTIVE_APPLICATION_STATUSES = new Set<ApplicationStatus>([
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.UNDER_REVIEW,
  ApplicationStatus.DOCUMENTS_REQUESTED,
  ApplicationStatus.VIEWING_SCHEDULED,
]);

const statusLabel: Record<ApplicationStatus, string> = {
  submitted: "No response yet",
  under_review: "No response yet",
  documents_requested: "No response yet",
  viewing_scheduled: "No response yet",
  approved: "Approved",
  rejected: "Disapproved",
  withdrawn: "Withdrawn",
};

const statusClasses: Record<ApplicationStatus, string> = {
  submitted: "border-blue-200 bg-blue-50 text-blue-700",
  under_review: "border-amber-200 bg-amber-50 text-amber-700",
  documents_requested: "border-orange-200 bg-orange-50 text-orange-700",
  viewing_scheduled: "border-violet-200 bg-violet-50 text-violet-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  withdrawn: "border-slate-200 bg-slate-50 text-slate-700",
};

function formatDate(value?: string) {
  if (!value) {
    return "Not available";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Not available";
  }

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ApplicationSummaryCard({ application }: { application: Application }) {
  const label = statusLabel[application.status] || application.status;
  const timelineLabel =
    application.status === ApplicationStatus.APPROVED ||
    application.status === ApplicationStatus.REJECTED ||
    application.status === ApplicationStatus.WITHDRAWN
      ? "Completed"
      : "In progress";
  const isActiveApplication = ACTIVE_APPLICATION_STATUSES.has(
    application.status,
  );

  return (
    <article className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-lg font-semibold tracking-tight text-slate-900">
            {application.propertyTitle || "Property application"}
          </p>
          <p className="text-sm text-slate-500">
            Submitted {formatDate(application.createdAt)}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses[application.status]}`}
        >
          {label}
        </span>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-slate-700 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Property
          </p>
          <p className="mt-1 font-medium text-slate-900">
            {application.propertyAddress || "Address not available"}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Status
          </p>
          <p className="mt-1 font-medium text-slate-900">{label}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Owner</p>
          <p className="mt-1 font-medium text-slate-900">
            {application.ownerName || "Not available"}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Timeline
          </p>
          <p className="mt-1 font-medium text-slate-900">{timelineLabel}</p>
          <p className="mt-1 text-xs text-slate-500">
            Updated {formatDate(application.updatedAt)}
          </p>
        </div>
      </div>

      {application.rejectionReason &&
        application.status === ApplicationStatus.REJECTED && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <p className="font-semibold">Disapproval reason</p>
            <p className="mt-1">{application.rejectionReason}</p>
          </div>
        )}

      {application.withdrawnReason &&
        application.status === ApplicationStatus.WITHDRAWN && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
            <p className="font-semibold">Withdrawn reason</p>
            <p className="mt-1">{application.withdrawnReason}</p>
          </div>
        )}

      {isActiveApplication && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Active application</p>
            <p className="text-xs text-slate-500">
              You can cancel this request before it is approved or disapproved.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => {
              const shouldCancel = window.confirm(
                "Cancel this application? The property manager will see it as withdrawn.",
              );
              if (!shouldCancel) {
                return;
              }

              void applicationService.withdrawApplication(
                application.id,
                "Canceled by tenant",
              );
            }}
          >
            Cancel application
          </button>
        </div>
      )}
    </article>
  );
}

export default function ApplicationHistoryPage() {
  const navigate = useNavigate();
  const t = useTranslation();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<HistoryView>("all");
  const [cancelingApplicationId, setCancelingApplicationId] = useState<
    string | null
  >(null);

  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      setLoading(true);
      try {
        const response = await applicationService.getMyApplicationHistory({
          page: 1,
          limit: 100,
        });

        if (!isMounted) {
          return;
        }

        setApplications(response.applications);
        setError(null);
      } catch {
        if (isMounted) {
          setApplications([]);
          setError("Failed to load your application history.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  const { currentApplications, pastApplications } = useMemo(() => {
    const current = applications.filter((application) =>
      ACTIVE_APPLICATION_STATUSES.has(application.status),
    );
    const past = applications.filter(
      (application) => !ACTIVE_APPLICATION_STATUSES.has(application.status),
    );

    return {
      currentApplications: current,
      pastApplications: past,
    };
  }, [applications]);

  const visibleSections = useMemo(() => {
    if (view === "current") {
      return ["current"] as const;
    }

    if (view === "completed") {
      return ["completed"] as const;
    }

    return ["current", "completed"] as const;
  }, [view]);

  const totalApplications = applications.length;

  const handleCancelApplication = async (application: Application) => {
    const shouldCancel = window.confirm(
      "Cancel this application? The property manager will see it as withdrawn.",
    );
    if (!shouldCancel) {
      return;
    }

    setCancelingApplicationId(application.id);
    try {
      await applicationService.withdrawApplication(
        application.id,
        "Canceled by tenant",
      );

      setApplications((prev) =>
        prev.map((entry) =>
          entry.id === application.id
            ? {
                ...entry,
                status: ApplicationStatus.WITHDRAWN,
                withdrawnReason: "Canceled by tenant",
                withdrawnAt: new Date().toISOString(),
              }
            : entry,
        ),
      );
    } catch {
      setError("Unable to cancel this application right now.");
    } finally {
      setCancelingApplicationId(null);
    }
  };

  const summaryCards = [
    {
      key: "all" as const,
      label: "All applications",
      value: totalApplications,
      tone: "text-slate-900",
      accent: "from-slate-900 via-slate-800 to-blue-900",
    },
    {
      key: "current" as const,
      label: "Current",
      value: currentApplications.length,
      tone: "text-blue-700",
      accent: "from-blue-600 via-blue-700 to-indigo-700",
    },
    {
      key: "completed" as const,
      label: "Completed",
      value: pastApplications.length,
      tone: "text-emerald-700",
      accent: "from-emerald-600 via-emerald-700 to-teal-700",
    },
  ];

  const renderSection = (
    title: string,
    subtitle: string,
    applicationsList: Application[],
    emptyMessage: string,
  ) => (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          {title}
        </h2>
        <span className="text-sm text-slate-500">{subtitle}</span>
      </div>
      <div className="space-y-4">
        {applicationsList.length > 0 ? (
          applicationsList.map((application) => (
            <div key={application.id} className="relative">
              <ApplicationSummaryCard application={application} />
              {cancelingApplicationId === application.id && (
                <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-white/75 backdrop-blur-sm">
                  <div className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg">
                    Canceling...
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <Card className="border-slate-200 shadow-sm shadow-slate-100">
            <CardContent className="p-6 text-sm text-slate-600">
              {emptyMessage}
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );

  return (
    <>
      <AppSidebar />
      <main className="min-h-screen bg-gray-50 px-4 pb-12 pt-20 lg:px-8 lg:pt-28">
        <div className="mx-auto max-w-6xl space-y-8">
          <section className="rounded-4xl bg-linear-to-r from-slate-950 via-slate-900 to-blue-900 p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.25)] sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-200/90">
              Tenant portal
            </p>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-3xl space-y-3">
                <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
                  Application History
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
                  Review every application you have sent, including current
                  submissions, approved outcomes, rejected decisions, and
                  withdrawn requests. Active applications stay marked as no
                  response yet until someone replies.
                </p>
                <div className="flex flex-wrap gap-2 pt-1 text-xs font-semibold">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-white/90 backdrop-blur">
                    Current applications
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-white/90 backdrop-blur">
                    Past applications
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-white/90 backdrop-blur">
                    Status timeline
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-sm">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-blue-50"
                  onClick={() => navigate("/properties")}
                >
                  Start new application
                </button>
              </div>
            </div>
          </section>

          {error && (
            <Alert
              type="error"
              message={error}
              onClose={() => setError(null)}
            />
          )}

          <section className="grid gap-4 sm:grid-cols-3">
            {summaryCards.map((card) => {
              const isActive = view === card.key;
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => setView(card.key)}
                  className={`text-left transition-transform duration-200 hover:-translate-y-0.5 ${
                    isActive ? "ring-2 ring-slate-900 ring-offset-2 ring-offset-gray-50" : ""
                  }`}
                >
                  <Card className="h-full overflow-hidden border-slate-200 shadow-sm shadow-slate-100">
                    <div className={`h-1 bg-linear-to-r ${card.accent}`} />
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold text-slate-600">
                        {card.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-end justify-between gap-4">
                      <p className={`text-3xl font-black tracking-tight ${card.tone}`}>
                        {loading ? "…" : card.value}
                      </p>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {isActive ? "Showing" : "Filter"}
                      </span>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </section>

          {loading ? (
            <Card className="border-slate-200 shadow-sm shadow-slate-100">
              <CardContent className="p-6 text-sm text-gray-600">
                Loading your applications...
              </CardContent>
            </Card>
          ) : applications.length === 0 ? (
            <Card className="border-slate-200 shadow-sm shadow-slate-100">
              <CardContent className="p-10 text-center">
                <p className="text-lg font-semibold tracking-tight text-slate-900">
                  No applications yet
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Once you submit an application, its status will appear here.
                </p>
                <Link
                  to="/properties"
                  className="mt-6 inline-flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  Browse properties
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {visibleSections.includes("current") && renderSection(
                "Current applications",
                "No response yet until reviewed",
                currentApplications,
                "No current applications waiting for a response.",
              )}

              {visibleSections.includes("completed") && renderSection(
                "Past applications",
                "Approved, disapproved, or withdrawn",
                pastApplications,
                "You do not have any completed applications yet.",
              )}
            </div>
          )}
        </div>
      </main>
      <HomeFooter />
    </>
  );
}
