"use client";

import React from "react";
import Link from "next/link";
import { Heart, Package, User } from "lucide-react";

type SectionKey = "account" | "orders";

type AccountSidebarProps = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
  /** Omitted when the account has no join date on record. */
  memberSince?: string;
  activeSection: SectionKey;
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

/**
 * These are navigation, so they are links.
 *
 * They used to be `<button>`s whose handlers called `router.push`  no href
 * meant no middle-click, no "open in new tab", no prefetch, and an
 * `aria-current="page"` on an element that is not a link.
 */
const sectionItems: {
  key: SectionKey;
  label: string;
  href: string;
  icon: React.ElementType;
}[] = [
  { key: "account", label: "Account details", href: "/my-account", icon: User },
  {
    key: "orders",
    label: "My orders",
    href: "/my-account/orders",
    icon: Package,
  },
];

const AccountSidebar = React.memo(function AccountSidebar({
  name,
  email,
  role,
  memberSince,
  activeSection,
}: AccountSidebarProps) {
  const roleLabel =
    role === "SUPER_ADMIN"
      ? "Super admin"
      : role === "ADMIN"
        ? "Admin"
        : "Customer";

  return (
    <div className="w-full xl:w-[330px] xl:shrink-0">
      <div
        className="overflow-hidden rounded-2xl border border-gray-3 bg-gray-2 shadow-2 xl:sticky"
        style={{ top: "calc(var(--site-header-height, 132px) + 1.5rem)" }}
      >
        {/* -------------------------- identity -------------------------- */}
        <div className="relative overflow-hidden border-b border-gray-3 px-6 py-7">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(90% 100% at 100% 0%, rgba(192,156,108,0.14) 0%, transparent 60%)",
            }}
          />

          <div className="relative flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-blue text-[17px] font-bold uppercase text-white">
              {getInitials(name)}
            </span>
            <div className="min-w-0">
              <p className="line-clamp-1 text-[15.5px] font-bold text-dark">
                {name || "User"}
              </p>
              <p className="mt-0.5 line-clamp-1 break-all text-[12.5px] text-body">
                {email || "Not provided"}
              </p>
              {/* Role reads as a quiet caption under the email  a coloured
                  word, not a badge. */}
              <p className="mt-1 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-blue">
                {roleLabel}
                {memberSince && (
                  <span className="ml-2 font-medium normal-case tracking-normal text-dark-5">
                    · Since {memberSince}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* --------------------------- nav --------------------------- */}
        <nav className="p-3">
          <ul className="space-y-1">
            {sectionItems.map(({ key, label, href, icon: Icon }) => {
              const isActive = activeSection === key;
              return (
                <li key={key}>
                  <Link
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[13.5px] font-semibold transition-colors ${
                      isActive
                        ? "bg-blue text-white"
                        : "text-dark hover:bg-gray-8 hover:text-blue"
                    }`}
                  >
                    <Icon className="h-[17px] w-[17px]" />
                    {label}
                  </Link>
                </li>
              );
            })}

            <li>
              <Link
                href="/wishlist"
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[13.5px] font-semibold text-dark transition-colors hover:bg-gray-8 hover:text-blue"
              >
                <Heart className="h-[17px] w-[17px]" />
                Wishlist
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
});

AccountSidebar.displayName = "AccountSidebar";

export default AccountSidebar;
