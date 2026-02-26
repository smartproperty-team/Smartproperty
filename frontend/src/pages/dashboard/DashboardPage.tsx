// ===========================================
// SmartProperty - Dashboard Page
// ===========================================

import {
  Bell,
  Building2,
  Calendar,
  FileText,
  Home,
  Mail,
  Pencil,
  Shield,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeFooter, HomeNavbar } from '@/components/layout';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from '@/components/ui';
import { authService, verificationService } from '@/services';
import { useAuthStore } from '@/store';
import { VerificationStatus } from '@/types/verification';
import { canManageProperties } from '@/utils';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout, isLoading, setUser } = useAuthStore();
  const canManage = canManageProperties(user);
  const accountInfoRef = useRef<HTMLDivElement>(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isRequestingEmailChange, setIsRequestingEmailChange] = useState(false);
  const [isDeactivatingAccount, setIsDeactivatingAccount] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
  });
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [emailMessage, setEmailMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus | null>(null);
  const [emailChangeMessage, setEmailChangeMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [profileMessage, setProfileMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Fetch verification status for tenants
  useEffect(() => {
    if (user?.role === 'tenant') {
      verificationService
        .getVerificationStatus()
        .then((data) => setVerificationStatus(data.overallStatus))
        .catch(() => setVerificationStatus(VerificationStatus.NOT_SUBMITTED));
    }
  }, [user?.role]);

  const handleResendVerification = async () => {
    if (!user?.email) return;
    setResendingEmail(true);
    try {
      await authService.resendVerification(user.email);
      setEmailMessage({
        type: 'success',
        text: 'Verification email sent! Check your inbox or MailHog at localhost:8025',
      });
    } catch {
      setEmailMessage({
        type: 'error',
        text: 'Failed to send verification email. Please try again.',
      });
    } finally {
      setResendingEmail(false);
    }
  };

  const handleOpenProfileEditor = () => {
    setProfileMessage(null);
    setProfileForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
    });
    setNewEmail(user?.email || '');
    setEmailChangeMessage(null);
    setIsEditingProfile(true);
    accountInfoRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const handleCancelProfileEdit = () => {
    setIsEditingProfile(false);
    setProfileForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
    });
    setNewEmail(user?.email || '');
    setEmailChangeMessage(null);
  };

  const handleRequestEmailChange = async () => {
    if (!user?.email) return;

    const normalizedEmail = newEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      setEmailChangeMessage({
        type: 'error',
        text: 'Please enter a valid email address.',
      });
      return;
    }

    if (normalizedEmail === user.email.toLowerCase()) {
      setEmailChangeMessage({
        type: 'error',
        text: 'New email must be different from current email.',
      });
      return;
    }

    setIsRequestingEmailChange(true);
    setEmailChangeMessage(null);

    try {
      const response = await authService.requestEmailChange({
        newEmail: normalizedEmail,
      });
      setEmailChangeMessage({
        type: 'success',
        text:
          response.message ||
          'Verification link sent to your new email. Please confirm it to complete the change.',
      });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ||
        'Failed to request email change. Please try again.';
      setEmailChangeMessage({
        type: 'error',
        text: message,
      });
    } finally {
      setIsRequestingEmailChange(false);
    }
  };

  const handleSaveProfile = async () => {
    const firstName = profileForm.firstName.trim();
    const lastName = profileForm.lastName.trim();
    const phone = profileForm.phone.trim();

    if (firstName.length < 2 || lastName.length < 2) {
      setProfileMessage({
        type: 'error',
        text: 'First name and last name must be at least 2 characters.',
      });
      return;
    }

    setIsSavingProfile(true);
    setProfileMessage(null);

    try {
      const updatedUser = await authService.updateProfile({
        firstName,
        lastName,
        phone: phone || undefined,
      });

      setUser({
        ...updatedUser,
        fullName:
          updatedUser.fullName ||
          `${updatedUser.firstName} ${updatedUser.lastName}`.trim(),
      });

      setIsEditingProfile(false);
      setProfileMessage({
        type: 'success',
        text: 'Profile updated successfully.',
      });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || 'Failed to update profile. Please try again.';
      setProfileMessage({ type: 'error', text: message });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeactivateAccount = async () => {
    setIsDeactivatingAccount(true);
    setProfileMessage(null);

    try {
      await authService.deactivateAccount();
      await logout();
      navigate('/login');
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || 'Failed to deactivate account. Please try again.';
      setProfileMessage({ type: 'error', text: message });
    } finally {
      setIsDeactivatingAccount(false);
      setShowDeactivateModal(false);
    }
  };

  const handleDeleteAccountPermanently = async () => {
    setIsDeletingAccount(true);
    setProfileMessage(null);

    try {
      await authService.deleteAccountPermanently();
      await logout();
      navigate('/login');
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ||
        'Failed to delete account permanently. Please try again.';
      setProfileMessage({ type: 'error', text: message });
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteModal(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      owner: 'bg-blue-100 text-blue-800',
      tenant: 'bg-green-100 text-green-800',
      manager: 'bg-purple-100 text-purple-800',
      agent: 'bg-yellow-100 text-yellow-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800',
      pending_verification: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <>
      <HomeNavbar />
      <div className="min-h-screen bg-gray-50 pt-24">


        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Email verification warning - only show after initial load */}
          {!isLoading && user && !user.isEmailVerified && (
            <div className="mb-6">
              <Alert
                type="warning"
                title="Email not verified"
                message="Please verify your email address to access all features."
              />
              <div className="mt-2 flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResendVerification}
                  isLoading={resendingEmail}
                >
                  Resend Verification Email
                </Button>
                <a
                  href="http://localhost:8025"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 hover:underline"
                >
                  Open MailHog →
                </a>
              </div>
              {emailMessage && (
                <div className="mt-2">
                  <Alert
                    type={emailMessage.type}
                    message={emailMessage.text}
                    onClose={() => setEmailMessage(null)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.firstName}! 👋
            </h1>
            <p className="mt-2 text-gray-600">
              {canManage
                ? "Here's what's happening with your properties today."
                : "Browse available properties and manage your applications."}
            </p>
          </div>

          {/* User Info Card */}
          <div ref={accountInfoRef} className="mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5 text-indigo-600" />
                  Your Account Information
                </CardTitle>
                {isEditingProfile ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelProfileEdit}
                      disabled={isSavingProfile}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSaveProfile}
                      isLoading={isSavingProfile}
                    >
                      Save Changes
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenProfileEditor}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {profileMessage && (
                  <div className="mb-4">
                    <Alert
                      type={profileMessage.type}
                      message={profileMessage.text}
                      onClose={() => setProfileMessage(null)}
                    />
                  </div>
                )}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Full Name
                    </label>
                    {isEditingProfile ? (
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <Input
                          placeholder="First name"
                          value={profileForm.firstName}
                          onChange={(e) =>
                            setProfileForm((prev) => ({
                              ...prev,
                              firstName: e.target.value,
                            }))
                          }
                        />
                        <Input
                          placeholder="Last name"
                          value={profileForm.lastName}
                          onChange={(e) =>
                            setProfileForm((prev) => ({
                              ...prev,
                              lastName: e.target.value,
                            }))
                          }
                        />
                      </div>
                    ) : (
                      <p className="mt-1 text-gray-900">{user?.fullName}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Email
                    </label>
                    {isEditingProfile ? (
                      <div className="mt-1 space-y-2">
                        <p className="flex items-center text-gray-900">
                          <Mail className="mr-2 h-4 w-4 text-gray-400" />
                          {user?.email}
                          {user?.isEmailVerified ? (
                            <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                              Verified
                            </span>
                          ) : (
                            <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                              Unverified
                            </span>
                          )}
                        </p>

                        <div className="flex items-center gap-2">
                          <Input
                            type="email"
                            placeholder="new.email@example.com"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRequestEmailChange}
                            isLoading={isRequestingEmailChange}
                          >
                            Change Email
                          </Button>
                        </div>

                        {emailChangeMessage && (
                          <Alert
                            type={emailChangeMessage.type}
                            message={emailChangeMessage.text}
                            onClose={() => setEmailChangeMessage(null)}
                          />
                        )}
                      </div>
                    ) : (
                      <p className="mt-1 flex items-center text-gray-900">
                        <Mail className="mr-2 h-4 w-4 text-gray-400" />
                        {user?.email}
                        {user?.isEmailVerified ? (
                          <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                            Verified
                          </span>
                        ) : (
                          <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                            Unverified
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Phone
                    </label>
                    {isEditingProfile ? (
                      <div className="mt-2">
                        <Input
                          type="tel"
                          placeholder="+1 (555) 123-4567"
                          value={profileForm.phone}
                          onChange={(e) =>
                            setProfileForm((prev) => ({
                              ...prev,
                              phone: e.target.value,
                            }))
                          }
                        />
                      </div>
                    ) : (
                      <p className="mt-1 text-gray-900">
                        {user?.phone || 'Not provided'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Role
                    </label>
                    <p className="mt-1">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getRoleBadgeColor(user?.role || '')}`}
                      >
                        {user?.role}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Status
                    </label>
                    <p className="mt-1">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusBadgeColor(user?.status || '')}`}
                      >
                        {user?.status?.replace('_', ' ')}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Member Since
                    </label>
                    <p className="mt-1 flex items-center text-gray-900">
                      <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                      {user?.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* 2FA Setup Button - Only show if not enabled */}
                {!user?.twoFactorEnabled && (
                  <div className="col-span-full mt-4 rounded-lg border-2 border-dashed border-yellow-300 bg-yellow-50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                          <Shield className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div className="ml-3">
                          <h3 className="font-medium text-gray-900">
                            Secure Your Account
                          </h3>
                          <p className="text-sm text-gray-600">
                            Enable two-factor authentication for extra security
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => navigate('/security/2fa')}
                        className="whitespace-nowrap"
                      >
                        Setup 2FA
                      </Button>
                    </div>
                  </div>
                )}

                {isEditingProfile && (
                  <div className="col-span-full mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-red-900">
                          Deactivate Account
                        </h3>
                        <p className="text-sm text-red-700">
                          This will deactivate your account and sign you out.
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowDeactivateModal(true)}
                        isLoading={isDeactivatingAccount}
                      >
                        Deactivate
                      </Button>
                    </div>
                  </div>
                )}

                {isEditingProfile && (
                  <div className="col-span-full mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-red-900">
                          Delete Account Permanently (GDPR)
                        </h3>
                        <p className="text-sm text-red-700">
                          This will permanently delete your account and all
                          personal data will be removed. This action cannot be
                          undone.
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowDeleteModal(true)}
                        isLoading={isDeletingAccount}
                      >
                        Delete Permanently
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Verify Me CTA - Show for tenants (hide if verified or rejected) */}
          {user?.role === 'tenant' &&
            verificationStatus !== VerificationStatus.VERIFIED &&
            verificationStatus !== VerificationStatus.REJECTED && (
              <div className="mb-8">
                  <div className="relative overflow-hidden rounded-xl border border-indigo-200 bg-linear-to-r from-indigo-500 via-purple-500 to-indigo-600 p-6 shadow-lg">
                  <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
                  <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white/10" />
                  <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                        <ShieldCheck className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          Get Verified
                        </h3>
                        <p className="text-sm text-indigo-100">
                          Upload your documents to build trust with landlords
                          and speed up your applications.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => navigate('/verification')}
                      className="shrink-0 bg-white text-indigo-600 shadow-md hover:bg-indigo-50 focus-visible:ring-white"
                      size="lg"
                    >
                      <ShieldCheck className="mr-2 h-5 w-5" />
                      Verify Me
                    </Button>
                  </div>
                </div>
              </div>
            )}

          {/* Admin: Review Verifications CTA */}
          {user?.role === 'admin' && (
            <div className="mb-8">
                  <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-linear-to-r from-amber-500 via-orange-500 to-red-500 p-6 shadow-lg">
                <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
                <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white/10" />
                <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                      <Shield className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        Tenant Verifications
                      </h3>
                      <p className="text-sm text-amber-100">
                        Review and approve tenant identity & income documents.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate('/admin/verifications')}
                    className="shrink-0 bg-white text-amber-600 shadow-md hover:bg-amber-50 focus-visible:ring-white"
                    size="lg"
                  >
                    <Shield className="mr-2 h-5 w-5" />
                    Review Verifications
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="flex items-center p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100">
                  <Home className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">0</p>
                  <p className="text-sm text-gray-500">
                    {canManage ? 'Properties' : 'Browsed'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">0</p>
                  <p className="text-sm text-gray-500">
                    {canManage ? 'Tenants' : 'Applications'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">0</p>
                  <p className="text-sm text-gray-500">Leases</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100">
                  <Bell className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">0</p>
                  <p className="text-sm text-gray-500">Notifications</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* API Testing Info */}
          <Card>
            <CardHeader>
              <CardTitle>🧪 API Testing Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <a
                  href="http://localhost:3000/api/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center rounded-lg border border-gray-200 p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                    <FileText className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">
                      Swagger API Docs
                    </p>
                    <p className="text-sm text-gray-500">
                      localhost:3000/api/docs
                    </p>
                  </div>
                </a>

                <a
                  href="http://localhost:8025"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center rounded-lg border border-gray-200 p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                    <Mail className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">MailHog</p>
                    <p className="text-sm text-gray-500">View sent emails</p>
                  </div>
                </a>

                <a
                  href="http://localhost:8081"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center rounded-lg border border-gray-200 p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                    <Building2 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">Mongo Express</p>
                    <p className="text-sm text-gray-500">Database admin</p>
                  </div>
                </a>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      {showDeactivateModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Deactivate your account?
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Your account will become inactive and you will be signed out
              immediately.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeactivateModal(false)}
                disabled={isDeactivatingAccount}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeactivateAccount}
                isLoading={isDeactivatingAccount}
              >
                Yes, Deactivate
              </Button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-red-900">
              Permanently delete your account?
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              This action cannot be undone. Your account and all associated
              personal data will be permanently deleted in compliance with GDPR
              regulations. You will be signed out immediately.
            </p>
            <div className="mt-4 rounded-lg bg-red-50 p-3">
              <p className="text-sm font-medium text-red-800">
                Warning: This is permanent and irreversible.
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeletingAccount}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccountPermanently}
                isLoading={isDeletingAccount}
              >
                Yes, Delete Permanently
              </Button>
            </div>
          </div>
        </div>
      )}
      <HomeFooter />
    </>
  );
}
