// ===========================================
// SmartProperty - Dashboard Page
// ===========================================

import {
  Bell,
  Building2,
  Calendar,
  ChevronDown,
  FileText,
  Home,
  LogOut,
  Mail,
  Monitor,
  Settings,
  Shield,
  User,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui";
import { authService } from "../../services";
import { useAuthStore } from "../../store";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout, isLoading } = useAuthStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
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

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-red-100 text-red-800",
      owner: "bg-blue-100 text-blue-800",
      tenant: "bg-green-100 text-green-800",
      manager: "bg-purple-100 text-purple-800",
      agent: "bg-yellow-100 text-yellow-800",
    };
    return colors[role] || "bg-gray-100 text-gray-800";
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      suspended: "bg-red-100 text-red-800",
      pending_verification: "bg-yellow-100 text-yellow-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">
              SmartProperty
            </span>
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center space-x-3 rounded-lg px-3 py-2 hover:bg-gray-100"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <User className="h-5 w-5" />
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {user?.fullName || user?.firstName}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.fullName}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <button className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <User className="mr-3 h-4 w-4" />
                  Profile
                </button>
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    navigate("/sessions");
                  }}
                  className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Monitor className="mr-3 h-4 w-4" />
                  Active Sessions
                </button>
                <button className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <Settings className="mr-3 h-4 w-4" />
                  Settings
                </button>
                <div className="border-t border-gray-100">
                  <button
                    onClick={handleLogout}
                    disabled={isLoading}
                    className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    {isLoading ? "Signing out..." : "Sign Out"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

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
            <div className="mt-2 flex items-center space-x-4">
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
            Here's what's happening with your properties today.
          </p>
        </div>

        {/* User Info Card */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5 text-indigo-600" />
                Your Account Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Full Name
                  </label>
                  <p className="mt-1 text-gray-900">{user?.fullName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Email
                  </label>
                  <p className="mt-1 flex items-center text-gray-900">
                    <Mail className="mr-2 h-4 w-4 text-gray-400" />
                    {user?.email}
                    {user?.isEmailVerified ? (
                      <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                        Verified
                      </span>
                    ) : (
                      <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                        Unverified
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Phone
                  </label>
                  <p className="mt-1 text-gray-900">
                    {user?.phone || "Not provided"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Role
                  </label>
                  <p className="mt-1">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getRoleBadgeColor(user?.role || "")}`}
                    >
                      {user?.role}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Status
                  </label>
                  <p className="mt-1">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusBadgeColor(user?.status || "")}`}
                    >
                      {user?.status?.replace("_", " ")}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Member Since
                  </label>
                  <p className="mt-1 flex items-center text-gray-900">
                    <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100">
                <Home className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-500">Properties</p>
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
                <p className="text-sm text-gray-500">Tenants</p>
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
                  <p className="font-medium text-gray-900">Swagger API Docs</p>
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
  );
}
