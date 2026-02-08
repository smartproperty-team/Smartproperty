// ===========================================
// SmartProperty - Login Page
// ===========================================

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Lock, Mail } from "lucide-react";
import { useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { HomeFooter, HomeNavbar } from "../../components/layout";
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
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);

  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

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
      await login(data.email, data.password, captchaToken);
      setSuccessMessage("Login successful! Redirecting...");
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
    } catch {
      // Error is handled by the store
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = authService.getGoogleLoginUrl();
  };

  const handleFacebookLogin = () => {
    window.location.href = authService.getFacebookLoginUrl();
  };

  return (
    <div className="home-page">
      <HomeNavbar />

      <main className="min-h-screen bg-gradient-to-br from-home-primary-light via-home-background to-home-background-alt px-4 py-12 pt-28 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-r from-home-secondary-dark to-home-primary shadow-lg shadow-blue-200/60">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="mt-4 text-3xl font-bold text-home-text">
              SmartProperty
            </h1>
            <p className="mt-2 text-home-muted">
              Welcome back! Sign in to continue.
            </p>
          </div>

          <Card className="border-home-border/80 shadow-xl shadow-blue-100/40">
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
              <CardDescription>
                Enter your credentials to access your account
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

                {captchaError && <Alert type="error" message={captchaError} />}

                <Input
                  label="Email Address"
                  type="email"
                  placeholder="you@example.com"
                  icon={<Mail className="h-5 w-5" />}
                  error={errors.email?.message}
                  className="focus-visible:ring-home-primary"
                  {...register("email")}
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  icon={<Lock className="h-5 w-5" />}
                  error={errors.password?.message}
                  className="focus-visible:ring-home-primary"
                  {...register("password")}
                />

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
                      onChange={(token) => {
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

                <div className="relative w-full">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-home-border" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white/90 px-2 text-home-muted">
                      Or continue with
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="soft"
                  className="w-full"
                  size="lg"
                  onClick={handleGoogleLogin}
                >
                  <GoogleIcon />
                  <span className="ml-2">Sign in with Google</span>
                </Button>

                <Button
                  type="button"
                  variant="soft"
                  className="w-full"
                  size="lg"
                  onClick={handleFacebookLogin}
                >
                  <FacebookIcon />
                  <span className="ml-2">Sign in with Facebook</span>
                </Button>

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

          <div className="mt-6 rounded-lg border border-home-border bg-white/70 p-4 backdrop-blur">
            <p className="text-center text-sm text-home-muted">
              <span className="font-medium">Testing?</span> Register a new
              account or use the API docs at{" "}
              <a
                href="http://localhost:3000/api/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-home-primary hover:underline"
              >
                localhost:3000/api/docs
              </a>
            </p>
          </div>
        </div>
      </main>

      <HomeFooter />
    </div>
  );
}
