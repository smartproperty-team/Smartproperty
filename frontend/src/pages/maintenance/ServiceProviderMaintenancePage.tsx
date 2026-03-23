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
type ProviderUpdatableStatus =
  | "in_progress"
  | "waiting_parts"
  | "completed"
  | "canceled";

import { Clock3, Wrench } from "lucide-react";
import { useEffect, useState } from "react";

const providerStatusOptions: Array<{
  value: MaintenanceStatus;
  label: string;
}> = [
  { value: "in_progress", label: "In progress" },
  { value: "waiting_parts", label: "Waiting parts" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
];

export default function ServiceProviderMaintenancePage() {
  const [items, setItems] = useState<MaintenanceRequest[]>([]);
  const [availableItems, setAvailableItems] = useState<MaintenanceRequest[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [pendingById, setPendingById] = useState<Record<string, boolean>>({});
  const [statusDraftById, setStatusDraftById] = useState<
    Record<string, string>
  >({});
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [reportSummaryById, setReportSummaryById] = useState<
    Record<string, string>
  >({});
  const [invoiceAmountById, setInvoiceAmountById] = useState<
    Record<string, string>
  >({});
  const [invoiceRefById, setInvoiceRefById] = useState<Record<string, string>>(
    {},
  );

  const loadAssigned = async () => {
    setLoading(true);
    try {
      const [list, available] = await Promise.all([
        maintenanceService.getAssignedRequests(),
        maintenanceService.getAvailableRequests(),
      ]);
      setItems(list);
      setAvailableItems(available);
    } catch {
      setMessage({
        type: "error",
        text: "Failed to load maintenance requests.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAssigned();
  }, []);

  const setPending = (id: string, value: boolean) => {
    setPendingById((prev) => ({ ...prev, [id]: value }));
  };

  const handleStatusUpdate = async (id: string) => {
    const status = statusDraftById[id] as ProviderUpdatableStatus | undefined;
    if (!status) {
      setMessage({ type: "error", text: "Please select a status first." });
      return;
    }

    setPending(id, true);
    try {
      await maintenanceService.updateProviderStatus(id, {
        status,
        reason: reasonById[id] || undefined,
      });
      setMessage({ type: "success", text: "Status updated successfully." });
      await loadAssigned();
    } catch {
      setMessage({ type: "error", text: "Failed to update status." });
    } finally {
      setPending(id, false);
    }
  };

  const handleReportSubmit = async (id: string) => {
    setPending(id, true);
    try {
      await maintenanceService.submitServiceReport(id, {
        workPerformedSummary: reportSummaryById[id] || undefined,
        invoiceAmount: invoiceAmountById[id]
          ? Number(invoiceAmountById[id])
          : undefined,
        invoiceReference: invoiceRefById[id] || undefined,
      });
      setMessage({ type: "success", text: "Service report submitted." });
      await loadAssigned();
    } catch {
      setMessage({ type: "error", text: "Failed to submit service report." });
    } finally {
      setPending(id, false);
    }
  };

  const handleClaim = async (id: string) => {
    setPending(id, true);
    try {
      await maintenanceService.claimRequest(id);
      setMessage({
        type: "success",
        text: "Request claimed successfully. It is now in your assigned jobs.",
      });
      await loadAssigned();
    } catch {
      setMessage({ type: "error", text: "Failed to claim request." });
    } finally {
      setPending(id, false);
    }
  };

  return (
    <>
      <AppSidebar />
      <div className="min-h-screen bg-gray-50 pt-16 lg:pt-24">
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Service Provider Maintenance Jobs
            </h1>
            <p className="mt-2 text-gray-600">
              View assigned requests, update progress, and submit intervention
              reports.
            </p>
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
                Loading maintenance requests...
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Available Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  {availableItems.length === 0 ? (
                    <p className="text-sm text-gray-600">
                      No open requests to claim right now.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {availableItems.map((item) => (
                        <div
                          key={`available-${item.id}`}
                          className="rounded-lg border border-gray-200 p-3"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">
                                {item.issueTitle || "Untitled issue"}
                              </p>
                              <p className="text-sm text-gray-600">
                                {item.category || "N/A"} •{" "}
                                {item.priority || "N/A"}
                              </p>
                            </div>
                            <Button
                              type="button"
                              onClick={() => handleClaim(item.id)}
                              isLoading={pendingById[item.id] === true}
                            >
                              Claim Request
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>My Assigned Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  {items.length === 0 ? (
                    <p className="text-sm text-gray-600">
                      No maintenance requests assigned yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {items.map((item) => (
                        <Card key={item.id}>
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center justify-between gap-3 text-lg">
                              <span>{item.issueTitle || "Untitled issue"}</span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                                <Clock3 className="h-3.5 w-3.5" />
                                {item.status.replace("_", " ")}
                              </span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid gap-3 text-sm md:grid-cols-2">
                              <p>
                                <span className="font-semibold text-gray-700">
                                  Category:
                                </span>{" "}
                                {item.category || "N/A"}
                              </p>
                              <p>
                                <span className="font-semibold text-gray-700">
                                  Priority:
                                </span>{" "}
                                {item.priority || "N/A"}
                              </p>
                              <p>
                                <span className="font-semibold text-gray-700">
                                  Property ID:
                                </span>{" "}
                                {item.propertyId}
                              </p>
                              <p>
                                <span className="font-semibold text-gray-700">
                                  Contact:
                                </span>{" "}
                                {item.contactPhone || "N/A"}
                              </p>
                            </div>

                            <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-700">
                              <p className="font-semibold text-gray-800">
                                Description
                              </p>
                              <p className="mt-1">
                                {item.description || "No description provided."}
                              </p>
                            </div>

                            <div className="grid gap-3 md:grid-cols-3">
                              <div className="md:col-span-1">
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                  Update status
                                </label>
                                <select
                                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                                  value={statusDraftById[item.id] || ""}
                                  onChange={(event) =>
                                    setStatusDraftById((prev) => ({
                                      ...prev,
                                      [item.id]: event.target.value,
                                    }))
                                  }
                                >
                                  <option value="">Select status</option>
                                  {providerStatusOptions.map((option) => (
                                    <option
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="md:col-span-2">
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                  Status note (optional)
                                </label>
                                <input
                                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                                  value={reasonById[item.id] || ""}
                                  onChange={(event) =>
                                    setReasonById((prev) => ({
                                      ...prev,
                                      [item.id]: event.target.value,
                                    }))
                                  }
                                  placeholder="Reason or progress note"
                                />
                              </div>
                            </div>

                            <Button
                              type="button"
                              onClick={() => handleStatusUpdate(item.id)}
                              isLoading={pendingById[item.id] === true}
                            >
                              <Wrench className="mr-2 h-4 w-4" />
                              Update Status
                            </Button>

                            <div className="space-y-3 rounded-lg border border-gray-200 p-3">
                              <p className="text-sm font-semibold text-gray-800">
                                Intervention report
                              </p>
                              <textarea
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                rows={3}
                                value={reportSummaryById[item.id] || ""}
                                onChange={(event) =>
                                  setReportSummaryById((prev) => ({
                                    ...prev,
                                    [item.id]: event.target.value,
                                  }))
                                }
                                placeholder="Work performed summary"
                              />
                              <div className="grid gap-3 md:grid-cols-2">
                                <input
                                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={invoiceAmountById[item.id] || ""}
                                  onChange={(event) =>
                                    setInvoiceAmountById((prev) => ({
                                      ...prev,
                                      [item.id]: event.target.value,
                                    }))
                                  }
                                  placeholder="Invoice amount"
                                />
                                <input
                                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                                  value={invoiceRefById[item.id] || ""}
                                  onChange={(event) =>
                                    setInvoiceRefById((prev) => ({
                                      ...prev,
                                      [item.id]: event.target.value,
                                    }))
                                  }
                                  placeholder="Invoice reference"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleReportSubmit(item.id)}
                                isLoading={pendingById[item.id] === true}
                              >
                                Submit Report
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </main>
        <HomeFooter />
      </div>
    </>
  );
}
