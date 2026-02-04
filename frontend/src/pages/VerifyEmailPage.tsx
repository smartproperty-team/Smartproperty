import { AlertCircle, CheckCircle, Loader, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import authService from "../services/auth.service";

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setStatus("error");
        setMessage("No verification token provided");
        return;
      }

      try {
        await authService.verifyEmail({ token });
        setStatus("success");
        setMessage("Email verified successfully!");

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } catch (err: any) {
        setStatus("error");
        setMessage(
          err.response?.data?.message ||
            "Email verification failed. Token may have expired.",
        );
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Mail className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Verify Email</h1>
          <p className="text-slate-400">Confirming your email address</p>
        </div>

        {/* Status Card */}
        <div className="bg-slate-800 rounded-xl shadow-2xl p-8 border border-slate-700">
          {status === "loading" && (
            <div className="text-center">
              <Loader className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-slate-300">Verifying your email...</p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-green-400 font-semibold mb-2">{message}</p>
              <p className="text-slate-400 text-sm">
                Redirecting to login in 3 seconds...
              </p>
              <div className="mt-4">
                <button
                  onClick={() => navigate("/login")}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2.5 px-4 rounded-lg transition"
                >
                  Go to Login Now
                </button>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-400 font-semibold mb-2">{message}</p>
              <p className="text-slate-400 text-sm mb-4">
                Your verification link may have expired. Please request a new
                one.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => navigate("/login")}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2.5 px-4 rounded-lg transition"
                >
                  Back to Login
                </button>
                <button
                  onClick={() => navigate("/register")}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2.5 px-4 rounded-lg transition"
                >
                  Register Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
