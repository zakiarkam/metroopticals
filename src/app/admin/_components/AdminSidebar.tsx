"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  FolderTree,
  LayoutDashboard,
  Megaphone,
  Package,
  PanelsTopLeft,
  Star,
  Tags,
  ScrollText,
  Settings,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCachedSession } from "@/features/auth/hooks/use-cached-session";

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  superAdminOnly?: boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
        superAdminOnly: true,
      },
    ],
  },
  {
    title: "Catalogue",
    items: [
      {
        id: "products",
        label: "Products",
        href: "/admin/products",
        icon: Package,
      },
      {
        id: "categories",
        label: "Categories",
        href: "/admin/categories",
        icon: FolderTree,
      },
      { id: "brands", label: "Brands", href: "/admin/brands", icon: Tags },
    ],
  },
  {
    title: "Storefront",
    items: [
      {
        id: "storefront",
        label: "Site content",
        href: "/admin/storefront",
        icon: PanelsTopLeft,
      },
      {
        id: "advertisements",
        label: "Advertisements",
        href: "/admin/advertisements",
        icon: Megaphone,
      },
    ],
  },
  {
    title: "Commerce",
    items: [
      {
        id: "orders",
        label: "Orders",
        href: "/admin/orders",
        icon: ScrollText,
      },
      { id: "reviews", label: "Reviews", href: "/admin/reviews", icon: Star },
      { id: "users", label: "Users", href: "/admin/users", icon: Users },
    ],
  },
  {
    title: "Account",
    items: [
      {
        id: "profile",
        label: "Profile",
        href: "/admin/profile",
        icon: Settings,
      },
    ],
  },
];

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
  const [collapsed, setCollapsed] = React.useState(false);

  const role = (session?.user as any)?.role;

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => !item.superAdminOnly || role === "SUPER_ADMIN",
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 84 : 272 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className={`absolute left-0 top-0 z-50 flex h-screen flex-col border-r border-gray-3 bg-gray-2 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-linear`}
      >
        {/* ------------------------------ brand ------------------------------ */}
        <div className="flex h-[72px] items-center gap-2 border-b border-gray-3 px-4">
          <Link
            href="/admin"
            className={`flex min-w-0 items-center gap-2.5 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue text-[13px] font-bold text-white">
              MO
            </span>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.16 }}
                  className="min-w-0"
                >
                  <span className="block truncate text-[14px] font-bold leading-tight text-dark">
                    Metro Opticals
                  </span>
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-dark-5">
                    Admin
                  </span>
                </motion.span>
              )}
            </AnimatePresence>
          </Link>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
            className="ml-auto rounded-lg p-1.5 text-dark-4 transition-colors hover:bg-blue-light-5 hover:text-blue lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`hidden h-8 w-8 items-center justify-center rounded-lg text-dark-4 transition-colors hover:bg-blue-light-5 hover:text-blue lg:flex ${
              collapsed ? "mx-auto" : "ml-auto"
            }`}
          >
            <ChevronLeft
              className={`h-4 w-4 transition-transform duration-300 ${
                collapsed ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {/* ------------------------------- nav ------------------------------- */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.title} className="mb-5 last:mb-0">
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="mb-1.5 px-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-dark-5"
                  >
                    {group.title}
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  // `/admin` would otherwise light up on every child route.
                  const active =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      onClick={() => setSidebarOpen(false)}
                      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition-colors ${
                        active
                          ? "bg-blue text-white"
                          : "text-dark-3 hover:bg-blue-light-5 hover:text-blue"
                      } ${collapsed ? "justify-center px-0" : ""}`}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      <AnimatePresence initial={false}>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -6 }}
                            transition={{ duration: 0.16 }}
                            className="truncate"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </motion.aside>

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-dark/25 lg:hidden"
        />
      )}
    </>
  );
};

export default AdminSidebar;
