import { AlertCircle, CheckCircle, Loader } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract tokens from URL
        const accessToken = searchParams.get("token");
        const refreshToken = searchParams.get("refreshToken");

        if (!accessToken || !refreshToken) {
          throw new Error("Missing authentication tokens");
        }

        // Store tokens and log in
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);

        // Fetch user data using the access token
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:3000/api"}/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error("Failed to fetch user profile");
        }

        const userData = await response.json();

        // Update auth store
        login(userData, accessToken, refreshToken);

        setStatus("success");

        // Redirect to home page after a short delay
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 1500);
      } catch (error) {
        console.error("OAuth callback error:", error);
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Authentication failed",
        );

        // Redirect to login after showing error
        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, login]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Glassmorphism Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8">
          {status === "loading" && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-purple-500/20">
                <Loader className="w-8 h-8 text-purple-400 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Completing Sign In
              </h2>
              <p className="text-white/60">
                Please wait while we set up your account...
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-green-500/20">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Success!</h2>
              <p className="text-white/60">Redirecting you to the app...</p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-red-500/20">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Authentication Failed
              </h2>
              <p className="text-white/60 mb-4">
                {errorMessage || "Something went wrong. Please try again."}
              </p>
              <p className="text-sm text-white/40">Redirecting to login...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
