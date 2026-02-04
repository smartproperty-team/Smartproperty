import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Loader,
  Lock,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import authService from "../services/auth.service";

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
        "Password must contain uppercase, number, and special character (@$!%*?&)",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const token = searchParams.get("token");

  useEffect(() => {
    // Validate token exists
    if (!token) {
      setTokenValid(false);
    } else {
      setTokenValid(true);
    }
  }, [token]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      toast.error("Invalid reset link");
      return;
    }

    try {
      setIsResetting(true);
      await authService.resetPassword({
        token,
        newPassword: data.newPassword,
      });
      toast.success("Password reset successfully!");

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        "Password reset failed. Link may have expired.";
      toast.error(message);
    } finally {
      setIsResetting(false);
    }
  };

  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Invalid Link</h1>
            <p className="text-slate-400">
              This password reset link is invalid or has expired
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl shadow-2xl p-8 border border-slate-700">
            <button
              onClick={() => navigate("/forgot-password")}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2.5 px-4 rounded-lg transition"
            >
              Request New Reset Link
            </button>
            <button
              onClick={() => navigate("/login")}
              className="w-full mt-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2.5 px-4 rounded-lg transition"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isResetting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Password Reset
            </h1>
            <p className="text-slate-400">Your password has been reset</p>
          </div>

          <div className="bg-slate-800 rounded-xl shadow-2xl p-8 border border-slate-700 text-center">
            <Loader className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-300">Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-slate-400">Create a new secure password</p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-800 rounded-xl shadow-2xl p-8 border border-slate-700">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* New Password */}
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-slate-200 mb-2"
              >
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register("newPassword")}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-red-400 text-sm mt-1">
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-slate-200 mb-2"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register("confirmPassword")}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-400 text-sm mt-1">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Password Requirements */}
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3 text-xs text-slate-300">
              <p className="font-semibold mb-2">Password must contain:</p>
              <ul className="space-y-1">
                <li>✓ At least 8 characters</li>
                <li>✓ One uppercase letter (A-Z)</li>
                <li>✓ One number (0-9)</li>
                <li>✓ One special character (@$!%*?&)</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2.5 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
