import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import authService from "../services/auth.service";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await authService.forgotPassword(data);
      setSubmittedEmail(data.email);
      setSubmitted(true);
      toast.success("Password reset email sent!");
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Failed to send reset email";
      toast.error(message);
    }
  };

  if (submitted) {
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
              Check Your Email
            </h1>
            <p className="text-slate-400">
              We sent a password reset link to{" "}
              <span className="text-blue-400 font-semibold">
                {submittedEmail}
              </span>
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl shadow-2xl p-8 border border-slate-700 space-y-4">
            <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-4">
              <p className="text-blue-200 text-sm">
                If you don't see the email in your inbox, check your spam
                folder. The link expires in 1 hour.
              </p>
            </div>

            <button
              onClick={() => navigate("/login")}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2.5 px-4 rounded-lg transition"
            >
              Back to Login
            </button>

            <button
              onClick={() => setSubmitted(false)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2.5 px-4 rounded-lg transition"
            >
              Send Another Email
            </button>
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
              <Mail className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Forgot Password
          </h1>
          <p className="text-slate-400">
            Enter your email to receive a password reset link
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-800 rounded-xl shadow-2xl p-8 border border-slate-700">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-200 mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...register("email")}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-sm mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2.5 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          {/* Back Link */}
          <button
            onClick={() => navigate("/login")}
            className="w-full mt-4 flex items-center justify-center text-blue-400 hover:text-blue-300 font-semibold py-2 transition"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
