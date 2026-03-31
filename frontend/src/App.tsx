// ===========================================
// SmartProperty - Main App Component
// ===========================================

import { useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './App.css';
import ReadAloudWidget from './components/accessibility/ReadAloudWidget';
import { ProtectedRoute } from './components/auth';
import { PushNotificationTestButton } from './components/notifications/PushNotificationTestButton';
import { useLanguageStore } from './i18n';
import {
  ApplicationsReviewPage,
  TenantApplicationsPage,
} from './pages/applications';
import {
  FacebookCallbackPage,
  ForgotPasswordPage,
  GoogleCallbackPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
  VerifyEmailPage,
} from './pages/auth';
import {
  AdminUsersPage,
  AdminVerificationPage,
  BranchManagerAgenciesPage,
  BranchManagerAgencyOnboardingPage,
  DashboardPage,
  SessionsPage,
  VerificationPage,
} from './pages/dashboard';
import { HomePage, PaletteDemoPage } from './pages/home';
import {
  MaintenanceRequestFormPage,
  MyMaintenanceRequestsPage,
  ServiceProviderMaintenancePage,
} from './pages/maintenance';
import { PreferencesOnboardingModal } from './pages/onboarding';
import { ProfilePage } from './pages/profile';
import {
  MyPropertiesPage,
  PropertiesPage,
  PropertyDetailPage,
  PropertyFormPage,
} from './pages/properties';
import TwoFactorPage from './pages/security/TwoFactorPage';
import { SettingsPage } from './pages/settings';
import { pushNotificationService } from './services/push-notification.service';
import { useAuthStore, usePreferencesStore } from './store';
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
} from './utils';

function getPageTitle(pathname: string): string {
  const exactTitles: Record<string, string> = {
    '/': 'Home',
    '/design/palette': 'Design Palette',
    '/login': 'Login',
    '/register': 'Register',
    '/forgot-password': 'Forgot Password',
    '/reset-password': 'Reset Password',
    '/verify-email': 'Verify Email',
    '/auth/google/callback': 'Google Sign-In',
    '/auth/facebook/callback': 'Facebook Sign-In',
    '/dashboard': 'Dashboard',
    '/sessions': 'Sessions',
    '/verification': 'Verification',
    '/applications': 'My Applications',
    '/applications/review': 'Applications Review',
    '/super-administrator/verifications': 'Verification Review',
    '/super-administrator/users': 'User Management',
    '/branch-manager/agencies': 'My Agencies',
    '/branch-manager/agencies/new': 'Agency Onboarding',
    '/profile': 'Profile',
    '/settings': 'Settings',
    '/security/2fa': 'Two-Factor Authentication',
    '/properties': 'Properties',
    '/properties/mine': 'My Properties',
    '/properties/new': 'Create Property',
    '/maintenance/requests/new': 'Maintenance Request',
    '/maintenance/requests/mine': 'My Maintenance Status',
    '/maintenance/requests/assigned': 'Assigned Maintenance',
  };

  if (exactTitles[pathname]) {
    return `${exactTitles[pathname]} | SmartProperty`;
  }

  if (/^\/properties\/[^/]+\/edit$/.test(pathname)) {
    return 'Edit Property | SmartProperty';
  }

  if (/^\/properties\/[^/]+$/.test(pathname)) {
    return 'Property Details | SmartProperty';
  }

  return 'SmartProperty';
}

function App() {
  const location = useLocation();
  const { language } = useLanguageStore();
  const { checkAuth, isAuthenticated, user } = useAuthStore();
  const { openOnboarding, getUserPreferences, setUserPreferences } =
    usePreferencesStore();
  const promptedUserRef = useRef<string | null>(null);
  const showFloatingReadAloud =
    /^\/(login|register|forgot-password|reset-password|verify-email)$/.test(
      location.pathname,
    ) ||
    location.pathname === '/auth/google/callback' ||
    location.pathname === '/auth/facebook/callback';
  const mainContentId = 'main-content';

  // Check if user is authenticated on app load
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const path = location.pathname;
    let pageTitle = 'SmartProperty';

    if (path === '/') pageTitle = 'Home | SmartProperty';
    else if (path === '/login') pageTitle = 'Sign In | SmartProperty';
    else if (path === '/register') pageTitle = 'Register | SmartProperty';
    else if (path === '/forgot-password') {
      pageTitle = 'Forgot Password | SmartProperty';
    } else if (path === '/reset-password') {
      pageTitle = 'Reset Password | SmartProperty';
    } else if (path === '/verify-email') {
      pageTitle = 'Verify Email | SmartProperty';
    } else if (path.startsWith('/properties/new')) {
      pageTitle = 'Add Property | SmartProperty';
    } else if (path.startsWith('/maintenance/requests/new')) {
      pageTitle = 'Maintenance Request | SmartProperty';
    } else if (path.startsWith('/maintenance/requests/mine')) {
      pageTitle = 'My Maintenance Status | SmartProperty';
    } else if (path.startsWith('/maintenance/requests/assigned')) {
      pageTitle = 'Assigned Maintenance | SmartProperty';
    } else if (path.startsWith('/properties/mine')) {
      pageTitle = 'My Properties | SmartProperty';
    } else if (path.startsWith('/properties/') && path.endsWith('/edit')) {
      pageTitle = 'Edit Property | SmartProperty';
    } else if (path.startsWith('/properties/')) {
      pageTitle = 'Property Details | SmartProperty';
    } else if (path === '/properties') {
      pageTitle = 'Properties | SmartProperty';
    } else if (path === '/dashboard') {
      pageTitle = 'Dashboard | SmartProperty';
    } else if (path === '/profile') {
      pageTitle = 'Profile | SmartProperty';
    } else if (path === '/settings') {
      pageTitle = 'Settings | SmartProperty';
    } else if (path === '/sessions') {
      pageTitle = 'Sessions | SmartProperty';
    } else if (path === '/verification') {
      pageTitle = 'Verification | SmartProperty';
    } else if (path === '/applications') {
      pageTitle = 'My Applications | SmartProperty';
    } else if (path === '/applications/review') {
      pageTitle = 'Review Applications | SmartProperty';
    } else if (path === '/super-administrator/verifications') {
      pageTitle = 'Admin Verifications | SmartProperty';
    } else if (path === '/super-administrator/users') {
      pageTitle = 'Admin Users | SmartProperty';
    } else if (path === '/branch-manager/agencies') {
      pageTitle = 'My Agencies | SmartProperty';
    } else if (path === '/security/2fa') {
      pageTitle = 'Two-Factor Authentication | SmartProperty';
    }

    document.title = pageTitle;
  }, [location.pathname]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (mainEl && !mainEl.id) {
      mainEl.id = 'main-content';
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
        const serverPreferences = await import('./services').then((m) =>
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
      {location.pathname !== '/' && (
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
              <SessionsPage />
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
              <ProfilePage />
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
              <TwoFactorPage />
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
      {showFloatingReadAloud && <ReadAloudWidget mode="floating" />}
      {isAuthenticated && <PushNotificationTestButton />}
    </>
  );
}

export default App;
