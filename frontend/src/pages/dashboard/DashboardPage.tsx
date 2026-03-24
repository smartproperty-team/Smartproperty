// ===========================================
// SmartProperty - Dashboard Page
// ===========================================

import { AppSidebar, HomeFooter } from "@/components/layout";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import {
  applicationService,
  authService,
  notificationService,
  propertyService,
  verificationService,
} from "@/services";
import { useAuthStore } from "@/store";
import { ApplicationStatus, type Application } from "@/types/application";
import { UserRole } from "@/types/auth";
import type {
  PortfolioConnectorDefinition,
  PortfolioConnectorId,
  PortfolioConnectorSyncResult,
  PortfolioImportPreview,
  PortfolioSummary,
  Property,
} from "@/types/property";
import { VerificationStatus } from "@/types/verification";
import {
  canAccessAdminUsers,
  canCreateMaintenanceRequest,
  canManageAgencyOnboarding,
  canManageAssignedMaintenance,
  canManageProperties,
  canReviewApplications,
  canReviewVerifications,
  canTrackMaintenanceRequests,
  isTenant,
} from "@/utils";
import {
  Bell,
  Building2,
  Download,
  FileText,
  Home,
  Mail,
  Shield,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const ACTIVE_APPLICATION_STATUSES = new Set<ApplicationStatus>([
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.UNDER_REVIEW,
  ApplicationStatus.DOCUMENTS_REQUESTED,
  ApplicationStatus.VIEWING_SCHEDULED,
]);

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuthStore();
  const canManage = canManageProperties(user);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus | null>(null);
  const [ownerProperties, setOwnerProperties] = useState<Property[]>([]);
  const [isLoadingOwnerProperties, setIsLoadingOwnerProperties] =
    useState(false);
  const [tenantApplications, setTenantApplications] = useState<Application[]>(
    [],
  );
  const [receivedApplications, setReceivedApplications] = useState<
    Application[]
  >([]);
  const [isLoadingTenantApplications, setIsLoadingTenantApplications] =
    useState(false);
  const [isLoadingReceivedApplications, setIsLoadingReceivedApplications] =
    useState(false);
  const [showAllTenantApplications, setShowAllTenantApplications] =
    useState(false);
  const [showAllReceivedApplications, setShowAllReceivedApplications] =
    useState(false);
  const [processingReceivedFor, setProcessingReceivedFor] = useState<
    string | null
  >(null);
  const [rejectDraft, setRejectDraft] = useState<{
    applicationId: string;
    reason: string;
  } | null>(null);
  const [expandedHistoryFor, setExpandedHistoryFor] = useState<string | null>(
    null,
  );
  const [withdrawingFor, setWithdrawingFor] = useState<string | null>(null);
  const [withdrawDraft, setWithdrawDraft] = useState<{
    applicationId: string;
    reason: string;
  } | null>(null);
  const [withdrawPopup, setWithdrawPopup] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [tenantApplicationsMessage, setTenantApplicationsMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [receivedApplicationsMessage, setReceivedApplicationsMessage] =
    useState<{
      type: "success" | "error";
      text: string;
    } | null>(null);
  const [approveResultPopup, setApproveResultPopup] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [rejectResultPopup, setRejectResultPopup] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [stats, setStats] = useState({
    first: 0,
    second: 0,
    leases: 0,
    notifications: 0,
  });
  const [portfolioSummary, setPortfolioSummary] =
    useState<PortfolioSummary | null>(null);
  const [isLoadingPortfolioSummary, setIsLoadingPortfolioSummary] =
    useState(false);
  const [isExportingPortfolio, setIsExportingPortfolio] = useState(false);
  const [isExportingPortfolioExcel, setIsExportingPortfolioExcel] =
    useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [portfolioImportFile, setPortfolioImportFile] = useState<File | null>(
    null,
  );
  const [portfolioImportPreview, setPortfolioImportPreview] =
    useState<PortfolioImportPreview | null>(null);
  const [isPreviewingImport, setIsPreviewingImport] = useState(false);
  const [isCommittingImport, setIsCommittingImport] = useState(false);
  const [portfolioImportMessage, setPortfolioImportMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [portfolioConnectors, setPortfolioConnectors] = useState<
    PortfolioConnectorDefinition[]
  >([]);
  const [selectedConnectorId, setSelectedConnectorId] =
    useState<PortfolioConnectorId>("seloger");
  const [connectorEndpointUrl, setConnectorEndpointUrl] = useState("");
  const [isSyncingConnector, setIsSyncingConnector] = useState(false);
  const [connectorSyncResult, setConnectorSyncResult] =
    useState<PortfolioConnectorSyncResult | null>(null);
  const [connectorSyncMessage, setConnectorSyncMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const canAccessPortfolioDashboard =
    canManageProperties(user) ||
    user?.role === UserRole.ACCOUNTANT_ADMIN_ASSISTANT;
  const canRequestMaintenance = canCreateMaintenanceRequest(user);
  const canTrackOwnMaintenance = canTrackMaintenanceRequests(user);
  const canManageMaintenanceAsProvider = canManageAssignedMaintenance(user);

  const applicationStatusClass: Record<ApplicationStatus, string> = {
    submitted: "bg-blue-100 text-blue-700",
    under_review: "bg-amber-100 text-amber-700",
    documents_requested: "bg-orange-100 text-orange-700",
    viewing_scheduled: "bg-violet-100 text-violet-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-rose-100 text-rose-700",
    withdrawn: "bg-slate-200 text-slate-700",
  };

  const applicationStatusLabel: Record<ApplicationStatus, string> = {
    submitted: "Submitted",
    under_review: "Under review",
    documents_requested: "Documents requested",
    viewing_scheduled: "Viewing scheduled",
    approved: "Approved",
    rejected: "Rejected",
    withdrawn: "Withdrawn",
  };

  const formatDateTime = (value?: string) => {
    if (!value) {
      return "Not available";
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return "Not available";
    }

    return parsedDate.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Fetch verification status for tenants
  useEffect(() => {
    if (isTenant(user)) {
      verificationService
        .getVerificationStatus()
        .then((data) => setVerificationStatus(data.overallStatus))
        .catch(() => setVerificationStatus(VerificationStatus.NOT_SUBMITTED));
    }
  }, [user?.role]);

  useEffect(() => {
    if (user?.role !== UserRole.OWNER || !user.id) {
      setOwnerProperties([]);
      return;
    }

    const loadOwnerProperties = async () => {
      setIsLoadingOwnerProperties(true);
      try {
        const response = await propertyService.getProperties({
          ownerId: user.id,
          page: 1,
          limit: 6,
        });
        setOwnerProperties(response.properties);
      } catch {
        setOwnerProperties([]);
      } finally {
        setIsLoadingOwnerProperties(false);
      }
    };

    void loadOwnerProperties();
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!isTenant(user)) {
      setTenantApplications([]);
      return;
    }

    const loadTenantApplications = async () => {
      setIsLoadingTenantApplications(true);
      try {
        const response = await applicationService.getMyApplications({
          page: 1,
          limit: 50,
        });
        setTenantApplications(response.applications);
      } catch {
        setTenantApplications([]);
      } finally {
        setIsLoadingTenantApplications(false);
      }
    };

    void loadTenantApplications();
  }, [user]);

  useEffect(() => {
    if (!canReviewApplications(user)) {
      setReceivedApplications([]);
      return;
    }

    void reloadReceivedApplications();
  }, [user]);

  const reloadReceivedApplications = async () => {
    if (!canReviewApplications(user)) {
      return;
    }

    setIsLoadingReceivedApplications(true);
    try {
      const response = await applicationService.getReceivedApplications({
        page: 1,
        limit: 50,
      });
      setReceivedApplications(response.applications);
    } catch {
      setReceivedApplicationsMessage({
        type: "error",
        text: "Failed to refresh received applications.",
      });
    } finally {
      setIsLoadingReceivedApplications(false);
    }
  };

  const approveReceivedApplication = async (applicationId: string) => {
    try {
      setProcessingReceivedFor(applicationId);
      await applicationService.approveApplication(applicationId);
      setReceivedApplicationsMessage({
        type: "success",
        text: "Application approved.",
      });
      setApproveResultPopup({
        type: "success",
        text: "Application approved successfully.",
      });
      await reloadReceivedApplications();
    } catch {
      setReceivedApplicationsMessage({
        type: "error",
        text: "Unable to approve this application.",
      });
      setApproveResultPopup({
        type: "error",
        text: "Unable to approve this application.",
      });
    } finally {
      setProcessingReceivedFor(null);
    }
  };

  const confirmRejectReceivedApplication = async () => {
    if (!rejectDraft) {
      return;
    }

    const reason = rejectDraft.reason.trim();
    if (!reason) {
      setReceivedApplicationsMessage({
        type: "error",
        text: "Please provide a rejection reason.",
      });
      return;
    }

    try {
      setProcessingReceivedFor(rejectDraft.applicationId);
      await applicationService.rejectApplication(
        rejectDraft.applicationId,
        reason,
      );
      setReceivedApplicationsMessage({
        type: "success",
        text: "Application rejected.",
      });
      setRejectResultPopup({
        type: "success",
        text: "Application rejected successfully.",
      });
      setRejectDraft(null);
      await reloadReceivedApplications();
    } catch {
      setReceivedApplicationsMessage({
        type: "error",
        text: "Unable to reject this application.",
      });
      setRejectResultPopup({
        type: "error",
        text: "Unable to reject this application.",
      });
    } finally {
      setProcessingReceivedFor(null);
    }
  };

  const reloadTenantApplications = async () => {
    if (!isTenant(user)) {
      return;
    }

    setIsLoadingTenantApplications(true);
    try {
      const response = await applicationService.getMyApplications({
        page: 1,
        limit: 50,
      });
      setTenantApplications(response.applications);
    } catch {
      setTenantApplicationsMessage({
        type: "error",
        text: "Failed to refresh applications.",
      });
    } finally {
      setIsLoadingTenantApplications(false);
    }
  };

  const withdrawTenantApplication = async (id: string) => {
    setWithdrawDraft({ applicationId: id, reason: "" });
  };

  const confirmWithdrawTenantApplication = async () => {
    if (!withdrawDraft) {
      return;
    }

    const applicationId = withdrawDraft.applicationId;
    const reason = withdrawDraft.reason.trim() || undefined;

    try {
      setWithdrawingFor(applicationId);
      await applicationService.withdrawApplication(applicationId, reason);
      setTenantApplicationsMessage({
        type: "success",
        text: "Application withdrawn.",
      });
      setWithdrawPopup({
        type: "success",
        text: "Application withdrawn successfully.",
      });
      setWithdrawDraft(null);
      await reloadTenantApplications();
    } catch {
      setTenantApplicationsMessage({
        type: "error",
        text: "Unable to withdraw this application.",
      });
      setWithdrawPopup({
        type: "error",
        text: "Unable to withdraw this application.",
      });
    } finally {
      setWithdrawingFor(null);
    }
  };

  useEffect(() => {
    if (!user?.id) {
      setStats({ first: 0, second: 0, leases: 0, notifications: 0 });
      return;
    }

    const loadStats = async () => {
      let notificationCount = 0;
      try {
        notificationCount = await notificationService.getUnreadCount();
      } catch {
        notificationCount = 0;
      }

      if (isTenant(user)) {
        let browsedCount = 0;
        let applicationCount = 0;

        try {
          const properties = await propertyService.getProperties({
            page: 1,
            limit: 1,
          });
          browsedCount = properties.total;
        } catch {
          browsedCount = 0;
        }

        try {
          const applications = await applicationService.getMyApplications({
            page: 1,
            limit: 1,
          });
          applicationCount = applications.total;
        } catch {
          applicationCount = 0;
        }

        setStats({
          first: browsedCount,
          second: applicationCount,
          leases: 0,
          notifications: notificationCount,
        });
        return;
      }

      if (canManageProperties(user)) {
        let propertyCount = 0;
        let tenantCount = 0;

        try {
          const properties = await propertyService.getProperties({
            page: 1,
            limit: 1,
            ...(user.role === UserRole.OWNER
              ? { ownerId: user.id }
              : { managerId: user.id }),
          });
          propertyCount = properties.total;
        } catch {
          propertyCount = 0;
        }

        if (canReviewApplications(user)) {
          try {
            const received = await applicationService.getReceivedApplications({
              page: 1,
              limit: 100,
            });

            const uniqueTenants = new Set(
              received.applications.map((application) => application.tenantId),
            ).size;

            tenantCount = uniqueTenants || received.total;
          } catch {
            tenantCount = 0;
          }
        }

        setStats({
          first: propertyCount,
          second: tenantCount,
          leases: 0,
          notifications: notificationCount,
        });
        return;
      }

      setStats({
        first: 0,
        second: 0,
        leases: 0,
        notifications: notificationCount,
      });
    };

    void loadStats();
  }, [user]);

  useEffect(() => {
    if (!canAccessPortfolioDashboard) {
      setPortfolioSummary(null);
      return;
    }

    const loadPortfolioSummary = async () => {
      setIsLoadingPortfolioSummary(true);
      try {
        const scope =
          user?.role === UserRole.OWNER
            ? "owner"
            : user?.role === UserRole.SUPER_ADMIN
              ? "all"
              : "manager";

        const summary = await propertyService.getPortfolioSummary({ scope });
        setPortfolioSummary(summary);
      } catch {
        setPortfolioSummary(null);
      } finally {
        setIsLoadingPortfolioSummary(false);
      }
    };

    void loadPortfolioSummary();
  }, [canAccessPortfolioDashboard, user?.role]);

  useEffect(() => {
    if (!canManageProperties(user)) {
      setPortfolioConnectors([]);
      return;
    }

    const loadConnectors = async () => {
      try {
        const connectors = await propertyService.getPortfolioConnectors();
        setPortfolioConnectors(connectors);

        if (connectors.length > 0) {
          setSelectedConnectorId(connectors[0].id);
        }
      } catch {
        setPortfolioConnectors([]);
      }
    };

    void loadConnectors();
  }, [user]);

  const handleExportPortfolio = async () => {
    setIsExportingPortfolio(true);
    try {
      const scope =
        user?.role === UserRole.OWNER
          ? "owner"
          : user?.role === UserRole.SUPER_ADMIN
            ? "all"
            : "manager";

      const payload = await propertyService.exportPortfolioCsv({ scope });
      const blob = new Blob([payload.csv], { type: payload.contentType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = payload.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsExportingPortfolio(false);
    }
  };

  const downloadBase64File = (
    base64: string,
    contentType: string,
    fileName: string,
  ) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: contentType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportPortfolioExcel = async () => {
    setIsExportingPortfolioExcel(true);
    try {
      const scope =
        user?.role === UserRole.OWNER
          ? "owner"
          : user?.role === UserRole.SUPER_ADMIN
            ? "all"
            : "manager";

      const payload = await propertyService.exportPortfolioExcel({ scope });
      downloadBase64File(payload.base64, payload.contentType, payload.fileName);
    } finally {
      setIsExportingPortfolioExcel(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const payload = await propertyService.getPortfolioImportTemplateExcel();
      downloadBase64File(payload.base64, payload.contentType, payload.fileName);
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handlePreviewImport = async () => {
    if (!portfolioImportFile) {
      setPortfolioImportMessage({
        type: "error",
        text: "Please choose a CSV file first.",
      });
      return;
    }

    setIsPreviewingImport(true);
    setPortfolioImportMessage(null);
    try {
      const preview =
        await propertyService.previewPortfolioImport(portfolioImportFile);
      setPortfolioImportPreview(preview);
      setPortfolioImportMessage({
        type: "success",
        text: `Preview ready: ${preview.validRows} valid row(s), ${preview.invalidRows} invalid row(s).`,
      });
    } catch {
      setPortfolioImportPreview(null);
      setPortfolioImportMessage({
        type: "error",
        text: "Import preview failed. Please verify your CSV format and try again.",
      });
    } finally {
      setIsPreviewingImport(false);
    }
  };

  const handleCommitImport = async () => {
    if (!portfolioImportPreview?.acceptedRows?.length) {
      setPortfolioImportMessage({
        type: "error",
        text: "No valid rows to import. Run preview first.",
      });
      return;
    }

    const shouldCommit = window.confirm(
      "Are you sure you want to import the validated rows? This will create new properties.",
    );
    if (!shouldCommit) {
      return;
    }

    setIsCommittingImport(true);
    setPortfolioImportMessage(null);
    try {
      const result = await propertyService.commitPortfolioImport(
        portfolioImportPreview.acceptedRows,
      );

      setPortfolioImportMessage({
        type: "success",
        text: `Import completed: ${result.created} created, ${result.skipped} skipped, ${result.failed} failed.`,
      });

      const scope =
        user?.role === UserRole.OWNER
          ? "owner"
          : user?.role === UserRole.SUPER_ADMIN
            ? "all"
            : "manager";
      const summary = await propertyService.getPortfolioSummary({ scope });
      setPortfolioSummary(summary);
    } catch {
      setPortfolioImportMessage({
        type: "error",
        text: "Import commit failed. Please review rows and try again.",
      });
    } finally {
      setIsCommittingImport(false);
    }
  };

  const handleSyncConnector = async () => {
    if (!canManageProperties(user)) {
      return;
    }

    const selectedConnector = portfolioConnectors.find(
      (connector) => connector.id === selectedConnectorId,
    );

    const isWebhookConnector = selectedConnector?.id === "webhook";
    const endpointUrl = connectorEndpointUrl.trim();

    if (isWebhookConnector && !endpointUrl) {
      setConnectorSyncMessage({
        type: "error",
        text: "Webhook connector requires an endpoint URL.",
      });
      return;
    }

    setIsSyncingConnector(true);
    setConnectorSyncMessage(null);
    setConnectorSyncResult(null);

    try {
      const scope =
        user?.role === UserRole.OWNER
          ? "owner"
          : user?.role === UserRole.SUPER_ADMIN
            ? "all"
            : "manager";

      const result = await propertyService.syncPortfolioConnector({
        connectorId: selectedConnectorId,
        scope,
        dryRun: !isWebhookConnector,
        endpointUrl: isWebhookConnector ? endpointUrl : undefined,
      });

      setConnectorSyncResult(result);
      setConnectorSyncMessage({
        type: "success",
        text: `Connector sync completed: ${result.mappedRecords}/${result.totalRecords} mapped, ${result.failedRecords} failed.`,
      });
    } catch {
      setConnectorSyncMessage({
        type: "error",
        text: "Connector sync failed. Check connector settings and try again.",
      });
    } finally {
      setIsSyncingConnector(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user?.email) return;
    setResendingEmail(true);
    try {
      await authService.resendVerification(user.email);
      setEmailMessage({
        type: "success",
        text: "Verification email sent! Check your inbox or MailHog at localhost:8025",
      });
    } catch {
      setEmailMessage({
        type: "error",
        text: "Failed to send verification email. Please try again.",
      });
    } finally {
      setResendingEmail(false);
    }
  };

  const handleApplicationsCardClick = () => {
    if (canReviewApplications(user)) {
      navigate("/applications/review");
      return;
    }

    if (isTenant(user)) {
      navigate("/applications");
    }
  };

  return (
    <>
      <AppSidebar />
      <div className="min-h-screen bg-gray-50 pt-16 lg:pt-24">
        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Email verification warning - only show after initial load */}
          {!isLoading && user && !user.isEmailVerified && (
            <div className="mb-6">
              <Alert
                type="warning"
                title="Email not verified"
                message="Please verify your email address to access all features."
              />
              <div className="mt-2 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResendVerification}
                  isLoading={resendingEmail}
                >
                  Resend Verification Email
                </Button>
                <a
                  href="http://localhost:8025"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open MailHog (opens in new tab)"
                  className="text-sm text-indigo-600 hover:underline"
                >
                  Open MailHog
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </div>
              {emailMessage && (
                <div className="mt-2">
                  <Alert
                    type={emailMessage.type}
                    message={emailMessage.text}
                    onClose={() => setEmailMessage(null)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.firstName}! 👋
            </h1>
            <p className="mt-2 text-gray-600">
              {canManage
                ? "Here's what's happening with your properties today."
                : "Browse available properties and manage your applications."}
            </p>
            {canRequestMaintenance && (
              <div className="mt-4">
                <Button onClick={() => navigate("/maintenance/requests/new")}>
                  <Wrench className="mr-2 h-4 w-4" />
                  Request Maintenance
                </Button>
              </div>
            )}
            {canTrackOwnMaintenance && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => navigate("/maintenance/requests/mine")}
                >
                  <Wrench className="mr-2 h-4 w-4" />
                  My Maintenance Status
                </Button>
              </div>
            )}
            {canManageMaintenanceAsProvider && (
              <div className="mt-4">
                <Button
                  onClick={() => navigate("/maintenance/requests/assigned")}
                >
                  <Wrench className="mr-2 h-4 w-4" />
                  Manage Maintenance Requests
                </Button>
              </div>
            )}
          </div>

          {/* Verify Me CTA - Show for tenants (hide if verified or rejected) */}
          {isTenant(user) &&
            verificationStatus !== VerificationStatus.VERIFIED &&
            verificationStatus !== VerificationStatus.REJECTED && (
              <div className="mb-8">
                <div className="relative overflow-hidden rounded-xl border border-indigo-200 bg-linear-to-r from-indigo-500 via-purple-500 to-indigo-600 p-6 shadow-lg">
                  <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
                  <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white/10" />
                  <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                        <ShieldCheck className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          Get Verified
                        </h3>
                        <p className="text-sm text-indigo-100">
                          Upload your documents to build trust with landlords
                          and speed up your applications.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => navigate("/verification")}
                      className="shrink-0 bg-white text-indigo-600 shadow-md hover:bg-indigo-50 focus-visible:ring-white"
                      size="lg"
                    >
                      <ShieldCheck className="mr-2 h-5 w-5" />
                      Verify Me
                    </Button>
                  </div>
                </div>
              </div>
            )}

          {/* Super Administrator: Review Verifications CTA */}
          {canReviewVerifications(user) && (
            <div className="mb-8">
              <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-linear-to-r from-amber-500 via-orange-500 to-red-500 p-6 shadow-lg">
                <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
                <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white/10" />
                <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                      <Shield className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        Tenant Verifications
                      </h3>
                      <p className="text-sm text-amber-100">
                        Review and approve tenant identity & income documents.
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      onClick={() =>
                        navigate("/super-administrator/verifications")
                      }
                      className="bg-white text-amber-700 shadow-md hover:bg-amber-50 focus-visible:ring-white"
                      size="lg"
                    >
                      <Shield className="mr-2 h-5 w-5" />
                      Review Verifications
                    </Button>
                    {canAccessAdminUsers(user) && (
                      <Button
                        onClick={() => navigate("/super-administrator/users")}
                        className="bg-white text-amber-700 shadow-md hover:bg-amber-50 focus-visible:ring-white"
                        size="lg"
                      >
                        <Users className="mr-2 h-5 w-5" />
                        Manage Users
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Branch Manager: Agencies CTA */}
          {canManageAgencyOnboarding(user) && (
            <div className="mb-8">
              <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-linear-to-r from-emerald-500 via-teal-500 to-cyan-500 p-6 shadow-lg">
                <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
                <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white/10" />
                <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                      <Building2 className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        Agency Management
                      </h3>
                      <p className="text-sm text-emerald-100">
                        View your agencies and create a new one with automatic
                        role account provisioning.
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      onClick={() => navigate("/branch-manager/agencies")}
                      className="bg-white text-emerald-700 shadow-md hover:bg-emerald-50 focus-visible:ring-white"
                      size="lg"
                    >
                      <Building2 className="mr-2 h-5 w-5" />
                      My Agencies
                    </Button>
                    <Button
                      onClick={() => navigate("/branch-manager/agencies/new")}
                      className="bg-white text-emerald-700 shadow-md hover:bg-emerald-50 focus-visible:ring-white"
                      size="lg"
                    >
                      <Building2 className="mr-2 h-5 w-5" />
                      New Agency
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="flex items-center p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100">
                  <Home className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.first}
                  </p>
                  <p className="text-sm text-gray-500">
                    {canManage ? "Properties" : "Browsed"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card
              className={
                canReviewApplications(user) || isTenant(user)
                  ? "cursor-pointer transition hover:shadow-md"
                  : ""
              }
              onClick={handleApplicationsCardClick}
              onKeyDown={(event) => {
                if (
                  (event.key === "Enter" || event.key === " ") &&
                  (canReviewApplications(user) || isTenant(user))
                ) {
                  event.preventDefault();
                  handleApplicationsCardClick();
                }
              }}
              role={
                canReviewApplications(user) || isTenant(user)
                  ? "button"
                  : undefined
              }
              tabIndex={
                canReviewApplications(user) || isTenant(user) ? 0 : undefined
              }
              aria-label={
                canReviewApplications(user) || isTenant(user)
                  ? "Open applications"
                  : undefined
              }
            >
              <CardContent className="flex items-center p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.second}
                  </p>
                  <p className="text-sm text-gray-500">
                    {canManage ? "Tenants" : "Applications"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.leases}
                  </p>
                  <p className="text-sm text-gray-500">Leases</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100">
                  <Bell className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.notifications}
                  </p>
                  <p className="text-sm text-gray-500">Notifications</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {canReviewApplications(user) && (
            <Card className="mb-8">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Received Applications</CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setShowAllReceivedApplications((previous) => !previous)
                    }
                  >
                    {showAllReceivedApplications ? "Show Less" : "Show All"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate("/applications/review")}
                  >
                    Open Review Workspace
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {receivedApplicationsMessage && (
                  <div className="mb-3">
                    <Alert
                      type={receivedApplicationsMessage.type}
                      message={receivedApplicationsMessage.text}
                      onClose={() => setReceivedApplicationsMessage(null)}
                    />
                  </div>
                )}
                {isLoadingReceivedApplications ? (
                  <p className="text-sm text-gray-600">
                    Loading received applications...
                  </p>
                ) : receivedApplications.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">
                    No received applications right now.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...receivedApplications]
                      .sort(
                        (a, b) =>
                          +new Date(b.createdAt) - +new Date(a.createdAt),
                      )
                      .slice(0, showAllReceivedApplications ? undefined : 6)
                      .map((application) => (
                        <div
                          key={application.id}
                          className="rounded-lg border border-gray-200 p-4"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                {application.propertyTitle ||
                                  application.propertyAddress ||
                                  "Property"}
                              </p>
                              <p className="text-xs text-gray-500">
                                Applicant: {application.tenantName || "Tenant"}
                              </p>
                              <p className="text-xs text-gray-500">
                                Submitted{" "}
                                {formatDateTime(application.createdAt)}
                              </p>
                            </div>
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${applicationStatusClass[application.status]}`}
                            >
                              {applicationStatusLabel[application.status]}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                              onClick={() =>
                                navigate(
                                  `/applications/review?applicationId=${application.id}`,
                                )
                              }
                            >
                              Open Application
                            </button>
                            {ACTIVE_APPLICATION_STATUSES.has(
                              application.status,
                            ) && (
                              <>
                                <button
                                  type="button"
                                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-70"
                                  onClick={() =>
                                    void approveReceivedApplication(
                                      application.id,
                                    )
                                  }
                                  disabled={
                                    processingReceivedFor === application.id
                                  }
                                >
                                  {processingReceivedFor === application.id
                                    ? "Processing..."
                                    : "Approve"}
                                </button>
                                <button
                                  type="button"
                                  className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                                  onClick={() =>
                                    setRejectDraft({
                                      applicationId: application.id,
                                      reason: "",
                                    })
                                  }
                                  disabled={
                                    processingReceivedFor === application.id
                                  }
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {isTenant(user) && (
            <Card className="mb-8">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>My Applied Houses</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setShowAllTenantApplications((previous) => !previous)
                  }
                >
                  {showAllTenantApplications
                    ? "Show Less"
                    : "View All Applications"}
                </Button>
              </CardHeader>
              <CardContent>
                {tenantApplicationsMessage && (
                  <div className="mb-3">
                    <Alert
                      type={tenantApplicationsMessage.type}
                      message={tenantApplicationsMessage.text}
                      onClose={() => setTenantApplicationsMessage(null)}
                    />
                  </div>
                )}
                {isLoadingTenantApplications ? (
                  <p className="text-sm text-gray-600">
                    Loading applications...
                  </p>
                ) : tenantApplications.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">
                    You have not applied to any houses yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...tenantApplications]
                      .sort(
                        (a, b) =>
                          +new Date(b.createdAt) - +new Date(a.createdAt),
                      )
                      .slice(0, showAllTenantApplications ? undefined : 4)
                      .map((application) => {
                        const sortedStatusHistory = (
                          application.statusHistory?.length
                            ? [...application.statusHistory]
                            : [
                                {
                                  status: application.status,
                                  changedAt: application.updatedAt,
                                  changedBy: "system",
                                },
                              ]
                        ).sort(
                          (a, b) =>
                            +new Date(a.changedAt) - +new Date(b.changedAt),
                        );
                        const isHistoryOpen =
                          expandedHistoryFor === application.id;

                        return (
                          <div
                            key={application.id}
                            className="rounded-lg border border-gray-200 p-4"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {application.propertyTitle ||
                                    application.propertyAddress ||
                                    "Applied property"}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Applied on{" "}
                                  {formatDateTime(application.createdAt)}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  Last update:{" "}
                                  {formatDateTime(application.updatedAt)}
                                </p>
                              </div>
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${applicationStatusClass[application.status]}`}
                              >
                                {applicationStatusLabel[application.status]}
                              </span>
                            </div>

                            {application.requestedDocuments.length > 0 && (
                              <p className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800">
                                Documents requested:{" "}
                                {application.requestedDocuments.join(", ")}
                              </p>
                            )}

                            {application.rejectionReason && (
                              <p className="mt-2 rounded-md bg-rose-50 p-2 text-xs text-rose-700">
                                Rejection reason: {application.rejectionReason}
                              </p>
                            )}

                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                onClick={() =>
                                  setExpandedHistoryFor((previous) =>
                                    previous === application.id
                                      ? null
                                      : application.id,
                                  )
                                }
                              >
                                {isHistoryOpen
                                  ? "Hide Status History"
                                  : "View Status History"}
                              </button>

                              {ACTIVE_APPLICATION_STATUSES.has(
                                application.status,
                              ) && (
                                <button
                                  type="button"
                                  className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                                  onClick={() =>
                                    void withdrawTenantApplication(
                                      application.id,
                                    )
                                  }
                                  disabled={withdrawingFor === application.id}
                                >
                                  {withdrawingFor === application.id
                                    ? "Withdrawing..."
                                    : "Withdraw Application"}
                                </button>
                              )}
                            </div>

                            {isHistoryOpen && (
                              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                <p className="text-xs font-semibold text-slate-900">
                                  Status History
                                </p>
                                <ul className="mt-2 space-y-2">
                                  {sortedStatusHistory.map(
                                    (event, eventIndex) => (
                                      <li
                                        key={`${application.id}-status-${eventIndex}`}
                                        className="rounded border border-slate-200 bg-white p-2 text-xs text-slate-700"
                                      >
                                        <p className="font-semibold">
                                          {applicationStatusLabel[event.status]}
                                        </p>
                                        <p className="text-slate-500">
                                          {formatDateTime(event.changedAt)}
                                        </p>
                                        {event.note && (
                                          <p className="mt-1">{event.note}</p>
                                        )}
                                      </li>
                                    ),
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {user?.role === UserRole.OWNER && (
            <Card className="mb-8">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center">
                  <Home className="mr-2 h-5 w-5 text-indigo-600" />
                  My Listed Properties
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/properties")}
                >
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingOwnerProperties ? (
                  <p className="text-sm text-gray-600">
                    Loading your properties...
                  </p>
                ) : ownerProperties.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">
                    You have no listed properties yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ownerProperties.map((property) => {
                      const propertyId = property.id || property._id;
                      const primaryImage =
                        property.images?.find((img) => img.isPrimary) ||
                        property.images?.[0];
                      const imageUrl =
                        primaryImage?.url || "/placeholder-property.svg";

                      return (
                        <div
                          key={propertyId}
                          className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <img
                              src={imageUrl}
                              alt={property.title}
                              className="h-16 w-24 rounded-md object-cover"
                              onError={(event) => {
                                (event.currentTarget as HTMLImageElement).src =
                                  "/placeholder-property.svg";
                              }}
                            />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-gray-900">
                                {property.title}
                              </p>
                              <p className="truncate text-sm text-gray-600">
                                {property.address.city},{" "}
                                {property.address.country}
                              </p>
                              <p className="mt-1 text-sm text-indigo-600">
                                {property.price.toLocaleString()}{" "}
                                {property.currency}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium capitalize text-gray-700">
                              {property.status.replace("_", " ")}
                            </span>
                            {propertyId && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    navigate(`/properties/${propertyId}`)
                                  }
                                >
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    navigate(`/properties/${propertyId}/edit`)
                                  }
                                >
                                  Edit
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {canAccessPortfolioDashboard && (
            <Card className="mb-8">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center">
                  <Building2 className="mr-2 h-5 w-5 text-indigo-600" />
                  Portfolio Management & Data Exchange
                </CardTitle>
                <Button
                  size="sm"
                  onClick={handleExportPortfolio}
                  isLoading={isExportingPortfolio}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingPortfolioSummary ? (
                  <p className="text-sm text-gray-600">
                    Loading portfolio KPIs...
                  </p>
                ) : !portfolioSummary ? (
                  <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">
                    Portfolio summary unavailable right now. Try again in a
                    moment.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-lg border border-gray-200 p-4">
                        <p className="text-sm text-gray-500">
                          Total Properties
                        </p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {portfolioSummary.totals.properties}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 p-4">
                        <p className="text-sm text-gray-500">Listed</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {portfolioSummary.totals.listed}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 p-4">
                        <p className="text-sm text-gray-500">Rented</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {portfolioSummary.totals.rented}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 p-4">
                        <p className="text-sm text-gray-500">Avg Price</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {portfolioSummary.totals.avgPrice.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-lg border border-gray-200 p-4">
                        <p className="mb-2 text-sm font-medium text-gray-700">
                          Top Cities
                        </p>
                        {portfolioSummary.topCities.length === 0 ? (
                          <p className="text-sm text-gray-500">
                            No city data available yet.
                          </p>
                        ) : (
                          <ul className="space-y-1 text-sm text-gray-700">
                            {portfolioSummary.topCities.map((city) => (
                              <li
                                key={city.city}
                                className="flex items-center justify-between"
                              >
                                <span>{city.city}</span>
                                <span className="font-medium">
                                  {city.count}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="rounded-lg border border-gray-200 p-4">
                        <p className="mb-2 text-sm font-medium text-gray-700">
                          Data Quality
                        </p>
                        <ul className="space-y-1 text-sm text-gray-700">
                          <li>
                            Completeness Score:{" "}
                            <span className="font-medium">
                              {
                                portfolioSummary.dataQuality
                                  .avgCompletenessScore
                              }
                              %
                            </span>
                          </li>
                          <li>
                            Missing Descriptions:{" "}
                            <span className="font-medium">
                              {portfolioSummary.dataQuality.missingDescription}
                            </span>
                          </li>
                          <li>
                            Missing Images:{" "}
                            <span className="font-medium">
                              {portfolioSummary.dataQuality.missingImages}
                            </span>
                          </li>
                          <li>
                            Missing Coordinates:{" "}
                            <span className="font-medium">
                              {portfolioSummary.dataQuality.missingCoordinates}
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {canManageProperties(user) && (
                      <div className="rounded-lg border border-gray-200 p-4">
                        <p className="mb-2 text-sm font-medium text-gray-700">
                          Import CSV/Excel (Preview then Commit)
                        </p>
                        <div className="mb-3 flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            onClick={handleExportPortfolioExcel}
                            isLoading={isExportingPortfolioExcel}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Export Excel
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleDownloadTemplate}
                            isLoading={isDownloadingTemplate}
                          >
                            Download Import Template
                          </Button>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <input
                            type="file"
                            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            onChange={(event) => {
                              const file = event.target.files?.[0] || null;
                              setPortfolioImportFile(file);
                              setPortfolioImportPreview(null);
                              setPortfolioImportMessage(null);
                            }}
                            className="block w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-700"
                          />
                          <Button
                            variant="outline"
                            onClick={handlePreviewImport}
                            isLoading={isPreviewingImport}
                          >
                            Preview
                          </Button>
                          <Button
                            onClick={handleCommitImport}
                            isLoading={isCommittingImport}
                            disabled={
                              !portfolioImportPreview?.acceptedRows?.length
                            }
                          >
                            Import Valid Rows
                          </Button>
                        </div>

                        {portfolioImportPreview && (
                          <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                            <p>
                              Rows: {portfolioImportPreview.totalRows} | Valid:{" "}
                              {portfolioImportPreview.validRows} | Invalid:{" "}
                              {portfolioImportPreview.invalidRows} | Warnings:{" "}
                              {portfolioImportPreview.warnings}
                            </p>
                            {portfolioImportPreview.errors.length > 0 && (
                              <p className="mt-1 text-red-600">
                                First error: row{" "}
                                {portfolioImportPreview.errors[0].rowNumber} -{" "}
                                {portfolioImportPreview.errors[0].message}
                              </p>
                            )}
                          </div>
                        )}

                        {portfolioImportMessage && (
                          <div className="mt-3">
                            <Alert
                              type={portfolioImportMessage.type}
                              message={portfolioImportMessage.text}
                              onClose={() => setPortfolioImportMessage(null)}
                            />
                          </div>
                        )}

                        <div className="mt-5 rounded-lg border border-dashed border-gray-300 p-4">
                          <p className="mb-2 text-sm font-medium text-gray-700">
                            Partner API Connectors (Listing Synchronization)
                          </p>

                          {portfolioConnectors.length === 0 ? (
                            <p className="text-sm text-gray-500">
                              No connectors available.
                            </p>
                          ) : (
                            <>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <label className="text-sm text-gray-700">
                                  <span className="mb-1 block font-medium">
                                    Connector
                                  </span>
                                  <select
                                    value={selectedConnectorId}
                                    onChange={(event) => {
                                      setSelectedConnectorId(
                                        event.target
                                          .value as PortfolioConnectorId,
                                      );
                                      setConnectorSyncResult(null);
                                      setConnectorSyncMessage(null);
                                    }}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                  >
                                    {portfolioConnectors.map((connector) => (
                                      <option
                                        key={connector.id}
                                        value={connector.id}
                                      >
                                        {connector.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>

                                <label className="text-sm text-gray-700">
                                  <span className="mb-1 block font-medium">
                                    Endpoint URL (webhook only)
                                  </span>
                                  <input
                                    type="url"
                                    value={connectorEndpointUrl}
                                    onChange={(event) =>
                                      setConnectorEndpointUrl(
                                        event.target.value,
                                      )
                                    }
                                    placeholder="https://partner.example.com/webhook"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                    disabled={selectedConnectorId !== "webhook"}
                                  />
                                </label>
                              </div>

                              <div className="mt-3 flex items-center justify-between gap-3">
                                <p className="text-xs text-gray-500">
                                  {portfolioConnectors.find(
                                    (connector) =>
                                      connector.id === selectedConnectorId,
                                  )?.description || ""}
                                </p>
                                <Button
                                  variant="outline"
                                  onClick={handleSyncConnector}
                                  isLoading={isSyncingConnector}
                                >
                                  Sync Connector
                                </Button>
                              </div>

                              {connectorSyncMessage && (
                                <div className="mt-3">
                                  <Alert
                                    type={connectorSyncMessage.type}
                                    message={connectorSyncMessage.text}
                                    onClose={() =>
                                      setConnectorSyncMessage(null)
                                    }
                                  />
                                </div>
                              )}

                              {connectorSyncResult && (
                                <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                                  <p>
                                    Total: {connectorSyncResult.totalRecords} |
                                    Mapped: {connectorSyncResult.mappedRecords}{" "}
                                    | Failed:{" "}
                                    {connectorSyncResult.failedRecords}
                                    {connectorSyncResult.pushedRecords > 0 && (
                                      <>
                                        {" "}
                                        | Pushed:{" "}
                                        {connectorSyncResult.pushedRecords}
                                      </>
                                    )}
                                  </p>
                                  {connectorSyncResult.issues.length > 0 && (
                                    <p className="mt-1 text-amber-700">
                                      First issue: row{" "}
                                      {connectorSyncResult.issues[0].rowNumber}{" "}
                                      - {connectorSyncResult.issues[0].message}
                                    </p>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* API Testing Info */}
          <Card>
            <CardHeader>
              <CardTitle>🧪 API Testing Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <a
                  href="http://localhost:3000/api/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open Swagger API docs (opens in new tab)"
                  className="flex items-center rounded-lg border border-gray-200 p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                    <FileText className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">
                      Swagger API Docs
                    </p>
                    <p className="text-sm text-gray-500">
                      localhost:3000/api/docs
                    </p>
                  </div>
                </a>

                <a
                  href="http://localhost:8025"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open MailHog (opens in new tab)"
                  className="flex items-center rounded-lg border border-gray-200 p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                    <Mail className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">MailHog</p>
                    <p className="text-sm text-gray-500">View sent emails</p>
                  </div>
                </a>

                <a
                  href="http://localhost:8081"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open Mongo Express (opens in new tab)"
                  className="flex items-center rounded-lg border border-gray-200 p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                    <Building2 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">Mongo Express</p>
                    <p className="text-sm text-gray-500">
                      Database super administrator
                    </p>
                  </div>
                </a>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
      {withdrawDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-rose-900">
              Withdraw Application
            </h3>
            <p className="mt-2 text-sm text-rose-800">
              Are you sure you want to withdraw this application?
            </p>

            <label className="mt-4 block text-sm font-semibold text-gray-900">
              Reason (optional)
              <textarea
                className="mt-2 min-h-24 w-full rounded-lg border border-rose-200 px-3 py-2 text-sm text-gray-700 focus:border-rose-400 focus:outline-none"
                value={withdrawDraft.reason}
                onChange={(event) =>
                  setWithdrawDraft((previous) =>
                    previous
                      ? { ...previous, reason: event.target.value }
                      : previous,
                  )
                }
                placeholder="You can share why you are withdrawing."
              />
            </label>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                onClick={() => setWithdrawDraft(null)}
                disabled={withdrawingFor === withdrawDraft.applicationId}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={() => void confirmWithdrawTenantApplication()}
                disabled={withdrawingFor === withdrawDraft.applicationId}
              >
                {withdrawingFor === withdrawDraft.applicationId
                  ? "Withdrawing..."
                  : "Confirm Withdrawal"}
              </button>
            </div>
          </div>
        </div>
      )}
      {withdrawPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-300 bg-rose-50 p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-600 text-2xl font-bold text-white">
              {withdrawPopup.type === "success" ? "!" : "x"}
            </div>
            <h3 className="mt-4 text-xl font-bold text-rose-900">
              {withdrawPopup.type === "success"
                ? "Application Withdrawn"
                : "Withdrawal Failed"}
            </h3>
            <p className="mt-2 text-sm text-rose-800">{withdrawPopup.text}</p>
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                onClick={() => setWithdrawPopup(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {approveResultPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-2xl font-bold text-white">
              {approveResultPopup.type === "success" ? "!" : "x"}
            </div>
            <h3 className="mt-4 text-xl font-bold text-emerald-900">
              {approveResultPopup.type === "success"
                ? "Application Approved"
                : "Approval Failed"}
            </h3>
            <p className="mt-2 text-sm text-emerald-800">
              {approveResultPopup.text}
            </p>
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                onClick={() => setApproveResultPopup(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {rejectResultPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-300 bg-rose-50 p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-600 text-2xl font-bold text-white">
              {rejectResultPopup.type === "success" ? "!" : "x"}
            </div>
            <h3 className="mt-4 text-xl font-bold text-rose-900">
              {rejectResultPopup.type === "success"
                ? "Application Rejected"
                : "Rejection Failed"}
            </h3>
            <p className="mt-2 text-sm text-rose-800">
              {rejectResultPopup.text}
            </p>
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                onClick={() => setRejectResultPopup(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
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
                disabled={processingReceivedFor === rejectDraft.applicationId}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={() => void confirmRejectReceivedApplication()}
                disabled={processingReceivedFor === rejectDraft.applicationId}
              >
                {processingReceivedFor === rejectDraft.applicationId
                  ? "Rejecting..."
                  : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
      <HomeFooter />
    </>
  );
}
