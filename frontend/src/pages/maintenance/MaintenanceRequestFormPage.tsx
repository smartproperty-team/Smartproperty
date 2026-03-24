import { HomeFooter, Navbar } from "@/components/layout";
import { Button, Input, Stepper, type StepperStep } from "@/components/ui";
import { maintenanceService } from "@/services/maintenance.service";
import { propertyService } from "@/services/property.service";
import { useAuthStore } from "@/store";
import { UserRole } from "@/types/auth";
import type {
  CreateMaintenanceRequestDto,
  EntryPermissionOption,
  MaintenanceCategory,
  MaintenancePriority,
} from "@/types/maintenance";
import type { Property } from "@/types/property";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const steps: StepperStep[] = [
  { id: "basics", label: "Request basics" },
  { id: "description", label: "Description" },
  { id: "media", label: "Media evidence" },
  { id: "access", label: "Access & contact" },
  { id: "review", label: "Review & submit" },
];

type FormErrors = Partial<Record<string, string>>;

const categoryOptions: Array<{ value: MaintenanceCategory; label: string }> = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "hvac", label: "HVAC" },
  { value: "appliance", label: "Appliance" },
  { value: "structural", label: "Structural" },
  { value: "security", label: "Security" },
  { value: "other", label: "Other" },
];

const priorityOptions: Array<{ value: MaintenancePriority; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "emergency", label: "Emergency" },
];

const entryOptions: Array<{ value: EntryPermissionOption; label: string }> = [
  { value: "presence_required", label: "Presence required during visit" },
  {
    value: "can_enter_with_key",
    label: "Can enter with key / building access",
  },
  { value: "call_before_entry", label: "Call before entry" },
];

