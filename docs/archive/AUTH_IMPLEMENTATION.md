# SmartProperty Frontend - Authentication Guide

## Overview

All backend authentication services have been fully implemented in the frontend. This guide explains how to use them in your React components.

## Quick Start

### Using the `useAuth` Hook

The easiest way to use authentication in your components is through the `useAuth` hook:

```typescript
import { useAuth } from "@/hooks";

export function LoginComponent() {
  const { login, isLoading, error } = useAuth();

  const handleSubmit = async (email: string, password: string) => {
    try {
      await login({ email, password });
      // User is now logged in
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  return (
    <div>
      {error && <p className="text-red-500">{error}</p>}
      <button disabled={isLoading} onClick={() => handleSubmit("test@example.com", "password")}>
        {isLoading ? "Loading..." : "Login"}
      </button>
    </div>
  );
}
```

## Available Features

### 1. Authentication

#### Register

```typescript
const { register, isLoading, error } = useAuth();

await register({
  email: "user@example.com",
  password: "SecurePass123!",
  confirmPassword: "SecurePass123!",
  firstName: "John",
  lastName: "Doe",
  phone: "+1234567890", // optional
  role: UserRole.TENANT, // optional
});
```

#### Login

```typescript
const { login } = useAuth();

await login({
  email: "user@example.com",
  password: "SecurePass123!",
});
```

#### Logout (Current Session)

```typescript
const { logout } = useAuth();

// Logout from current session
await logout();

// Or logout from specific session with refresh token
await logout(refreshToken);
```

#### Logout from All Devices

```typescript
const { logoutAll } = useAuth();

// Logout from all devices
await logoutAll();

// Or keep current session active
await logoutAll(currentSessionId);
```

### 2. User Information

#### Get Current User

```typescript
const { user, isAuthenticated, checkAuth } = useAuth();

// User info is automatically loaded on component mount
// Manual refresh available with:
await checkAuth();
```

### 3. Password Management

#### Change Password

```typescript
const { changePassword } = useAuth();

await changePassword({
  currentPassword: "OldPass123!",
  newPassword: "NewPass456!",
  confirmPassword: "NewPass456!",
});
```

#### Forgot Password

```typescript
const { forgotPassword } = useAuth();

await forgotPassword("user@example.com");
// User receives email with reset link
```

#### Reset Password

```typescript
const { resetPassword } = useAuth();

await resetPassword({
  token: "reset-token-from-email",
  password: "NewPass123!",
  confirmPassword: "NewPass123!",
});
```

### 4. Email Verification

#### Verify Email

```typescript
const { verifyEmail } = useAuth();

await verifyEmail({
  token: "verification-token-from-email",
});
```

#### Resend Verification Email

```typescript
const { resendVerification } = useAuth();

await resendVerification("user@example.com");
```

### 5. Session Management

#### Get All Sessions

```typescript
const { fetchSessions, sessions } = useAuth();

await fetchSessions();
// sessions contains list of all active sessions
```

#### Revoke a Session

```typescript
const { revokeSession } = useAuth();

await revokeSession("session-id");
```

## Validation Utilities

The frontend includes comprehensive validation utilities:

```typescript
import {
  isValidEmail,
  isValidPassword,
  getPasswordStrength,
  validateRegistrationData,
  validateLoginData,
  validateChangePasswordData,
} from "@/utils";

// Validate individual fields
const validEmail = isValidEmail("test@example.com");
const validPassword = isValidPassword("SecurePass123!");
const strength = getPasswordStrength("SecurePass123!"); // "weak" | "medium" | "strong"

// Validate entire forms
const { valid, errors } = validateRegistrationData({
  email: "test@example.com",
  password: "SecurePass123!",
  confirmPassword: "SecurePass123!",
  firstName: "John",
  lastName: "Doe",
});

if (!valid) {
  console.log(errors); // { email: "...", password: "..." }
}
```

## Error Handling

Use error utilities for consistent error handling:

```typescript
import {
  getAuthErrorMessage,
  isAuthError,
  isValidationError,
  isConflictError,
  isRateLimitError,
  isServerError,
} from "@/utils";

try {
  await login({ email, password });
} catch (error) {
  const message = getAuthErrorMessage(error, "Login failed");

  if (isAuthError(error)) {
    // Handle 401 errors
  } else if (isValidationError(error)) {
    // Handle 400 errors
  } else if (isConflictError(error)) {
    // Handle 409 errors (e.g., email already exists)
  } else if (isRateLimitError(error)) {
    // Handle 429 errors (too many requests)
  } else if (isServerError(error)) {
    // Handle 5xx errors
  }
}
```

## Direct Service Access

If you need to use services directly without the store:

```typescript
import { authService } from "@/services";

// All methods available
await authService.login({ email, password });
await authService.register(data);
await authService.changePassword(data);
await authService.getSessions();
await authService.revokeSession(sessionId);
```

## Store Direct Access

For advanced use cases, access the Zustand store directly:

```typescript
import { useAuthStore } from "@/store";

export function MyComponent() {
  const store = useAuthStore();

  return (
    <div>
      <p>User: {store.user?.email}</p>
      <p>Loading: {store.isLoading ? "Yes" : "No"}</p>
      <p>Error: {store.error}</p>
    </div>
  );
}
```

## Password Requirements

Passwords must meet these requirements:

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (@$!%\*?&)

## Throttling

Some endpoints have rate limiting:

- **Register**: 5 requests per minute
- **Login**: 10 requests per minute
- **Forgot Password**: 3 requests per minute
- **Resend Verification**: 3 requests per minute

## Token Refresh

The API client automatically handles token refresh:

- When an API call returns 401, it automatically refreshes the tokens
- If refresh fails, the user is redirected to login
- Tokens are stored in localStorage

## Authentication State Flow

```
1. User initiates login/register
2. credentials sent to backend
3. Backend validates and returns tokens
4. Frontend stores tokens (localStorage + axios headers)
5. User state is updated in store
6. On page reload, stored tokens are checked
7. If tokens exist, user info is fetched automatically
8. If tokens are invalid, user is logged out
```

## Type Definitions

All types are available in `@/types/auth`:

```typescript
import type {
  User,
  AuthResponse,
  LoginCredentials,
  RegisterData,
  Session,
  // ... more types
} from "@/types/auth";
```

## Best Practices

1. **Always use the `useAuth` hook** in components for consistent state management
2. **Validate input before submission** using validation utilities
3. **Handle errors gracefully** with error utilities
4. **Clear errors** after user interaction
5. **Store user preferences** separately from auth state
6. **Implement proper loading states** while async operations are in progress
7. **Redirect to login** when authentication fails
8. **Implement session timeout** for security

## Example: Complete Login Form

```typescript
import { useAuth } from "@/hooks";
import { validateLoginData, getAuthErrorMessage } from "@/utils";
import { useState } from "react";

export function LoginForm() {
  const { login, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [validationErrors, setValidationErrors] = useState({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const { valid, errors } = validateLoginData(formData);
    if (!valid) {
      setValidationErrors(errors);
      return;
    }

    try {
      await login(formData);
      // Success - user is logged in
    } catch (err) {
      const message = getAuthErrorMessage(err);
      // Error is already in auth store, but you can handle it here too
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Email"
      />
      {validationErrors.email && <span className="error">{validationErrors.email}</span>}

      <input
        type="password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        placeholder="Password"
      />
      {validationErrors.password && <span className="error">{validationErrors.password}</span>}

      {error && <div className="error-alert">{error}</div>}

      <button disabled={isLoading} type="submit">
        {isLoading ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
```
