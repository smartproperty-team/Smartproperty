import * as Slider from "@radix-ui/react-slider";
import { useEffect, useMemo, useState } from "react";
import LocationPreferenceMap from "../../components/settings/LocationPreferenceMap";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui";
import { authService } from "../../services";
import { useAuthStore, usePreferencesStore } from "../../store";
import {
  UserRole,
  type UserLocationPreference,
  type UserNotificationPreferences,
} from "../../types/auth";

type OnboardingStep = 1 | 2 | 3 | 4;

const PROPERTY_TYPE_OPTIONS = [
  "Apartment",
  "House",
  "Studio",
  "Villa",
  "Office",
];

export default function PreferencesOnboardingModal() {
  const { isAuthenticated, user } = useAuthStore();
  const {
    isOnboardingOpen,
    closeOnboarding,
    skipOnboarding,
    savePreferences,
    getUserPreferences,
    setUserPreferences,
  } = usePreferencesStore();

  const existingPreferences = useMemo(() => {
    if (!user) {
      return null;
    }
    return getUserPreferences(user.id);
  }, [getUserPreferences, user]);

  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [minBudget, setMinBudget] = useState(500);
  const [maxBudget, setMaxBudget] = useState(3000);
  const [locations, setLocations] = useState("");
  const [locationPreference, setLocationPreference] =
    useState<UserLocationPreference>({
      label: "",
      radiusKm: 11,
    });
  const [notifications, setNotifications] =
    useState<UserNotificationPreferences>({
      email: true,
      sms: false,
      push: true,
    });
  const [isSaving, setIsSaving] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);

  useEffect(() => {
    if (!existingPreferences || !isOnboardingOpen) {
      return;
    }

    setPropertyTypes(existingPreferences.propertyTypes);
    setMinBudget(existingPreferences.budgetRange[0]);
    setMaxBudget(existingPreferences.budgetRange[1]);
    setLocations(existingPreferences.locations);
    setLocationPreference(
      existingPreferences.locationPreference ?? {
        label: existingPreferences.locations,
        radiusKm: 11,
      },
    );
    setNotifications(existingPreferences.notifications);
    setCurrentStep(1);
  }, [existingPreferences, isOnboardingOpen]);

  useEffect(() => {
    if (isOnboardingOpen && user && user.role !== UserRole.TENANT) {
      closeOnboarding();
    }
  }, [closeOnboarding, isOnboardingOpen, user]);

  if (
    !isAuthenticated ||
    !user ||
    !isOnboardingOpen ||
    user.role !== UserRole.TENANT
  ) {
    return null;
  }

  const togglePropertyType = (propertyType: string) => {
    setPropertyTypes((currentPropertyTypes) => {
      if (currentPropertyTypes.includes(propertyType)) {
        return currentPropertyTypes.filter((type) => type !== propertyType);
      }
      return [...currentPropertyTypes, propertyType];
    });
  };

  const handleNotificationToggle = (
    notificationType: keyof UserNotificationPreferences,
  ) => {
    setNotifications((currentNotifications) => ({
      ...currentNotifications,
      [notificationType]: !currentNotifications[notificationType],
    }));
  };

  const handleBudgetRangeChange = (value: number[]) => {
    if (value.length !== 2) {
      return;
    }
    setMinBudget(Math.min(value[0], value[1]));
    setMaxBudget(Math.max(value[0], value[1]));
  };

  const validateStep = (step: OnboardingStep): boolean => {
    if (step === 1 && propertyTypes.length === 0) {
      setRequestError("Please select at least one property type.");
      return false;
    }

    if (step === 3 && locations.trim().length === 0) {
      setRequestError("Please provide at least one preferred location.");
      return false;
    }

    if (
      step === 4 &&
      !notifications.email &&
      !notifications.sms &&
      !notifications.push
    ) {
      setRequestError("Please enable at least one notification type.");
      return false;
    }

    setRequestError(null);
    return true;
  };

  const goToNextStep = () => {
    if (!validateStep(currentStep)) {
      return;
    }
    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as OnboardingStep);
    }
  };

  const goToPreviousStep = () => {
    setRequestError(null);
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as OnboardingStep);
    }
  };

  const handleSkip = async () => {
    setIsSaving(true);
    setRequestError(null);
    try {
      const serverPreferences = await authService.updatePreferences({
        propertyTypes,
        budgetRange: [minBudget, maxBudget],
        locations: locations.trim(),
        locationPreference: {
          ...locationPreference,
          label: locations.trim(),
        },
        notifications,
        completed: false,
        skipped: true,
      });
      setUserPreferences(user.id, serverPreferences);
      closeOnboarding();
    } catch {
      skipOnboarding(user.id);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) {
      return;
    }

    setIsSaving(true);
    setRequestError(null);
    try {
      const serverPreferences = await authService.updatePreferences({
        propertyTypes,
        budgetRange: [minBudget, maxBudget],
        locations: locations.trim(),
        locationPreference: {
          ...locationPreference,
          label: locations.trim(),
        },
        notifications,
        completed: true,
        skipped: false,
      });
      savePreferences(user.id, serverPreferences);
    } catch {
      setRequestError("Failed to save preferences. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const stepTitle = {
    1: "Property type preferences",
    2: "Budget range preferences",
    3: "Location preferences",
    4: "Notification preferences",
  }[currentStep];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-xl">
            Tell us your property preferences
          </CardTitle>
          <p className="text-sm text-gray-600">
            We use these answers to personalize listings and notifications for
            you.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Question {currentStep} of 4</span>
              <span>{stepTitle}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-home-primary transition-all"
                style={{ width: `${(currentStep / 4) * 100}%` }}
              />
            </div>
          </div>

          {requestError && <Alert type="error" message={requestError} />}

          {currentStep === 1 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">
                What property types do you prefer?
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {PROPERTY_TYPE_OPTIONS.map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={propertyTypes.includes(option)}
                      onChange={() => togglePropertyType(option)}
                      className="h-4 w-4 rounded border-gray-300 text-home-primary focus:ring-home-primary"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </section>
          )}

          {currentStep === 2 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  What budget interval do you want?
                </h3>
                <span className="text-sm text-gray-600">
                  ${minBudget.toLocaleString()} - ${maxBudget.toLocaleString()}
                </span>
              </div>

              <div className="rounded-lg border border-gray-200 p-5">
                <Slider.Root
                  className="relative flex h-6 w-full touch-none select-none items-center"
                  min={500}
                  max={10000}
                  step={100}
                  minStepsBetweenThumbs={1}
                  value={[minBudget, maxBudget]}
                  onValueChange={handleBudgetRangeChange}
                >
                  <Slider.Track className="relative h-2 grow rounded-full bg-gray-200">
                    <Slider.Range className="absolute h-full rounded-full bg-home-primary" />
                  </Slider.Track>
                  <Slider.Thumb className="block h-5 w-5 rounded-full border border-home-primary bg-white shadow focus:outline-none focus:ring-2 focus:ring-home-primary" />
                  <Slider.Thumb className="block h-5 w-5 rounded-full border border-home-primary bg-white shadow focus:outline-none focus:ring-2 focus:ring-home-primary" />
                </Slider.Root>
                <div className="mt-3 flex justify-between text-xs text-gray-500">
                  <span>$500</span>
                  <span>$10,000</span>
                </div>
              </div>
            </section>
          )}

          {currentStep === 3 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Which locations are you interested in?
              </h3>
              <LocationPreferenceMap
                value={locations}
                onChange={setLocations}
                selection={locationPreference}
                onSelectionChange={setLocationPreference}
                disabled={isSaving}
              />
            </section>
          )}

          {currentStep === 4 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">
                How do you want to receive notifications?
              </h3>
              <div className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    { key: "email", label: "Email" },
                    { key: "sms", label: "SMS" },
                    { key: "push", label: "Push" },
                  ] as const
                ).map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={notifications[item.key]}
                      onChange={() => handleNotificationToggle(item.key)}
                      className="h-4 w-4 rounded border-gray-300 text-home-primary focus:ring-home-primary"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </section>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
              isLoading={isSaving}
            >
              Skip for now
            </Button>

            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={goToPreviousStep}
                disabled={isSaving}
              >
                Previous
              </Button>
            )}

            {currentStep < 4 ? (
              <Button type="button" onClick={goToNextStep} disabled={isSaving}>
                Validate & Next
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} isLoading={isSaving}>
                Save preferences
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
