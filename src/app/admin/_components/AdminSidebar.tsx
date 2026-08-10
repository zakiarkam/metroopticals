"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCachedSession } from "@/features/auth/hooks/use-cached-session";

interface AdminSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  sidebarOpen,
  setSidebarOpen,
}) => {
  const pathname = usePathname();
  const { data: session } = useCachedSession();
  const [collapsed, setCollapsed] = React.useState<boolean>(false);

  const allMenuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 13V5.5C4 4.67157 4.67157 4 5.5 4H11"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M20 11V18.5C20 19.3284 19.3284 20 18.5 20H13"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M9 15V9L15 9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15 9L9 15"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      href: "/admin",
      superAdminOnly: true,
    },
    {
      id: "products",
      label: "Products",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 9L12 4L20 9V15L12 20L4 15V9Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M12 4V20"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M20 9L12 14L4 9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      ),
      href: "/admin/products",
    },
    {
      id: "categories",
      label: "Categories",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <rect
            x="4"
            y="4"
            width="6"
            height="6"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <rect
            x="14"
            y="4"
            width="6"
            height="6"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <rect
            x="4"
            y="14"
            width="6"
            height="6"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <rect
            x="14"
            y="14"
            width="6"
            height="6"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      ),
      href: "/admin/categories",
    },
    {
      id: "advertisements",
      label: "Advertisements",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <rect
            x="3"
            y="4"
            width="18"
            height="16"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M3 10H21"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M7 16H7.01"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M12 16H12.01"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M17 16H17.01"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
      href: "/admin/advertisements",
    },
    {
      id: "users",
      label: "Users",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M4 19C4.61305 16.0889 6.89249 14 9 14C11.1075 14 13.3869 16.0889 14 19"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M17 11C18.6569 11 20 9.65685 20 8C20 6.34315 18.6569 5 17 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M16 19C16.3333 17.3333 17.6 15 20 15"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
      href: "/admin/users",
    },
    {
      id: "orders",
      label: "Orders",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path
            d="M6 7H18"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M6 12H18"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M6 17H12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M8 4H16C17.1046 4 18 4.89543 18 6V20L12 17L6 20V6C6 4.89543 6.89543 4 8 4Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      ),
      href: "/admin/orders",
    },
    // {
    //   id: "revenue",
    //   label: "Revenue",
    //   icon: (
    //     <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
    //       <path
    //         d="M5 17L10 12L14 16L19 11"
    //         stroke="currentColor"
    //         strokeWidth="1.5"
    //         strokeLinecap="round"
    //         strokeLinejoin="round"
    //       />
    //       <path
    //         d="M19 7V11H15"
    //         stroke="currentColor"
    //         strokeWidth="1.5"
    //         strokeLinecap="round"
    //         strokeLinejoin="round"
    //       />
    //       <path
    //         d="M4 20H20"
    //         stroke="currentColor"
    //         strokeWidth="1.5"
    //         strokeLinecap="round"
    //       />
    //     </svg>
    //   ),
    //   href: "/admin/revenue",
    // },
    // {
    //   id: "settings",
    //   label: "Settings",
    //   icon: (
    //     <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
    //       <path
    //         d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
    //         stroke="currentColor"
    //         strokeWidth="1.5"
    //       />
    //       <path
    //         d="M19.4 15C19.5373 14.3609 19.6083 13.6994 19.6083 13.025C19.6083 12.3506 19.5373 11.6891 19.4 11.05L21.5 9.4L18.6 4.6L15.9 5.7C15.0692 5.18443 14.1693 4.79176 13.225 4.5375L12.75 2H7.25L6.775 4.5375C5.83071 4.79176 4.93084 5.18443 4.1 5.7L1.4 4.6L0 7.025L2.1 8.675C1.96268 9.31408 1.89168 9.97563 1.89168 10.65C1.89168 11.3244 1.96268 11.9859 2.1 12.625L0 14.275L2.9 19.075L5.6 17.975C6.43084 18.4906 7.33071 18.8832 8.275 19.1375L8.75 21.675H14.25L14.725 19.1375C15.6693 18.8832 16.5692 18.4906 17.4 17.975L20.1 19.075L23 14.275L19.4 15Z"
    //         stroke="currentColor"
    //         strokeWidth="1.5"
    //         strokeLinejoin="round"
    //       />
    //     </svg>
    //   ),
    //   href: "/admin/settings",
    // },
    {
      id: "profile",
      label: "Profile",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M19.4 15C19.5373 14.3609 19.6083 13.6994 19.6083 13.025C19.6083 12.3506 19.5373 11.6891 19.4 11.05L21.5 9.4L18.6 4.6L15.9 5.7C15.0692 5.18443 14.1693 4.79176 13.225 4.5375L12.75 2H7.25L6.775 4.5375C5.83071 4.79176 4.93084 5.18443 4.1 5.7L1.4 4.6L0 7.025L2.1 8.675C1.96268 9.31408 1.89168 9.97563 1.89168 10.65C1.89168 11.3244 1.96268 11.9859 2.1 12.625L0 14.275L2.9 19.075L5.6 17.975C6.43084 18.4906 7.33071 18.8832 8.275 19.1375L8.75 21.675H14.25L14.725 19.1375C15.6693 18.8832 16.5692 18.4906 17.4 17.975L20.1 19.075L23 14.275L19.4 15Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      ),
      href: "/admin/profile",
    },
  ];

  // Filter menu items based on user role
  const userRole = (session?.user as any)?.role;
  const menuItems = allMenuItems.filter((item) => {
    if (item.superAdminOnly) {
      return userRole === "SUPER_ADMIN";
    }
    return true;
  });

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 288 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`absolute left-0 top-0 z-50 flex h-screen flex-col overflow-y-hidden bg-white shadow-xl border-r border-gray-3 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-linear`}
      >
        <div className="flex items-center justify-between gap-2 px-6 py-5.5 lg:py-5 border-b border-gray-3">
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Link href="/admin" className="flex items-center gap-2">
                  <span className="text-lg font-bold text-dark whitespace-nowrap">
                    Metro Opticals Admin
                  </span>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setSidebarOpen(false)}
            className="block lg:hidden hover:bg-blue-50 hover:text-blue rounded-lg p-1 transition-all duration-200"
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <motion.button
            onClick={() => setCollapsed(!collapsed)}
            className={`hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-blue-50 hover:text-blue transition-all duration-200 ${
              collapsed ? "" : "ml-auto"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <motion.svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              animate={{ rotate: collapsed ? 0 : 180 }}
              transition={{ duration: 0.3 }}
            >
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          </motion.button>
        </div>

        <div className="flex flex-col flex-1 overflow-y-auto duration-300 ease-linear">
          <nav className="p-3 sm:p-5">
            <div className="flex flex-col gap-2">
              {menuItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-200 ${
                    pathname === item.href
                      ? "border-blue bg-blue text-white shadow-lg"
                      : "border-gray-3 bg-white text-dark-2 shadow-md hover:shadow-lg hover:border-blue hover:text-blue hover:bg-blue-50"
                  } ${collapsed ? "justify-center" : ""}`}
                  title={collapsed ? item.label : ""}
                >
                  <motion.span
                    className={collapsed ? "" : "flex-shrink-0"}
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {item.icon}
                  </motion.span>
                  <AnimatePresence mode="wait">
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="text-custom-sm font-medium whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              ))}
            </div>
          </nav>

          {/* <motion.div
            className="border-t border-gray-3 p-4 sm:p-6 bg-gray-1 mt-auto"
            layout
          >
            <AnimatePresence mode="wait">
              {!collapsed ? (
                <motion.div
                  key="expanded"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <h4 className="text-custom-lg font-semibold text-dark mb-2">
                    Automations
                  </h4>
                  <p className="text-custom-sm text-body mb-4">
                    Enable stock alerts, schedule promotions, and sync inventory
                    automatically.
                  </p>
                  <div className="flex flex-col gap-3">
                    <motion.label
                      className="flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow-1 cursor-pointer"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <span className="text-custom-sm text-dark">
                        Low inventory alerts
                      </span>
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-blue cursor-pointer"
                        defaultChecked
                      />
                    </motion.label>
                    <motion.label
                      className="flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow-1 cursor-pointer"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <span className="text-custom-sm text-dark">
                        Auto publish reviews
                      </span>
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-blue cursor-pointer"
                      />
                    </motion.label>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="collapsed"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-3"
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full flex items-center justify-center rounded-lg bg-white px-3 py-3 shadow-1 hover:bg-gray-2 transition-colors"
                    title="Automations"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div> */}
        </div>
      </motion.aside>

      {sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
        />
      )}
    </>
  );
};

export default AdminSidebar;
