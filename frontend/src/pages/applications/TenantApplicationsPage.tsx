import { AppSidebar, HomeFooter } from "@/components/layout";
import LocationPreferenceMap from "@/components/settings/LocationPreferenceMap";
import { Alert, Stepper, type StepperStep } from "@/components/ui";
import applicationService from "@/services/application.service";
import type {
  Application,
  ApplicationQuestionnaire,
  ApplicationStatus,
} from "@/types/application";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

const APPLICATION_FORM_STEPS: StepperStep[] = [
  { id: "identity", label: "Identity" },
  { id: "household", label: "Household" },
  { id: "rental-need", label: "Rental Need" },
  { id: "employment", label: "Employment" },
  { id: "financial", label: "Financial" },
  { id: "history", label: "History" },
];

const LEASE_DURATION_OPTIONS = [
  { value: "6_months", label: "6 months" },
  { value: "12_months", label: "12 months" },
  { value: "24_months", label: "24 months" },
  { value: "flexible", label: "Flexible" },
] as const;

const MONTHLY_INCOME_INTERVAL_OPTIONS = [
  { value: "under_1000", label: "Less than 1,000 EUR", mappedIncome: 900 },
  {
    value: "1000_1999",
    label: "1,000 - 1,999 EUR",
    mappedIncome: 1500,
  },
  {
    value: "2000_2999",
    label: "2,000 - 2,999 EUR",
    mappedIncome: 2500,
  },
  {
    value: "3000_3999",
    label: "3,000 - 3,999 EUR",
    mappedIncome: 3500,
  },
  {
    value: "4000_5999",
    label: "4,000 - 5,999 EUR",
    mappedIncome: 5000,
  },
  { value: "6000_plus", label: "6,000+ EUR", mappedIncome: 6000 },
] as const;

const BUDGET_SLIDER_MIN = 300;
const BUDGET_SLIDER_MAX = 6000;
const BUDGET_SLIDER_STEP = 50;

const statusClass: Record<ApplicationStatus, string> = {
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  documents_requested: "bg-orange-100 text-orange-700",
  viewing_scheduled: "bg-violet-100 text-violet-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  withdrawn: "bg-slate-200 text-slate-700",
};

