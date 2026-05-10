// ===========================================
// SmartProperty - Auth Examples Component
// ===========================================
// This file contains example implementations of auth features
// Copy and adapt these to your components as needed

import { useAuth } from '@/hooks';
import {
  validateChangePasswordData,
  validateLoginData,
  validateRegistrationData,
} from '@/utils';
import { useState } from 'react';

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

// ===========================================
// Example 1: Login Component
// ===========================================

export function LoginExample() {
  const { login, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationErrors({});

    const { valid, errors } = validateLoginData({ email, password });
    if (!valid) {
      setValidationErrors(errors);
      return;
    }

    try {
      await login({ email, password });
      // Redirect to dashboard on success
    } catch (err) {
      console.error('Login error:', formatError(err));
      // Error already in auth store
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg ${
              validationErrors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="your@email.com"
          />
          {validationErrors.email && (
            <p className="text-red-500 text-sm mt-1">
              {validationErrors.email}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg ${
              validationErrors.password ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="••••••••"
          />
          {validationErrors.password && (
            <p className="text-red-500 text-sm mt-1">
              {validationErrors.password}
            </p>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </div>
    </form>
  );
}

// ===========================================
// Example 2: Registration Component
// ===========================================

export function RegisterExample() {
  const { register, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationErrors({});

    const { valid, errors } = validateRegistrationData(formData);
    if (!valid) {
      setValidationErrors(errors);
      return;
    }

    try {
      await register(formData);
      // Redirect to verify email page
    } catch (err) {
      console.error('Registration error:', formatError(err));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">First Name</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
            {validationErrors.firstName && (
              <p className="text-red-500 text-sm mt-1">
                {validationErrors.firstName}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Last Name</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) =>
                setFormData({ ...formData, lastName: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
            {validationErrors.lastName && (
              <p className="text-red-500 text-sm mt-1">
                {validationErrors.lastName}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          {validationErrors.email && (
            <p className="text-red-500 text-sm mt-1">
              {validationErrors.email}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Phone (Optional)
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          {validationErrors.phone && (
            <p className="text-red-500 text-sm mt-1">
              {validationErrors.phone}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          {validationErrors.password && (
            <p className="text-red-500 text-sm mt-1">
              {validationErrors.password}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Confirm Password
          </label>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) =>
              setFormData({ ...formData, confirmPassword: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          {validationErrors.confirmPassword && (
            <p className="text-red-500 text-sm mt-1">
              {validationErrors.confirmPassword}
            </p>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
        >
          {isLoading ? 'Registering...' : 'Register'}
        </button>
      </div>
    </form>
  );
}

// ===========================================
// Example 3: Change Password Component
// ===========================================

export function ChangePasswordExample() {
  const { changePassword, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationErrors({});
    setSuccess(false);

    const { valid, errors } = validateChangePasswordData(formData);
    if (!valid) {
      setValidationErrors(errors);
      return;
    }

    try {
      await changePassword(formData);
      setSuccess(true);
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      // Show success message for 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Change password error:', formatError(err));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Current Password
          </label>
          <input
            type="password"
            value={formData.currentPassword}
            onChange={(e) =>
              setFormData({ ...formData, currentPassword: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          {validationErrors.currentPassword && (
            <p className="text-red-500 text-sm mt-1">
              {validationErrors.currentPassword}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">New Password</label>
          <input
            type="password"
            value={formData.newPassword}
            onChange={(e) =>
              setFormData({ ...formData, newPassword: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          {validationErrors.newPassword && (
            <p className="text-red-500 text-sm mt-1">
              {validationErrors.newPassword}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Confirm New Password
          </label>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) =>
              setFormData({ ...formData, confirmPassword: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          {validationErrors.confirmPassword && (
            <p className="text-red-500 text-sm mt-1">
              {validationErrors.confirmPassword}
            </p>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
        )}
        {success && (
          <div className="p-3 bg-green-100 text-green-700 rounded-lg">
            Password changed successfully!
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
        >
          {isLoading ? 'Changing...' : 'Change Password'}
        </button>
      </div>
    </form>
  );
}

// ===========================================
// Example 4: Sessions Management Component
// ===========================================

export function SessionsExample() {
  const { sessions, fetchSessions, revokeSession, isLoading, error } =
    useAuth();
  const [localLoading, setLocalLoading] = useState(false);

  const handleFetchSessions = async () => {
    setLocalLoading(true);
    try {
      await fetchSessions();
    } finally {
      setLocalLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeSession(sessionId);
    } catch (err) {
      console.error('Failed to revoke session:', formatError(err));
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-4">
        <button
          onClick={handleFetchSessions}
          disabled={localLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
        >
          {localLoading ? 'Loading...' : 'Load Sessions'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="p-4 border border-gray-200 rounded-lg"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{session.deviceName}</h3>
                <p className="text-sm text-gray-600">
                  {session.browser} on {session.os}
                </p>
                <p className="text-sm text-gray-500">IP: {session.ipAddress}</p>
                <p className="text-sm text-gray-500">
                  Last active:{' '}
                  {new Date(session.lastActivityAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => handleRevokeSession(session.id)}
                disabled={isLoading}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm disabled:opacity-50"
              >
                Revoke
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
