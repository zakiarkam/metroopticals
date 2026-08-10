"use client";
import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { signOut } from "next-auth/react";
import { clearUserSession } from "@/lib/sessionStorage";
import { useCachedSession } from "@/features/auth/hooks/use-cached-session";

interface AdminHeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
  sidebarOpen,
  setSidebarOpen,
}) => {
  const { data: session, status, cachedUser } = useCachedSession();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      clearUserSession();
      // Sign out with NextAuth
      await signOut({
        callbackUrl: "/log-in",
        redirect: true,
      });
    } catch (error) {
      console.error("Logout error:", error);
      // Force redirect even if signOut fails
      window.location.href = "/log-in";
    }
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

  // Use NextAuth session as source of truth
  const user = session?.user ?? (status === "loading" ? cachedUser : null);

  return (
    <header
      className={`sticky top-0 z-40 flex w-full bg-white border-b transition-all duration-300 ${
        scrolled
          ? "border-gray-3 shadow-lg bg-gradient-to-b from-white to-gray-50"
          : "border-gray-3 shadow-md"
      }`}
    >
      <div className="flex flex-grow items-center justify-between px-4 py-4 md:px-6 2xl:px-11">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="block rounded-lg border border-gray-3 bg-white p-1.5 shadow-md hover:shadow-lg hover:border-blue hover:bg-blue-50 transition-all duration-200 lg:hidden"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 6H20"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M4 12H20"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M4 18H20"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-3 bg-white px-4 py-2 text-custom-sm font-medium text-dark shadow-md hover:shadow-lg hover:border-blue hover:text-blue hover:bg-blue-50 transition-all duration-200"
              target="_blank"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 22V12H15V22"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="hidden sm:inline">View Store</span>
            </Link>
          </motion.div>

          {/* <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-3 hover:bg-gray-2 transition-colors"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red text-white text-xs font-semibold"
            >
              3
            </motion.span>
          </motion.button> */}

          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-blue text-white font-semibold shadow-md hover:shadow-lg hover:bg-blue-dark transition-all duration-200"
            >
              {getInitials(user?.name)}
            </motion.button>

            <AnimatePresence>
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-12 z-50 w-56 rounded-lg border border-gray-3 bg-white shadow-xl overflow-hidden"
                  >
                    <div className="border-b border-gray-3 px-4 py-3">
                      <p className="text-custom-sm font-medium text-dark">
                        {user?.name || "Admin User"}
                      </p>
                      <p className="text-custom-xs text-body">{user?.email}</p>
                      <div className="mt-1">
                        <span
                          className={`inline-flex items-center rounded-full py-0.5 text-[11px] font-medium ${
                            (user as any)?.role === "SUPER_ADMIN"
                              ? "bg-purple-100 text-purple-700"
                              : (user as any)?.role === "ADMIN"
                                ? " text-blue"
                                : " text-green"
                          }`}
                        >
                          {(user as any)?.role === "SUPER_ADMIN"
                            ? "Super Admin"
                            : (user as any)?.role}
                        </span>
                      </div>
                    </div>
                    <div className="py-2">
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 px-4 py-2 text-custom-sm text-dark hover:bg-blue-50 hover:text-blue transition-all duration-200"
                      >
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M16 17L21 12L16 7"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M21 12H9"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Sign out
                      </button>
                    </div>
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
