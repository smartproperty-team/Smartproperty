// ===========================================
// SmartProperty - Verify Email Page
// ===========================================

import { Building2, CheckCircle, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, CardContent } from "../../components/ui";
import { authService } from "../../services";
import { useAuthStore } from "../../store";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Invalid verification link. No token provided.");
        return;
      }

      try {
        const response = await authService.verifyEmail({ token });
        setStatus("success");
        setMessage(response.message);

        // Update the auth store with the latest user data
        // so the email verification status is reflected immediately
        await checkAuth();

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate("/dashboard", { replace: true });
        }, 2000);
      } catch (err: unknown) {
        setStatus("error");
        const errorMessage =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ||
          "Failed to verify email. The link may have expired.";
        setMessage(errorMessage);
      }
    };

    verifyEmail();
  }, [token, checkAuth, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-purple-100 px-4 py-12">
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
          <CardContent className="flex flex-col items-center py-10">
            {status === "loading" && (
              <>
                <Loader2 className="h-16 w-16 animate-spin text-indigo-600" />
                <h2 className="mt-4 text-xl font-semibold text-gray-900">
                  Verifying your email...
                </h2>
                <p className="mt-2 text-gray-600">Please wait a moment.</p>
              </>
            )}

            {status === "success" && (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-gray-900">
                  Email Verified!
                </h2>
                <p className="mt-2 text-center text-gray-600">{message}</p>
                <p className="mt-4 text-sm text-gray-500">
                  Redirecting to dashboard in a few seconds...
                </p>
                <Link to="/dashboard" className="mt-6">
                  <Button size="lg">Go to Dashboard</Button>
                </Link>
              </>
            )}

            {status === "error" && (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <XCircle className="h-10 w-10 text-red-600" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-gray-900">
                  Verification Failed
                </h2>
                <p className="mt-2 text-center text-gray-600">{message}</p>
                <div className="mt-6 space-y-3 text-center">
                  <Link to="/login">
                    <Button variant="outline">Back to Login</Button>
                  </Link>
                  <p className="text-sm text-gray-500">
                    Need a new verification link?{" "}
                    <Link
                      to="/login"
                      className="text-indigo-600 hover:underline"
                    >
                      Sign in and request one
                    </Link>
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
