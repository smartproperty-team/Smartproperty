import { AppSidebar, HomeFooter } from "@/components/layout";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui";
import {
  agencyOnboardingService,
  type AgencyOnboardingResponse,
} from "@/services/agency-onboarding.service";
import { useAuthStore } from "@/store";
import { canManageAgencyOnboarding } from "@/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  CalendarDays,
  Download,
  MapPinned,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const memberSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters"),
  lastName: z
    .string()
    .trim()
    .min(2, "Last name must be at least 2 characters")
    .optional()
    .or(z.literal("")),
});

const formSchema = z.object({
  name: z.string().trim().min(2, "Agency name is required"),
  region: z.string().trim().min(2, "Region is required"),
  agencyCreationDate: z.string().min(1, "Creation date is required"),
  description: z
    .string()
    .trim()
    .max(300, "Description must be 300 characters or less")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(20, "Phone must be 20 characters or less")
    .optional()
    .or(z.literal("")),
  contactEmail: z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  accountant: memberSchema,
  rentalManager: memberSchema,
  manager: memberSchema,
  serviceProvider: memberSchema,
});

type FormData = z.infer<typeof formSchema>;

const roleLabels = {
  accountant: "Accountant",
  rental_manager: "Rental Manager",
  real_estate_agent: "Manager",
  service_provider: "Service Provider",
};

function formatRole(role: string): string {
  return roleLabels[role as keyof typeof roleLabels] || role.replace(/_/g, " ");
}

function sanitizeFileToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function BranchManagerAgencyOnboardingPage() {
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [result, setResult] = useState<AgencyOnboardingResponse | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      agencyCreationDate: new Date().toISOString().slice(0, 10),
      accountant: { firstName: "John", lastName: "" },
      rentalManager: { firstName: "John", lastName: "" },
      manager: { firstName: "John", lastName: "" },
      serviceProvider: { firstName: "John", lastName: "" },
    },
  });

  if (!canManageAgencyOnboarding(user)) {
    return null;
  }

  const onSubmit = async (values: FormData) => {
    setIsSubmitting(true);
    setMessage(null);
    setResult(null);

    try {
      const payload = {
        ...values,
        description: values.description || undefined,
        phone: values.phone || undefined,
        contactEmail: values.contactEmail || undefined,
        accountant: {
          firstName: values.accountant.firstName,
          lastName: values.accountant.lastName || undefined,
        },
        rentalManager: {
          firstName: values.rentalManager.firstName,
          lastName: values.rentalManager.lastName || undefined,
        },
        manager: {
          firstName: values.manager.firstName,
          lastName: values.manager.lastName || undefined,
        },
        serviceProvider: {
          firstName: values.serviceProvider.firstName,
          lastName: values.serviceProvider.lastName || undefined,
        },
      };

      const response =
        await agencyOnboardingService.createAgencyWithAccounts(payload);
      setResult(response);
      setMessage({
        type: "success",
        text: `Agency created. ${response.createdAccounts.length} accounts created, ${response.skippedAccounts.length} skipped.`,
      });
      reset({
        ...values,
        description: "",
        phone: "",
        contactEmail: "",
      });
    } catch (error: unknown) {
      const text =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Failed to create agency";
      setMessage({ type: "error", text });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadAccountsTxt = () => {
    if (!result || result.createdAccounts.length === 0) {
      return;
    }

    const lines: string[] = [
      "SmartProperty - Created Agency Accounts",
      `Agency: ${result.agency.name}`,
      `Generated at: ${new Date().toISOString()}`,
      "",
      "Credentials:",
      ...result.createdAccounts.map((account, index) => {
        return [
          `${index + 1}. Role: ${formatRole(account.role)}`,
          `   Email: ${account.email}`,
          `   Temporary password: ${account.temporaryPassword}`,
        ].join("\n");
      }),
      "",
      "Security note: Change temporary passwords at first login.",
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const timestamp = new Date().toISOString().slice(0, 10);
    const agencyToken = sanitizeFileToken(result.agency.name) || "agency";

    anchor.href = objectUrl;
    anchor.download = `${agencyToken}-created-accounts-${timestamp}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(objectUrl);
  };

  return (
    <>
      <AppSidebar />
      <div className="min-h-screen bg-gray-50 pt-16 lg:pt-24">
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center text-xl text-gray-900">
                <Building2 className="mr-2 h-5 w-5 text-indigo-600" />
                Agency Onboarding
              </CardTitle>
              <p className="text-sm text-gray-600">
                Create an agency and auto-provision Accountant, Rental Manager,
                Manager, and Service Provider accounts.
              </p>
            </CardHeader>
          </Card>

          {message && (
            <div className="mb-4">
              <Alert
                type={message.type}
                message={message.text}
                onClose={() => setMessage(null)}
              />
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg text-gray-900">
                  <MapPinned className="mr-2 h-5 w-5 text-indigo-600" />
                  Agency Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Agency name"
                    {...register("name")}
                    error={errors.name?.message}
                    placeholder="Alpha Immo"
                    required
                  />
                  <Input
                    label="Region"
                    {...register("region")}
                    error={errors.region?.message}
                    placeholder="North Region"
                    required
                  />
                  <Input
                    type="date"
                    label="Creation date"
                    {...register("agencyCreationDate")}
                    error={errors.agencyCreationDate?.message}
                    icon={<CalendarDays className="h-4 w-4" />}
                    required
                  />
                  <Input
                    label="Contact email"
                    type="email"
                    {...register("contactEmail")}
                    error={errors.contactEmail?.message}
                    placeholder="contact@alphaimmo.com"
                  />
                  <Input
                    label="Phone"
                    {...register("phone")}
                    error={errors.phone?.message}
                    placeholder="+33123456789"
                  />
                  <Input
                    label="Description"
                    {...register("description")}
                    error={errors.description?.message}
                    placeholder="Optional agency description"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg text-gray-900">
                  <UserPlus className="mr-2 h-5 w-5 text-indigo-600" />
                  Role Account Seeds
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Emails are auto-generated as firstname.role@agencyslug.com.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3 rounded-lg border border-gray-200 p-4">
                    <p className="text-sm font-semibold text-gray-800">
                      Accountant
                    </p>
                    <Input
                      label="First name"
                      {...register("accountant.firstName")}
                      error={errors.accountant?.firstName?.message}
                      required
                    />
                    <Input
                      label="Last name"
                      {...register("accountant.lastName")}
                      error={errors.accountant?.lastName?.message}
                    />
                  </div>

                  <div className="space-y-3 rounded-lg border border-gray-200 p-4">
                    <p className="text-sm font-semibold text-gray-800">
                      Rental Manager
                    </p>
                    <Input
                      label="First name"
                      {...register("rentalManager.firstName")}
                      error={errors.rentalManager?.firstName?.message}
                      required
                    />
                    <Input
                      label="Last name"
                      {...register("rentalManager.lastName")}
                      error={errors.rentalManager?.lastName?.message}
                    />
                  </div>

                  <div className="space-y-3 rounded-lg border border-gray-200 p-4">
                    <p className="text-sm font-semibold text-gray-800">
                      Manager
                    </p>
                    <Input
                      label="First name"
                      {...register("manager.firstName")}
                      error={errors.manager?.firstName?.message}
                      required
                    />
                    <Input
                      label="Last name"
                      {...register("manager.lastName")}
                      error={errors.manager?.lastName?.message}
                    />
                  </div>

                  <div className="space-y-3 rounded-lg border border-gray-200 p-4">
                    <p className="text-sm font-semibold text-gray-800">
                      Service Provider
                    </p>
                    <Input
                      label="First name"
                      {...register("serviceProvider.firstName")}
                      error={errors.serviceProvider?.firstName?.message}
                      required
                    />
                    <Input
                      label="Last name"
                      {...register("serviceProvider.lastName")}
                      error={errors.serviceProvider?.lastName?.message}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" isLoading={isSubmitting}>
                Create agency and accounts
              </Button>
            </div>
          </form>

          {result && (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-base text-gray-900">
                      Created Accounts ({result.createdAccounts.length})
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadAccountsTxt}
                      disabled={result.createdAccounts.length === 0}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download .txt
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {result.createdAccounts.length === 0 ? (
                    <p className="text-sm text-gray-600">
                      No account was created.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {result.createdAccounts.map((account) => (
                        <div
                          key={account.email}
                          className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm"
                        >
                          <p className="font-semibold text-green-900">
                            {formatRole(account.role)}
                          </p>
                          <p className="text-green-800">{account.email}</p>
                          <p className="text-green-800">
                            Temporary password: {account.temporaryPassword}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-gray-900">
                    Skipped Accounts ({result.skippedAccounts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.skippedAccounts.length === 0 ? (
                    <p className="text-sm text-gray-600">No skipped account.</p>
                  ) : (
                    <div className="space-y-3">
                      {result.skippedAccounts.map((account) => (
                        <div
                          key={`${account.email}-${account.role}`}
                          className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm"
                        >
                          <p className="font-semibold text-amber-900">
                            {formatRole(account.role)}
                          </p>
                          <p className="text-amber-800">{account.email}</p>
                          <p className="text-amber-800">{account.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </main>

        <HomeFooter />
      </div>
    </>
  );
}
