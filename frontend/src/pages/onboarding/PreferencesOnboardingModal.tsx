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
import { useTranslation } from "../../i18n";
import { authService } from "../../services";
import { useAuthStore, usePreferencesStore } from "../../store";
import {
  UserRole,
  type UserLocationPreference,
  type UserNotificationPreferences,
} from "../../types/auth";

type OnboardingStep = 1 | 2 | 3 | 4;
const ONBOARDING_STEPS = [1, 2, 3, 4] as const;

export default function PreferencesOnboardingModal() {
  const t = useTranslation();
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

  const propertyTypeOptions = [
    {
      value: "Apartment",
      label: t.preferencesOnboarding.options.propertyTypes.apartment,
    },
    {
      value: "House",
      label: t.preferencesOnboarding.options.propertyTypes.house,
    },
    {
      value: "Studio",
      label: t.preferencesOnboarding.options.propertyTypes.studio,
    },
    {
      value: "Villa",
      label: t.preferencesOnboarding.options.propertyTypes.villa,
    },
    {
      value: "Office",
      label: t.preferencesOnboarding.options.propertyTypes.office,
    },
  ] as const;

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
      setRequestError(t.preferencesOnboarding.errors.selectPropertyType);
      return false;
    }

    if (step === 3 && locations.trim().length === 0) {
      setRequestError(t.preferencesOnboarding.errors.selectLocation);
      return false;
    }

    if (
      step === 4 &&
      !notifications.email &&
      !notifications.sms &&
      !notifications.push
    ) {
      setRequestError(t.preferencesOnboarding.errors.enableNotification);
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
      setRequestError(t.preferencesOnboarding.errors.saveFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const stepTitle = {
    1: t.preferencesOnboarding.steps.propertyTypes,
    2: t.preferencesOnboarding.steps.budget,
    3: t.preferencesOnboarding.steps.location,
    4: t.preferencesOnboarding.steps.notifications,
  }[currentStep];

  const questionLabel = t.preferencesOnboarding.progress.questionOf
    .replace("{{current}}", String(currentStep))
    .replace("{{total}}", String(ONBOARDING_STEPS.length));

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 px-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>{questionLabel}</span>
              <span>{stepTitle}</span>
            </div>
            <div className="relative h-6">
              <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-home-primary transition-all"
                  style={{
                    width: `${((currentStep - 1) / (ONBOARDING_STEPS.length - 1)) * 100}%`,
                  }}
                />
              </div>

              <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between">
                {ONBOARDING_STEPS.map((step) => {
                  const isCompleted = step < currentStep;
                  const isCurrent = step === currentStep;

                  return (
                    <span
                      key={step}
                      className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors ${
                        isCompleted
                          ? "border-home-primary bg-home-primary text-white"
                          : isCurrent
                            ? "border-home-primary bg-white text-home-primary"
                            : "border-gray-300 bg-white text-gray-500"
                      }`}
                      aria-label={t.preferencesOnboarding.progress.stepLabel.replace(
                        "{{step}}",
                        String(step),
                      )}
                    >
                      {isCompleted ? "✓" : step}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
          <CardTitle className="text-xl">
            {t.preferencesOnboarding.title}
          </CardTitle>
          <p className="text-sm text-gray-600">
            {t.preferencesOnboarding.subtitle}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {requestError && <Alert type="error" message={requestError} />}

          {currentStep === 1 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">
                {t.preferencesOnboarding.questions.propertyTypes}
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {propertyTypeOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={propertyTypes.includes(option.value)}
                      onChange={() => togglePropertyType(option.value)}
                      className="h-4 w-4 rounded border-gray-300 text-home-primary focus:ring-home-primary"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </section>
          )}

          {currentStep === 2 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  {t.preferencesOnboarding.questions.budget}
                </h3>
                <span className="text-sm text-gray-600">
                  TND {minBudget.toLocaleString()} - TND{" "}
                  {maxBudget.toLocaleString()}
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
                  <span>TND 500</span>
                  <span>TND 10,000</span>
                </div>
              </div>
            </section>
          )}

          {currentStep === 3 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">
                {t.preferencesOnboarding.questions.location}
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
                {t.preferencesOnboarding.questions.notifications}
              </h3>
              <div className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    {
                      key: "email",
                      label:
                        t.preferencesOnboarding.options.notificationChannels
                          .email,
                    },
                    {
                      key: "sms",
                      label:
                        t.preferencesOnboarding.options.notificationChannels
                          .sms,
                    },
                    {
                      key: "push",
                      label:
                        t.preferencesOnboarding.options.notificationChannels
                          .push,
                    },
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
              {t.preferencesOnboarding.actions.skip}
            </Button>

            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={goToPreviousStep}
                disabled={isSaving}
              >
                {t.preferencesOnboarding.actions.previous}
              </Button>
            )}

            {currentStep < 4 ? (
              <Button type="button" onClick={goToNextStep} disabled={isSaving}>
                {t.preferencesOnboarding.actions.next}
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} isLoading={isSaving}>
                {t.preferencesOnboarding.actions.save}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
