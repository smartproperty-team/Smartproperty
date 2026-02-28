// ===========================================
// SmartProperty - Main App Component
// ===========================================

import { useEffect, useRef } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { ProtectedRoute } from "./components/auth";
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
  DashboardPage,
  SessionsPage,
  VerificationPage,
} from "./pages/dashboard";
import { HomePage } from "./pages/home";
import { PreferencesOnboardingModal } from "./pages/onboarding";
import { ProfilePage } from "./pages/profile";
import {
  PropertiesPage,
  PropertyDetailPage,
  PropertyFormPage,
} from "./pages/properties";
import TwoFactorPage from "./pages/security/TwoFactorPage";
import { SettingsPage } from "./pages/settings";
import { useAuthStore, usePreferencesStore } from "./store";
import { canManageProperties, isOwner } from "./utils";

function App() {
  const { checkAuth, isAuthenticated, user } = useAuthStore();
  const { openOnboarding, getUserPreferences, setUserPreferences } =
    usePreferencesStore();
  const promptedUserRef = useRef<string | null>(null);

  // Check if user is authenticated on app load
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

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
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
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
          path="/admin/verifications"
          element={
            <ProtectedRoute>
              <AdminVerificationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              {user?.role === "admin" ? (
                <AdminUsersPage />
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
        <Route path="/properties/:id" element={<PropertyDetailPage />} />
        <Route
          path="/properties/new"
          element={
            <ProtectedRoute>
              {isOwner(user) ? (
                <PropertyFormPage />
              ) : (
                <Navigate to="/properties" replace />
              )}
            </ProtectedRoute>
          }
        />
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

        {/* 404 - Redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <PreferencesOnboardingModal />
    </>
  );
}

export default App;
