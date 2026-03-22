import { AppSidebar, HomeFooter } from "@/components/layout";
import { Alert } from "@/components/ui";
import applicationService from "@/services/application.service";
import type { Application, ApplicationStatus } from "@/types/application";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

const statusClass: Record<ApplicationStatus, string> = {
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  documents_requested: "bg-orange-100 text-orange-700",
  viewing_scheduled: "bg-violet-100 text-violet-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  withdrawn: "bg-slate-200 text-slate-700",
};

const statusLabel: Record<ApplicationStatus, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  documents_requested: "Documents requested",
  viewing_scheduled: "Viewing scheduled",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const statusEmojis: Record<ApplicationStatus, string> = {
  submitted: "📋",
  under_review: "👀",
  documents_requested: "📄",
  viewing_scheduled: "📅",
  approved: "✅",
  rejected: "❌",
  withdrawn: "⏸️",
};

export default function TenantApplicationsPage() {
  const [searchParams] = useSearchParams();
  const prefilledPropertyId = searchParams.get("propertyId") || "";
  const targetApplicationId = searchParams.get("applicationId") || "";

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [propertyId, setPropertyId] = useState(prefilledPropertyId);
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [messageToOwner, setMessageToOwner] = useState("");
  const [deadline, setDeadline] = useState("");

  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  const sortedApplications = useMemo(
    () =>
      [...applications].sort(
        (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      ),
    [applications],
  );

  const loadApplications = async () => {
    setLoading(true);
    try {
      const response = await applicationService.getMyApplications({
        page: 1,
        limit: 50,
      });
      setApplications(response.applications);
      setError(null);
    } catch {
      setError("Failed to load your applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadApplications();
  }, []);

  useEffect(() => {
    if (prefilledPropertyId && !propertyId) {
      setPropertyId(prefilledPropertyId);
    }
  }, [prefilledPropertyId, propertyId]);

  useEffect(() => {
    if (targetApplicationId && !loading) {
      const element = document.getElementById(`app-${targetApplicationId}`);
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

  const submitApplication = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!propertyId.trim()) {
      setError("Please open a property and click Apply first.");
      return;
    }

    try {
      setError(null);
      setNotice(null);
      await applicationService.submitApplication({
        propertyId,
        employmentInfo: {
          companyName,
          jobTitle,
          monthlyIncome: Number(monthlyIncome),
        },
        messageToOwner: messageToOwner || undefined,
        applicationDeadline: deadline
          ? new Date(deadline).toISOString()
          : undefined,
      });

      setPropertyId("");
      setCompanyName("");
      setJobTitle("");
      setMonthlyIncome("");
      setMessageToOwner("");
      setDeadline("");
      setNotice("Application submitted successfully.");
      await loadApplications();
    } catch {
      setError("Failed to submit application.");
    }
  };

  const withdrawApplication = async (id: string) => {
    const shouldWithdraw = window.confirm(
      "Withdraw this application? You can submit a new one later if needed.",
    );
    if (!shouldWithdraw) {
      return;
    }

    try {
      setError(null);
      await applicationService.withdrawApplication(id);
      setNotice("Application withdrawn.");
      await loadApplications();
    } catch {
      setError("Unable to withdraw this application.");
    }
  };

  const uploadDocument = async (id: string, file: File) => {
    setUploadingFor(id);
    try {
      await applicationService.uploadDocument(id, file);
      setNotice("Document uploaded.");
      await loadApplications();
    } catch {
      setError("Failed to upload document.");
    } finally {
      setUploadingFor(null);
    }
  };

  return (
    <>
      <AppSidebar />
      <main className="min-h-screen bg-gray-50 px-4 pb-12 pt-20 lg:px-8 lg:pt-28">
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                🏠 Apply for a Rental Property
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Fill out your information to apply. The property owner will
                review your application and get back to you.
              </p>
            </div>

            {error && (
              <div className="mt-4" aria-live="assertive">
                <Alert
                  type="error"
                  message={error}
                  onClose={() => setError(null)}
                />
              </div>
            )}
            {notice && (
              <div className="mt-4" aria-live="polite">
                <Alert
                  type="success"
                  message={notice}
                  onClose={() => setNotice(null)}
                />
              </div>
            )}

            <form className="mt-8 space-y-6" onSubmit={submitApplication}>
              {/* Property Selection */}
              <fieldset className="rounded-lg border-2 border-indigo-200 bg-indigo-50 p-4">
                <legend className="font-bold text-indigo-900">
                  Property Selection
                </legend>
                <label className="grid gap-2 text-sm text-gray-700">
                  <span className="font-bold text-indigo-900">
                    🏘️ Which Property?
                  </span>
                  <span className="text-xs text-indigo-700">
                    {prefilledPropertyId
                      ? "✓ This property was selected when you clicked Apply"
                      : "Enter the property ID you want to apply for"}
                  </span>
                  <input
                    id="application-property-id"
                    className={`rounded-lg border-2 px-3 py-2 font-medium text-gray-900 ${
                      prefilledPropertyId
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-gray-300"
                    }`}
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                    placeholder="Enter property ID"
                    readOnly={!!prefilledPropertyId}
                    disabled={!!prefilledPropertyId}
                    required
                    aria-required="true"
                  />
                  {prefilledPropertyId && (
                    <p className="text-xs text-emerald-700">
                      ✓ Property auto-filled
                    </p>
                  )}
                </label>
              </fieldset>

              {/* Employment Information */}
              <fieldset className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                <legend className="font-bold text-blue-900">
                  💼 Your Employment
                </legend>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-1 text-sm text-gray-700">
                    <span className="font-semibold text-gray-900">
                      Company Name
                    </span>
                    <span className="text-xs text-gray-600">
                      Where do you work?
                    </span>
                    <input
                      id="application-company-name"
                      className="mt-1 rounded-lg border border-gray-300 px-3 py-2"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g., Tech Corp, Acme Inc"
                      required
                      aria-required="true"
                    />
                  </label>
                  <label className="grid gap-1 text-sm text-gray-700">
                    <span className="font-semibold text-gray-900">
                      Job Title
                    </span>
                    <span className="text-xs text-gray-600">
                      What's your position?
                    </span>
                    <input
                      id="application-job-title"
                      className="mt-1 rounded-lg border border-gray-300 px-3 py-2"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g., Software Engineer, Manager"
                      required
                      aria-required="true"
                    />
                  </label>
                  <label className="col-span-2 grid gap-1 text-sm text-gray-700">
                    <span className="font-semibold text-gray-900">
                      Monthly Income 💰
                    </span>
                    <span className="text-xs text-gray-600">
                      Your gross monthly salary (helps owners assess
                      affordability)
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-lg font-semibold text-gray-600">
                        €
                      </span>
                      <input
                        id="application-monthly-income"
                        type="number"
                        min="0"
                        className="mt-1 flex-1 rounded-lg border border-gray-300 px-3 py-2"
                        value={monthlyIncome}
                        onChange={(e) => setMonthlyIncome(e.target.value)}
                        placeholder="e.g., 3500"
                        required
                        aria-required="true"
                      />
                    </div>
                  </label>
                </div>
              </fieldset>

              {/* Optional Message */}
              <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-4">
                <label className="grid gap-2 text-sm text-gray-700">
                  <span className="font-bold text-purple-900">
                    💬 Message to Owner (Optional)
                  </span>
                  <span className="text-xs text-purple-700">
                    Tell the owner about yourself, why you're interested in this
                    property, or any special circumstances
                  </span>
                  <textarea
                    className="mt-1 min-h-20 rounded-lg border border-gray-300 px-3 py-2"
                    value={messageToOwner}
                    onChange={(e) => setMessageToOwner(e.target.value)}
                    placeholder="e.g., 'I'm very interested in this property because...'"
                  />
                </label>
              </div>

              {/* Optional Deadline */}
              <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4">
                <label className="grid gap-2 text-sm text-gray-700">
                  <span className="font-bold text-yellow-900">
                    ⏰ When Do You Need a Place? (Optional)
                  </span>
                  <span className="text-xs text-yellow-700">
                    Set a deadline to let the owner know when you need to move
                    in
                  </span>
                  <input
                    type="datetime-local"
                    className="mt-1 rounded-lg border border-gray-300 px-3 py-2"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </label>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 font-bold text-white shadow-lg transition-all hover:shadow-xl hover:from-indigo-700 hover:to-indigo-800 active:scale-95"
                >
                  🚀 Submit My Application
                </button>
              </div>
            </form>
          </section>

          {/* Application History Section */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                📋 My Applications
              </h2>
              <button
                type="button"
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => void loadApplications()}
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-gray-600">
                ⏳ Loading your applications...
              </p>
            ) : sortedApplications.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
                <p className="text-lg text-gray-600">📭 No applications yet</p>
                <p className="mt-2 text-sm text-gray-500">
                  Find a property you like and click "Apply Now" to get started!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedApplications.map((application) => (
                  <article
                    key={application.id}
                    id={`app-${application.id}`}
                    className="rounded-xl border-2 border-gray-200 p-5 transition-all hover:border-indigo-300 hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          🏠{" "}
                          {application.propertyTitle ||
                            application.propertyAddress ||
                            "Your selected property"}
                          {" · "}
                          👤 Owner: {application.ownerName || "Property owner"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          📅{" "}
                          {new Date(application.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </p>
                      </div>
                      <span
                        className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold ${statusClass[application.status]}`}
                      >
                        {statusEmojis[application.status] || "📋"}{" "}
                        {statusLabel[application.status]}
                      </span>
                    </div>

                    {application.rejectionReason && (
                      <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                        ❌{" "}
                        <span className="font-semibold">Rejection Reason:</span>{" "}
                        {application.rejectionReason}
                      </p>
                    )}

                    {application.requestedDocuments.length > 0 && (
                      <div className="mt-3 rounded-lg border-l-4 border-amber-400 bg-amber-50 p-3 text-sm text-amber-800">
                        <p className="font-semibold">📄 Documents Requested:</p>
                        <p className="mt-1">
                          {application.requestedDocuments.join(", ")}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border-2 border-blue-300 bg-blue-50 px-4 py-2 font-semibold text-blue-700 transition-colors hover:bg-blue-100">
                        <span>📎</span>
                        <input
                          id={`upload-${application.id}`}
                          type="file"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              void uploadDocument(application.id, file);
                            }
                          }}
                        />
                        {uploadingFor === application.id
                          ? "Uploading..."
                          : "Upload Document"}
                      </label>

                      {application.status !== "approved" &&
                        application.status !== "rejected" &&
                        application.status !== "withdrawn" && (
                          <button
                            type="button"
                            className="rounded-lg border-2 border-rose-300 bg-rose-50 px-4 py-2 font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                            onClick={() =>
                              void withdrawApplication(application.id)
                            }
                          >
                            ❌ Withdraw Application
                          </button>
                        )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <HomeFooter />
    </>
  );
}
