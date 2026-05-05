import { Alert } from "@/components/ui";
import { leaseService } from "@/services/lease.service";
import { paymentService } from "@/services/payment.service";
import { useAuthStore } from "@/store";
import type { Lease } from "@/types/lease";
import { PaymentType } from "@/types/payment";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { StripePaymentForm } from "./StripePaymentForm";

function getStripeTestAmount(leaseAmount: number): number {
  const normalized = Math.round(leaseAmount / 10);
  return normalized > 0 ? normalized : 1;
}

function formatDate(value?: string): string {
  return value ? new Date(value).toLocaleDateString() : "-";
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = error as {
      response?: { data?: { message?: string | string[] } };
    };
    const message = response.response?.data?.message;

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

  return error instanceof Error ? error.message : "Failed to load lease";
}

export function PaymentInitiatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();

  const leaseId = searchParams.get("leaseId");
  const [lease, setLease] = useState<Lease | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePromise, setStripePromise] =
    useState<Promise<Stripe | null> | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load lease data
  useEffect(() => {
    const loadLease = async () => {
      if (!leaseId) {
        setError("No lease ID provided");
        setLoading(false);
        return;
      }

      try {
        const leaseData = await leaseService.getById(leaseId);
        setLease(leaseData);

        // Initiate payment
        if (user?.id) {
          const monthlyRent = leaseData.monthlyRent ?? 0;
          const stripeAmount = getStripeTestAmount(monthlyRent);
          const response = await paymentService.initiate({
            leaseId: leaseData.id,
            tenantId: user.id,
            amount: stripeAmount,
            currency: "USD",
            type: PaymentType.RENT,
            description: `Rent payment for ${leaseData.propertyTitle || leaseData.propertyId}`,
          });

          setPaymentId(response.id);
          setPaymentIntentId(response.stripePaymentIntentId);
          // Backend may return `clientSecret` (we added alias) or `stripeClientSecret`
          const secret =
            (response as any).clientSecret ||
            (response as any).stripeClientSecret;
          setClientSecret(secret || null);

          // Determine publishable key (backend may return it). Fallback to env.
          const publishable =
            (response as any).stripePublishableKey ||
            import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
          if (publishable) {
            setStripePromise(loadStripe(publishable as string));
          }
        }
      } catch (err) {
        console.error("Error loading lease:", err);
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    loadLease();
  }, [leaseId, user?.id]);

  const handlePaymentSuccess = useCallback(
    async (confirmedPaymentIntentId: string) => {
      if (!paymentId) {
        setSuccessMessage(
          `Payment completed successfully. Payment intent: ${confirmedPaymentIntentId}`,
        );
        setTimeout(() => {
          navigate("/payments/history", {
            replace: true,
            state: {
              paymentSuccess: true,
              paymentIntentId: confirmedPaymentIntentId,
            },
          });
        }, 1800);
        return;
      }

      try {
        await paymentService.confirm(paymentId, confirmedPaymentIntentId);
        setSuccessMessage(
          `Payment completed successfully. Payment intent: ${confirmedPaymentIntentId}`,
        );
        setTimeout(() => {
          navigate("/payments/history", {
            replace: true,
            state: {
              paymentSuccess: true,
              paymentId,
              paymentIntentId: confirmedPaymentIntentId,
            },
          });
        }, 1800);
      } catch (confirmError) {
        console.error("Error confirming payment:", confirmError);
        setSuccessMessage(
          `Stripe completed the payment, but the app could not update the history record yet. Payment intent: ${confirmedPaymentIntentId}`,
        );
        setTimeout(() => {
          navigate("/payments/history", {
            replace: true,
            state: {
              paymentSuccess: true,
              paymentId,
              paymentIntentId: confirmedPaymentIntentId,
            },
          });
        }, 1800);
      }
    },
    [navigate, paymentId],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!lease) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Lease not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← Back
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {successMessage && (
            <div className="mb-6">
              <Alert
                type="success"
                title="Payment successful"
                message={successMessage}
              />
            </div>
          )}

          {/* Payment Summary */}
          <div className="mb-8 pb-8 border-b">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Make Rent Payment
            </h1>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Property</p>
                <p className="font-semibold text-gray-900">
                  {lease.propertyTitle || "Property"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Monthly Rent</p>
                <p className="font-semibold text-gray-900">
                  {lease.currency || "USD"}{" "}
                  {Number(lease.monthlyRent ?? 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Lease Period</p>
                <p className="font-semibold text-gray-900">
                  {formatDate(lease.startDate)} - {formatDate(lease.endDate)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Amount Due</p>
                <p className="font-semibold text-lg text-blue-600">
                  {lease.currency || "USD"}{" "}
                  {Number(lease.monthlyRent ?? 0).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                💳 You'll be charged{" "}
                <span className="font-semibold">
                  {lease.currency || "USD"}{" "}
                  {Number(lease.monthlyRent ?? 0).toLocaleString()}
                </span>{" "}
                using your card
              </p>
            </div>
          </div>

          {/* Stripe Payment Form */}
          {clientSecret && paymentIntentId ? (
            // Wrap the payment form with Stripe Elements
            <>
              {stripePromise ? (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <StripePaymentForm
                    clientSecret={clientSecret}
                    paymentIntentId={paymentIntentId}
                    amount={Number(lease.monthlyRent ?? 0)}
                    currency={lease.currency || "USD"}
                    onSuccess={handlePaymentSuccess}
                  />
                </Elements>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">Initializing payment form...</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">Initializing payment form...</p>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">Test Card:</span> 4242 4242 4242
            4242 | <span className="font-semibold">Expiry:</span> Any future
            date | <span className="font-semibold">CVC:</span> Any 3 digits
          </p>
        </div>
      </div>
    </div>
  );
}
