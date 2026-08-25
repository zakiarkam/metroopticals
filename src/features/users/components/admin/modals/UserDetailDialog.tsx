"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getUserById } from "@/features/users/api/user-api";
import { User } from "@/features/users/types/user";
import { Toast } from "@/lib/utils/toast";
import { X } from "lucide-react";

type UserDetailDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: number | null;
};

const UserDetailDialog: React.FC<UserDetailDialogProps> = ({
  isOpen,
  onClose,
  userId,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const loadUser = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);

    try {
      const data = await getUserById(userId);
      setUser(data);
    } catch (err: any) {
      console.error("Failed to load user:", err);

      Toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load user details"
      );

      onCloseRef.current();
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen && userId) loadUser();
  }, [isOpen, userId, loadUser]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const rolePill = useMemo(() => {
    return (role: string) => {
      if (role === "SUPER_ADMIN") {
        return "bg-purple-100 text-purple-700";
      }
      return role === "ADMIN"
        ? "bg-blue-light-5 text-blue"
        : "bg-green-light-6 text-green";
    };
  }, []);

  const initials = useMemo(() => {
    const name = user?.name?.trim() || "";
    if (!name) return "U";
    return name
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [user?.name]);

  const Field = ({
    label,
    value,
  }: {
    label: string;
    value: React.ReactNode;
  }) => (
    <div className="space-y-1">
      <p className="text-[11px] text-body uppercase tracking-wide">{label}</p>
      <div className="text-xs md:text-sm text-dark font-medium leading-snug">
        {value}
      </div>
    </div>
  );

  const Section = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <section className="rounded-xl border border-gray-3 bg-gray-2 shadow-sm">
      <div className="px-3 py-2 md:px-4 md:py-3 border-b border-gray-2">
        <h4 className="text-sm md:text-base font-semibold text-dark">
          {title}
        </h4>
      </div>
      <div className="px-3 py-2 md:px-4 md:py-3">{children}</div>
    </section>
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header (compact, sticky) */}
        <DialogHeader className="sticky top-0 z-10 bg-gray-2 border-b border-gray-3">
          <div className="flex items-start md:items-center justify-between gap-3 px-3 py-2 md:px-4 md:py-3">
            <div className="min-w-0">
              <DialogTitle className="text-base md:text-lg font-semibold leading-tight">
                User Details
              </DialogTitle>
              <DialogDescription className="text-xs md:text-sm text-body">
                View detailed information about this user
              </DialogDescription>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9 shrink-0 rounded-lg"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-3 py-2 md:px-4 md:py-3">
          {isLoading ? (
            <div className="text-center py-14">
              <div className="inline-block h-9 w-9 animate-spin rounded-full border-4 border-solid border-blue border-r-transparent" />
              <p className="mt-3 text-xs md:text-sm text-body">
                Loading user details...
              </p>
            </div>
          ) : user ? (
            <div className="space-y-4">
              {/* Compact header card */}
              <div className="rounded-xl border border-gray-3 bg-gray-2 shadow-sm px-3 py-2 md:px-4 md:py-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-full bg-blue text-white font-semibold text-base md:text-lg shrink-0"
                      aria-hidden="true"
                    >
                      {initials}
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-sm md:text-base font-semibold text-dark leading-snug truncate">
                        {user.name}
                      </h3>
                      <p className="text-xs md:text-sm text-body truncate">
                        {user.email}
                      </p>

                      <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
                        <span
                          className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${rolePill(
                            user.role
                          )}`}
                        >
                          {user.role}
                        </span>

                        {/* Optional helper chip(s) for UX */}
                        {user.phone ? (
                          <span className="inline-flex w-fit rounded-full bg-gray-1 px-2.5 py-1 text-[11px] font-medium text-body">
                            Phone on file
                          </span>
                        ) : (
                          <span className="inline-flex w-fit rounded-full bg-gray-1 px-2.5 py-1 text-[11px] font-medium text-body">
                            No phone
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sections */}
              <Section title="Basic Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <Field label="Full Name" value={user.name} />
                  <Field label="Email Address" value={user.email} />
                  <Field
                    label="Phone Number"
                    value={user.phone || "Not provided"}
                  />
                  <Field label="Role" value={user.role} />
                </div>
              </Section>

              <Section title="Address Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div className="md:col-span-2">
                    <Field
                      label="Street Address"
                      value={user.address || "Not provided"}
                    />
                  </div>
                  <Field label="City" value={user.city || "Not provided"} />
                  <Field
                    label="Country"
                    value={user.country || "Not provided"}
                  />
                  <Field
                    label="Postal Code"
                    value={user.postalCode || "Not provided"}
                  />
                </div>
              </Section>

              <Section title="Account Information">
                <div className="grid grid-cols-1 gap-3">
                  <Field
                    label="Member Since"
                    value={formatDate(user.createdAt)}
                  />
                </div>
              </Section>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailDialog;
