"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { clearUserSession } from "@/lib/sessionStorage";
import { useCachedSession } from "@/features/auth/hooks/use-cached-session";
import SiteContainer from "@/components/common/SiteContainer";
import InlineSpinner from "@/components/common/InlineSpinner";
import { useDispatch } from "react-redux";
import { api } from "@/store/services/api";
import { userApi } from "@/features/users/api/user-api";
import { CUSTOMER_TYPE_LABELS, type CustomerType } from "@/features/users/types/user";
import AccountSidebar from "./AccountSidebar";

const CUSTOMER_TYPE_OPTIONS: { value: CustomerType; label: string }[] = [
  { value: "END_USER", label: "End User" },
  { value: "WHOLESALER", label: "Whole Seller" },
  { value: "RESELLER", label: "Reseller" },
  { value: "INSTALLER", label: "Installer" },
  { value: "PROJECTS", label: "Projects" },
  { value: "COMPANY", label: "Company" },
];

type UserProfile = {
  id: number;
  name: string;
  email: string;
  customerType?: CustomerType | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  postalCode?: string | null;
};

export default function MyAccount() {
  const { data: session, status, update } = useCachedSession();
  const router = useRouter();
  const dispatch = useDispatch();

  // ✅ avoid SSR mismatch: wait for client mount
  const [mounted, setMounted] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Edit mode state
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    customerType: "END_USER" as CustomerType,
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      clearUserSession();
      await signOut({ callbackUrl: "/" });
    } catch {
      window.location.href = "/";
    }
  }, []);

  // ✅ redirect only when mounted + unauthenticated
  useEffect(() => {
    if (!mounted) return;

    if (status === "unauthenticated") {
      router.replace("/log-in?redirect=/my-account");
    }
  }, [mounted, status, router]);

  useEffect(() => {
    const user = session?.user as any;
    if (!user?.id) return;

    setProfile({
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      customerType: user.customerType || "END_USER",
      phone: user.phone || "",
      address: user.address || "",
      city: user.city || "",
      postalCode: user.postalCode || "",
      country: user.country || "",
    });

    const nameParts = (user.name || "").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    setEditForm({
      firstName,
      lastName,
      email: user.email || "",
      customerType: user.customerType || "END_USER",
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
      setEditForm({
        firstName,
        lastName,
        email: profile.email || "",
        customerType: profile.customerType || "END_USER",
        phone: profile.phone || "",
        address: profile.address || "",
        city: profile.city || "",
        postalCode: profile.postalCode || "",
        country: profile.country || "",
      });
    }
    setIsEditingDetails(true);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleCancelEdit = () => {
    setIsEditingDetails(false);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const response = await userApi.updateProfile({
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        customerType: editForm.customerType,
        phone: editForm.phone,
        address: editForm.address,
        city: editForm.city,
        country: editForm.country,
        postalCode: editForm.postalCode,
      });

      setProfile(response.data);
      const updatedUser = {
        id: response.data.id || session?.user?.id,
        name: response.data.name ?? session?.user?.name ?? null,
        email: response.data.email ?? session?.user?.email ?? null,
        role: (session?.user as any)?.role ?? "CUSTOMER",
        customerType: (response.data as any).customerType ?? editForm.customerType,
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
      setIsEditingDetails(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      setSaveError(error.message || "Could not save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const userForUI = profile ?? session?.user;
  const isReady = mounted && status === "authenticated" && !!userForUI;

  const memberSince = useMemo(() => {
    // if you have createdAt on session.user, use it; else show month/year now
    const d = (session?.user as any)?.createdAt
      ? new Date((session?.user as any).createdAt)
      : new Date();
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }, [session?.user]);

  const handleSidebarSelect = useCallback(
    (section: "account" | "orders") => {
      if (section === "orders") {
        router.push("/my-account/orders");
      }
    },
    [router]
  );

  if (!isReady) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <InlineSpinner size={34} />
      </div>
    );
  }

  const fullName = userForUI?.name || "";
  const email = userForUI?.email || "";
  const role = (session?.user as any)?.role || "CUSTOMER";

  return (
    <div>
      <section className="bg-gray-2 py-6 sm:py-8">
        <SiteContainer>
          <div className="flex flex-col gap-6 xl:flex-row">
            <AccountSidebar
              name={fullName}
              email={email}
              role={role}
              memberSince={memberSince}
              activeSection="account"
              onSectionClick={handleSidebarSelect}
            />

            {/* RIGHT CONTENT */}
            <div className="flex-1 min-w-0">
              <div
                className="bg-white rounded-xl shadow-1 p-5 sm:p-6"
                role="tabpanel"
                id="panel-account"
                aria-labelledby="tab-account"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-dark font-semibold text-lg">
                      Account Details
                    </h2>
                    <p className="text-custom-xs text-body mt-0.5">
                      Manage your personal information
                    </p>
                  </div>
                  {!isEditingDetails && (
                    <button
                      type="button"
                      onClick={handleEditClick}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-3 bg-white text-dark transition hover:border-blue hover:text-blue"
                      aria-label="Edit details"
                      title="Edit details"
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                      </svg>
                    </button>
                  )}
                </div>

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

                {!isEditingDetails ? (
                  <div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-gray-1 p-3 border border-gray-3">
                        <p className="text-custom-xs text-body mb-1">
                          Full Name
                        </p>
                        <p className="font-semibold text-dark">
                          {profile?.name || fullName}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-1 p-3 border border-gray-3">
                        <p className="text-custom-xs text-body mb-0.5">
                          Email Address
                        </p>
                        <p className="font-semibold text-dark break-all">
                          {email}
                        </p>
                        <p className="text-[10px] text-body mt-0.5">
                          Email cannot be changed
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-1 p-3 border border-gray-3">
                        <p className="text-custom-xs text-body mb-0.5">
                          Phone Number
                        </p>
                        <p className="font-semibold text-dark">
                          {profile?.phone || "Not provided"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-1 p-3 border border-gray-3">
                        <p className="text-custom-xs text-body mb-0.5">
                          Customer Type
                        </p>
                        <p className="font-semibold text-dark">
                          {CUSTOMER_TYPE_LABELS[profile?.customerType || "END_USER"]}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-1 p-3 border border-gray-3">
                        <p className="text-custom-xs text-body mb-0.5">City</p>
                        <p className="font-semibold text-dark">
                          {profile?.city || "Not provided"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-1 p-3 border border-gray-3">
                        <p className="text-custom-xs text-body mb-0.5">
                          Address
                        </p>
                        <p className="font-semibold text-dark">
                          {profile?.address || "Not provided"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-1 p-3 border border-gray-3">
                        <p className="text-custom-xs text-body mb-0.5">
                          Postal Code
                        </p>
                        <p className="font-semibold text-dark">
                          {profile?.postalCode || "Not provided"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-1 p-3 border border-gray-3 sm:col-span-2">
                        <p className="text-custom-xs text-body mb-0.5">
                          Country
                        </p>
                        <p className="font-semibold text-dark">
                          {profile?.country || "Not provided"}
                        </p>
                      </div>
                    </div>

                    {profileError && (
                      <p className="text-sm text-red" role="alert">
                        {profileError}
                      </p>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSaveDetails} className="space-y-4">
                    {saveError && (
                      <div className="rounded-xl bg-red-light-6 border border-red p-3">
                        <p className="text-sm text-red">{saveError}</p>
                      </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="edit-firstname"
                          className="block mb-2 text-sm font-medium text-dark"
                        >
                          First Name
                        </label>
                        <input
                          id="edit-firstname"
                          type="text"
                          value={editForm.firstName}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              firstName: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-gray-3 bg-white px-4 py-2.5 text-dark outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                          required
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="edit-lastname"
                          className="block mb-2 text-sm font-medium text-dark"
                        >
                          Last Name
                        </label>
                        <input
                          id="edit-lastname"
                          type="text"
                          value={editForm.lastName}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              lastName: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-gray-3 bg-white px-4 py-2.5 text-dark outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                          required
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="edit-email"
                          className="block mb-2 text-sm font-medium text-dark"
                        >
                          Email Address
                        </label>
                        <input
                          id="edit-email"
                          type="email"
                          value={editForm.email}
                          disabled
                          className="w-full rounded-xl border border-gray-3 bg-gray-1 px-4 py-2.5 text-dark-2 cursor-not-allowed"
                        />
                        <p className="text-[11px] text-body mt-1">
                          Email cannot be changed
                        </p>
                      </div>

                      <div>
                        <label
                          htmlFor="edit-phone"
                          className="block mb-2 text-sm font-medium text-dark"
                        >
                          Phone Number
                        </label>
                        <input
                          id="edit-phone"
                          type="tel"
                          value={editForm.phone}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              phone: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-gray-3 bg-white px-4 py-2.5 text-dark outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                          required
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="edit-customer-type"
                          className="block mb-2 text-sm font-medium text-dark"
                        >
                          Customer Type
                        </label>
                        <select
                          id="edit-customer-type"
                          value={editForm.customerType}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              customerType: e.target.value as CustomerType,
                            })
                          }
                          className="w-full rounded-xl border border-gray-3 bg-white px-4 py-2.5 text-dark outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                        >
                          {CUSTOMER_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="edit-city"
                          className="block mb-2 text-sm font-medium text-dark"
                        >
                          City
                        </label>
                        <input
                          id="edit-city"
                          type="text"
                          value={editForm.city}
                          onChange={(e) =>
                            setEditForm({ ...editForm, city: e.target.value })
                          }
                          className="w-full rounded-xl border border-gray-3 bg-white px-4 py-2.5 text-dark outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                          required
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="edit-address"
                          className="block mb-2 text-sm font-medium text-dark"
                        >
                          Address
                        </label>
                        <input
                          id="edit-address"
                          type="text"
                          value={editForm.address}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              address: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-gray-3 bg-white px-4 py-2.5 text-dark outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                          required
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="edit-postal"
                          className="block mb-2 text-sm font-medium text-dark"
                        >
                          Postal Code
                        </label>
                        <input
                          id="edit-postal"
                          type="text"
                          value={editForm.postalCode}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              postalCode: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-gray-3 bg-white px-4 py-2.5 text-dark outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                          required
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label
                          htmlFor="edit-country"
                          className="block mb-2 text-sm font-medium text-dark"
                        >
                          Country
                        </label>
                        <input
                          id="edit-country"
                          type="text"
                          value={editForm.country}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              country: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-gray-3 bg-white px-4 py-2.5 text-dark outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 rounded-full bg-blue px-6 py-3 text-sm font-semibold text-white hover:bg-blue-dark disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSaving ? (
                          <>
                            <svg
                              className="animate-spin h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                            Saving...
                          </>
                        ) : (
                          <>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              aria-hidden="true"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Save Changes
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 rounded-full border border-gray-3 px-6 py-3 text-sm font-semibold text-dark hover:border-blue hover:text-blue disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </SiteContainer>
      </section>
    </div>
  );
}
