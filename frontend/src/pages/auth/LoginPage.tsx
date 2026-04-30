// ===========================================
// SmartProperty - Login Page
// ===========================================

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Lock, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { HomeFooter, Navbar } from "../../components/layout";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
} from "../../components/ui";
import { authService } from "../../services";
import { useAuthStore } from "../../store";
import "./auth.css";

// Google Icon SVG Component
const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

// Facebook Icon SVG Component
const FacebookIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  twoFactorCode: z.string().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [show2FA, setShow2FA] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [pendingLoginData, setPendingLoginData] = useState<{
    email: string;
    password: string;
    twoFactorCode?: string;
  } | null>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showReactivateModal) {
        setShowReactivateModal(false);
        setPendingLoginData(null);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showReactivateModal]);

  const rawSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;
  const siteKey = rawSiteKey && rawSiteKey !== 'placeholder' ? rawSiteKey : undefined;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      clearError();
      if (!captchaToken) {
        setCaptchaError("Please complete the CAPTCHA.");
        return;
      }
      setCaptchaError(null);
      await login(data.email, data.password, captchaToken, data.twoFactorCode);
      setSuccessMessage("Login successful! Redirecting...");
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
    } catch (err: any) {
      // Check if 2FA is required
      const errorMessage = err?.response?.data?.message || err?.message || "";
      if (errorMessage.toLowerCase().includes("two-factor")) {
        setShow2FA(true);
      }
      if (errorMessage.toLowerCase().includes("inactive")) {
        clearError();
        setPendingLoginData({
          email: data.email,
          password: data.password,
          twoFactorCode: data.twoFactorCode,
        });
        setShowReactivateModal(true);
      }
    }
  };

  const handleConfirmReactivation = async () => {
    if (!pendingLoginData) return;

    try {
      clearError();
      await login(
        pendingLoginData.email,
        pendingLoginData.password,
        undefined,
        pendingLoginData.twoFactorCode,
        true,
      );
      setShowReactivateModal(false);
      setPendingLoginData(null);
      setSuccessMessage("Account reactivated! Redirecting...");
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || "";
      if (errorMessage.toLowerCase().includes("two-factor")) {
        setShow2FA(true);
      }
      setShowReactivateModal(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = authService.getGoogleLoginUrl();
  };

  const handleFacebookLogin = () => {
    window.location.href = authService.getFacebookLoginUrl();
  };

  return (
    <>
      <Navbar />
      <div className="auth-page auth-bg pt-28">
        <main className="auth-main px-4 py-12">
          <div className="w-full max-w-lg">
            <div className="mb-8 text-center auth-brand">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-linear-to-r from-home-secondary-dark to-home-primary shadow-lg shadow-blue-200/60">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <h1 className="mt-4 text-3xl font-bold text-home-text">
                SmartProperty
              </h1>
              <p className="mt-2 text-home-muted">
                Welcome back! Sign in to continue.
              </p>
            </div>

            <Card className="auth-card border-home-border/60 shadow-xl">
              <CardHeader className="text-center">
                <CardTitle>Welcome</CardTitle>
                <CardDescription>
                  We&apos;re happy to see you again
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                  {error && (
                    <Alert type="error" message={error} onClose={clearError} />
                  )}

                  {successMessage && (
                    <Alert type="success" message={successMessage} />
                  )}

                  {captchaError && (
                    <Alert type="error" message={captchaError} />
                  )}

                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="you@example.com"
                    icon={<Mail className="h-5 w-5" />}
                    error={errors.email?.message}
                    className="focus-visible:ring-home-primary"
                    required
                    {...register("email")}
                  />

                  <Input
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    icon={<Lock className="h-5 w-5" />}
                    error={errors.password?.message}
                    className="focus-visible:ring-home-primary"
                    required
                    {...register("password")}
                  />

                  {show2FA && (
                    <div className="space-y-2">
                      <Input
                        label="Two-Factor Code"
                        type="text"
                        placeholder="123456"
                        maxLength={6}
                        error={errors.twoFactorCode?.message}
                        className="focus-visible:ring-home-primary"
                        required
                        {...register("twoFactorCode")}
                      />
                      <p className="text-sm text-home-muted">
                        Enter the 6-digit code from your authenticator app
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-home-border text-home-primary focus:ring-home-primary"
                      />
                      <span className="ml-2 text-sm text-home-muted">
                        Remember me
                      </span>
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-sm font-medium text-home-primary hover:text-home-primary-dark"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <div className="flex justify-center">
                    {siteKey ? (
                      <ReCAPTCHA
                        sitekey={siteKey}
                        onChange={(token: string | null) => {
                          setCaptchaToken(token);
                          setCaptchaError(null);
                        }}
                        onExpired={() => setCaptchaToken(null)}
                      />
                    ) : (
                      <p className="text-sm text-red-600">
                        Missing CAPTCHA site key.
                      </p>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="flex-col space-y-4">
                  <Button
                    type="submit"
                    className="w-full bg-home-secondary hover:bg-home-secondary-dark focus-visible:ring-home-primary"
                    size="lg"
                    isLoading={isLoading}
                  >
                    Sign In
                  </Button>

                  <div className="auth-social">
                    <p className="auth-social-title">OR LOGIN WITH</p>
                    <div className="auth-social-icons">
                      <button
                        type="button"
                        className="auth-social-icon-btn"
                        onClick={handleGoogleLogin}
                        aria-label="Sign in with Google"
                      >
                        <GoogleIcon />
                      </button>
                      <button
                        type="button"
                        className="auth-social-icon-btn"
                        onClick={handleFacebookLogin}
                        aria-label="Sign in with Facebook"
                      >
                        <FacebookIcon />
                      </button>
                    </div>
                  </div>

                  <p className="text-center text-sm text-home-muted">
                    Don't have an account?{" "}
                    <Link
                      to="/register"
                      className="font-medium text-home-primary hover:text-home-primary-dark"
                    >
                      Create one now
                    </Link>
                  </p>
                </CardFooter>
              </form>
            </Card>

            <div className="auth-note mt-6 rounded-lg border border-home-border p-4">
              <p className="text-center text-sm text-home-muted">
                <span className="font-medium">Testing?</span> Register a new
                account or use the API docs at{" "}
                <a
                  href="http://localhost:3000/api/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open API docs (opens in new tab)"
                  className="text-home-primary hover:underline"
                >
                  localhost:3000/api/docs
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </p>
            </div>
          </div>
        </main>
      </div>
      <HomeFooter />

      {showReactivateModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reactivate-modal-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3
              id="reactivate-modal-title"
              className="text-lg font-semibold text-gray-900"
            >
              Reactivate your account?
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Your account is currently inactive. Do you want to activate it and
              continue signing in?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReactivateModal(false);
                  setPendingLoginData(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={handleConfirmReactivation}
                isLoading={isLoading}
              >
                Yes, Activate
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
