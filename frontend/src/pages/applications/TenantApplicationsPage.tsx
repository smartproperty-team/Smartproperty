import { AppSidebar, HomeFooter } from "@/components/layout";
import LocationPreferenceMap from "@/components/settings/LocationPreferenceMap";
import { Alert, Stepper, type StepperStep } from "@/components/ui";
import applicationService from "@/services/application.service";
import type {
  Application,
  ApplicationQuestionnaire,
} from "@/types/application";
import { ApplicationStatus } from "@/types/application";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const APPLICATION_FORM_STEPS: StepperStep[] = [
  { id: "identity", label: "Identity" },
  { id: "household", label: "Household" },
  { id: "rental-need", label: "Rental Need" },
  { id: "history", label: "History" },
];

const LEASE_DURATION_OPTIONS = [
  { value: "6_months", label: "6 months" },
  { value: "12_months", label: "12 months" },
  { value: "24_months", label: "24 months" },
  { value: "flexible", label: "Flexible" },
] as const;

const ACTIVE_APPLICATION_STATUSES = new Set<ApplicationStatus>([
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.UNDER_REVIEW,
  ApplicationStatus.DOCUMENTS_REQUESTED,
  ApplicationStatus.VIEWING_SCHEDULED,
]);

export default function TenantApplicationsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledPropertyId = searchParams.get("propertyId") || "";
  const targetApplicationId = searchParams.get("applicationId") || "";

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [propertyId, setPropertyId] = useState(prefilledPropertyId);

  const [dateOfBirth, setDateOfBirth] = useState("");
  const [currentAddress, setCurrentAddress] = useState("");
  const [preferredContactChannel, setPreferredContactChannel] =
    useState("email");

  const [occupantsAdults, setOccupantsAdults] = useState("1");
  const [occupantsChildren, setOccupantsChildren] = useState("0");
  const [occupantRelationshipSummary, setOccupantRelationshipSummary] =
    useState("");
  const [hasPets, setHasPets] = useState(false);
  const [petType, setPetType] = useState("");
  const [petCount, setPetCount] = useState("0");
  const [smokingStatus, setSmokingStatus] = useState("not_specified");

  const [desiredMoveInDate, setDesiredMoveInDate] = useState("");
  const [leaseDurationPreference, setLeaseDurationPreference] =
    useState("12_months");

  const [reasonForMoving, setReasonForMoving] = useState("");
  const [hadRentPaymentIncidents, setHadRentPaymentIncidents] = useState(false);
  const [rentPaymentIncidentsExplanation, setRentPaymentIncidentsExplanation] =
    useState("");

  const [messageToOwner, setMessageToOwner] = useState("");
  const [currentFormStep, setCurrentFormStep] = useState(0);
  const [validationPopupMessage, setValidationPopupMessage] = useState<
    string | null
  >(null);
  const submitIntentRef = useRef(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBlockedForSelectedProperty, setIsBlockedForSelectedProperty] =
    useState(false);

  const finalFormStepIndex = APPLICATION_FORM_STEPS.length - 1;
  const totalFormSteps = APPLICATION_FORM_STEPS.length;
  const progressPercent = Math.round(
    ((currentFormStep + 1) / totalFormSteps) * 100,
  );
  const maxAllowedBirthDate = (() => {
    const cutoffDate = new Date();
    cutoffDate.setHours(0, 0, 0, 0);
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 20);
    return cutoffDate.toISOString().slice(0, 10);
  })();

  const toNumberOrUndefined = (value: string) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return undefined;
    }

    const parsedValue = Number(trimmedValue);
    return Number.isFinite(parsedValue) ? parsedValue : undefined;
  };

  const getApiErrorMessage = (error: unknown, fallback: string) => {
    if (typeof error === "object" && error !== null && "response" in error) {
      const response = (
        error as {
          response?: { data?: { message?: string | string[] } };
        }
      ).response;
      const message = response?.data?.message;

      if (Array.isArray(message)) {
        const firstMessage = message.find(
          (item) => typeof item === "string" && item.trim().length > 0,
        );
        if (firstMessage) {
          return firstMessage;
        }
      }

      if (typeof message === "string" && message.trim().length > 0) {
        return message;
      }
    }

    return fallback;
  };

  const showValidationPopup = (message: string) => {
    setValidationPopupMessage(message);
  };

  const validateStep = (stepIndex: number) => {
    if (stepIndex === 0 && !propertyId.trim()) {
      return "Please open a property and click Apply first.";
    }

    if (stepIndex === 0) {
      if (!dateOfBirth) {
        return "Please provide your date of birth.";
      }

      const birthDate = new Date(`${dateOfBirth}T00:00:00`);
      const cutoffDate = new Date();
      cutoffDate.setHours(0, 0, 0, 0);
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 20);

      if (Number.isNaN(birthDate.getTime()) || birthDate > cutoffDate) {
        return "Applicant must be at least 20 years old.";
      }

      if (!currentAddress.trim()) {
        return "Please provide your current address.";
      }
    }

    if (stepIndex === 2) {
      if (!desiredMoveInDate.trim()) {
        return "Please choose your desired move-in date.";
      }

      if (!leaseDurationPreference.trim()) {
        return "Please select a lease duration preference.";
      }
    }

    if (stepIndex === 3) {
      if (!reasonForMoving.trim()) {
        return "Please provide a reason for moving.";
      }

      if (hadRentPaymentIncidents && !rentPaymentIncidentsExplanation.trim()) {
        return "Please explain past payment incidents or switch to No incidents.";
      }
    }

    return null;
  };

  const goToPreviousStep = () => {
    setError(null);
    setCurrentFormStep((previous) => Math.max(previous - 1, 0));
  };

  const goToNextStep = () => {
    const validationError = validateStep(currentFormStep);

    if (validationError) {
      showValidationPopup(validationError);
      return;
    }

    setError(null);
    setCurrentFormStep((previous) =>
      Math.min(previous + 1, finalFormStepIndex),
    );
  };

  const handleStepChange = (stepIndex: number) => {
    if (stepIndex <= currentFormStep) {
      setError(null);
      setCurrentFormStep(stepIndex);
    }
  };

  const loadApplications = async () => {
    setLoading(true);
    try {
      const response = await applicationService.getMyApplications({
        page: 1,
        limit: 50,
      });
      setApplications(response.applications);
      setError(null);
    } catch {
      setError("Failed to load your applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadApplications();
  }, []);

  useEffect(() => {
    if (prefilledPropertyId && !propertyId) {
      setPropertyId(prefilledPropertyId);
    }
  }, [prefilledPropertyId, propertyId]);

  useEffect(() => {
    if (targetApplicationId && !loading) {
      const element = document.getElementById(`app-${targetApplicationId}`);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add("ring-2", "ring-indigo-500", "ring-offset-2");
          setTimeout(() => {
            element.classList.remove(
              "ring-2",
              "ring-indigo-500",
              "ring-offset-2",
            );
          }, 3000);
        }, 100);
      }
    }
  }, [targetApplicationId, loading]);

  useEffect(() => {
    if (!prefilledPropertyId) {
      setIsBlockedForSelectedProperty(false);
      return;
    }

    const hasActiveApplication = applications.some(
      (application) =>
        application.propertyId === prefilledPropertyId &&
        ACTIVE_APPLICATION_STATUSES.has(application.status),
    );

    setIsBlockedForSelectedProperty(hasActiveApplication);
  }, [applications, prefilledPropertyId]);

  const submitApplication = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (currentFormStep === finalFormStepIndex && !submitIntentRef.current) {
      return;
    }
    submitIntentRef.current = false;

    if (currentFormStep < finalFormStepIndex) {
      goToNextStep();
      return;
    }

    if (!propertyId.trim()) {
      showValidationPopup("Please open a property and click Apply first.");
      return;
    }

    if (isBlockedForSelectedProperty) {
      showValidationPopup(
        "You already have an active application for this property.",
      );
      return;
    }

    for (let stepIndex = 0; stepIndex <= finalFormStepIndex; stepIndex += 1) {
      const validationError = validateStep(stepIndex);
      if (validationError) {
        setCurrentFormStep(stepIndex);
        showValidationPopup(validationError);
        return;
      }
    }

    const questionnaire: ApplicationQuestionnaire = {
      dateOfBirth: dateOfBirth || undefined,
      currentAddress: currentAddress.trim() || undefined,
      preferredContactChannel: preferredContactChannel || undefined,
      occupantsAdults: toNumberOrUndefined(occupantsAdults),
      occupantsChildren: toNumberOrUndefined(occupantsChildren),
      occupantRelationshipSummary:
        occupantRelationshipSummary.trim() || undefined,
      hasPets,
      petType: hasPets ? petType.trim() || undefined : undefined,
      petCount: hasPets ? toNumberOrUndefined(petCount) : undefined,
      smokingStatus: smokingStatus || undefined,
      desiredMoveInDate: desiredMoveInDate || undefined,
      leaseDurationPreference: leaseDurationPreference.trim() || undefined,
      reasonForMoving: reasonForMoving.trim() || undefined,
      hadRentPaymentIncidents,
      rentPaymentIncidentsExplanation: hadRentPaymentIncidents
        ? rentPaymentIncidentsExplanation.trim() || undefined
        : undefined,
    };

    try {
      setIsSubmitting(true);
      setError(null);
      setNotice(null);
      await applicationService.submitApplication({
        propertyId,
        employmentInfo: {
          companyName: "Not provided by applicant",
          jobTitle: "Not provided by applicant",
          monthlyIncome: 0,
        },
        messageToOwner: messageToOwner || undefined,
        questionnaire,
      });

      navigate("/dashboard", {
        replace: true,
        state: { applicationSubmitted: true },
      });
      return;
    } catch (error) {
      setError(getApiErrorMessage(error, "Failed to submit application."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Enter") {
      return;
    }

    const target = event.target as HTMLElement;

    if (target instanceof HTMLTextAreaElement) {
      return;
    }

    if (target instanceof HTMLButtonElement && target.type === "submit") {
      return;
    }

    event.preventDefault();
  };

  return (
    <>
      <AppSidebar />
      <main className="min-h-screen bg-gray-50 px-4 pb-12 pt-20 lg:px-8 lg:pt-28">
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                Apply for a Rental Property
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Fill out your information to apply. The property owner will
                review your application and get back to you.
              </p>
            </div>

            {error && (
              <div className="mt-4" aria-live="assertive">
                <Alert
                  type="error"
                  message={error}
                  onClose={() => setError(null)}
                />
              </div>
            )}
            {notice && (
              <div className="mt-4" aria-live="polite">
                <Alert
                  type="success"
                  message={notice}
                  onClose={() => setNotice(null)}
                />
              </div>
            )}

            {isBlockedForSelectedProperty && prefilledPropertyId && (
              <div className="mt-8 rounded-xl border border-amber-300 bg-amber-50 p-5">
                <p className="text-sm font-semibold text-amber-900">
                  You already have an active application for this property.
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  Withdraw your current application first if you want to submit
                  a new one.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                    onClick={() => navigate("/dashboard")}
                  >
                    Go to Dashboard
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-amber-400 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                    onClick={() => navigate("/dashboard")}
                  >
                    View My Applications in Dashboard
                  </button>
                </div>
              </div>
            )}

            {!isBlockedForSelectedProperty && (
              <form
                className="mt-8"
                onSubmit={submitApplication}
                onKeyDown={handleFormKeyDown}
                noValidate
              >
                <div className="mb-6 rounded-2xl border-2 border-indigo-300 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-bold uppercase tracking-wide text-indigo-700">
                      Questionnaire Progress
                    </p>
                    <span className="text-lg font-extrabold text-indigo-900">
                      {progressPercent}%
                    </span>
                  </div>
                  <p className="mb-3 text-sm font-semibold text-indigo-900">
                    Step {currentFormStep + 1} of {totalFormSteps}:{" "}
                    {APPLICATION_FORM_STEPS[currentFormStep]?.label}
                  </p>
                  <progress
                    className="h-4 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-indigo-100 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-indigo-600 [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-indigo-600"
                    value={currentFormStep + 1}
                    max={totalFormSteps}
                    aria-label="Application form progress"
                  />
                </div>

                <Stepper
                  steps={APPLICATION_FORM_STEPS}
                  currentStep={currentFormStep}
                  ariaLabel="Rental application steps"
                  allowStepNavigation
                  onStepChange={handleStepChange}
                  actions={
                    <div className="flex flex-wrap gap-3 pt-2">
                      {currentFormStep > 0 && (
                        <button
                          type="button"
                          className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                          onClick={goToPreviousStep}
                        >
                          Back
                        </button>
                      )}

                      {currentFormStep < finalFormStepIndex ? (
                        <button
                          type="button"
                          className="ml-auto rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white transition-colors hover:bg-indigo-700"
                          onClick={goToNextStep}
                        >
                          Next
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          onClick={() => {
                            submitIntentRef.current = true;
                          }}
                          className="ml-auto rounded-lg bg-linear-to-r from-indigo-600 to-indigo-700 px-6 py-3 font-bold text-white shadow-lg transition-all hover:from-indigo-700 hover:to-indigo-800 hover:shadow-xl active:scale-95"
                        >
                          {isSubmitting
                            ? "Submitting..."
                            : "Submit My Application"}
                        </button>
                      )}
                    </div>
                  }
                >
                  {currentFormStep === 0 && (
                    <div>
                      <div className="rounded-lg border-2 border-sky-200 bg-sky-50 p-4">
                        <p className="mb-3 font-bold text-sky-900">
                          Applicant Identity
                        </p>
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="grid gap-1 text-sm text-gray-700">
                            <span className="font-semibold text-gray-900">
                              Date of Birth
                            </span>
                            <input
                              type="date"
                              className="rounded-lg border border-gray-300 px-3 py-2"
                              value={dateOfBirth}
                              onChange={(e) => setDateOfBirth(e.target.value)}
                              max={maxAllowedBirthDate}
                              required
                            />
                          </label>
                          <label className="grid gap-1 text-sm text-gray-700">
                            <span className="font-semibold text-gray-900">
                              Preferred Contact Channel
                            </span>
                            <select
                              className="rounded-lg border border-gray-300 px-3 py-2"
                              value={preferredContactChannel}
                              onChange={(e) =>
                                setPreferredContactChannel(e.target.value)
                              }
                            >
                              <option value="email">Email</option>
                              <option value="phone">Phone</option>
                              <option value="sms">SMS</option>
                              <option value="whatsapp">WhatsApp</option>
                            </select>
                          </label>
                          <label className="md:col-span-2 grid gap-1 text-sm text-gray-700">
                            <span className="font-semibold text-gray-900">
                              Current Address
                            </span>
                            <input
                              className="rounded-lg border border-gray-300 px-3 py-2"
                              value={currentAddress}
                              onChange={(e) =>
                                setCurrentAddress(e.target.value)
                              }
                              placeholder="Street, city, postal code"
                              required
                            />
                            <span className="text-xs text-gray-500">
                              You can type your address or choose it on the map
                              below.
                            </span>
                            <div className="rounded-lg border border-sky-100 bg-white p-3">
                              <LocationPreferenceMap
                                value={currentAddress}
                                onChange={setCurrentAddress}
                                showRadius={false}
                              />
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentFormStep === 1 && (
                    <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                      <p className="mb-3 font-bold text-blue-900">
                        Household & Occupancy
                      </p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="grid gap-1 text-sm text-gray-700">
                          <span className="font-semibold text-gray-900">
                            Adults
                          </span>
                          <input
                            type="number"
                            min="0"
                            className="rounded-lg border border-gray-300 px-3 py-2"
                            value={occupantsAdults}
                            onChange={(e) => setOccupantsAdults(e.target.value)}
                          />
                        </label>
                        <label className="grid gap-1 text-sm text-gray-700">
                          <span className="font-semibold text-gray-900">
                            Children
                          </span>
                          <input
                            type="number"
                            min="0"
                            className="rounded-lg border border-gray-300 px-3 py-2"
                            value={occupantsChildren}
                            onChange={(e) =>
                              setOccupantsChildren(e.target.value)
                            }
                          />
                        </label>
                        <label className="md:col-span-2 grid gap-1 text-sm text-gray-700">
                          <span className="font-semibold text-gray-900">
                            Relationships in Household
                          </span>
                          <input
                            className="rounded-lg border border-gray-300 px-3 py-2"
                            value={occupantRelationshipSummary}
                            onChange={(e) =>
                              setOccupantRelationshipSummary(e.target.value)
                            }
                            placeholder="e.g., partner, dependent"
                          />
                        </label>
                        <label className="grid gap-1 text-sm text-gray-700">
                          <span className="font-semibold text-gray-900">
                            Pets
                          </span>
                          <select
                            className="rounded-lg border border-gray-300 px-3 py-2"
                            value={hasPets ? "yes" : "no"}
                            onChange={(e) =>
                              setHasPets(e.target.value === "yes")
                            }
                          >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                          </select>
                        </label>
                        <label className="grid gap-1 text-sm text-gray-700">
                          <span className="font-semibold text-gray-900">
                            Smoking Status
                          </span>
                          <select
                            className="rounded-lg border border-gray-300 px-3 py-2"
                            value={smokingStatus}
                            onChange={(e) => setSmokingStatus(e.target.value)}
                          >
                            <option value="not_specified">
                              Prefer not to say
                            </option>
                            <option value="non_smoker">Non-smoker</option>
                            <option value="smoker">Smoker</option>
                          </select>
                        </label>
                        {hasPets && (
                          <>
                            <label className="grid gap-1 text-sm text-gray-700">
                              <span className="font-semibold text-gray-900">
                                Pet Type
                              </span>
                              <input
                                className="rounded-lg border border-gray-300 px-3 py-2"
                                value={petType}
                                onChange={(e) => setPetType(e.target.value)}
                                placeholder="e.g., cat"
                              />
                            </label>
                            <label className="grid gap-1 text-sm text-gray-700">
                              <span className="font-semibold text-gray-900">
                                Pet Count
                              </span>
                              <input
                                type="number"
                                min="0"
                                className="rounded-lg border border-gray-300 px-3 py-2"
                                value={petCount}
                                onChange={(e) => setPetCount(e.target.value)}
                              />
                            </label>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {currentFormStep === 2 && (
                    <div className="rounded-lg border-2 border-violet-200 bg-violet-50 p-4">
                      <p className="mb-3 font-bold text-violet-900">
                        Rental Need
                      </p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="grid gap-1 text-sm text-gray-700">
                          <span className="font-semibold text-gray-900">
                            Desired Move-in Date
                          </span>
                          <input
                            type="date"
                            className="rounded-lg border border-gray-300 px-3 py-2"
                            value={desiredMoveInDate}
                            onChange={(e) =>
                              setDesiredMoveInDate(e.target.value)
                            }
                            required
                          />
                        </label>

                        <fieldset className="md:col-span-2 grid gap-2 text-sm text-gray-700">
                          <legend className="font-semibold text-gray-900">
                            Lease Duration Preference
                          </legend>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {LEASE_DURATION_OPTIONS.map((option) => (
                              <label
                                key={option.value}
                                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2"
                              >
                                <input
                                  type="radio"
                                  name="leaseDurationPreference"
                                  value={option.value}
                                  checked={
                                    leaseDurationPreference === option.value
                                  }
                                  onChange={(e) =>
                                    setLeaseDurationPreference(e.target.value)
                                  }
                                />
                                <span>{option.label}</span>
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      </div>
                    </div>
                  )}

                  {currentFormStep === 3 && (
                    <div className="space-y-4">
                      <div className="rounded-lg border-2 border-rose-200 bg-rose-50 p-4">
                        <p className="mb-3 font-bold text-rose-900">
                          Rental History
                        </p>
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="md:col-span-2 grid gap-1 text-sm text-gray-700">
                            <span className="font-semibold text-gray-900">
                              Reason for Moving
                            </span>
                            <textarea
                              className="min-h-20 rounded-lg border border-gray-300 px-3 py-2"
                              value={reasonForMoving}
                              onChange={(e) =>
                                setReasonForMoving(e.target.value)
                              }
                              spellCheck={false}
                            />
                          </label>
                          <label className="grid gap-1 text-sm text-gray-700">
                            <span className="font-semibold text-gray-900">
                              Past Rent Payment Incidents
                            </span>
                            <select
                              className="rounded-lg border border-gray-300 px-3 py-2"
                              value={hadRentPaymentIncidents ? "yes" : "no"}
                              onChange={(e) =>
                                setHadRentPaymentIncidents(
                                  e.target.value === "yes",
                                )
                              }
                            >
                              <option value="no">No</option>
                              <option value="yes">Yes</option>
                            </select>
                          </label>
                          {hadRentPaymentIncidents && (
                            <label className="md:col-span-2 grid gap-1 text-sm text-gray-700">
                              <span className="font-semibold text-gray-900">
                                Incidents Explanation
                              </span>
                              <textarea
                                className="min-h-20 rounded-lg border border-gray-300 px-3 py-2"
                                value={rentPaymentIncidentsExplanation}
                                onChange={(e) =>
                                  setRentPaymentIncidentsExplanation(
                                    e.target.value,
                                  )
                                }
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-4">
                        <label className="grid gap-2 text-sm text-gray-700">
                          <span className="font-bold text-purple-900">
                            Message to Owner (Optional)
                          </span>
                          <textarea
                            className="min-h-20 rounded-lg border border-gray-300 px-3 py-2"
                            value={messageToOwner}
                            onChange={(e) => setMessageToOwner(e.target.value)}
                            placeholder="Anything you'd like the owner to know"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </Stepper>
              </form>
            )}
          </section>
        </div>
      </main>
      {validationPopupMessage && (
        <div className="fixed inset-0 z-3000 flex items-center justify-center bg-black/40 px-4">
          <div className="relative z-3001 w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-600 text-xl font-bold text-white">
              !
            </div>
            <h3 className="mt-4 text-lg font-bold text-rose-900">
              Please Check Your Form
            </h3>
            <p className="mt-2 text-sm text-rose-800">
              {validationPopupMessage}
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                onClick={() => setValidationPopupMessage(null)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      <HomeFooter />
    </>
  );
}
