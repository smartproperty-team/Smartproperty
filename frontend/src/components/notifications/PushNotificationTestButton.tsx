// ===========================================
// SmartProperty - Push Notification Test Button
// Admin: Send test notifications to tenants
// ===========================================

import { Bell, User, X } from 'lucide-react';
import { useState } from 'react';
import api from '../../services/api';
import { useAuthStore } from '../../store';
import { UserRole } from '../../types';

const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

export function PushNotificationTestButton() {
  const { user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const isAdmin = [UserRole.SUPER_ADMIN, UserRole.BRANCH_MANAGER].includes(
    user?.role as UserRole,
  );

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenModal = async () => {
    if (isAdmin) {
      setShowModal(true);
      await loadTenants();
    } else {
      handleSendTestPush();
    }
  };

  const loadTenants = async () => {
    try {
      // Fetch tenants list from admin endpoint
      const response = await api.get('/users/role/tenants');
      const tenantsList = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];
      setTenants(tenantsList);
    } catch (error) {
      console.error('Failed to load tenants:', formatError(error));
      setTenants([]);
    }
  };

  const handleSendTestPush = async (toUserId?: string) => {
    setIsLoading(true);
    try {
      if (toUserId && isAdmin) {
        // Send to specific user
        await api.post(`/notifications/push/test-to-user/${toUserId}`);
        showToast('success', `✓ Test notification sent to user`);
      } else {
        // Send to self
        await api.post('/notifications/push/test');
        showToast('success', '✓ Test notification sent!');
      }
      setShowModal(false);
      setSelectedUserId(null);
    } catch {
      showToast('error', '✗ Failed to send notification');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Toast Message */}
      {toast && (
        <div
          className={`fixed bottom-20 right-4 px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-all duration-300 z-50 ${
            toast.type === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* Modal for Admin to Select User */}
      {showModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                Send Test Notification
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedUserId(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* User List */}
            <div className="mb-6 max-h-64 overflow-y-auto rounded-lg border border-gray-200">
              {tenants.length > 0 ? (
                tenants.map((tenant) => (
                  <button
                    key={tenant.id}
                    onClick={() => setSelectedUserId(tenant.id)}
                    className={`w-full px-4 py-3 text-left transition-colors ${
                      selectedUserId === tenant.id
                        ? 'bg-indigo-50 text-indigo-900'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <User size={16} />
                      <span className="font-medium">
                        {tenant.firstName} {tenant.lastName}
                      </span>
                    </div>
                    <div className="ml-6 text-sm text-gray-500">
                      {tenant.email}
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">
                  No tenants available
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedUserId(null);
                }}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  selectedUserId && handleSendTestPush(selectedUserId)
                }
                disabled={!selectedUserId || isLoading}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={handleOpenModal}
        disabled={isLoading}
        title={
          isAdmin
            ? 'Send test notification to user'
            : 'Send test push notification'
        }
        className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-all duration-200 hover:bg-indigo-700 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Bell className="h-6 w-6" />
      </button>
    </>
  );
}

export default PushNotificationTestButton;
