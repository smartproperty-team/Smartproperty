// ===========================================
// SmartProperty - Two-Factor Authentication Page
// ===========================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppSidebar, HomeFooter } from "../../components/layout";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { authService } from "../../services/auth.service";
import { useAuthStore } from "../../store";

// ===========================================
// Types
// ===========================================

interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  otpauthUrl: string;
}

// ===========================================
// Two-Factor Authentication Page
// ===========================================

export default function TwoFactorPage() {
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Setup state
  const [setupData, setSetupData] = useState<TwoFactorSetup | null>(null);
  const [verificationCode, setVerificationCode] = useState("");

  // Disable state
  const [password, setPassword] = useState("");
  const [showDisableForm, setShowDisableForm] = useState(false);

  // ===========================================
  // Setup 2FA
  // ===========================================

  const handleSetup2FA = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await authService.setup2FA();
      setSetupData(data);
      setSuccess("Scan the QR code with your authenticator app");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to setup two-factor authentication";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // ===========================================
  // Enable 2FA
  // ===========================================

  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authService.enable2FA(verificationCode);

      // Update user state
      if (user) {
        updateUser({ ...user, twoFactorEnabled: true });
      }

      setSuccess("Two-factor authentication enabled successfully!");
      setSetupData(null);
      setVerificationCode("");

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Invalid verification code";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // ===========================================
  // Disable 2FA
  // ===========================================

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      setError("Password is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authService.disable2FA(password);

      // Update user state
      if (user) {
        updateUser({ ...user, twoFactorEnabled: false });
      }

      setSuccess("Two-factor authentication disabled successfully");
      setPassword("");
      setShowDisableForm(false);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to disable two-factor authentication";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // ===========================================
  // Render
  // ===========================================

  return (
    <>
      <AppSidebar />
      <div className="min-h-screen bg-gray-50 px-4 py-12 pt-16 sm:px-6 lg:px-8 lg:pt-24">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Two-Factor Authentication
            </h1>
            <p className="mt-2 text-gray-600">
              Add an extra layer of security to your account
            </p>
          </div>

          {error && <Alert type="error" message={error} className="mb-6" />}

          {success && (
            <Alert type="success" message={success} className="mb-6" />
          )}

          <Card className="p-6">
            {/* Status Display */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Status</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Two-factor authentication is{" "}
                    <span
                      className={
                        user?.twoFactorEnabled
                          ? "text-green-600 font-semibold"
                          : "text-gray-600"
                      }
                    >
                      {user?.twoFactorEnabled ? "enabled" : "disabled"}
                    </span>
                  </p>
                </div>
                {user?.twoFactorEnabled ? (
                  <div className="flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Protected
                  </div>
                ) : (
                  <div className="flex items-center px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Not Protected
                  </div>
                )}
              </div>
            </div>

            {/* Enable 2FA Section */}
            {!user?.twoFactorEnabled && !setupData && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Enable Two-Factor Authentication
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Use an authenticator app like Google Authenticator, Authy, or
                  1Password to generate verification codes.
                </p>
                <Button
                  onClick={handleSetup2FA}
                  isLoading={loading}
                  className="w-full"
                >
                  Get Started
                </Button>
              </div>
            )}

            {/* Setup & Verify Section */}
            {setupData && !user?.twoFactorEnabled && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Scan QR Code
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Scan this QR code with your authenticator app:
                </p>

                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 mb-4 flex justify-center">
                  <img
                    src={setupData.qrCode}
                    alt="QR Code"
                    className="w-64 h-64"
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <p className="text-xs text-gray-600 mb-2">
                    Or enter this code manually:
                  </p>
                  <code className="block text-sm font-mono text-gray-900 break-all">
                    {setupData.secret}
                  </code>
                </div>

                <form onSubmit={handleEnable2FA}>
                  <div className="mb-6">
                    <label
                      htmlFor="code"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Enter verification code
                    </label>
                    <Input
                      id="code"
                      type="text"
                      placeholder="123456"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      maxLength={6}
                      pattern="[0-9]{6}"
                      required
                      autoComplete="off"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Enter the 6-digit code from your authenticator app
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setSetupData(null);
                        setVerificationCode("");
                        setError(null);
                      }}
                      className="w-full"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      isLoading={loading}
                      className="w-full"
                    >
                      Verify & Enable
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Disable 2FA Section */}
            {user?.twoFactorEnabled && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Disable Two-Factor Authentication
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Disabling two-factor authentication will make your account
                  less secure.
                </p>

                {!showDisableForm ? (
                  <Button
                    variant="destructive"
                    onClick={() => setShowDisableForm(true)}
                    className="w-full"
                  >
                    Disable 2FA
                  </Button>
                ) : (
                  <form onSubmit={handleDisable2FA}>
                    <div className="mb-6">
                      <label
                        htmlFor="password"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Confirm your password
                      </label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setShowDisableForm(false);
                          setPassword("");
                          setError(null);
                        }}
                        className="w-full"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="destructive"
                        isLoading={loading}
                        className="w-full"
                      >
                        Confirm Disable
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </Card>

          <div className="mt-6 text-center">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              {"<- Back to Dashboard"}
            </Button>
          </div>
        </div>
      </div>
      <HomeFooter />
    </>
  );
}
