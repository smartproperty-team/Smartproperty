// ===========================================
// SmartProperty - Auth Types
// ===========================================

export enum UserRole {
  ADMIN = "admin",
  OWNER = "owner",
  TENANT = "tenant",
  MANAGER = "manager",
  AGENT = "agent",
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
  PENDING_VERIFICATION = "pending_verification",
}

export enum AuthProvider {
  LOCAL = "local",
  GOOGLE = "google",
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  authProvider?: AuthProvider;
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface LoginCredentials {
  email: string;
  password: string;
  twoFactorCode?: string;
  captchaToken?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: UserRole;
  captchaToken?: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface VerifyEmailData {
  token: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

// ===========================================
// Session Management Types
// ===========================================

export interface Session {
  id: string;
  deviceName: string;
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
  browser: string;
  os: string;
  ipAddress: string;
  location?: string;
  isActive: boolean;
  lastActivityAt: string;
  createdAt: string;
  expiresAt: string;
  isCurrent?: boolean;
}

export interface AuthResponseWithSession extends AuthResponse {
  sessionId: string;
}
