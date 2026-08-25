"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { clearUserSession } from "@/lib/sessionStorage";
import { useCachedSession } from "@/features/auth/hooks/use-cached-session";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Loader2,
  LogOut,
  Pencil,
} from "lucide-react";
import SiteContainer from "@/components/common/SiteContainer";
import PageHero from "@/components/common/PageHero";
import InlineSpinner from "@/components/common/InlineSpinner";
import { useDispatch } from "react-redux";
import { api } from "@/store/services/api";
import { userApi } from "@/features/users/api/user-api";
import {
  CUSTOMER_TYPE_LABELS,
  type CustomerType,
} from "@/features/users/types/user";
import AccountSidebar from "./AccountSidebar";
import { inputClasses } from "@/components/common/form";

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
        customerType:
          (response.data as any).customerType ?? editForm.customerType,
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
            ]),
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
    // No join date is better than today's date  the old fallback told a brand
    // new visitor they had been a member since this morning.
    const createdAt = (session?.user as any)?.createdAt;
    if (!createdAt) return undefined;
    return new Date(createdAt).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }, [session?.user]);

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

  /** Read-only field tile. */
  const detailTile = (
    label: string,
    value?: string | null,
    hint?: string,
    span = false,
  ) => (
    <div
      key={label}
      className={`rounded-xl border border-gray-3 bg-gray-1 px-4 py-3.5 ${
        span ? "sm:col-span-2" : ""
      }`}
    >
      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-dark-5">
        {label}
      </p>
      <p className="mt-1.5 break-words text-[14px] font-semibold text-dark">
        {value || <span className="font-normal text-dark-5">Not provided</span>}
      </p>
      {hint && <p className="mt-1 text-[11px] text-dark-5">{hint}</p>}
    </div>
  );

  return (
    <>
      <PageHero
        eyebrow="Your account"
        title={fullName || "My account"}
        description="Keep your contact and delivery details up to date so orders reach you without a phone call."
        crumbs={[{ label: "My account" }]}
        actions={
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-3 px-5 text-[13px] font-semibold text-dark transition-colors hover:border-red hover:text-red"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        }
      />

      <section className="bg-gray-1 py-10 lg:py-14">
        <SiteContainer>
          <div className="flex flex-col gap-6 xl:flex-row xl:gap-8">
            <AccountSidebar
              name={fullName}
              email={email}
              role={role}
              memberSince={memberSince}
              activeSection="account"
            />

            {/* RIGHT CONTENT */}
            <div className="min-w-0 flex-1">
              <div
                className="overflow-hidden rounded-2xl border border-gray-3 bg-gray-2 shadow-2"
                role="tabpanel"
                id="panel-account"
                aria-labelledby="tab-account"
              >
                <div className="flex items-center justify-between gap-4 border-b border-gray-3 px-5 py-4 sm:px-6">
                  <div>
                    <h2 className="text-[15px] font-bold text-dark">
                      Account details
                    </h2>
                    <p className="mt-0.5 text-[12.5px] text-dark-5">
                      Your personal and delivery information
                    </p>
                  </div>
                  {!isEditingDetails && (
                    <button
                      type="button"
                      onClick={handleEditClick}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-3 px-4 text-[13px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                  )}
                </div>

                <div className="p-5 sm:p-6">
                  {saveSuccess && (
                    <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-green/30 bg-green/10 px-4 py-3.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green" />
                      <p className="text-[13px] font-semibold text-green">
                        Profile updated successfully.
                      </p>
                    </div>
                  )}

                  {!isEditingDetails ? (
                    <div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {detailTile("Full name", profile?.name || fullName)}
                        {detailTile(
                          "Email address",
                          email,
                          "Email cannot be changed",
                        )}
                        {detailTile("Phone number", profile?.phone)}
                        {detailTile(
                          "Customer type",
                          CUSTOMER_TYPE_LABELS[
                            profile?.customerType || "END_USER"
                          ],
                        )}
                        {detailTile("City", profile?.city)}
                        {detailTile("Postal code", profile?.postalCode)}
                        {detailTile(
                          "Address",
                          profile?.address,
                          undefined,
                          true,
                        )}
                        {detailTile(
                          "Country",
                          profile?.country,
                          undefined,
                          true,
                        )}
                      </div>

                      {profileError && (
                        <p className="mt-4 text-[13px] text-red" role="alert">
                          {profileError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handleSaveDetails} className="space-y-4">
                      {saveError && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-red/30 bg-red/10 px-4 py-3.5">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red" />
                          <p className="text-[13px] text-red">{saveError}</p>
                        </div>
                      )}

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="edit-firstname"
                            className="mb-2 block text-[12.5px] font-semibold text-dark"
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
                            className={inputClasses}
                            required
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="edit-lastname"
                            className="mb-2 block text-[12.5px] font-semibold text-dark"
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
                            className={inputClasses}
                            required
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="edit-email"
                            className="mb-2 block text-[12.5px] font-semibold text-dark"
                          >
                            Email Address
                          </label>
                          <input
                            id="edit-email"
                            type="email"
                            value={editForm.email}
                            disabled
                            className="h-11 w-full cursor-not-allowed rounded-xl border border-gray-3 bg-gray-8 px-4 text-[14px] text-dark-5"
                          />
                          <p className="mt-1.5 text-[11px] text-dark-5">
                            Email cannot be changed
                          </p>
                        </div>

                        <div>
                          <label
                            htmlFor="edit-phone"
                            className="mb-2 block text-[12.5px] font-semibold text-dark"
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
                            className={inputClasses}
                            required
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="edit-customer-type"
                            className="mb-2 block text-[12.5px] font-semibold text-dark"
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
                            className={inputClasses}
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
                            className="mb-2 block text-[12.5px] font-semibold text-dark"
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
                            className={inputClasses}
                            required
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="edit-address"
                            className="mb-2 block text-[12.5px] font-semibold text-dark"
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
                            className={inputClasses}
                            required
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="edit-postal"
                            className="mb-2 block text-[12.5px] font-semibold text-dark"
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
                            className={inputClasses}
                            required
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label
                            htmlFor="edit-country"
                            className="mb-2 block text-[12.5px] font-semibold text-dark"
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
                            className={inputClasses}
                            required
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue px-7 text-[13px] font-bold text-white transition-colors hover:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Saving…
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4" />
                              Save changes
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-3 px-7 text-[13px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </SiteContainer>
      </section>
    </>
  );
}
