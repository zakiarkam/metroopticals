"use client";

import React from "react";

type SectionKey = "account" | "orders";

type AccountSidebarProps = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
  memberSince: string;
  activeSection: SectionKey;
  onSectionClick: (section: SectionKey) => void;
};

const getInitials = (name?: string | null) => {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const sectionItems: {
  key: SectionKey;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "account",
    label: "My Account",
    icon: (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    key: "orders",
    label: "My Orders",
    icon: (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
];

const AccountSidebar = React.memo(function AccountSidebar({
  name,
  email,
  role,
  memberSince,
  activeSection,
  onSectionClick,
}: AccountSidebarProps) {
  const roleLabel =
    role === "SUPER_ADMIN"
      ? "Super Admin"
      : role === "ADMIN"
        ? "Admin"
        : "Customer";

  return (
    <div className="w-full xl:w-[360px]">
      <div className="overflow-hidden rounded-2xl bg-white shadow-1">
        <div className="space-y-3 border-b border-gray-3 px-6 py-6 sm:px-7">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue text-lg font-semibold uppercase text-white">
              {getInitials(name)}
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold text-dark line-clamp-1">
                {name || "User"}
              </p>
              <p className="text-sm text-body line-clamp-1">
                {email || "Not provided"}
              </p>
              <p className="text-xs text-dark-2">Member since {memberSince}</p>
            </div>
          </div>
        </div>
        <div className="space-y-3 px-6 py-6 sm:px-7">
          {sectionItems.map((section) => {
            const isActive = activeSection === section.key;
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => onSectionClick(section.key)}
                className={[
                  "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold transition",
                  isActive
                    ? "bg-blue text-white"
                    : "bg-gray-1 text-dark-2 hover:border-blue hover:text-blue",
                  "border border-transparent",
                ].join(" ")}
              >
                <span
                  className={[
                    "inline-flex h-6 w-6 items-center justify-center rounded-lg  ",
                    isActive ? "btext-white" : "text-dark-2",
                  ].join(" ")}
                >
                  {section.icon}
                </span>
                {section.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

AccountSidebar.displayName = "AccountSidebar";

export default AccountSidebar;
