// ===========================================
// SmartProperty - Sessions Page
// ===========================================

import { useEffect, useState } from "react";
import { AppSidebar, HomeFooter } from "../../components/layout";
import { useAuthStore, useSessionsStore } from "../../store";
import type { Session } from "../../types/auth";

// Device type icons
const DeviceIcon = ({ type }: { type: Session["deviceType"] }) => {
  switch (type) {
    case "mobile":
      return (
        <svg
          className="w-8 h-8 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      );
    case "tablet":
      return (
        <svg
          className="w-8 h-8 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      );
    case "desktop":
    default:
      return (
        <svg
          className="w-8 h-8 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      );
  }
};

// Format date for display
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Format relative time
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return formatDate(dateString);
};

export const SessionsPage = () => {
  const {
    sessions,
    isLoading,
    error,
    fetchSessions,
    revokeSession,
    revokeAllSessions,
    clearError,
  } = useSessionsStore();
  const { logout } = useAuthStore();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [showLogoutAllModal, setShowLogoutAllModal] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showLogoutAllModal) {
        setShowLogoutAllModal(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showLogoutAllModal]);

  const handleRevokeSession = async (sessionId: string, isCurrent: boolean) => {
    if (isCurrent) {
      // If revoking current session, just logout
      await logout();
      return;
    }

    setRevokingId(sessionId);
    try {
      await revokeSession(sessionId);
    } finally {
      setRevokingId(null);
    }
  };

  const handleLogoutAll = async () => {
    try {
      await revokeAllSessions();
      await logout();
    } catch {
      setShowLogoutAllModal(false);
    }
  };

  if (isLoading && sessions.length === 0) {
    return (
      <>
        <AppSidebar />
        <div className="min-h-screen bg-gray-50 py-8 pt-16 lg:pt-24">
          <div className="max-w-4xl mx-auto px-4">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-lg shadow p-6">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <HomeFooter />
      </>
    );
  }

  return (
    <>
      <AppSidebar />
      <div className="min-h-screen bg-gray-50 py-8 pt-16 lg:pt-24">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Active Sessions
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your active sessions across all devices. You can have up
                to 5 active sessions.
              </p>
            </div>
            {sessions.length > 1 && (
              <button
                onClick={() => setShowLogoutAllModal(true)}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                Sign out all devices
              </button>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-red-500 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-red-700">{error}</span>
              </div>
              <button
                onClick={clearError}
                className="text-red-500 hover:text-red-700"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}

          {/* Sessions List */}
          <div className="space-y-4">
            {sessions.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <svg
                  className="w-16 h-16 text-gray-400 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No active sessions
                </h3>
                <p className="text-gray-500">
                  Your session information will appear here when you sign in.
                </p>
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className={`bg-white rounded-lg shadow p-6 ${
                    session.isCurrent ? "ring-2 ring-blue-500" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      {/* Device Icon */}
                      <div className="shrink-0 p-2 bg-gray-100 rounded-lg">
                        <DeviceIcon type={session.deviceType} />
                      </div>

                      {/* Session Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {session.deviceName ||
                              `${session.browser} on ${session.os}`}
                          </h3>
                          {session.isCurrent && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Current session
                            </span>
                          )}
                        </div>

                        <div className="mt-1 text-sm text-gray-500 space-y-1">
                          <p>
                            <span className="font-medium">Browser:</span>{" "}
                            {session.browser} •{" "}
                            <span className="font-medium">OS:</span>{" "}
                            {session.os}
                          </p>
                          <p>
                            <span className="font-medium">IP:</span>{" "}
                            {session.ipAddress}
                            {session.location && ` • ${session.location}`}
                          </p>
                          <p>
                            <span className="font-medium">Last active:</span>{" "}
                            {formatRelativeTime(session.lastActivityAt)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Started: {formatDate(session.createdAt)} • Expires:{" "}
                            {formatDate(session.expiresAt)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Revoke Button */}
                    <button
                      onClick={() =>
                        handleRevokeSession(
                          session.id,
                          session.isCurrent || false,
                        )
                      }
                      disabled={revokingId === session.id}
                      className={`shrink-0 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        session.isCurrent
                          ? "text-blue-600 bg-blue-50 hover:bg-blue-100"
                          : "text-red-600 bg-red-50 hover:bg-red-100"
                      } ${revokingId === session.id ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {revokingId === session.id ? (
                        <span className="flex items-center">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Revoking...
                        </span>
                      ) : session.isCurrent ? (
                        "Sign out"
                      ) : (
                        "Revoke"
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Session Count Info */}
          {sessions.length > 0 && (
            <div className="mt-6 text-center text-sm text-gray-500">
              {sessions.length} of 5 sessions active
            </div>
          )}
        </div>

        {/* Logout All Modal */}
        {showLogoutAllModal && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sessions-logout-all-title"
          >
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
              {/* Backdrop */}
              <div
                className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
                onClick={() => setShowLogoutAllModal(false)}
              />

              {/* Modal */}
              <div className="relative inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div className="sm:flex sm:items-start">
                  <div className="flex items-center justify-center shrink-0 w-12 h-12 mx-auto bg-red-100 rounded-full sm:mx-0 sm:h-10 sm:w-10">
                    <svg
                      className="w-6 h-6 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3
                      id="sessions-logout-all-title"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      Sign out of all devices?
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        This will sign you out of all devices, including this
                        one. You will need to sign in again to continue using
                        SmartProperty.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={handleLogoutAll}
                    disabled={isLoading}
                    className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {isLoading ? "Signing out..." : "Sign out all"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLogoutAllModal(false)}
                    className="inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <HomeFooter />
    </>
  );
};

export default SessionsPage;
