// ===========================================
// SmartProperty - Auth Configuration
// ===========================================

/**
 * Password Requirements Configuration
 */
export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 50,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL_CHAR: true,
  SPECIAL_CHARS: "@$!%*?&",
};

/**
 * Password Strength Levels
 */
export const PASSWORD_STRENGTH_LEVELS = {
  WEAK: "weak",
  MEDIUM: "medium",
  STRONG: "strong",
} as const;

/**
 * Authentication Error Messages
 */
export const AUTH_ERRORS = {
  INVALID_EMAIL: "Invalid email address",
  INVALID_PASSWORD: "Invalid password format",
  PASSWORDS_NOT_MATCH: "Passwords do not match",
  EMAIL_REQUIRED: "Email is required",
  PASSWORD_REQUIRED: "Password is required",
  CONFIRM_PASSWORD_REQUIRED: "Password confirmation is required",
  FIRST_NAME_REQUIRED: "First name is required",
  LAST_NAME_REQUIRED: "Last name is required",
  INVALID_PHONE: "Invalid phone number format",

  // Auth specific
  LOGIN_FAILED: "Login failed",
  REGISTER_FAILED: "Registration failed",
  EMAIL_ALREADY_REGISTERED: "Email already registered",
  INVALID_CREDENTIALS: "Invalid email or password",
  ACCOUNT_LOCKED: "Account is locked",
  EMAIL_NOT_VERIFIED: "Email not verified",

  // Password
  CHANGE_PASSWORD_FAILED: "Failed to change password",
  RESET_PASSWORD_FAILED: "Failed to reset password",
  FORGOT_PASSWORD_FAILED: "Failed to process forgot password",
  CURRENT_PASSWORD_INCORRECT: "Current password is incorrect",
  NEW_PASSWORD_SAME: "New password must be different from current password",

  // Email verification
  VERIFY_EMAIL_FAILED: "Failed to verify email",
  RESEND_VERIFICATION_FAILED: "Failed to resend verification email",
  INVALID_VERIFICATION_TOKEN: "Invalid or expired verification token",

  // Session
  SESSION_EXPIRED: "Session expired",
  INVALID_TOKEN: "Invalid or expired token",
  REFRESH_TOKEN_REQUIRED: "Refresh token is required",
  LOGOUT_FAILED: "Failed to logout",

  // Server
  SERVER_ERROR: "Server error. Please try again later",
  TOO_MANY_REQUESTS: "Too many requests. Please try again later",
  NETWORK_ERROR: "Network error. Please check your connection",
} as const;

/**
 * Success Messages
 */
export const AUTH_SUCCESS = {
  LOGIN_SUCCESS: "Login successful",
  REGISTER_SUCCESS: "Registration successful. Please verify your email",
  LOGOUT_SUCCESS: "Logged out successfully",
  LOGOUT_ALL_SUCCESS: "Logged out from all devices",
  PASSWORD_CHANGED: "Password changed successfully",
  PASSWORD_RESET: "Password reset successfully",
  EMAIL_VERIFICATION_SENT: "Verification email sent",
  EMAIL_VERIFIED: "Email verified successfully",
  FORGOT_PASSWORD_SENT: "Password reset email sent",
} as const;

/**
 * API Endpoints
 */
export const AUTH_ENDPOINTS = {
  REGISTER: "/auth/register",
  LOGIN: "/auth/login",
  LOGOUT: "/auth/logout",
  LOGOUT_ALL: "/auth/logout-all",
  REFRESH: "/auth/refresh",
  CURRENT_USER: "/auth/me",
  VERIFY_EMAIL: "/auth/verify-email",
  RESEND_VERIFICATION: "/auth/resend-verification",
  FORGOT_PASSWORD: "/auth/forgot-password",
  RESET_PASSWORD: "/auth/reset-password",
  CHANGE_PASSWORD: "/auth/change-password",
  SESSIONS: "/auth/sessions",
  REVOKE_SESSION: (sessionId: string) => `/auth/sessions/${sessionId}`,
} as const;

