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
import { Eye, Headset, Heart, Phone } from "lucide-react";
import { siteConfig } from "@/config/site";

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
          : "flex flex-wrap items-center justify-center gap-x-8 gap-y-1"
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
              aria-current={isActive ? "page" : undefined}
              className={`relative block whitespace-nowrap text-[13.5px] font-medium capitalize transition-colors ${
                vertical
                  ? `rounded-lg px-3 py-2.5 ${
                      isActive
                        ? "bg-blue/10 text-blue"
                        : "text-dark hover:bg-gray-8 hover:text-blue"
                    }`
                  : `py-3.5 ${isActive ? "text-blue" : "text-dark hover:text-blue"}`
              }`}
            >
              {item.label}
              {/* active underline, desktop row only */}
              {!vertical && isActive && (
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-blue"
                />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  </nav>
);

/**
 * Slim announcement strip above the header.
 *
 * Carries the two things that convert best on an optical storefront — the free
 * eye test and the phone number — without stealing room from the search bar.
 */
const AnnouncementBar = () => (
  <div className="hidden border-b border-gray-3 bg-gray-1 sm:block">
    <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-3 py-2 sm:px-4 lg:px-6">
      <p className="flex items-center gap-2 text-[11.5px] font-medium text-dark-4">
        <Eye className="h-3.5 w-3.5 text-blue" />
        Free eye test with every pair · Island-wide delivery in 2 days
      </p>

      <div className="flex items-center gap-5 text-[11.5px] font-medium">
        <a
          href={siteConfig.contact.phoneHref}
          className="flex items-center gap-1.5 text-dark-4 transition-colors hover:text-blue"
        >
          <Phone className="h-3.5 w-3.5" />
          {siteConfig.contact.phone}
        </a>
        <Link
          href="/faq"
          className="hidden text-dark-4 transition-colors hover:text-blue md:block"
        >
          Help
        </Link>
      </div>
    </div>
  </div>
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
      className={`fixed left-0 top-0 z-40 w-full border-b border-gray-3 bg-gray-2 transition-shadow duration-200 ${
        stickyMenu ? "shadow-3" : "shadow-none"
      }`}
    >
      {/* The announcement strip collapses away once the page is scrolled, so the
          sticky header stays compact without losing it on first paint. */}
      {!stickyMenu && <AnnouncementBar />}

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
