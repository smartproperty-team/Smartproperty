// ===========================================
// SmartProperty - Main App Component
// ===========================================

import { useEffect } from "react";
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
import { DashboardPage, SessionsPage } from "./pages/dashboard";
import { HomePage } from "./pages/home";
import { useAuthStore } from "./store";

function App() {
  const { checkAuth, isAuthenticated } = useAuthStore();

  // Check if user is authenticated on app load
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
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

      {/* 404 - Redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
