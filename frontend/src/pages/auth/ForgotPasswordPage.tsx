// ===========================================
// SmartProperty - Forgot Password Page
// ===========================================

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Building2, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
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

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.forgotPassword({ email: data.email });
      setSuccessMessage(response.message);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to send reset email. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-indigo-100 via-white to-purple-100 px-4 py-12 pt-28">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-linear-to-r from-indigo-600 to-purple-600">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="mt-4 text-3xl font-bold text-gray-900">
              SmartProperty
            </h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Forgot Password</CardTitle>
              <CardDescription>
                Enter your email and we'll send you a reset link
              </CardDescription>
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
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="you@example.com"
                    icon={<Mail className="h-5 w-5" />}
                    error={errors.email?.message}
                    required
                    {...register("email")}
                  />
                )}
              </CardContent>

              <CardFooter className="flex-col space-y-4">
                {!successMessage ? (
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    isLoading={isLoading}
                  >
                    Send Reset Link
                  </Button>
                ) : (
                  <div className="text-center text-sm text-gray-600">
                    <p>Check your email for the reset link.</p>
                    <p className="mt-2">
                      View emails at{" "}
                      <a
                        href="http://localhost:8025"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open MailHog (opens in new tab)"
                        className="text-indigo-600 hover:underline"
                      >
                        MailHog (localhost:8025)
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </p>
                  </div>
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
      <HomeFooter />
    </>
  );
}
