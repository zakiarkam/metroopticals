"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  FolderTree,
  LayoutDashboard,
  Glasses,
  Megaphone,
  Package,
  Boxes,
  Inbox,
  ScanLine,
  ReceiptText,
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
    // No heading  the dashboard stands on its own above the two worlds.
    title: "",
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
    title: "Shop counter",
    items: [
      { id: "pos", label: "POS", href: "/admin/pos", icon: ScanLine },
      {
        id: "pos-sales",
        label: "Counter sales",
        href: "/admin/pos/sales",
        icon: ReceiptText,
      },
      { id: "pos-stock", label: "Stock", href: "/admin/pos/stock", icon: Boxes },
    ],
  },
  {
    // Everything that shapes and serves the website, in one place.
    title: "Website",
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
      {
        // The lens price list. Super admin only: it is what the shop charges
        // for every pair of lenses it sells online.
        id: "lenses",
        label: "Lens pricing",
        href: "/admin/lenses",
        icon: Glasses,
        superAdminOnly: true,
      },
      {
        id: "orders",
        label: "Orders",
        href: "/admin/orders",
        icon: ScrollText,
      },
      { id: "users", label: "Users", href: "/admin/users", icon: Users },
    ],
  },
  {
    // What the shop says and hears: the site's words and artwork on one side,
    // what customers write back on the other.
    title: "Content",
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
      { id: "messages", label: "Messages", href: "/admin/messages", icon: Inbox },
      { id: "reviews", label: "Reviews", href: "/admin/reviews", icon: Star },
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
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className={`absolute left-0 top-0 z-50 flex h-screen flex-col border-r border-gray-3 bg-gray-2 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-linear`}
      >
        {/* ------------------------------ brand ------------------------------ */}
        <div
          className={`flex h-[72px] items-center gap-2 border-b border-gray-3 ${
            collapsed ? "justify-center px-2" : "px-3"
          }`}
        >
          <Link
            // Owners go to the dashboard; everyone else to the till, since
            // /admin would only bounce them there anyway.
            href={role === "SUPER_ADMIN" ? "/admin" : "/admin/pos"}
            className={`flex min-w-0 items-center gap-2.5 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue text-[12px] font-bold text-white">
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
                  <span className="block truncate text-[13px] font-bold leading-tight text-dark">
                    Metro Opticals
                  </span>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-dark-5">
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

          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              className="ml-auto hidden h-8 w-8 items-center justify-center rounded-lg text-dark-4 transition-colors hover:bg-blue-light-5 hover:text-blue lg:flex"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ------------------------------- nav ------------------------------- */}
        <nav
          // Still scrolls; the bar itself is hidden, which keeps the narrow
          // rail from losing width to it.
          className={`no-scrollbar flex-1 overflow-y-auto py-3 ${collapsed ? "px-2" : "px-2.5"}`}
        >
          {groups.map((group) => (
            <div
              key={group.title}
              className={`last:mb-0 last:border-0 last:pb-0 ${
                collapsed
                  ? "mb-2.5 border-b border-gray-3 pb-2.5"
                  : "mb-3"
              }`}
            >
              <AnimatePresence initial={false}>
                {!collapsed && group.title && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="mb-1 px-2.5 text-[9.5px] font-bold uppercase tracking-[0.16em] text-dark-5"
                  >
                    {group.title}
                  </motion.p>
                )}
              </AnimatePresence>

              <div className={`flex flex-col ${collapsed ? "gap-1.5" : "gap-px"}`}>
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
                      className={`group relative flex items-center rounded-lg font-semibold transition-colors ${
                        active
                          ? "bg-blue text-white shadow-1"
                          : "text-dark-3 hover:bg-blue-light-5 hover:text-blue"
                      } ${
                        collapsed
                          ? "mx-auto h-10 w-10 justify-center"
                          : "gap-2.5 px-2.5 py-[7px] text-[12.5px]"
                      }`}
                    >
                      <Icon
                        className={`shrink-0 ${collapsed ? "h-[19px] w-[19px]" : "h-4 w-4"} ${
                          active ? "" : "text-dark-5 group-hover:text-blue"
                        }`}
                      />
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

        {/* The expand control sits at the foot of the collapsed rail, where it
            has room to be a proper target. */}
        {collapsed && (
          <div className="hidden border-t border-gray-3 p-2 lg:block">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-dark-4 transition-colors hover:bg-blue-light-5 hover:text-blue"
            >
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </button>
          </div>
        )}
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
