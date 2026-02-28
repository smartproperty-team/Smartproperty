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
import { authService, propertyService, verificationService } from "@/services";
import { useAuthStore } from "@/store";
import type { Property } from "@/types/property";
import { VerificationStatus } from "@/types/verification";
import { canManageProperties } from "@/utils";
import {
  Bell,
  Building2,
  FileText,
  Home,
  Mail,
  Shield,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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

  // Fetch verification status for tenants
  useEffect(() => {
    if (user?.role === "tenant") {
      verificationService
        .getVerificationStatus()
        .then((data) => setVerificationStatus(data.overallStatus))
        .catch(() => setVerificationStatus(VerificationStatus.NOT_SUBMITTED));
    }
  }, [user?.role]);

  useEffect(() => {
    if (user?.role !== "owner" || !user.id) {
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
                  className="text-sm text-indigo-600 hover:underline"
                >
                  Open MailHog →
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
          </div>

          {/* Verify Me CTA - Show for tenants (hide if verified or rejected) */}
          {user?.role === "tenant" &&
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

          {/* Admin: Review Verifications CTA */}
          {user?.role === "admin" && (
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
                      onClick={() => navigate("/admin/verifications")}
                      className="bg-white text-amber-700 shadow-md hover:bg-amber-50 focus-visible:ring-white"
                      size="lg"
                    >
                      <Shield className="mr-2 h-5 w-5" />
                      Review Verifications
                    </Button>
                    <Button
                      onClick={() => navigate("/admin/users")}
                      className="bg-white text-amber-700 shadow-md hover:bg-amber-50 focus-visible:ring-white"
                      size="lg"
                    >
                      <Users className="mr-2 h-5 w-5" />
                      Manage Users
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
                  <p className="text-2xl font-bold text-gray-900">0</p>
                  <p className="text-sm text-gray-500">
                    {canManage ? "Properties" : "Browsed"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">0</p>
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
                  <p className="text-2xl font-bold text-gray-900">0</p>
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
                  <p className="text-2xl font-bold text-gray-900">0</p>
                  <p className="text-sm text-gray-500">Notifications</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {user?.role === "owner" && (
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
                  className="flex items-center rounded-lg border border-gray-200 p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                    <Building2 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">Mongo Express</p>
                    <p className="text-sm text-gray-500">Database admin</p>
                  </div>
                </a>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
      <HomeFooter />
    </>
  );
}
