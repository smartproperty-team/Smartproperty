import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
import "./App.css";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleBasedDashboard from "./components/RoleBasedDashboard";
import SiteLayout from "./components/SiteLayout";
import AboutPage from "./pages/AboutPage";
import BlogPage from "./pages/BlogPage";
import CareersPage from "./pages/CareersPage";
import ContactPage from "./pages/ContactPage";
import FaqPage from "./pages/FaqPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import PricingPage from "./pages/PricingPage";
import ProfilePage from "./pages/ProfilePage";
import PropertiesPage from "./pages/PropertiesPage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import RegisterPage from "./pages/RegisterPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SettingsPage from "./pages/SettingsPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import OAuthCallbackPage from "./pages/auth/OAuthCallbackPage";
import { useAuthStore } from "./store/authStore";

function App() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/properties" element={<PropertiesPage />} />
          <Route path="/properties/:id" element={<PropertyDetailPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RoleBasedDashboard />
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
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
