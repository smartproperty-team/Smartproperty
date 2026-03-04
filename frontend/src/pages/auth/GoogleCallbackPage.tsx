// ===========================================
// SmartProperty - Google OAuth Callback Page
// ===========================================

import { Building2, CheckCircle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { HomeFooter, Navbar } from "../../components/layout";
import {
  Alert,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui";
import { authService } from "../../services";
import { useAuthStore } from "../../store";

export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkAuth } = useAuthStore();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const accessToken = searchParams.get("accessToken");
        const refreshToken = searchParams.get("refreshToken");
        const error = searchParams.get("error");

        if (error) {
          setStatus("error");
          setErrorMessage(decodeURIComponent(error));
          return;
        }

        if (!accessToken || !refreshToken) {
          setStatus("error");
          setErrorMessage("Missing authentication tokens");
          return;
        }

        // Store the tokens
        authService.handleGoogleCallback(accessToken, refreshToken);

        // Verify the tokens and load user data
        await checkAuth();

        setStatus("success");

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate("/dashboard", { replace: true });
        }, 1500);
      } catch (err) {
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Authentication failed",
        );
      }
    };

    handleCallback();
  }, [searchParams, navigate, checkAuth]);

  return (
    <>
      <Navbar />
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-purple-100 px-4 py-12 pt-28">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="mt-4 text-3xl font-bold text-gray-900">
              SmartProperty
            </h1>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle>
                {status === "loading" && "Signing you in..."}
                {status === "success" && "Success!"}
                {status === "error" && "Authentication Failed"}
              </CardTitle>
              <CardDescription>
                {status === "loading" &&
                  "Please wait while we complete your sign-in."}
                {status === "success" && "Redirecting you to the dashboard..."}
                {status === "error" && "There was a problem signing you in."}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col items-center space-y-4">
              {status === "loading" && (
                <div className="flex items-center justify-center">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
                </div>
              )}

              {status === "success" && (
                <CheckCircle className="h-16 w-16 text-green-500" />
              )}

              {status === "error" && (
                <>
                  <XCircle className="h-16 w-16 text-red-500" />
                  {errorMessage && (
                    <Alert type="error" message={errorMessage} />
                  )}
                  <button
                    onClick={() => navigate("/login")}
                    className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Return to login
                  </button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <HomeFooter />
    </>
  );
}
