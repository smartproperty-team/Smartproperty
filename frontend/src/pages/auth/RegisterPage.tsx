// ===========================================
// SmartProperty - Register Page
// ===========================================

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Lock, Mail, Phone, User } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
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
import { useAuthStore } from "../../store";

const registerSchema = z
  .object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    phone: z.string().optional(),
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

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const {
    register: registerUser,
    isLoading,
    error,
    clearError,
  } = useAuthStore();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      clearError();
      await registerUser({
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      });
      setSuccessMessage(
        "Registration successful! Please check your email to verify your account.",
      );
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch {
      // Error is handled by the store
    }
  };

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
          <p className="mt-2 text-gray-600">
            Create your account to get started
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>Fill in your details to register</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {error && (
                <Alert type="error" message={error} onClose={clearError} />
              )}

              {successMessage && (
                <Alert type="success" message={successMessage} />
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  placeholder="John"
                  icon={<User className="h-5 w-5" />}
                  error={errors.firstName?.message}
                  {...register("firstName")}
                />

                <Input
                  label="Last Name"
                  placeholder="Doe"
                  error={errors.lastName?.message}
                  {...register("lastName")}
                />
              </div>

              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                icon={<Mail className="h-5 w-5" />}
                error={errors.email?.message}
                {...register("email")}
              />

              <Input
                label="Phone Number (Optional)"
                type="tel"
                placeholder="+1 (555) 123-4567"
                icon={<Phone className="h-5 w-5" />}
                error={errors.phone?.message}
                {...register("phone")}
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                icon={<Lock className="h-5 w-5" />}
                error={errors.password?.message}
                {...register("password")}
              />

              <Input
                label="Confirm Password"
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
            </CardContent>

            <CardFooter className="flex-col space-y-4">
              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isLoading}
              >
                Create Account
              </Button>

              <p className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
