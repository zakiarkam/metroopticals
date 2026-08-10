"use client";

import { useCachedSession } from "@/features/auth/hooks/use-cached-session";
import Link from "next/link";
import { memo, useEffect, useRef, useState } from "react";

const getInitials = (name?: string | null) => {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

interface AccountMenuProps {
  onLogout: () => void;
}

const AccountMenu = memo(function AccountMenu({ onLogout }: AccountMenuProps) {
  const {
    data: session,
    status,
    cachedUser,
  } = useCachedSession({
    required: false,
  });
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showUserMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserMenu]);

  // Use cached session data
  const user = session?.user ?? cachedUser;
  const isAuthenticated =
    status === "authenticated" || (status === "loading" && !!cachedUser);

  // Loading state or not yet mounted
  if (!isClient || status === "loading") {
    return (
      <div className="flex h-9 w-9 animate-pulse items-center justify-center rounded-full bg-gray-200 aspect-square" />
    );
  }

  // Not authenticated - Login button
  if (!isAuthenticated || !user) {
    return (
      <Link
        href="/log-in"
        className="group flex items-center gap-2.5 transition-all hover:opacity-80"
        aria-label="Login"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue/10 group-hover:bg-blue/20 transition-colors aspect-square shrink-0">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3C50E0"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>

        <div className="hidden sm:block">
          <span className="block text-2xs text-dark-4 uppercase group-hover:text-blue transition-colors">
            account
          </span>
          <p className="font-medium text-custom-sm text-dark group-hover:text-blue transition-colors">
            Log In
          </p>
        </div>
      </Link>
    );
  }

  const userRole = (user as any)?.role;

  // Authenticated - User menu
  return (
    <div ref={menuRef} className="relative z-50">
      <button
        onClick={() => setShowUserMenu((s) => !s)}
        className="group flex items-center gap-2 transition-all hover:opacity-90"
        aria-label="Open account menu"
        aria-expanded={showUserMenu}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue text-white font-semibold text-sm transition-all group-hover:bg-blue-dark group-hover:shadow-md aspect-square shrink-0">
          {getInitials(user.name)}
        </div>
        <div className="hidden sm:block text-left">
          <span className="block text-2xs text-dark-4 uppercase group-hover:text-blue transition-colors">
            Welcome
          </span>
          <p className="font-medium text-custom-sm text-dark line-clamp-1 max-w-[140px] group-hover:text-blue transition-colors">
            {user.name}
          </p>
        </div>
      </button>

      {showUserMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowUserMenu(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 top-full  sm:mr-0 z-50 w-64 max-w-[calc(100vw-16px)] rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden ">
            {/* User Info */}
            <div className="border-b border-gray-200 px-4 py-3">
              <p className="text-custom-sm font-medium text-dark">
                {user.name}
              </p>
              <p className="text-custom-xs text-body break-all">{user.email}</p>

              {(userRole === "ADMIN" || userRole === "SUPER_ADMIN") && (
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center rounded-full py-0.5 text-[11px] font-medium ${
                      userRole === "SUPER_ADMIN"
                        ? " text-purple-700"
                        : " text-blue"
                    }`}
                  >
                    {userRole === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
                  </span>
                </div>
              )}
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <Link
                href="/my-account"
                className="block px-4 py-2 text-sm text-dark hover:bg-gray-50 transition-colors"
                onClick={() => setShowUserMenu(false)}
              >
                My Account
              </Link>
              <Link
                href="/wishlist"
                className="block px-4 py-2 text-sm text-dark hover:bg-gray-50 transition-colors"
                onClick={() => setShowUserMenu(false)}
              >
                Wishlist
              </Link>

              {(userRole === "ADMIN" || userRole === "SUPER_ADMIN") && (
                <Link
                  href={userRole === "SUPER_ADMIN" ? "/admin" : "/admin/users"}
                  className="block px-4 py-2 text-sm text-dark hover:bg-gray-50 transition-colors"
                  onClick={() => setShowUserMenu(false)}
                >
                  Admin Panel
                </Link>
              )}
            </div>

            {/* Logout */}
            <div className="border-t border-gray-200 p-2">
              <button
                onClick={onLogout}
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red hover:bg-red-50 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export default AccountMenu;