const statusLabel: Record<ApplicationStatus, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  documents_requested: "Documents requested",
  viewing_scheduled: "Viewing scheduled",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export default function TenantApplicationsPage() {
  const [searchParams] = useSearchParams();
  const prefilledPropertyId = searchParams.get("propertyId") || "";
  const targetApplicationId = searchParams.get("applicationId") || "";

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [propertyId, setPropertyId] = useState(prefilledPropertyId);
  const [monthlyIncomeInterval, setMonthlyIncomeInterval] = useState("");

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
  const [monthlyBudget, setMonthlyBudget] = useState("1200");
  const [
    mandatoryPropertySpecificAnswers,
    setMandatoryPropertySpecificAnswers,
  ] = useState("");

  const [employmentStatus, setEmploymentStatus] = useState("");
  const [contractType, setContractType] = useState("");
  const [coApplicantIncome, setCoApplicantIncome] = useState("");

  const [monthlyDebtPayments, setMonthlyDebtPayments] = useState("");
  const [currentRentAmount, setCurrentRentAmount] = useState("");
  const [guarantorNeeded, setGuarantorNeeded] = useState(false);
  const [guarantorName, setGuarantorName] = useState("");
  const [guarantorIncome, setGuarantorIncome] = useState("");

  const [previousLandlordContact, setPreviousLandlordContact] = useState("");
  const [reasonForMoving, setReasonForMoving] = useState("");
  const [hadRentPaymentIncidents, setHadRentPaymentIncidents] = useState(false);
  const [rentPaymentIncidentsExplanation, setRentPaymentIncidentsExplanation] =
    useState("");

  const [messageToOwner, setMessageToOwner] = useState("");
  const [deadline, setDeadline] = useState("");
  const [currentFormStep, setCurrentFormStep] = useState(0);

  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [withdrawingFor, setWithdrawingFor] = useState<string | null>(null);
  const [expandedHistoryFor, setExpandedHistoryFor] = useState<string | null>(
    null,
  );

  const sortedApplications = useMemo(
    () =>
      [...applications].sort(
        (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      ),
    [applications],
  );

  const finalFormStepIndex = APPLICATION_FORM_STEPS.length - 1;

  const selectedMonthlyIncomeInterval = MONTHLY_INCOME_INTERVAL_OPTIONS.find(
    (option) => option.value === monthlyIncomeInterval,
  );

  const formatDateTime = (value?: string) => {
    if (!value) {
      return "Not available";
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return "Not available";
    }

    return parsedDate.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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

  const validateStep = (stepIndex: number) => {
    if (stepIndex === 0 && !propertyId.trim()) {
      return "Please open a property and click Apply first.";
    }

    if (stepIndex === 0) {
      if (!dateOfBirth) {
        return "Please provide your date of birth.";
      }

      if (!currentAddress.trim()) {
        return "Please provide your current address.";
      }
    }

    if (stepIndex === 2) {
      if (!leaseDurationPreference.trim()) {
        return "Please select a lease duration preference.";
      }
    }

    if (stepIndex === 3) {
      if (!employmentStatus.trim()) {
        return "Please provide your employment status.";
      }

      if (!monthlyIncomeInterval.trim()) {
        return "Please select your monthly income interval.";
      }
    }

    if (stepIndex === 4) {
      if (guarantorNeeded && !guarantorName.trim()) {
        return "Please provide guarantor name or set guarantor to No.";
      }
    }

    if (stepIndex === 5) {
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
      setError(validationError);
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

  const submitApplication = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (currentFormStep < finalFormStepIndex) {
      goToNextStep();
      return;
    }

    if (!propertyId.trim()) {
      setError("Please open a property and click Apply first.");
      return;
    }

    for (let stepIndex = 0; stepIndex <= finalFormStepIndex; stepIndex += 1) {
      const validationError = validateStep(stepIndex);
      if (validationError) {
        setCurrentFormStep(stepIndex);
        setError(validationError);
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
      monthlyBudgetMin: toNumberOrUndefined(monthlyBudget),
      monthlyBudgetMax: toNumberOrUndefined(monthlyBudget),
      mandatoryPropertySpecificAnswers:
        mandatoryPropertySpecificAnswers.trim() || undefined,
      employmentStatus: employmentStatus || undefined,
      contractType: contractType || undefined,
      coApplicantIncome: toNumberOrUndefined(coApplicantIncome),
      monthlyDebtPayments: toNumberOrUndefined(monthlyDebtPayments),
      currentRentAmount: toNumberOrUndefined(currentRentAmount),
      guarantorNeeded,
      guarantorName: guarantorNeeded
        ? guarantorName.trim() || undefined
        : undefined,
      guarantorIncome: guarantorNeeded
        ? toNumberOrUndefined(guarantorIncome)
        : undefined,
      previousLandlordContact: previousLandlordContact.trim() || undefined,
      reasonForMoving: reasonForMoving.trim() || undefined,
      hadRentPaymentIncidents,
      rentPaymentIncidentsExplanation: hadRentPaymentIncidents
        ? rentPaymentIncidentsExplanation.trim() || undefined
        : undefined,
    };

    try {
      setError(null);
      setNotice(null);
      await applicationService.submitApplication({
        propertyId,
        employmentInfo: {
          companyName: employmentStatus.trim()
            ? `Employment status: ${employmentStatus}`
            : "Not provided",
          jobTitle: contractType.trim()
            ? `Contract: ${contractType}`
            : "Not provided",
          monthlyIncome: selectedMonthlyIncomeInterval?.mappedIncome ?? 0,
        },
        messageToOwner: messageToOwner || undefined,
        applicationDeadline: deadline
          ? new Date(deadline).toISOString()
          : undefined,
        questionnaire,
      });

      setPropertyId("");
      setMonthlyIncomeInterval("");
      setDateOfBirth("");
      setCurrentAddress("");
      setPreferredContactChannel("email");
      setOccupantsAdults("1");
      setOccupantsChildren("0");
      setOccupantRelationshipSummary("");
      setHasPets(false);
      setPetType("");
      setPetCount("0");
      setSmokingStatus("not_specified");
      setDesiredMoveInDate("");
      setLeaseDurationPreference("12_months");
      setMonthlyBudget("1200");
      setMandatoryPropertySpecificAnswers("");
      setEmploymentStatus("");
      setContractType("");
      setCoApplicantIncome("");
      setMonthlyDebtPayments("");
      setCurrentRentAmount("");
      setGuarantorNeeded(false);
      setGuarantorName("");
      setGuarantorIncome("");
      setPreviousLandlordContact("");
      setReasonForMoving("");
      setHadRentPaymentIncidents(false);
      setRentPaymentIncidentsExplanation("");
      setMessageToOwner("");
      setDeadline("");
      setCurrentFormStep(0);
      setNotice("Application submitted successfully.");
      await loadApplications();
    } catch (error) {
      setError(getApiErrorMessage(error, "Failed to submit application."));
    }
  };

  const withdrawApplication = async (id: string) => {
    const shouldWithdraw = window.confirm(
      "Withdraw this application? You can submit a new one later if needed.",
    );
    if (!shouldWithdraw) {
      return;
    }

    const reasonInput = window.prompt(
      "Optional: share a reason for withdrawal.",
      "",
    );
    const reason = reasonInput?.trim() || undefined;

    try {
      setError(null);
      setWithdrawingFor(id);
      await applicationService.withdrawApplication(id, reason);
      setNotice("Application withdrawn.");
      await loadApplications();
    } catch {
      setError("Unable to withdraw this application.");
    } finally {
      setWithdrawingFor(null);
    }
  };

  const uploadDocument = async (id: string, file: File) => {
    setUploadingFor(id);
    try {
      await applicationService.uploadDocument(id, file);
      setNotice("Document uploaded.");
      await loadApplications();
    } catch {
      setError("Failed to upload document.");
    } finally {
      setUploadingFor(null);
    }
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

            <form className="mt-8" onSubmit={submitApplication}>
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
                        className="ml-auto rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-3 font-bold text-white shadow-lg transition-all hover:from-indigo-700 hover:to-indigo-800 hover:shadow-xl active:scale-95"
                      >
                        Submit My Application
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
                            onChange={(e) => setCurrentAddress(e.target.value)}
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
                          onChange={(e) => setOccupantsChildren(e.target.value)}
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
                          onChange={(e) => setHasPets(e.target.value === "yes")}
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
                          onChange={(e) => setDesiredMoveInDate(e.target.value)}
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

                      <div className="md:col-span-2 rounded-lg border border-gray-300 bg-white p-4">
                        <label className="grid gap-3 text-sm text-gray-700">
                          <div>
                            <p className="font-semibold text-gray-900">
                              Monthly Budget
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                              {Number(monthlyBudget).toLocaleString("en-US")} DT
                            </p>
                          </div>
                          <input
                            type="range"
                            min={BUDGET_SLIDER_MIN}
                            max={BUDGET_SLIDER_MAX}
                            step={BUDGET_SLIDER_STEP}
                            value={monthlyBudget}
                            onChange={(e) => setMonthlyBudget(e.target.value)}
                          />
                        </label>
                      </div>

                      <label className="md:col-span-2 grid gap-1 text-sm text-gray-700">
                        <span className="font-semibold text-gray-900">
                          Property-specific Notes (if required)
                        </span>
                        <textarea
                          className="min-h-20 rounded-lg border border-gray-300 px-3 py-2"
                          value={mandatoryPropertySpecificAnswers}
                          onChange={(e) =>
                            setMandatoryPropertySpecificAnswers(e.target.value)
                          }
                          placeholder="Any mandatory answers for this property"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {currentFormStep === 3 && (
                  <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-4">
                    <p className="mb-3 font-bold text-emerald-900">
                      Employment & Income
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-1 text-sm text-gray-700">
                        <span className="font-semibold text-gray-900">
                          Employment Status
                        </span>
                        <select
                          className="rounded-lg border border-gray-300 px-3 py-2"
                          value={employmentStatus}
                          onChange={(e) => setEmploymentStatus(e.target.value)}
                        >
                          <option value="">Select</option>
                          <option value="employee">Employee</option>
                          <option value="self_employed">Self-employed</option>
                          <option value="student">Student</option>
                          <option value="retired">Retired</option>
                          <option value="other">Other</option>
                        </select>
                      </label>
                      <label className="grid gap-1 text-sm text-gray-700">
                        <span className="font-semibold text-gray-900">
                          Contract Type
                        </span>
                        <select
                          className="rounded-lg border border-gray-300 px-3 py-2"
                          value={contractType}
                          onChange={(e) => setContractType(e.target.value)}
                        >
                          <option value="">Select</option>
                          <option value="permanent">Permanent</option>
                          <option value="fixed_term">Fixed-term</option>
                          <option value="freelance">Freelance</option>
                          <option value="other">Other</option>
                        </select>
                      </label>
                      <fieldset className="col-span-2 grid gap-2 text-sm text-gray-700">
                        <legend className="font-semibold text-gray-900">
                          Monthly Income Interval
                        </legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {MONTHLY_INCOME_INTERVAL_OPTIONS.map((option) => (
                            <label
                              key={option.value}
                              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2"
                            >
                              <input
                                type="radio"
                                name="monthlyIncomeInterval"
                                value={option.value}
                                checked={monthlyIncomeInterval === option.value}
                                onChange={(e) =>
                                  setMonthlyIncomeInterval(e.target.value)
                                }
                              />
                              <span>{option.label}</span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <label className="col-span-2 grid gap-1 text-sm text-gray-700">
                        <span className="font-semibold text-gray-900">
                          Co-applicant Income (optional, €)
                        </span>
                        <input
                          type="number"
                          min="0"
                          className="rounded-lg border border-gray-300 px-3 py-2"
                          value={coApplicantIncome}
                          onChange={(e) => setCoApplicantIncome(e.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                )}

                {currentFormStep === 4 && (
                  <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
                    <p className="mb-3 font-bold text-amber-900">
                      Financial Commitments
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-1 text-sm text-gray-700">
                        <span className="font-semibold text-gray-900">
                          Existing Monthly Debt Payments (€)
                        </span>
                        <input
                          type="number"
                          min="0"
                          className="rounded-lg border border-gray-300 px-3 py-2"
                          value={monthlyDebtPayments}
                          onChange={(e) =>
                            setMonthlyDebtPayments(e.target.value)
                          }
                        />
                      </label>
                      <label className="grid gap-1 text-sm text-gray-700">
                        <span className="font-semibold text-gray-900">
                          Current Rent Amount (€)
                        </span>
                        <input
                          type="number"
                          min="0"
                          className="rounded-lg border border-gray-300 px-3 py-2"
                          value={currentRentAmount}
                          onChange={(e) => setCurrentRentAmount(e.target.value)}
                        />
                      </label>
                      <label className="grid gap-1 text-sm text-gray-700">
                        <span className="font-semibold text-gray-900">
                          Guarantor Needed?
                        </span>
                        <select
                          className="rounded-lg border border-gray-300 px-3 py-2"
                          value={guarantorNeeded ? "yes" : "no"}
                          onChange={(e) =>
                            setGuarantorNeeded(e.target.value === "yes")
                          }
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </label>
                      {guarantorNeeded && (
                        <>
                          <label className="grid gap-1 text-sm text-gray-700">
                            <span className="font-semibold text-gray-900">
                              Guarantor Name
                            </span>
                            <input
                              className="rounded-lg border border-gray-300 px-3 py-2"
                              value={guarantorName}
                              onChange={(e) => setGuarantorName(e.target.value)}
                              placeholder="Full name"
                            />
                          </label>
                          <label className="grid gap-1 text-sm text-gray-700">
                            <span className="font-semibold text-gray-900">
                              Guarantor Income (€)
                            </span>
                            <input
                              type="number"
                              min="0"
                              className="rounded-lg border border-gray-300 px-3 py-2"
                              value={guarantorIncome}
                              onChange={(e) =>
                                setGuarantorIncome(e.target.value)
                              }
                            />
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {currentFormStep === 5 && (
                  <div className="space-y-4">
                    <div className="rounded-lg border-2 border-rose-200 bg-rose-50 p-4">
                      <p className="mb-3 font-bold text-rose-900">
                        Rental History
                      </p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="md:col-span-2 grid gap-1 text-sm text-gray-700">
                          <span className="font-semibold text-gray-900">
                            Current/Previous Landlord Contact (optional)
                          </span>
                          <input
                            className="rounded-lg border border-gray-300 px-3 py-2"
                            value={previousLandlordContact}
                            onChange={(e) =>
                              setPreviousLandlordContact(e.target.value)
                            }
                            placeholder="Email or phone"
                          />
                        </label>
                        <label className="md:col-span-2 grid gap-1 text-sm text-gray-700">
                          <span className="font-semibold text-gray-900">
                            Reason for Moving
                          </span>
                          <textarea
                            className="min-h-20 rounded-lg border border-gray-300 px-3 py-2"
                            value={reasonForMoving}
                            onChange={(e) => setReasonForMoving(e.target.value)}
                            required
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

                    <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4">
                      <label className="grid gap-2 text-sm text-gray-700">
                        <span className="font-bold text-yellow-900">
                          When Do You Need a Place? (Optional)
                        </span>
                        <input
                          type="datetime-local"
                          className="rounded-lg border border-gray-300 px-3 py-2"
                          value={deadline}
                          onChange={(e) => setDeadline(e.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </Stepper>
            </form>
          </section>

          {/* Application History Section */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                My Applications
              </h2>
              <button
                type="button"
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => void loadApplications()}
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-gray-600">
                Loading your applications...
              </p>
            ) : sortedApplications.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
                <p className="text-lg text-gray-600">No applications yet</p>
                <p className="mt-2 text-sm text-gray-500">
                  Find a property you like and click "Apply Now" to get started!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedApplications.map((application) => (
                  <article
                    key={application.id}
                    id={`app-${application.id}`}
                    className="rounded-xl border-2 border-gray-200 p-5 transition-all hover:border-indigo-300 hover:shadow-md"
                  >
                    {(() => {
                      const sortedStatusHistory = (
                        application.statusHistory?.length
                          ? [...application.statusHistory]
                          : [
                              {
                                status: application.status,
                                changedAt: application.updatedAt,
                                changedBy: "system",
                              },
                            ]
                      ).sort(
                        (a, b) =>
                          +new Date(a.changedAt) - +new Date(b.changedAt),
                      );
                      const isHistoryOpen =
                        expandedHistoryFor === application.id;

                      return (
                        <>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-900">
                                {application.propertyTitle ||
                                  application.propertyAddress ||
                                  "Your selected property"}
                                {" - "}
                                Owner:{" "}
                                {application.ownerName || "Property owner"}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                Submitted{" "}
                                {formatDateTime(application.createdAt)}
                              </p>
                            </div>
                            <span
                              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold ${statusClass[application.status]}`}
                            >
                              {statusLabel[application.status]}
                            </span>
                          </div>

                          <div className="mt-3 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 md:grid-cols-2">
                            <p>
                              <span className="font-semibold text-slate-900">
                                Current status:
                              </span>{" "}
                              {statusLabel[application.status]}
                            </p>
                            <p>
                              <span className="font-semibold text-slate-900">
                                Last update:
                              </span>{" "}
                              {formatDateTime(application.updatedAt)}
                            </p>
                            {application.applicationDeadline && (
                              <p>
                                <span className="font-semibold text-slate-900">
                                  Deadline:
                                </span>{" "}
                                {formatDateTime(
                                  application.applicationDeadline,
                                )}
                              </p>
                            )}
                            {application.withdrawnAt && (
                              <p>
                                <span className="font-semibold text-slate-900">
                                  Withdrawn at:
                                </span>{" "}
                                {formatDateTime(application.withdrawnAt)}
                              </p>
                            )}
                          </div>

                          {application.rejectionReason && (
                            <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                              <span className="font-semibold">
                                Rejection Reason:
                              </span>{" "}
                              {application.rejectionReason}
                            </p>
                          )}

                          {application.requestedDocuments.length > 0 && (
                            <div className="mt-3 rounded-lg border-l-4 border-amber-400 bg-amber-50 p-3 text-sm text-amber-800">
                              <p className="font-semibold">
                                Documents Requested:
                              </p>
                              <p className="mt-1">
                                {application.requestedDocuments.join(", ")}
                              </p>
                            </div>
                          )}

                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border-2 border-blue-300 bg-blue-50 px-4 py-2 font-semibold text-blue-700 transition-colors hover:bg-blue-100">
                              <input
                                id={`upload-${application.id}`}
                                type="file"
                                className="hidden"
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  if (file) {
                                    void uploadDocument(application.id, file);
                                  }
                                }}
                              />
                              {uploadingFor === application.id
                                ? "Uploading..."
                                : "Upload Document"}
                            </label>

                            <button
                              type="button"
                              className="rounded-lg border-2 border-slate-300 bg-slate-50 px-4 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                              onClick={() =>
                                setExpandedHistoryFor((previous) =>
                                  previous === application.id
                                    ? null
                                    : application.id,
                                )
                              }
                            >
                              {isHistoryOpen
                                ? "Hide Status History"
                                : "View Status History"}
                            </button>

                            {application.status !== "approved" &&
                              application.status !== "rejected" &&
                              application.status !== "withdrawn" && (
                                <button
                                  type="button"
                                  className="rounded-lg border-2 border-rose-300 bg-rose-50 px-4 py-2 font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                                  onClick={() =>
                                    void withdrawApplication(application.id)
                                  }
                                  disabled={withdrawingFor === application.id}
                                >
                                  {withdrawingFor === application.id
                                    ? "Withdrawing..."
                                    : "Withdraw Application"}
                                </button>
                              )}
                          </div>

                          {isHistoryOpen && (
                            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                              <p className="text-sm font-semibold text-slate-900">
                                Status History
                              </p>
                              <ul className="mt-3 space-y-2">
                                {sortedStatusHistory.map(
                                  (event, eventIndex) => (
                                    <li
                                      key={`${application.id}-status-${eventIndex}`}
                                      className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
                                    >
                                      <p className="font-semibold text-slate-900">
                                        {statusLabel[event.status]}
                                      </p>
                                      <p className="mt-1 text-xs text-slate-500">
                                        {formatDateTime(event.changedAt)}
                                      </p>
                                      {event.note && (
                                        <p className="mt-2 text-sm text-slate-700">
                                          {event.note}
                                        </p>
                                      )}
                                    </li>
                                  ),
                                )}
                              </ul>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <HomeFooter />
    </>
  );
}
