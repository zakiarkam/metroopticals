"use client";

import { signOut } from "next-auth/react";
import { clearUserSession } from "@/lib/sessionStorage";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Headset, Heart } from "lucide-react";

import AccountMenu from "./AccountMenu";
import CartButton from "./CartButton";
import Logo from "./Logo";
import SearchBar from "./SearchBar";

import { useCartModalContext } from "@/app/context/CartSidebarModalContext";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { useAppSelector } from "@/store/store";

/** Nav entries are limited so the row never wraps awkwardly on laptops. */
const MAX_NAV_CATEGORIES = 7;

/* ----------------------------- utils ----------------------------- */

function useHeaderHeightCssVar(headerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const setVar = () => {
      const h = el.offsetHeight || 0;
      document.documentElement.style.setProperty(
        "--site-header-height",
        `${h}px`
      );
    };

    setVar();
    const ro = new ResizeObserver(setVar);
    ro.observe(el);
    window.addEventListener("resize", setVar);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", setVar);
    };
  }, [headerRef]);
}

function useSticky(threshold = 80) {
  const [sticky, setSticky] = useState(false);
  const stickyRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        const next = window.scrollY >= threshold;
        if (next !== stickyRef.current) {
          stickyRef.current = next;
          setSticky(next);
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("scroll", onScroll);
    };
  }, [threshold]);

  return sticky;
}

function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

/* ----------------------------- icons ----------------------------- */

