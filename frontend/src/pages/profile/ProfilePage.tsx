// ===========================================
// SmartProperty - Profile Page
// ===========================================

import { Calendar, Mail, Shield, User } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HomeFooter, HomeNavbar } from "../../components/layout";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "../../components/ui";
import { authService } from "../../services";
import { useAuthStore } from "../../store";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, setUser } = useAuthStore();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRequestingEmailChange, setIsRequestingEmailChange] = useState(false);
  const [isDeactivatingAccount, setIsDeactivatingAccount] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phone: user?.phone || "",
    avatar: user?.avatar || "",
  });
  const [newEmail, setNewEmail] = useState(user?.email || "");
  const [emailChangeMessage, setEmailChangeMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [profileMessage, setProfileMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleStartProfileEdit = () => {
    setProfileMessage(null);
    setEmailChangeMessage(null);
    setProfileForm({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      phone: user?.phone || "",
      avatar: user?.avatar || "",
    });
    setNewEmail(user?.email || "");
    setIsEditingProfile(true);
  };

  const handleCancelProfileEdit = () => {
    setIsEditingProfile(false);
    setProfileForm({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      phone: user?.phone || "",
      avatar: user?.avatar || "",
    });
    setNewEmail(user?.email || "");
    setEmailChangeMessage(null);
  };

  const handleRequestEmailChange = async () => {
    if (!user?.email) return;

    const normalizedEmail = newEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      setEmailChangeMessage({
        type: "error",
        text: "Please enter a valid email address.",
      });
      return;
    }

    if (normalizedEmail === user.email.toLowerCase()) {
      setEmailChangeMessage({
        type: "error",
        text: "New email must be different from current email.",
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
        type: "success",
        text:
          response.message ||
          "Verification link sent to your new email. Please confirm it to complete the change.",
      });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ||
        "Failed to request email change. Please try again.";
      setEmailChangeMessage({
        type: "error",
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
    const avatar = profileForm.avatar.trim();

    if (firstName.length < 2 || lastName.length < 2) {
      setProfileMessage({
        type: "error",
        text: "First name and last name must be at least 2 characters.",
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
        avatar,
      });

      setUser({
        ...updatedUser,
        fullName:
          updatedUser.fullName ||
          `${updatedUser.firstName} ${updatedUser.lastName}`.trim(),
      });

      setIsEditingProfile(false);
      setProfileMessage({
        type: "success",
        text: "Profile updated successfully.",
      });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Failed to update profile. Please try again.";
      setProfileMessage({ type: "error", text: message });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarUploadClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setProfileMessage({
        type: "error",
        text: "Please select a valid image file.",
      });
      event.target.value = "";
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setProfileMessage({
        type: "error",
        text: "Image size must be 5MB or less.",
      });
      event.target.value = "";
      return;
    }

    setIsUploadingAvatar(true);
    setProfileMessage(null);

    try {
      const uploaded = await authService.uploadAvatar(file);
      setProfileForm((prev) => ({
        ...prev,
        avatar: uploaded.url,
      }));
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Failed to upload image. Please try again.";
      setProfileMessage({
        type: "error",
        text: message,
      });
      event.target.value = "";
      setIsUploadingAvatar(false);
      return;
    }

    setIsUploadingAvatar(false);
    event.target.value = "";
  };

  const handleRemoveAvatar = () => {
    setProfileForm((prev) => ({
      ...prev,
      avatar: "",
    }));
  };

  const handleDeactivateAccount = async () => {
    setIsDeactivatingAccount(true);
    setProfileMessage(null);

    try {
      await authService.deactivateAccount();
      await logout();
      navigate("/login");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Failed to deactivate account. Please try again.";
      setProfileMessage({ type: "error", text: message });
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
      navigate("/login");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ||
        "Failed to delete account permanently. Please try again.";
      setProfileMessage({ type: "error", text: message });
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      <HomeNavbar />
      <div className="min-h-screen bg-gray-50 pt-24">
        {/* Header */}
        <header className="border-b border-gray-200 bg-white shadow-sm">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </button>
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              Profile Settings
            </h1>
            <div className="w-32" />
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Account Information Card */}
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5 text-indigo-600" />
                  Your Account Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profileMessage && (
                  <div className="mb-6">
                    <Alert
                      type={profileMessage.type}
                      message={profileMessage.text}
                      onClose={() => setProfileMessage(null)}
                    />
                  </div>
                )}

                <div className="mb-6 rounded-xl border border-gray-200 p-4">
                  <h3 className="mb-3 font-medium text-gray-900">
                    Profile Picture
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                      {profileForm.avatar ? (
                        <img
                          src={profileForm.avatar}
                          alt={user?.firstName || "Profile"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-500">
                          <User className="h-8 w-8" />
                        </div>
                      )}
                    </div>

                    {isEditingProfile ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarFileChange}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAvatarUploadClick}
                          isLoading={isUploadingAvatar}
                          disabled={isSavingProfile}
                        >
                          Upload Photo
                        </Button>
                        {profileForm.avatar && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveAvatar}
                            disabled={isUploadingAvatar || isSavingProfile}
                          >
                            Remove
                          </Button>
                        )}
                        <p className="w-full text-xs text-gray-500">
                          JPG, PNG, WEBP up to 5MB.
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">
                        Add a profile picture to personalize your account.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mb-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <h3 className="font-medium text-gray-900">Full Name</h3>
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
                      <p className="mt-1 text-gray-700">
                        {user?.firstName} {user?.lastName}
                      </p>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Email</h3>
                    {isEditingProfile ? (
                      <div className="mt-1 space-y-2">
                        <p className="flex items-center text-gray-700 text-sm">
                          <Mail className="mr-2 h-4 w-4 text-gray-400" />
                          {user?.email}
                          {user?.isEmailVerified && (
                            <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                              Verified
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-2">
                          <Input
                            type="email"
                            placeholder="new.email@example.com"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            size={1}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRequestEmailChange}
                            isLoading={isRequestingEmailChange}
                          >
                            Change
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
                      <div className="mt-1 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700">{user?.email}</span>
                        {user?.isEmailVerified && (
                          <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                            Verified
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Phone</h3>
                    {isEditingProfile ? (
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
                        className="mt-1"
                      />
                    ) : (
                      <p className="mt-1 text-gray-700">
                        {user?.phone || "Not provided"}
                      </p>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Member Since</h3>
                    <div className="mt-1 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-700">
                        {user?.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  {!isEditingProfile ? (
                    <Button variant="default" onClick={handleStartProfileEdit}>
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleCancelProfileEdit}
                        disabled={isSavingProfile || isUploadingAvatar}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="default"
                        onClick={handleSaveProfile}
                        isLoading={isSavingProfile}
                        disabled={isUploadingAvatar}
                      >
                        Save Changes
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Deactivate Account Section */}
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-red-900">
                  Deactivate Account
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm text-red-700 mb-4">
                    Deactivating your account will sign you out and make your
                    account inactive. You can reactivate it by logging in again.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeactivateModal(true)}
                    isLoading={isDeactivatingAccount}
                  >
                    Deactivate Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Delete Account Section */}
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-red-900">
                  Delete Account Permanently (GDPR)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm text-red-700 mb-4">
                    Permanently delete your account and all associated personal
                    data. This action cannot be undone and complies with GDPR
                    regulations.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteModal(true)}
                    isLoading={isDeletingAccount}
                  >
                    Delete Account Permanently
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        <HomeFooter />
      </div>

      {/* Deactivate Confirmation Modal */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Deactivate your account?
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Your account will become inactive and you will be signed out
              immediately. You can reactivate it by logging in again.
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
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
                ⚠️ Warning: This is permanent and irreversible.
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
    </>
  );
}
