// ===========================================
// SmartProperty - Main App Component
// ===========================================

import { useEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import "./App.css";
import { ProtectedRoute } from "./components/auth";
import { PushNotificationTestButton } from "./components/notifications/PushNotificationTestButton";
import { useLanguageStore } from "./i18n";
import {
  ApplicationsReviewPage,
  TenantApplicationsPage,
} from "./pages/applications";
import {
  FacebookCallbackPage,
  ForgotPasswordPage,
  GoogleCallbackPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
  VerifyEmailPage,
} from "./pages/auth";
import {
  AdminUsersPage,
  AdminVerificationPage,
  BranchManagerAgenciesPage,
  BranchManagerAgencyOnboardingPage,
  DashboardPage,
  VerificationPage,
} from "./pages/dashboard";
import { HomePage, PaletteDemoPage } from "./pages/home";
import {
  MaintenanceRequestFormPage,
  MyMaintenanceRequestsPage,
  ServiceProviderMaintenancePage,
} from "./pages/maintenance";
import { PreferencesOnboardingModal } from "./pages/onboarding";
import {
  MyPropertiesPage,
  PropertiesPage,
  PropertyDetailPage,
  PropertyFormPage,
} from "./pages/properties";
import { SettingsPage } from "./pages/settings";
import { pushNotificationService } from "./services/push-notification.service";
import { useAuthStore, usePreferencesStore } from "./store";
import {
  canAccessAdminUsers,
  canCreateMaintenanceRequest,
  canCreateProperties,
  canManageAgencyOnboarding,
  canManageAssignedMaintenance,
  canManageProperties,
  canReviewApplications,
  canReviewVerifications,
  canTrackMaintenanceRequests,
  isTenant,
} from "./utils";

function getSettingsTabTitle(search: string): string {
  const tab = new URLSearchParams(search).get("tab");

  switch (tab) {
    case "account":
      return "Account Settings";
    case "security":
      return "Security Settings";
    case "sessions":
      return "Session Settings";
    case "preferences":
      return "Preference Settings";
    case "workspace":
      return "Workspace Settings";
    default:
      return "Settings";
  }
}

function getPageTitle(path: string, search: string): string {
  if (path === "/settings") {
    return `${getSettingsTabTitle(search)} | SmartProperty`;
  }

  const exactTitles: Record<string, string> = {
    "/": "Home",
    "/design/palette": "Design Palette",
    "/login": "Sign In",
    "/register": "Register",
    "/forgot-password": "Forgot Password",
    "/reset-password": "Reset Password",
    "/verify-email": "Verify Email",
    "/dashboard": "Dashboard",
    "/sessions": "Session Settings",
    "/verification": "Verification",
    "/applications": "My Applications",
    "/applications/review": "Review Applications",
    "/super-administrator/verifications": "Admin Verifications",
    "/super-administrator/users": "Admin Users",
    "/branch-manager/agencies": "My Agencies",
    "/branch-manager/agencies/new": "Agency Onboarding",
    "/profile": "Account Settings",
    "/security/2fa": "Security Settings",
    "/properties": "Properties",
    "/properties/mine": "My Properties",
    "/properties/new": "Add Property",
    "/maintenance/requests/new": "Maintenance Request",
    "/maintenance/requests/mine": "My Maintenance Status",
    "/maintenance/requests/assigned": "Assigned Maintenance",
  };

  if (exactTitles[path]) {
    return `${exactTitles[path]} | SmartProperty`;
  }

  if (path.startsWith("/properties/") && path.endsWith("/edit")) {
    return "Edit Property | SmartProperty";
  }

  if (path.startsWith("/properties/")) {
    return "Property Details | SmartProperty";
  }

  return "SmartProperty";
}

function App() {
  const location = useLocation();
  const { language } = useLanguageStore();
  const { checkAuth, isAuthenticated, user } = useAuthStore();
  const { openOnboarding, getUserPreferences, setUserPreferences } =
    usePreferencesStore();
  const promptedUserRef = useRef<string | null>(null);
 
  // Check if user is authenticated on app load
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    document.title = getPageTitle(location.pathname, location.search);
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const mainEl = document.querySelector("main");
    if (mainEl && !mainEl.id) {
      mainEl.id = "main-content";
    }
  }, [location.pathname]);

  // Initialize push notifications when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      void pushNotificationService.initialize();
    }
  }, [isAuthenticated, user]);

  // Bootstrap preferences after login
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (promptedUserRef.current === user.id) return;

    let isCancelled = false;

    const bootstrapPreferences = async () => {
      let resolvedPreferences = getUserPreferences(user.id);

      try {
        const serverPreferences = await import("./services").then((m) =>
          m.authService.getPreferences(),
        );
        if (!isCancelled) {
          setUserPreferences(user.id, serverPreferences);
          resolvedPreferences = serverPreferences;
        }
      } catch {
        // Keep local persisted fallback if backend is temporarily unavailable
      }

      if (!resolvedPreferences.completed && !isCancelled) {
        openOnboarding();
      }

      promptedUserRef.current = user.id;
    };

    void bootstrapPreferences();

    return () => {
      isCancelled = true;
    };
  }, [
    getUserPreferences,
    isAuthenticated,
    openOnboarding,
    setUserPreferences,
    user,
  ]);

  return (
    <>
      {location.pathname !== "/" && (
        <a href="#main-content" className="global-skip-link">
          Skip to main content
        </a>
      )}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/design/palette" element={<PaletteDemoPage />} />
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginPage />
            )
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <RegisterPage />
            )
          }
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
        <Route
          path="/auth/facebook/callback"
          element={<FacebookCallbackPage />}
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessions"
          element={
            <ProtectedRoute>
              <Navigate to="/settings?tab=sessions" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/verification"
          element={
            <ProtectedRoute>
              <VerificationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/applications"
          element={
            <ProtectedRoute>
              {isTenant(user) ? (
                <TenantApplicationsPage />
              ) : (
                <Navigate to="/dashboard" replace />
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/applications/review"
          element={
            <ProtectedRoute>
              {canReviewApplications(user) ? (
                <ApplicationsReviewPage />
              ) : (
                <Navigate to="/dashboard" replace />
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-administrator/verifications"
          element={
            <ProtectedRoute>
              {canReviewVerifications(user) ? (
                <AdminVerificationPage />
              ) : (
                <Navigate to="/dashboard" replace />
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-administrator/users"
          element={
            <ProtectedRoute>
              {canAccessAdminUsers(user) ? (
                <AdminUsersPage />
              ) : (
                <Navigate to="/dashboard" replace />
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/branch-manager/agencies"
          element={
            <ProtectedRoute>
              {canManageAgencyOnboarding(user) ? (
                <BranchManagerAgenciesPage />
              ) : (
                <Navigate to="/dashboard" replace />
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/branch-manager/agencies/new"
          element={
            <ProtectedRoute>
              {canManageAgencyOnboarding(user) ? (
                <BranchManagerAgencyOnboardingPage />
              ) : (
                <Navigate to="/dashboard" replace />
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Navigate to="/settings?tab=account" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/security/2fa"
          element={
            <ProtectedRoute>
              <Navigate to="/settings?tab=security" replace />
            </ProtectedRoute>
          }
        />

        {/* Properties Routes */}
        <Route path="/properties" element={<PropertiesPage />} />
        <Route
          path="/properties/mine"
          element={
            <ProtectedRoute>
              {canManageProperties(user) ? (
                <MyPropertiesPage />
              ) : (
                <Navigate to="/properties" replace />
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/properties/new"
          element={
            <ProtectedRoute>
              {canCreateProperties(user) ? (
                <PropertyFormPage />
              ) : (
                <Navigate to="/properties" replace />
              )}
            </ProtectedRoute>
          }
        />
        <Route path="/properties/:id" element={<PropertyDetailPage />} />
        <Route
          path="/properties/:id/edit"
          element={
            <ProtectedRoute>
              {canManageProperties(user) ? (
                <PropertyFormPage />
              ) : (
                <Navigate to="/properties" replace />
              )}
            </ProtectedRoute>
          }
        />

        <Route
          path="/maintenance/requests/new"
          element={
            <ProtectedRoute>
              {canCreateMaintenanceRequest(user) ? (
                <MaintenanceRequestFormPage />
              ) : (
                <Navigate to="/dashboard" replace />
              )}
            </ProtectedRoute>
          }
        />

        <Route
          path="/maintenance/requests/mine"
          element={
            <ProtectedRoute>
              {canTrackMaintenanceRequests(user) ? (
                <MyMaintenanceRequestsPage />
              ) : (
                <Navigate to="/dashboard" replace />
              )}
            </ProtectedRoute>
          }
        />

        <Route
          path="/maintenance/requests/assigned"
          element={
            <ProtectedRoute>
              {canManageAssignedMaintenance(user) ? (
                <ServiceProviderMaintenancePage />
              ) : (
                <Navigate to="/dashboard" replace />
              )}
            </ProtectedRoute>
          }
        />

        {/* 404 - Redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <PreferencesOnboardingModal />
      {isAuthenticated && <PushNotificationTestButton />}
    </>
  );
}

export default App;
