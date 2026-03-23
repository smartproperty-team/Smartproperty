import { AppSidebar, HomeFooter } from "@/components/layout";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { maintenanceService } from "@/services/maintenance.service";
import type {
  MaintenanceRequest,
  MaintenanceStatus,
} from "@/types/maintenance";
import { Clock3, RefreshCw, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const STATUS_META: Record<
  MaintenanceStatus,
  { label: string; badgeClass: string }
> = {
  submitted: {
    label: "Submitted",
    badgeClass: "bg-slate-100 text-slate-700",
  },
  triaged: {
    label: "Triaged",
    badgeClass: "bg-blue-100 text-blue-700",
  },
  assigned: {
    label: "Assigned",
    badgeClass: "bg-indigo-100 text-indigo-700",
  },
  scheduled: {
    label: "Scheduled",
    badgeClass: "bg-violet-100 text-violet-700",
  },
  in_progress: {
    label: "In progress",
    badgeClass: "bg-amber-100 text-amber-700",
  },
  waiting_parts: {
    label: "Waiting parts",
    badgeClass: "bg-orange-100 text-orange-700",
  },
  completed: {
    label: "Completed",
    badgeClass: "bg-emerald-100 text-emerald-700",
  },
  closed: {
    label: "Closed",
    badgeClass: "bg-emerald-100 text-emerald-700",
  },
  canceled: {
    label: "Canceled",
    badgeClass: "bg-rose-100 text-rose-700",
  },
  rejected: {
    label: "Rejected",
    badgeClass: "bg-red-100 text-red-700",
  },
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleString();
}

function wasReopenedAfterProviderCancellation(
  request: MaintenanceRequest,
): boolean {
  return (
    request.status === "triaged" &&
    (request.statusReason || "").toLowerCase().includes("released by provider")
  );
}

export default function MyMaintenanceRequestsPage() {
  const [items, setItems] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const location = useLocation();

  const highlightedRequestId = useMemo(
    () => new URLSearchParams(location.search).get("requestId"),
    [location.search],
  );

  const loadMyRequests = async () => {
    setLoading(true);
    try {
      const list = await maintenanceService.getMyRequests();
      setItems(list);
    } catch {
      setMessage({
        type: "error",
        text: "Failed to load your maintenance requests.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMyRequests();
  }, []);

  return (
    <>
      <AppSidebar />
      <div className="min-h-screen bg-gray-50 pt-16 lg:pt-24">
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                My Maintenance Request Status
              </h1>
              <p className="mt-2 text-gray-600">
                Track the latest status for requests you created.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadMyRequests()}
              isLoading={loading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>

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
            <Card>
              <CardContent className="p-6 text-sm text-gray-600">
                Loading your requests...
              </CardContent>
            </Card>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-gray-600">
                  You have no maintenance requests yet.
                </p>
                <div className="mt-4">
                  <Link to="/maintenance/requests/new">
                    <Button type="button">
                      <Wrench className="mr-2 h-4 w-4" />
                      Create Request
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const statusMeta = STATUS_META[item.status];
                const isHighlighted = highlightedRequestId === item.id;
                const title = item.issueTitle || "Untitled issue";
                const isReopened = wasReopenedAfterProviderCancellation(item);

                return (
                  <Card
                    key={item.id}
                    className={
                      isHighlighted ? "ring-2 ring-indigo-400" : undefined
                    }
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-lg text-gray-900">{title}</span>
                        <span
                          className={`inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badgeClass}`}
                        >
                          <Clock3 className="h-3.5 w-3.5" />
                          {statusMeta.label}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isReopened && (
                        <div className="mb-3 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                          Reopened after provider cancellation
                        </div>
                      )}

                      <div className="grid gap-3 text-sm text-gray-700 md:grid-cols-2">
                        <p>
                          <span className="font-semibold text-gray-800">
                            Category:
                          </span>{" "}
                          {item.category || "N/A"}
                        </p>
                        <p>
                          <span className="font-semibold text-gray-800">
                            Priority:
                          </span>{" "}
                          {item.priority || "N/A"}
                        </p>
                        <p>
                          <span className="font-semibold text-gray-800">
                            Created:
                          </span>{" "}
                          {formatDate(item.createdAt)}
                        </p>
                        <p>
                          <span className="font-semibold text-gray-800">
                            Last update:
                          </span>{" "}
                          {formatDate(item.updatedAt)}
                        </p>
                      </div>

                      {item.statusReason && (
                        <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700">
                          <p className="font-semibold text-gray-800">
                            Status note
                          </p>
                          <p className="mt-1">{item.statusReason}</p>
                        </div>
                      )}

                      {isReopened && (
                        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                          <p className="font-semibold">History</p>
                          <p className="mt-1">
                            Reopened after provider cancellation on{" "}
                            {formatDate(item.updatedAt)}.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
        <HomeFooter />
      </div>
    </>
  );
}
