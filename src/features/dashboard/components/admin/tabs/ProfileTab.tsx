"use client";
import React, { useState, useEffect } from "react";
import { useCachedSession } from "@/features/auth/hooks/use-cached-session";
import { motion } from "framer-motion";
import { userApi } from "@/features/users/api/user-api";
import { useDispatch } from "react-redux";
import { api } from "@/store/services/api";
import { authApi } from "@/features/auth/api/auth-api";

type UserProfile = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  postalCode?: string | null;
};

const ProfileTab: React.FC = () => {
  const { data: session, update } = useCachedSession();
  const dispatch = useDispatch();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const getRoleBadgeClass = (role?: string) => {
    if (role === "SUPER_ADMIN")
      return "bg-purple-100 text-purple-700 border border-purple-300";
    if (role === "ADMIN")
      return "bg-blue-light-5 text-blue border border-blue/20";
    return "bg-green-light-6 text-green border border-green/20";
  };

  const getRoleLabel = (role?: string) => {
    if (role === "SUPER_ADMIN") return "Super Admin";
    return role || "Customer";
  };
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const user = session?.user as any;
    if (!user?.id) return;

    setProfile({
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      address: user.address || "",
      city: user.city || "",
      postalCode: user.postalCode || "",
      country: user.country || "",
    });

    const nameParts = (user.name || "").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    setFormData({
      firstName,
      lastName,
      email: user.email || "",
      phone: user.phone || "",
      address: user.address || "",
      city: user.city || "",
      postalCode: user.postalCode || "",
      country: user.country || "",
    });
    setProfileError(null);
  }, [session?.user]);

  const handleEditClick = () => {
    if (profile) {
      const nameParts = (profile.name || "").split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      setFormData({
        firstName,
        lastName,
        email: profile.email || "",
        phone: profile.phone || "",
        address: profile.address || "",
        city: profile.city || "",
        postalCode: profile.postalCode || "",
        country: profile.country || "",
      });
    }
    setIsEditing(true);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const response = await userApi.updateProfile(formData);
      setProfile(response.data);
      const updatedUser = {
        id: response.data.id || session?.user?.id,
        name: response.data.name ?? session?.user?.name ?? null,
        email: response.data.email ?? session?.user?.email ?? null,
        role: (session?.user as any)?.role ?? "ADMIN",
        image: (session?.user as any)?.image ?? null,
        phone: response.data.phone ?? null,
        address: response.data.address ?? null,
        city: response.data.city ?? null,
        country: response.data.country ?? null,
        postalCode: response.data.postalCode ?? null,
      };
      if (updatedUser.id) {
        try {
          await update?.({ user: updatedUser } as any);
          dispatch(
            api.util.invalidateTags([
              { type: "Users", id: updatedUser.id },
              { type: "Users", id: "LIST" },
            ])
          );
        } catch (error) {
          console.warn("Failed to refresh session data:", error);
        }
      }
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      setSaveError(error.message || "Could not save changes");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    // Validation
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords don't match");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    if (!/[A-Z]/.test(passwordData.newPassword)) {
      setPasswordError("Password must contain at least one uppercase letter");
      return;
    }

    if (!/[0-9]/.test(passwordData.newPassword)) {
      setPasswordError("Password must contain at least one number");
      return;
    }

    setPasswordLoading(true);

    try {
      await authApi.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setPasswordSuccess("Password changed successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      // Close form after 2 seconds
      setTimeout(() => {
        setIsChangingPassword(false);
        setPasswordSuccess(null);
      }, 2000);
    } catch (error: any) {
      setPasswordError(
        error.response?.data?.message ||
          "Failed to change password. Please try again."
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const calculatePasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) {
      return { score: 1, label: "Weak", color: "bg-red" };
    } else if (score <= 4) {
      return { score: 2, label: "Medium", color: "bg-yellow-dark" };
    } else {
      return { score: 3, label: "Strong", color: "bg-green" };
    }
  };

  const passwordStrength = calculatePasswordStrength(passwordData.newPassword);
  const isGoogleAuthenticated = session?.user?.provider === "google";

  const getMemberSince = () => {
    if (!session?.user?.createdAt) {
      return new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    return new Date(session.user.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "AD";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-7.5">
      {/* Profile Header Card */}
      <div className="rounded-xl border border-gray-3 bg-white shadow-1">
        <div className="border-b border-gray-3 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-custom-lg font-semibold text-dark">
                Profile Information
              </h3>
              <p className="text-custom-xs text-body">
                Manage your admin account details and preferences
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="flex flex-col items-start gap-6 border-b border-gray-3 pb-6 sm:flex-row">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue text-white text-2xl font-semibold flex-shrink-0">
              {getInitials(session?.user?.name)}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-dark">
                {session?.user?.name}
              </h2>
              <p className="text-custom-sm text-body">{session?.user?.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-custom-xs font-medium ${
                    session?.user?.role === "SUPER_ADMIN"
                      ? "bg-purple-100 text-purple-700 border border-purple-300"
                      : session?.user?.role === "ADMIN"
                        ? "bg-blue-light-5 text-blue border border-blue/20"
                        : "bg-green-light-6 text-green border border-green/20"
                  }`}
                >
                  {session?.user?.role === "SUPER_ADMIN"
                    ? "Super Admin"
                    : session?.user?.role}
                </span>
                <span className="inline-flex items-center rounded-full bg-green-light-6 px-3 py-1 text-custom-xs font-medium text-green">
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Profile Form */}
          {saveSuccess && (
            <div className="mb-4 rounded-xl bg-green-light-6 border border-green p-4 flex items-start gap-3">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-green shrink-0 mt-0.5"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <div>
                <p className="font-semibold text-green">
                  Profile updated successfully!
                </p>
              </div>
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-5 pt-6">
              {saveError && (
                <div className="rounded-xl bg-red-light-6 border border-red p-3">
                  <p className="text-sm text-red">{saveError}</p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-custom-sm font-medium text-dark">
                    First Name <span className="text-red">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-3 bg-gray-1 px-4 py-3 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-custom-sm font-medium text-dark">
                    Last Name <span className="text-red">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-3 bg-gray-1 px-4 py-3 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-custom-sm font-medium text-dark">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full rounded-lg border border-gray-3 bg-gray-2 px-4 py-3 text-custom-sm text-dark-4 cursor-not-allowed"
                />
                <p className="text-custom-xs text-body mt-1">
                  Email address cannot be changed
                </p>
              </div>

              <div>
                <label className="mb-2 block text-custom-sm font-medium text-dark">
                  Phone Number <span className="text-red">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-3 bg-gray-1 px-4 py-3 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-custom-sm font-medium text-dark">
                  Address <span className="text-red">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-3 bg-gray-1 px-4 py-3 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-custom-sm font-medium text-dark">
                    City <span className="text-red">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-3 bg-gray-1 px-4 py-3 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-custom-sm font-medium text-dark">
                    Postal Code <span className="text-red">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.postalCode}
                    onChange={(e) =>
                      setFormData({ ...formData, postalCode: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-3 bg-gray-1 px-4 py-3 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-custom-sm font-medium text-dark">
                  Country <span className="text-red">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.country}
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-3 bg-gray-1 px-4 py-3 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-custom-sm font-medium text-dark">
                  User ID
                </label>
                <input
                  type="text"
                  value={session?.user?.id || ""}
                  readOnly
                  className="w-full rounded-lg border border-gray-3 bg-gray-2 px-4 py-3 text-custom-sm text-dark-4 cursor-not-allowed font-mono"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="rounded-lg bg-blue px-6 py-2.5 text-custom-sm font-medium text-white hover:bg-blue-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    if (profile) {
                      const nameParts = (profile.name || "").split(" ");
                      const firstName = nameParts[0] || "";
                      const lastName = nameParts.slice(1).join(" ") || "";
                      setFormData({
                        firstName,
                        lastName,
                        email: profile.email || "",
                        phone: profile.phone || "",
                        address: profile.address || "",
                        city: profile.city || "",
                        postalCode: profile.postalCode || "",
                        country: profile.country || "",
                      });
                    }
                    setSaveError(null);
                    setSaveSuccess(false);
                  }}
                  className="rounded-lg border border-gray-3 px-6 py-2.5 text-custom-sm font-medium text-dark hover:bg-gray-1 transition"
                >
                  Cancel
                </motion.button>
              </div>
            </form>
          ) : (
            <div className="pt-6">
              <div className="rounded-lg border border-gray-3 bg-gray-1 p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <h3 className="text-lg font-semibold text-dark">
                    Account Information
                  </h3>
                  {!isEditing && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleEditClick}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-3 bg-white text-dark transition hover:border-blue hover:text-blue"
                      aria-label="Edit profile"
                      title="Edit profile"
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                      </svg>
                    </motion.button>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <svg
                      className="flex-shrink-0 fill-current text-blue mt-0.5"
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M10 2.5C7.92893 2.5 6.25 4.17893 6.25 6.25C6.25 8.32107 7.92893 10 10 10C12.0711 10 13.75 8.32107 13.75 6.25C13.75 4.17893 12.0711 2.5 10 2.5Z"
                        fill=""
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="text-custom-xs text-body uppercase tracking-wide mb-1">
                        Full Name
                      </p>
                      <p className="font-medium text-dark break-words">
                        {profile?.name || session?.user?.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <svg
                      className="flex-shrink-0 fill-current text-blue mt-0.5"
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M3.75 5.625C3.75 5.00368 4.25368 4.5 4.875 4.5H15.125C15.7463 4.5 16.25 5.00368 16.25 5.625V14.375C16.25 14.9963 15.7463 15.5 15.125 15.5H4.875C4.25368 15.5 3.75 14.9963 3.75 14.375V5.625Z"
                        fill=""
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="text-custom-xs text-body uppercase tracking-wide mb-1">
                        Email Address
                      </p>
                      <p className="font-medium text-dark break-words">
                        {profile?.email || session?.user?.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <svg
                      className="flex-shrink-0 text-blue mt-0.5"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-custom-xs text-body uppercase tracking-wide mb-1">
                        Phone Number
                      </p>
                      <p className="font-medium text-dark">
                        {profile?.phone || "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <svg
                      className="flex-shrink-0 text-blue mt-0.5"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-custom-xs text-body uppercase tracking-wide mb-1">
                        City
                      </p>
                      <p className="font-medium text-dark">
                        {profile?.city || "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <svg
                      className="flex-shrink-0 text-blue mt-0.5"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-custom-xs text-body uppercase tracking-wide mb-1">
                        Address
                      </p>
                      <p className="font-medium text-dark">
                        {profile?.address || "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <svg
                      className="flex-shrink-0 text-blue mt-0.5"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-custom-xs text-body uppercase tracking-wide mb-1">
                        Postal Code
                      </p>
                      <p className="font-medium text-dark">
                        {profile?.postalCode || "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <svg
                      className="flex-shrink-0 text-blue mt-0.5"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-custom-xs text-body uppercase tracking-wide mb-1">
                        Country
                      </p>
                      <p className="font-medium text-dark">
                        {profile?.country || "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <svg
                      className="flex-shrink-0 fill-current text-blue mt-0.5"
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                    >
                      <path
                        d="M10 2.5C8.89543 2.5 8 3.39543 8 4.5C8 5.60457 8.89543 6.5 10 6.5C11.1046 6.5 12 5.60457 12 4.5C12 3.39543 11.1046 2.5 10 2.5Z"
                        fill=""
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="text-custom-xs text-body uppercase tracking-wide mb-1">
                        User ID
                      </p>
                      <p className="font-medium text-dark font-mono text-xs break-all">
                        {session?.user?.id}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <svg
                      className="flex-shrink-0 fill-current text-blue mt-0.5"
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                    >
                      <path
                        d="M10 2.5C8.89543 2.5 8 3.39543 8 4.5C8 5.60457 8.89543 6.5 10 6.5C11.1046 6.5 12 5.60457 12 4.5C12 3.39543 11.1046 2.5 10 2.5Z"
                        fill=""
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="text-custom-xs text-body uppercase tracking-wide mb-1">
                        Role
                      </p>
                      <p className="font-medium text-dark">
                        <span className="inline-flex items-center rounded-full bg-blue-light-5 px-3 py-1 text-xs font-medium text-blue">
                          {session?.user?.role}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <svg
                      className="flex-shrink-0 fill-current text-blue mt-0.5"
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                    >
                      <path
                        d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M10 6V10L13 12"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="text-custom-xs text-body uppercase tracking-wide mb-1">
                        Member Since
                      </p>
                      <p className="font-medium text-dark">
                        {getMemberSince()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Section */}
      {!isGoogleAuthenticated && (
        <div className="rounded-xl border border-gray-3 bg-white shadow-1">
          <div className="border-b border-gray-3 px-5 py-4">
            <h3 className="text-custom-lg font-semibold text-dark">
              Change Password
            </h3>
            <p className="text-custom-xs text-body">
              Update your password to keep your account secure
            </p>
          </div>

          <div className="p-5">
            {!isChangingPassword ? (
              <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-3 p-4">
                <div className="flex-1">
                  <p className="text-custom-sm font-medium text-dark mb-1">
                    Password
                  </p>
                  <p className="text-custom-xs text-body">••••••••••••</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsChangingPassword(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue bg-blue px-4 py-2 text-custom-sm font-medium text-white hover:bg-blue-dark transition"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M15 8.33333V5.83333C15 3.99238 13.5076 2.5 11.6667 2.5H5.83333C3.99238 2.5 2.5 3.99238 2.5 5.83333V11.6667C2.5 13.5076 3.99238 15 5.83333 15H8.33333"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M11.6667 10.8333H17.5V16.6667C17.5 17.5871 16.7538 18.3333 15.8333 18.3333H13.3333C12.4129 18.3333 11.6667 17.5871 11.6667 16.6667V10.8333Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M13.75 10.8333V9.16667C13.75 8.24619 14.4962 7.5 15.4167 7.5C16.3371 7.5 17.0833 8.24619 17.0833 9.16667V10.8333"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                  Change Password
                </motion.button>
              </div>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-5">
                {passwordError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg bg-red-light-6 border border-red p-4"
                  >
                    <p className="text-custom-sm text-red">{passwordError}</p>
                  </motion.div>
                )}

                {passwordSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg bg-green-light-6 border border-green p-4"
                  >
                    <p className="text-custom-sm text-green">
                      {passwordSuccess}
                    </p>
                  </motion.div>
                )}

                <div>
                  <label className="mb-2 block text-custom-sm font-medium text-dark">
                    Current Password <span className="text-red">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        currentPassword: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-3 bg-gray-1 px-4 py-3 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
                    placeholder="Enter your current password"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-custom-sm font-medium text-dark">
                    New Password <span className="text-red">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        newPassword: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-3 bg-gray-1 px-4 py-3 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
                    placeholder="Enter new password"
                  />

                  {/* Password Strength Indicator */}
                  {passwordData.newPassword && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-custom-xs text-body">
                          Password strength
                        </span>
                        <span
                          className={`text-custom-xs font-medium ${
                            passwordStrength.score === 1
                              ? "text-red"
                              : passwordStrength.score === 2
                                ? "text-yellow-dark"
                                : "text-green"
                          }`}
                        >
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${
                              level <= passwordStrength.score
                                ? passwordStrength.color
                                : "bg-gray-3"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="mt-2 space-y-1">
                        <p
                          className={`text-custom-xs flex items-center gap-1 ${
                            /[A-Z]/.test(passwordData.newPassword)
                              ? "text-green"
                              : "text-body"
                          }`}
                        >
                          <span>
                            {/[A-Z]/.test(passwordData.newPassword) ? "✓" : "○"}
                          </span>
                          One uppercase letter
                        </p>
                        <p
                          className={`text-custom-xs flex items-center gap-1 ${
                            /[a-z]/.test(passwordData.newPassword)
                              ? "text-green"
                              : "text-body"
                          }`}
                        >
                          <span>
                            {/[a-z]/.test(passwordData.newPassword) ? "✓" : "○"}
                          </span>
                          One lowercase letter
                        </p>
                        <p
                          className={`text-custom-xs flex items-center gap-1 ${
                            /[0-9]/.test(passwordData.newPassword)
                              ? "text-green"
                              : "text-body"
                          }`}
                        >
                          <span>
                            {/[0-9]/.test(passwordData.newPassword) ? "✓" : "○"}
                          </span>
                          One number
                        </p>
                        <p
                          className={`text-custom-xs flex items-center gap-1 ${
                            passwordData.newPassword.length >= 8
                              ? "text-green"
                              : "text-body"
                          }`}
                        >
                          <span>
                            {passwordData.newPassword.length >= 8 ? "✓" : "○"}
                          </span>
                          At least 8 characters
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-custom-sm font-medium text-dark">
                    Confirm New Password <span className="text-red">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-3 bg-gray-1 px-4 py-3 text-custom-sm text-dark focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
                    placeholder="Confirm new password"
                  />
                  {passwordData.confirmPassword &&
                    passwordData.newPassword ===
                      passwordData.confirmPassword && (
                      <p className="mt-1 text-custom-xs text-green flex items-center gap-1">
                        <span>✓</span>
                        Passwords match
                      </p>
                    )}
                </div>

                <div className="flex gap-3 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={passwordLoading}
                    className="rounded-lg bg-blue px-6 py-2.5 text-custom-sm font-medium text-white hover:bg-blue-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {passwordLoading ? "Changing..." : "Change Password"}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordData({
                        currentPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                      });
                      setPasswordError(null);
                      setPasswordSuccess(null);
                    }}
                    className="rounded-lg border border-gray-3 px-6 py-2.5 text-custom-sm font-medium text-dark hover:bg-gray-1 transition"
                  >
                    Cancel
                  </motion.button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Security Settings */}
      {/* <div className="rounded-xl border border-gray-3 bg-white shadow-1">
        <div className="border-b border-gray-3 px-5 py-4">
          <h3 className="text-custom-lg font-semibold text-dark">
            Security Settings
          </h3>
          <p className="text-custom-xs text-body">
            Manage your password and security preferences
          </p>
        </div>

        <div className="p-5 space-y-5">
          <div className="rounded-lg border border-gray-3 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-custom-sm font-medium text-dark mb-1">
                  Password
                </p>
                <p className="text-custom-xs text-body">
                  Last changed 3 months ago
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-3 bg-white px-4 py-2 text-custom-sm font-medium text-dark hover:border-blue hover:text-blue transition"
              >
                Change Password
              </motion.button>
            </div>
          </div>

          <div className="rounded-lg border border-gray-3 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-custom-sm font-medium text-dark mb-1">
                  Two-Factor Authentication
                </p>
                <p className="text-custom-xs text-body">
                  Add an extra layer of security to your account
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 rounded-lg border border-blue bg-blue px-4 py-2 text-custom-sm font-medium text-white hover:bg-blue-dark transition"
              >
                Enable 2FA
              </motion.button>
            </div>
          </div>
        </div>
      </div> */}

      {/* Activity Log */}
      {/* <div className="rounded-xl border border-gray-3 bg-white shadow-1">
        <div className="border-b border-gray-3 px-5 py-4">
          <h3 className="text-custom-lg font-semibold text-dark">
            Recent Activity
          </h3>
          <p className="text-custom-xs text-body">
            Your recent login and account activities
          </p>
        </div>

        <div className="p-5">
          <div className="space-y-4">
            {[
              {
                action: "Logged in",
                device: "Chrome on Windows",
                location: "Colombo, Sri Lanka",
                time: "2 hours ago",
                icon: (
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M10 12C11.1046 12 12 11.1046 12 10C12 8.89543 11.1046 8 10 8C8.89543 8 8 8.89543 8 10C8 11.1046 8.89543 12 10 12Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                ),
              },
              {
                action: "Updated product",
                device: "Chrome on Windows",
                location: "Colombo, Sri Lanka",
                time: "5 hours ago",
                icon: (
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M14.1667 2.5L6.25 17.0833"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                ),
              },
              {
                action: "Changed settings",
                device: "Chrome on Windows",
                location: "Colombo, Sri Lanka",
                time: "1 day ago",
                icon: (
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M10 12C11.1046 12 12 11.1046 12 10C12 8.89543 11.1046 8 10 8C8.89543 8 8 8.89543 8 10C8 11.1046 8.89543 12 10 12Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                ),
              },
            ].map((activity, index) => (
              <div
                key={index}
                className="flex items-start gap-4 rounded-lg border border-gray-3 p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-light-5 text-blue flex-shrink-0">
                  {activity.icon}
                </div>
                <div className="flex-1">
                  <p className="text-custom-sm font-medium text-dark">
                    {activity.action}
                  </p>
                  <p className="text-custom-xs text-body">
                    {activity.device} • {activity.location}
                  </p>
                </div>
                <span className="text-custom-xs text-body whitespace-nowrap">
                  {activity.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div> */}
    </div>
  );
};

export default ProfileTab;