/**
 * Rate Limiting Information
 */
export const RATE_LIMITS = {
  REGISTER: { limit: 5, ttl: 60 }, // 5 requests per 60 seconds
  LOGIN: { limit: 10, ttl: 60 }, // 10 requests per 60 seconds
  FORGOT_PASSWORD: { limit: 3, ttl: 60 }, // 3 requests per 60 seconds
  RESEND_VERIFICATION: { limit: 3, ttl: 60 }, // 3 requests per 60 seconds
} as const;

/**
 * Token Configuration
 */
export const TOKEN_CONFIG = {
  ACCESS_TOKEN_KEY: "accessToken",
  REFRESH_TOKEN_KEY: "refreshToken",
  STORAGE_KEY: "auth-storage",
  EXPIRY_BUFFER: 60 * 1000, // 1 minute before actual expiry
} as const;

/**
 * User Role Descriptions
 */
export const USER_ROLE_DESCRIPTIONS: Record<string, string> = {
  super_admin: "Super Administrator",
  branch_manager: "Branch Manager",
  real_estate_agent: "Real Estate Agent / Manager",
  rental_manager: "Rental Manager",
  accountant_admin_assistant: "Accountant / Administrative Assistant",
  owner: "Property Owner",
  tenant: "Tenant",
  service_provider: "Service Provider",
} as const;

/**
 * User Status Descriptions
 */
export const USER_STATUS_DESCRIPTIONS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  suspended: "Suspended",
  pending_verification: "Pending Email Verification",
} as const;

/**
 * Validation Rules
 */
export const VALIDATION_RULES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_REGEX:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  PHONE_REGEX: /^\+?[1-9]\d{1,14}$/,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  EMAIL_MAX_LENGTH: 255,
} as const;

/**
 * Timeout Configuration (in milliseconds)
 */
export const TIMEOUTS = {
  API_REQUEST: 10000, // 10 seconds
  TOKEN_REFRESH_RETRY: 3000, // 3 seconds
  ERROR_DISPLAY: 3000, // 3 seconds
  SESSION_CHECK: 300000, // 5 minutes
} as const;

/**
 * Storage Configuration
 */
export const STORAGE_CONFIG = {
  USE_LOCALSTORAGE: true,
  USE_SESSION_STORAGE: false,
  USE_COOKIES: false,
} as const;

/**
 * Date Formats
 */
export const DATE_FORMATS = {
  DISPLAY: "MMM dd, yyyy HH:mm",
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  SHORT: "MM/dd/yyyy",
} as const;

/**
 * Device Detection
 */
export const DEVICE_TYPES = {
  DESKTOP: "desktop",
  MOBILE: "mobile",
  TABLET: "tablet",
  UNKNOWN: "unknown",
} as const;

/**
 * HTTP Status Codes (Auth Related)
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Feature Flags
 */
export const FEATURE_FLAGS = {
  ENABLE_SOCIAL_LOGIN: false,
  ENABLE_2FA: false,
  ENABLE_BIOMETRIC: false,
  ENABLE_SESSION_MANAGEMENT: true,
  ENABLE_ACCOUNT_RECOVERY: true,
  ENABLE_EMAIL_VERIFICATION: true,
} as const;

export default {
  PASSWORD_REQUIREMENTS,
  PASSWORD_STRENGTH_LEVELS,
  AUTH_ERRORS,
  AUTH_SUCCESS,
  AUTH_ENDPOINTS,
  RATE_LIMITS,
  TOKEN_CONFIG,
  USER_ROLE_DESCRIPTIONS,
  USER_STATUS_DESCRIPTIONS,
  VALIDATION_RULES,
  TIMEOUTS,
  STORAGE_CONFIG,
  DATE_FORMATS,
  DEVICE_TYPES,
  HTTP_STATUS,
  FEATURE_FLAGS,
};
