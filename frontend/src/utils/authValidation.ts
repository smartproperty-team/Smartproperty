// ===========================================
// SmartProperty - Auth Validation
// ===========================================

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * Requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
 */
export const isValidPassword = (password: string): boolean => {
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

/**
 * Get password strength level
 */
export const getPasswordStrength = (
  password: string,
): "weak" | "medium" | "strong" => {
  if (!password) return "weak";

  let strength = 0;

  // Length check
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;

  // Character variety checks
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[@$!%*?&]/.test(password)) strength++;

  if (strength <= 2) return "weak";
  if (strength <= 4) return "medium";
  return "strong";
};

/**
 * Validate phone number (international format)
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s\-()]/g, ""));
};

/**
 * Validate passwords match
 */
export const passwordsMatch = (
  password: string,
  confirmPassword: string,
): boolean => {
  return password === confirmPassword && password.length > 0;
};

/**
 * Validate registration data
 */
export const validateRegistrationData = (data: {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone?: string;
}): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!data.email || !isValidEmail(data.email)) {
    errors.email = "Invalid email address";
  }

  if (!data.password) {
    errors.password = "Password is required";
  } else if (!isValidPassword(data.password)) {
    errors.password =
      "Password must be at least 8 characters with uppercase, lowercase, number, and special character";
  }

  if (!passwordsMatch(data.password, data.confirmPassword)) {
    errors.confirmPassword = "Passwords do not match";
  }

  if (!data.firstName || data.firstName.trim().length < 2) {
    errors.firstName = "First name must be at least 2 characters";
  }

  if (!data.lastName || data.lastName.trim().length < 2) {
    errors.lastName = "Last name must be at least 2 characters";
  }

  if (data.phone && !isValidPhoneNumber(data.phone)) {
    errors.phone = "Invalid phone number format";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate login data
 */
export const validateLoginData = (data: {
  email: string;
  password: string;
}): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!data.email || !isValidEmail(data.email)) {
    errors.email = "Invalid email address";
  }

  if (!data.password) {
    errors.password = "Password is required";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate password change data
 */
export const validateChangePasswordData = (data: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!data.currentPassword) {
    errors.currentPassword = "Current password is required";
  }

  if (!data.newPassword) {
    errors.newPassword = "New password is required";
  } else if (!isValidPassword(data.newPassword)) {
    errors.newPassword =
      "Password must be at least 8 characters with uppercase, lowercase, number, and special character";
  }

  if (!passwordsMatch(data.newPassword, data.confirmPassword)) {
    errors.confirmPassword = "Passwords do not match";
  }

  if (data.currentPassword === data.newPassword) {
    errors.newPassword = "New password must be different from current password";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate reset password data
 */
export const validateResetPasswordData = (data: {
  password: string;
  confirmPassword: string;
}): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!data.password) {
    errors.password = "Password is required";
  } else if (!isValidPassword(data.password)) {
    errors.password =
      "Password must be at least 8 characters with uppercase, lowercase, number, and special character";
  }

  if (!passwordsMatch(data.password, data.confirmPassword)) {
    errors.confirmPassword = "Passwords do not match";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};
