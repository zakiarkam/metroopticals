"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { signOut } from "next-auth/react";
import { ExternalLink, LogOut, Menu } from "lucide-react";
import { clearUserSession } from "@/lib/sessionStorage";
import { useCachedSession } from "@/features/auth/hooks/use-cached-session";

/**
 * Admin top bar.
 *
 * Carries the current section name, because with the sidebar collapsed (or on
 * mobile, where it is hidden entirely) nothing else on the page said where you
 * were.
 */

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/admin": {
    title: "Dashboard",
    subtitle: "Revenue, orders and stock at a glance",
  },
  "/admin/products": {
    title: "Products",
    subtitle: "Frames, lenses and everything in the catalogue",
  },
  "/admin/categories": {
    title: "Categories",
    subtitle: "How the catalogue is organised on the storefront",
  },
  "/admin/brands": {
    title: "Brands",
    subtitle: "Designer labels stocked in the catalogue",
  },
  "/admin/reviews": {
    title: "Reviews",
    subtitle: "Approve or reject customer reviews",
  },
  "/admin/storefront": {
    title: "Site content",
    subtitle: "Headlines, menus and banners across the storefront",
  },
  "/admin/advertisements": {
    title: "Advertisements",
    subtitle: "Banner artwork and campaigns across the site",
  },
  "/admin/orders": { title: "Orders", subtitle: "Fulfilment and order status" },
  "/admin/users": { title: "Users", subtitle: "Customer and staff accounts" },
  "/admin/profile": { title: "Profile", subtitle: "Your account settings" },
};

const resolveTitle = (pathname: string) => {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];

  // Deep routes (e.g. /admin/orders/12) inherit their section's heading.
  const match = Object.keys(PAGE_TITLES)
    .filter((key) => key !== "/admin" && pathname.startsWith(key))
    .sort((a, b) => b.length - a.length)[0];

  return match ? PAGE_TITLES[match] : { title: "Admin", subtitle: "" };
};

const initials = (name?: string | null) =>
  name
    ? name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "AD";

interface AdminHeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
  sidebarOpen,
  setSidebarOpen,
}) => {
  const pathname = usePathname();
  const { data: session, status, cachedUser } = useCachedSession();
  const [showMenu, setShowMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const user = session?.user ?? (status === "loading" ? cachedUser : null);
  const role = (user as any)?.role;
  const page = resolveTitle(pathname);

  const handleLogout = async () => {
    try {
      clearUserSession();
      await signOut({ callbackUrl: "/log-in", redirect: true });
    } catch {
      // Never strand the admin in a half-signed-out state.
      window.location.href = "/log-in";
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b border-gray-3 bg-gray-2/95 backdrop-blur transition-shadow ${
        scrolled ? "shadow-2" : ""
      }`}
    >
      <div className="flex h-[72px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
          className="rounded-lg border border-gray-3 p-2 text-dark-3 transition-colors hover:border-blue hover:text-blue lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-bold leading-tight text-dark">
            {page.title}
          </h1>
          {page.subtitle && (
            <p className="hidden truncate text-[12.5px] text-dark-4 sm:block">
              {page.subtitle}
            </p>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            target="_blank"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-3 px-3 text-[13px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue sm:px-4"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="hidden sm:inline">View store</span>
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu((open) => !open)}
              aria-label="Account menu"
              className="grid h-10 w-10 place-items-center rounded-full bg-blue text-[13px] font-bold text-white transition-colors hover:bg-blue-dark"
            >
              {initials(user?.name)}
            </button>

            <AnimatePresence>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-2xl border border-gray-3 bg-gray-2 shadow-3"
                  >
                    <div className="border-b border-gray-3 px-4 py-3.5">
                      <p className="truncate text-[13.5px] font-semibold text-dark">
                        {user?.name || "Admin user"}
                      </p>
                      <p className="truncate text-[12px] text-dark-4">
                        {user?.email}
                      </p>
                      {role && (
                        <span className="mt-2 inline-flex rounded-full border border-blue/25 bg-blue-light-5 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-blue">
                          {role === "SUPER_ADMIN" ? "Super admin" : role}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-3 text-[13.5px] font-semibold text-dark transition-colors hover:bg-blue-light-5 hover:text-blue"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
