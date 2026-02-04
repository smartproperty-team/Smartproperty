// ===========================================
// SmartProperty - Auth Error Handler
// ===========================================

import type { AxiosError } from "axios";

export interface AuthErrorResponse {
  message: string;
  statusCode: number;
  error?: string;
}

/**
 * Extract error message from auth API response
 */
export const getAuthErrorMessage = (
  error: unknown,
  defaultMessage: string = "An error occurred",
): string => {
  if (error instanceof Error) {
    return error.message;
  }

  const axiosError = error as AxiosError<AuthErrorResponse> | null;
  if (axiosError?.response?.data?.message) {
    return axiosError.response.data.message;
  }

  if (axiosError?.response?.status === 401) {
    return "Invalid email or password";
  }

  if (axiosError?.response?.status === 409) {
    return "Email already registered";
  }

  if (axiosError?.response?.status === 400) {
    return "Invalid input. Please check your data";
  }

  if (axiosError?.response?.status === 429) {
    return "Too many requests. Please try again later";
  }

  if (axiosError?.response?.status === 500) {
    return "Server error. Please try again later";
  }

  return defaultMessage;
};

/**
 * Check if error is a validation error
 */
export const isValidationError = (error: unknown): boolean => {
  const axiosError = error as AxiosError | null;
  return axiosError?.response?.status === 400;
};

/**
 * Check if error is an auth error (401)
 */
export const isAuthError = (error: unknown): boolean => {
  const axiosError = error as AxiosError | null;
  return axiosError?.response?.status === 401;
};

/**
 * Check if error is a conflict error (409)
 */
export const isConflictError = (error: unknown): boolean => {
  const axiosError = error as AxiosError | null;
  return axiosError?.response?.status === 409;
};

/**
 * Check if error is a rate limit error (429)
 */
export const isRateLimitError = (error: unknown): boolean => {
  const axiosError = error as AxiosError | null;
  return axiosError?.response?.status === 429;
};

/**
 * Check if error is a server error (5xx)
 */
export const isServerError = (error: unknown): boolean => {
  const axiosError = error as AxiosError | null;
  return axiosError?.response?.status
    ? axiosError.response.status >= 500
    : false;
};
