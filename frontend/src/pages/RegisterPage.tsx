import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import OAuthButtons from "../components/auth/OAuthButtons";
import { useAuth } from "../hooks/useAuth";

const registerSchema = z
  .object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    role: z.enum(["admin", "owner", "tenant", "manager", "agent"]).optional(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain uppercase letter")
      .regex(/[0-9]/, "Password must contain number")
      .regex(/[@$!%*?&]/, "Password must contain special character (@$!%*?&)"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser, isLoading, isAuthenticated } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data: RegisterFormData) => {
    await registerUser({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      role: data.role ?? "tenant",
      phone: data.phone,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L9 5.414V17a1 1 0 102 0V5.414l6.293 6.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">SmartProperty</h1>
          <p className="text-slate-400">Create your account</p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-800 rounded-xl shadow-2xl p-8 border border-slate-700">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* First Name & Last Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-slate-200 mb-2"
                >
                  First Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    {...register("firstName")}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>
                {errors.firstName && (
                  <p className="text-red-400 text-xs mt-1">
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-slate-200 mb-2"
                >
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  {...register("lastName")}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
                {errors.lastName && (
                  <p className="text-red-400 text-xs mt-1">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

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

            {/* Phone & Role */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-slate-200 mb-2"
                >
                  Phone (optional)
                </label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="+1 555 0123"
                  {...register("phone")}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>

              <div>
                <label
                  htmlFor="role"
                  className="block text-sm font-medium text-slate-200 mb-2"
                >
                  Role
                </label>
                <select
                  id="role"
                  defaultValue="tenant"
                  {...register("role")}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                >
                  <option value="tenant">Tenant</option>
                  <option value="owner">Owner</option>
                  <option value="manager">Manager</option>
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                </select>
                {errors.role && (
                  <p className="text-red-400 text-xs mt-1">
                    {errors.role.message}
                  </p>
                )}
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-200 mb-2"
              >
                Password
              </label>
              <p className="text-xs text-slate-400 mb-2">
                At least 8 chars, uppercase, number, special (@$!%*?&)
              </p>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register("password")}
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
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">
                  {errors.password.message}
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
                <p className="text-red-400 text-xs mt-1">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isLoading ? "Creating account..." : "Create account"}
            </button>
          </form>

          {/* OAuth Buttons */}
          <div className="mt-6">
            <OAuthButtons />
          </div>

          {/* Sign In Link */}
          <p className="text-center text-slate-400 text-sm mt-6">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-blue-400 hover:text-blue-300 font-medium transition"
            >
              Sign in
            </button>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-xs mt-6">
          Smart Real Estate Management Platform
        </p>
      </div>
    </div>
  );
}
