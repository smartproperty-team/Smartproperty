import { AppSidebar, HomeFooter } from "@/components/layout";
import { Alert } from "@/components/ui";
import { paymentService } from "@/services/payment.service";
import type {
  Payment,
  PaymentListResponse,
  PaymentStatus,
} from "@/types/payment";
import { PaymentStatus as PaymentStatusEnum } from "@/types/payment";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function PaymentHistoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "">("");
  const paymentState = location.state as {
    paymentSuccess?: boolean;
    paymentId?: string;
    paymentIntentId?: string;
  } | null;

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response: PaymentListResponse = await paymentService.getMine(
        page,
        10,
        statusFilter,
      );
      setPayments(response.data);
      setTotalPages(Math.ceil(response.total / 10));
    } catch (err) {
      console.error("Error loading payments:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load payment history",
      );
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const getStatusBadge = (status: PaymentStatus) => {
    const badges: Record<
      PaymentStatus,
      { bg: string; text: string; icon: string }
    > = {
      [PaymentStatusEnum.PENDING]: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        icon: "⏳",
      },
      [PaymentStatusEnum.COMPLETED]: {
        bg: "bg-green-100",
        text: "text-green-800",
        icon: "✓",
      },
      [PaymentStatusEnum.FAILED]: {
        bg: "bg-red-100",
        text: "text-red-800",
        icon: "✕",
      },
      [PaymentStatusEnum.REFUNDED]: {
        bg: "bg-blue-100",
        text: "text-blue-800",
        icon: "↩",
      },
    };

    const badge = badges[status] || badges[PaymentStatusEnum.PENDING];
    return (
      <span
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}
      >
        {badge.icon} {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex">
        <AppSidebar />
        <main className="flex-1">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                Payment History
              </h1>
              <button
                onClick={() => navigate("/leases")}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                ← Back to Leases
              </button>
            </div>

            {paymentState?.paymentSuccess && (
              <div className="mb-6">
                <Alert
                  type="success"
                  title="Payment completed"
                  message={
                    paymentState.paymentIntentId
                      ? `Stripe confirmed payment intent ${paymentState.paymentIntentId}. Your payment history below reflects the completed payment.`
                      : "Stripe confirmed your payment. Your payment history below reflects the completed payment."
                  }
                />
              </div>
            )}

            {/* Filters */}
            <div className="mb-6 flex gap-4">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as PaymentStatus | "");
                  setPage(1);
                }}
                aria-label="Filter payments by status"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
              <button
                onClick={async () => {
                  const ok = window.confirm(
                    "Clear your payment history? This cannot be undone.",
                  );
                  if (!ok) return;
                  try {
                    setLoading(true);
                    setError(null);
                    const res = await paymentService.clearMine();
                    setSuccessMessage(`Cleared ${res.clearedCount} payment(s)`);
                    await loadPayments();
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Failed to clear payment history",
                    );
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Clear History
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-700">❌ {error}</p>
              </div>
            )}

            {successMessage && (
              <div className="mb-6">
                <Alert
                  type="success"
                  title="Cleared"
                  message={successMessage}
                />
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : payments.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <p className="text-gray-600 mb-4">No payments found</p>
                <button
                  onClick={() => navigate("/leases")}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Go to Leases
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Transaction ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {payment.currency} {payment.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                          {payment.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {getStatusBadge(payment.status as PaymentStatus)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                          {payment.transactionId ? (
                            <span title={payment.transactionId}>
                              {payment.transactionId.substring(0, 20)}...
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={async () => {
                              const ok = window.confirm(
                                "Delete this payment? This cannot be undone.",
                              );
                              if (!ok) return;
                              try {
                                setLoading(true);
                                setError(null);
                                const res = await paymentService.delete(
                                  payment.id,
                                );
                                if (res.deleted) {
                                  setPayments((prev) =>
                                    prev.filter((p) => p.id !== payment.id),
                                  );
                                  setSuccessMessage("Payment deleted");
                                } else {
                                  setError("Payment could not be deleted");
                                }
                              } catch (err) {
                                setError(
                                  err instanceof Error
                                    ? err.message
                                    : "Failed to delete payment",
                                );
                              } finally {
                                setLoading(false);
                              }
                            }}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      <HomeFooter />
    </div>
  );
}