export default function MaintenanceRequestFormPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [propertyOptions, setPropertyOptions] = useState<Property[]>([]);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);

  const [formData, setFormData] = useState({
    propertyId: "",
    issueTitle: "",
    category: "" as "" | MaintenanceCategory,
    priority: "" as "" | MaintenancePriority,
    emergency: false,
    description: "",
    locationInProperty: "",
    firstSeenAt: "",
    isBlockingUsage: false,
    preferredVisitWindows: "",
    contactPhone: user?.phone || "",
    entryPermission: "" as "" | EntryPermissionOption,
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",
  });

  useEffect(() => {
    void (async () => {
      if (!user?.id) {
        return;
      }

      setLoadingProperties(true);
      try {
        const filters: { limit: number; ownerId?: string; managerId?: string } =
          { limit: 100 };

        if (user.role === UserRole.OWNER) {
          filters.ownerId = user.id;
        } else if (user.role === UserRole.BRANCH_MANAGER) {
          filters.managerId = user.id;
        }

        const result = await propertyService.getProperties(filters);
        setPropertyOptions(result.properties || []);
      } catch (error) {
        console.error("Failed to load properties:", error);
      } finally {
        setLoadingProperties(false);
      }
    })();
  }, [user?.id, user?.role]);

  const mediaRequired =
    formData.priority === "high" ||
    formData.priority === "emergency" ||
    formData.emergency;

  const currentStepHasErrors = (step: number) => {
    if (step === 0) {
      return !!(
        errors.propertyId ||
        errors.issueTitle ||
        errors.category ||
        errors.priority
      );
    }

    if (step === 1) {
      return !!(errors.description || errors.firstSeenAt);
    }

    if (step === 2) {
      return !!errors.media;
    }

    if (step === 3) {
      return !!(
        errors.contactPhone ||
        errors.entryPermission ||
        errors.emergencyContact
      );
    }

    return false;
  };

  const setField = (name: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateDates = (newErrors: FormErrors): void => {
    if (!formData.firstSeenAt) {
      return;
    }

    const date = new Date(formData.firstSeenAt);

    if (date > new Date()) {
      newErrors.firstSeenAt = "First seen date cannot be in the future.";
    }
  };

  const validateStep = (step: number, strict: boolean): boolean => {
    const newErrors: FormErrors = {};

    if (step === 0 && strict) {
      if (!formData.propertyId) {
        newErrors.propertyId = "Property is required.";
      }

      if (!formData.issueTitle.trim()) {
        newErrors.issueTitle = "Issue title is required.";
      }

      if (!formData.category) {
        newErrors.category = "Category is required.";
      }

      if (!formData.priority) {
        newErrors.priority = "Priority is required.";
      }
    }

    if (step === 1 && strict) {
      if (!formData.description.trim()) {
        newErrors.description = "Detailed description is required.";
      }

      validateDates(newErrors);
    }

    if (step === 2 && strict && mediaRequired && mediaFiles.length < 1) {
      newErrors.media =
        "At least one media file is required for high or emergency requests.";
    }

    if (step === 3 && strict) {
      if (!formData.contactPhone.trim()) {
        newErrors.contactPhone = "Contact phone is required.";
      }

      if (!formData.entryPermission) {
        newErrors.entryPermission = "Entry permission is required.";
      }

      if (
        formData.emergency &&
        (!formData.emergencyContactName.trim() ||
          !formData.emergencyContactPhone.trim())
      ) {
        newErrors.emergencyContact =
          "Emergency contact name and phone are required.";
      }
    }

    if (step === 0 && !strict && !formData.propertyId) {
      newErrors.propertyId = "Property is required to save a draft.";
    }

    if (step === 1 && !strict) {
      validateDates(newErrors);
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const validateAllSteps = (strict: boolean): boolean => {
    const results = [0, 1, 2, 3].map((step) => validateStep(step, strict));
    return results.every(Boolean);
  };

  const mapMedia = () =>
    mediaFiles.map((file) => ({
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    }));

  const toPayload = (saveAsDraft: boolean): CreateMaintenanceRequestDto => {
    return {
      propertyId: formData.propertyId,
      issueTitle: formData.issueTitle || undefined,
      category: formData.category || undefined,
      priority: formData.priority || undefined,
      emergency: formData.emergency,
      description: formData.description || undefined,
      locationInProperty: formData.locationInProperty || undefined,
      firstSeenAt: formData.firstSeenAt
        ? new Date(formData.firstSeenAt).toISOString()
        : undefined,
      isBlockingUsage: formData.isBlockingUsage,
      media: mapMedia(),
      preferredVisitWindows: formData.preferredVisitWindows
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      contactPhone: formData.contactPhone || undefined,
      entryPermission: formData.entryPermission || undefined,
      emergencyContact: formData.emergency
        ? {
            name: formData.emergencyContactName,
            phone: formData.emergencyContactPhone,
            relation: formData.emergencyContactRelation || undefined,
          }
        : undefined,
      saveAsDraft,
    };
  };

  const handleFileInput = (files: FileList | null) => {
    if (!files) {
      return;
    }

    const incoming = Array.from(files);
    const valid: File[] = [];
    const rejected: string[] = [];

    for (const file of incoming) {
      const type = file.type;
      const isAllowed = type.startsWith("image/") || type.startsWith("video/");

      if (!isAllowed) {
        rejected.push(`${file.name}: unsupported file type`);
        continue;
      }

      const isVideo = type.startsWith("video/");
      const maxBytes = isVideo ? 25 * 1024 * 1024 : 10 * 1024 * 1024;

      if (file.size > maxBytes) {
        rejected.push(
          `${file.name}: ${isVideo ? "video max 25MB" : "image max 10MB"}`,
        );
        continue;
      }

      valid.push(file);
    }

    if (rejected.length > 0) {
      setErrors((prev) => ({
        ...prev,
        media: `Some files were rejected: ${rejected.join(", ")}`,
      }));
    } else if (errors.media) {
      setErrors((prev) => ({ ...prev, media: undefined }));
    }

    setMediaFiles((prev) => [...prev, ...valid]);
  };

  const handleSaveDraft = async () => {
    if (!validateAllSteps(false)) {
      return;
    }

    setLoading(true);
    try {
      await maintenanceService.createRequest(toPayload(true));
      navigate("/maintenance/requests/mine");
    } catch (error) {
      console.error("Failed to save maintenance draft:", error);
      alert("Could not save draft. Please review the form and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateAllSteps(true)) {
      return;
    }

    setLoading(true);
    try {
      await maintenanceService.createRequest(toPayload(false));
      navigate("/maintenance/requests/mine");
    } catch (error) {
      console.error("Failed to submit maintenance request:", error);
      alert(
        "Could not submit the request. Please review validation and retry.",
      );
    } finally {
      setLoading(false);
    }
  };

  const goNext = () => {
    const strict = currentStep < 4;
    if (!validateStep(currentStep, strict)) {
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const goBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  return (
    <div className="min-h-screen bg-home-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 lg:px-8">
        <header className="mb-6">
          <p className="text-sm font-medium uppercase tracking-wide text-home-primary">
            Maintenance module
          </p>
          <h1 className="text-3xl font-bold text-home-text">
            Owner/Branch Manager request intake
          </h1>
          <p className="mt-2 text-sm text-home-text-muted">
            Tenant intake is intentionally excluded for now.
          </p>
        </header>

        <Stepper
          steps={steps}
          currentStep={currentStep}
          allowStepNavigation
          onStepChange={(step) => {
            if (step <= currentStep) {
              setCurrentStep(step);
            }
          }}
          ariaLabel="Maintenance request steps"
          actions={
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-between">
              <Button type="button" variant="outline" onClick={goBack}>
                Back
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="soft"
                  isLoading={loading}
                  onClick={handleSaveDraft}
                >
                  Save draft
                </Button>
                {currentStep < 4 ? (
                  <Button type="button" onClick={goNext}>
                    Continue
                  </Button>
                ) : (
                  <Button
                    type="button"
                    isLoading={loading}
                    onClick={handleSubmit}
                  >
                    Submit request
                  </Button>
                )}
              </div>
            </div>
          }
        >
          <section className="rounded-xl border border-home-border bg-white p-5 shadow-sm">
            {currentStep === 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-home-text">
                    Property <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formData.propertyId}
                    onChange={(e) => setField("propertyId", e.target.value)}
                    className="h-10 w-full rounded-lg border border-home-border px-3 text-sm"
                    disabled={loadingProperties}
                  >
                    <option value="">Select property</option>
                    {propertyOptions.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.title}
                      </option>
                    ))}
                  </select>
                  {errors.propertyId && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.propertyId}
                    </p>
                  )}
                </div>

                <Input
                  label="Issue title"
                  required
                  value={formData.issueTitle}
                  onChange={(e) => setField("issueTitle", e.target.value)}
                  error={errors.issueTitle}
                />

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-home-text">
                    Category <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setField("category", e.target.value)}
                    className="h-10 w-full rounded-lg border border-home-border px-3 text-sm"
                  >
                    <option value="">Select category</option>
                    {categoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.category}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-home-text">
                    Priority <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setField("priority", e.target.value)}
                    className="h-10 w-full rounded-lg border border-home-border px-3 text-sm"
                  >
                    <option value="">Select priority</option>
                    {priorityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.priority && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.priority}
                    </p>
                  )}
                </div>

                <label className="inline-flex items-center gap-2 text-sm text-home-text">
                  <input
                    type="checkbox"
                    checked={formData.emergency}
                    onChange={(e) => setField("emergency", e.target.checked)}
                  />
                  Emergency request
                </label>
              </div>
            )}

            {currentStep === 1 && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-home-text">
                    Detailed description <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setField("description", e.target.value)}
                    rows={5}
                    className="w-full rounded-lg border border-home-border px-3 py-2 text-sm"
                    placeholder="Describe issue symptoms, frequency, and impact"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.description}
                    </p>
                  )}
                </div>

                <Input
                  label="Location in property"
                  value={formData.locationInProperty}
                  onChange={(e) =>
                    setField("locationInProperty", e.target.value)
                  }
                  placeholder="Kitchen, bathroom, bedroom..."
                />

                <Input
                  type="datetime-local"
                  label="First seen date/time"
                  value={formData.firstSeenAt}
                  onChange={(e) => setField("firstSeenAt", e.target.value)}
                  error={errors.firstSeenAt}
                />

                <label className="inline-flex items-center gap-2 text-sm text-home-text">
                  <input
                    type="checkbox"
                    checked={formData.isBlockingUsage}
                    onChange={(e) =>
                      setField("isBlockingUsage", e.target.checked)
                    }
                  />
                  Issue is blocking normal usage
                </label>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-home-text-muted">
                  Upload photos or videos. File limits: images up to 10MB,
                  videos up to 25MB.
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={(e) => handleFileInput(e.target.files)}
                  className="block w-full text-sm"
                />
                {errors.media && (
                  <p className="text-sm text-red-600">{errors.media}</p>
                )}
                {mediaFiles.length > 0 && (
                  <ul className="space-y-2 rounded-lg border border-home-border p-3 text-sm">
                    {mediaFiles.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between gap-3"
                      >
                        <span>
                          {file.name} ({Math.round(file.size / 1024)} KB)
                        </span>
                        <button
                          type="button"
                          className="text-xs text-red-600"
                          onClick={() =>
                            setMediaFiles((prev) =>
                              prev.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            )
                          }
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {mediaRequired && (
                  <p className="text-xs font-medium text-orange-700">
                    Media is required for high or emergency requests.
                  </p>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-home-text">
                    Preferred visit windows
                  </label>
                  <textarea
                    rows={3}
                    value={formData.preferredVisitWindows}
                    onChange={(e) =>
                      setField("preferredVisitWindows", e.target.value)
                    }
                    className="w-full rounded-lg border border-home-border px-3 py-2 text-sm"
                    placeholder="One line per window (e.g., Mon-Fri 09:00-12:00)"
                  />
                </div>

                <Input
                  label="Owner/Branch Manager phone"
                  required
                  value={formData.contactPhone}
                  onChange={(e) => setField("contactPhone", e.target.value)}
                  error={errors.contactPhone}
                />

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-home-text">
                    Entry permission <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formData.entryPermission}
                    onChange={(e) =>
                      setField("entryPermission", e.target.value)
                    }
                    className="h-10 w-full rounded-lg border border-home-border px-3 text-sm"
                  >
                    <option value="">Select option</option>
                    {entryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.entryPermission && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.entryPermission}
                    </p>
                  )}
                </div>

                {formData.emergency && (
                  <>
                    <Input
                      label="Emergency contact name"
                      required
                      value={formData.emergencyContactName}
                      onChange={(e) =>
                        setField("emergencyContactName", e.target.value)
                      }
                    />
                    <Input
                      label="Emergency contact phone"
                      required
                      value={formData.emergencyContactPhone}
                      onChange={(e) =>
                        setField("emergencyContactPhone", e.target.value)
                      }
                    />
                    <Input
                      label="Emergency contact relation"
                      value={formData.emergencyContactRelation}
                      onChange={(e) =>
                        setField("emergencyContactRelation", e.target.value)
                      }
                    />
                    {errors.emergencyContact && (
                      <p className="md:col-span-2 text-sm text-red-600">
                        {errors.emergencyContact}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="rounded-lg border border-home-border p-4">
                  <h2 className="text-lg font-semibold text-home-text">
                    Summary
                  </h2>
                  <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                    <div>
                      <dt className="text-home-text-muted">Property</dt>
                      <dd className="font-medium text-home-text">
                        {propertyOptions.find(
                          (p) => p.id === formData.propertyId,
                        )?.title || "N/A"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-home-text-muted">Issue title</dt>
                      <dd className="font-medium text-home-text">
                        {formData.issueTitle || "N/A"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-home-text-muted">Category</dt>
                      <dd className="font-medium text-home-text">
                        {formData.category || "N/A"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-home-text-muted">Priority</dt>
                      <dd className="font-medium text-home-text">
                        {formData.priority || "N/A"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-home-text-muted">Emergency</dt>
                      <dd className="font-medium text-home-text">
                        {formData.emergency ? "Yes" : "No"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-home-text-muted">Media files</dt>
                      <dd className="font-medium text-home-text">
                        {mediaFiles.length}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-lg border border-home-border p-4 text-sm text-home-text-muted">
                  <p className="font-medium text-home-text">Status workflow</p>
                  <p className="mt-1">
                    submitted → triaged → assigned → scheduled → in progress →
                    waiting parts → completed → closed (plus canceled/rejected)
                  </p>
                </div>

                {currentStepHasErrors(currentStep) && (
                  <p className="text-sm text-red-600">
                    Please review highlighted fields before submitting.
                  </p>
                )}
              </div>
            )}
          </section>
        </Stepper>

        <div className="mt-4 text-sm text-home-text-muted">
          Need a quick exit? Return to{" "}
          <Link to="/dashboard" className="text-home-primary underline">
            dashboard
          </Link>
          .
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-home-border bg-white p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] md:hidden">
        <div className="mx-auto flex max-w-6xl gap-2">
          <Button
            type="button"
            variant="soft"
            className="flex-1"
            isLoading={loading}
            onClick={handleSaveDraft}
          >
            Save draft
          </Button>
          <Button
            type="button"
            className="flex-1"
            isLoading={loading}
            onClick={handleSubmit}
          >
            Submit
          </Button>
        </div>
      </div>

      <HomeFooter />
    </div>
  );
}
