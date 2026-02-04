// ===========================================
// SmartProperty - Reset Password Page
// ===========================================

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Building2, Lock } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
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

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
        "Password must contain uppercase, lowercase, number, and special character",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError("Invalid reset token. Please request a new password reset.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.resetPassword({
        token,
        password: data.password,
        confirmPassword: data.confirmPassword,
      });
      setSuccessMessage(response.message);
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to reset password. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-purple-100 px-4 py-12">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6">
              <Alert
                type="error"
                message="Invalid or missing reset token. Please request a new password reset."
              />
              <div className="mt-4 text-center">
                <Link
                  to="/forgot-password"
                  className="text-indigo-600 hover:underline"
                >
                  Request new reset link
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>Enter your new password below</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {error && (
                <Alert
                  type="error"
                  message={error}
                  onClose={() => setError(null)}
                />
              )}

              {successMessage && (
                <Alert type="success" message={successMessage} />
              )}

              {!successMessage && (
                <>
                  <Input
                    label="New Password"
                    type="password"
                    placeholder="••••••••"
                    icon={<Lock className="h-5 w-5" />}
                    error={errors.password?.message}
                    {...register("password")}
                  />

                  <Input
                    label="Confirm New Password"
                    type="password"
                    placeholder="••••••••"
                    icon={<Lock className="h-5 w-5" />}
                    error={errors.confirmPassword?.message}
                    {...register("confirmPassword")}
                  />

                  <div className="text-xs text-gray-500">
                    <p className="font-medium">Password requirements:</p>
                    <ul className="mt-1 list-inside list-disc">
                      <li>At least 8 characters</li>
                      <li>One uppercase letter</li>
                      <li>One lowercase letter</li>
                      <li>One number</li>
                      <li>One special character (@$!%*?&)</li>
                    </ul>
                  </div>
                </>
              )}
            </CardContent>

            <CardFooter className="flex-col space-y-4">
              {!successMessage && (
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  isLoading={isLoading}
                >
                  Reset Password
                </Button>
              )}

              <Link
                to="/login"
                className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Link>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