function IconMenu({ open }: { open: boolean }) {
  return open ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ----------------------------- UI bits ----------------------------- */

const Container = ({ children }: { children: React.ReactNode }) => (
  <div className="mx-auto w-full max-w-[1600px] px-3 sm:px-4 lg:px-6">
    {children}
  </div>
);

type NavItem = { label: string; href: string };

const NavLinks = ({
  items,
  pathname,
  currentCategory,
  onNavigate,
  vertical = false,
}: {
  items: NavItem[];
  pathname: string;
  currentCategory: string;
  onNavigate?: () => void;
  vertical?: boolean;
}) => (
  <nav aria-label="Product categories">
    <ul
      className={
        vertical
          ? "flex flex-col gap-1"
          : "flex flex-wrap items-center justify-center gap-x-7 gap-y-2"
      }
    >
      {items.map((item) => {
        // A category is active when its slug matches the current ?category=.
        const slug = item.href.split("category=")[1];
        const isActive = slug
          ? currentCategory === slug
          : pathname === item.href.split("?")[0];

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={`block whitespace-nowrap text-sm font-medium transition-colors ${
                vertical ? "rounded-lg px-3 py-2 hover:bg-gray-8" : "py-3"
              } ${
                isActive
                  ? "text-blue"
                  : "text-dark hover:text-blue"
              }`}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  </nav>
);

/* ----------------------------- Header ---------------------------- */

export default function Header() {
  const headerRef = useRef<HTMLElement | null>(null);
  useHeaderHeightCssVar(headerRef);

  const stickyMenu = useSticky(80);
  const [navigationOpen, setNavigationOpen] = useState(false);
  useLockBodyScroll(navigationOpen);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("0");

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const { openCartModal } = useCartModalContext();
  const { categories } = useCategories();

  const product = useAppSelector((state) => state.cartReducer.items);

  // ✅ Close mobile nav on route change
  useEffect(() => setNavigationOpen(false), [pathname]);

  // ✅ Sync search state with URL (stable dependency)
  const queryKey = searchParams.toString();
  useEffect(() => {
    const nextCat = searchParams.get("category") || "0";
    const nextSearch = searchParams.get("search") || "";

    setSelectedCategory((prev) => (prev === nextCat ? prev : nextCat));
    setSearchQuery((prev) => (prev === nextSearch ? prev : nextSearch));
  }, [queryKey, searchParams]);

  /** Top-level categories only — brands would overflow the nav row. */
  const topLevelCategories = useMemo(
    () => (categories || []).filter((c) => !c.parentId),
    [categories]
  );

  // "Shop" lands on the filterable listing; each category deep-links into the
  // listing that reads ?category= so the filter is applied on arrival.
  const navItems = useMemo<NavItem[]>(
    () => [
      { label: "Shop", href: "/shop-with-sidebar" },
      ...topLevelCategories.slice(0, MAX_NAV_CATEGORIES).map((c) => ({
        label: c.name,
        href: `/shop-without-sidebar?category=${encodeURIComponent(c.slug)}`,
      })),
    ],
    [topLevelCategories]
  );

  const navigateToShop = useCallback(
    (categoryValue?: string, query?: string) => {
      const params = new URLSearchParams();
      if (categoryValue && categoryValue !== "0")
        params.set("category", categoryValue);
      if (query && query.trim()) params.set("search", query.trim());

      const qs = params.toString();
      router.push(`/shop-without-sidebar${qs ? `?${qs}` : ""}`);
    },
    [router]
  );

  const handleSearchSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      navigateToShop(selectedCategory, searchQuery);
    },
    [navigateToShop, selectedCategory, searchQuery]
  );

  const handleLogout = useCallback(async () => {
    clearUserSession();
    await signOut({ callbackUrl: "/log-in" });
  }, []);

  const iconButton =
    "inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-3 text-dark transition-colors hover:border-blue hover:text-blue";

  return (
    <header
      ref={headerRef}
      className={`fixed left-0 top-0 w-full z-40 bg-gray-2 transition-all duration-200 ${
        stickyMenu ? "shadow-lg" : "shadow-sm"
      }`}
    >
      <Container>
        {/* MAIN ROW */}
        <div
          className={`flex flex-col gap-3 lg:gap-4 ${
            stickyMenu ? "py-3" : "py-4"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <Logo />

              {/* Desktop search */}
              <div className="hidden lg:block w-full max-w-[820px]">
                <SearchBar
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onSubmit={handleSearchSubmit}
                />
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <AccountMenu onLogout={handleLogout} />

              <Link
                href="/contact"
                className={`hidden sm:inline-flex ${iconButton}`}
                aria-label="Contact us"
                title="Contact us"
              >
                <Headset className="h-5 w-5" />
              </Link>

              <Link
                href="/wishlist"
                className={`hidden sm:inline-flex ${iconButton}`}
                aria-label="Wishlist"
                title="Wishlist"
              >
                <Heart className="h-5 w-5" />
              </Link>

              <CartButton count={product.length} onOpen={openCartModal} />

              {/* Mobile menu toggle */}
              <button
                aria-label="Toggle navigation"
                aria-expanded={navigationOpen}
                className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-3 text-dark hover:border-blue hover:text-blue transition-colors"
                onClick={() => setNavigationOpen((s) => !s)}
              >
                <IconMenu open={navigationOpen} />
              </button>
            </div>
          </div>

          {/* Mobile search */}
          <div className="lg:hidden">
            <SearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSubmit={handleSearchSubmit}
            />
          </div>
        </div>
      </Container>

      {/* CATEGORY NAV ROW */}
      <div className="hidden md:block border-t border-gray-3">
        <Container>
          <NavLinks
            items={navItems}
            pathname={pathname}
            currentCategory={selectedCategory}
          />
        </Container>
      </div>

      {/* Mobile navigation */}
      {navigationOpen && (
        <>
          <div
            className="fixed left-0 right-0 bottom-0 z-30"
            style={{ top: "var(--site-header-height)" }}
            onClick={() => setNavigationOpen(false)}
          />
          <div className="md:hidden border-t border-gray-3 bg-gray-2 shadow-lg relative z-40">
            <Container>
              <div className="py-4">
                <NavLinks
                  items={navItems}
                  pathname={pathname}
                  currentCategory={selectedCategory}
                  onNavigate={() => setNavigationOpen(false)}
                  vertical
                />

                <div className="mt-3 flex items-center gap-2 border-t border-gray-3 pt-3">
                  <Link
                    href="/contact"
                    onClick={() => setNavigationOpen(false)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-3 py-2.5 text-sm font-medium text-dark hover:border-blue hover:text-blue transition-colors"
                  >
                    <Headset className="h-4 w-4" />
                    Contact
                  </Link>
                  <Link
                    href="/wishlist"
                    onClick={() => setNavigationOpen(false)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-3 py-2.5 text-sm font-medium text-dark hover:border-blue hover:text-blue transition-colors"
                  >
                    <Heart className="h-4 w-4" />
                    Wishlist
                  </Link>
                </div>
              </div>
            </Container>
          </div>
        </>
      )}
    </header>
  );
}
