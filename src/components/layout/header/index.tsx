"use client";

import { signOut } from "next-auth/react";
import { clearUserSession } from "@/lib/sessionStorage";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Headset, Heart } from "lucide-react";
import MegaMenu, {
  EMPTY_CATALOGUE,
  type NavCatalogue,
  type NavItem,
} from "@/features/site-content/components/site/MegaMenu";

import AccountMenu from "./AccountMenu";
import CartButton from "./CartButton";
import Logo from "./Logo";
import MobileNav from "./MobileNav";
import SearchBar from "./SearchBar";

import { useCartModalContext } from "@/app/context/CartSidebarModalContext";
import { useAppSelector } from "@/store/store";

/* ----------------------------- hooks ----------------------------- */

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

/* ----------------------------- UI bits ----------------------------- */

function IconMenu({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"}
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const Container = ({ children }: { children: React.ReactNode }) => (
  <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-5 lg:px-8">
    {children}
  </div>
);

/* ----------------------------- Header ---------------------------- */

export default function Header({
  megaNav = [],
  catalogue = EMPTY_CATALOGUE,
}: {
  megaNav?: NavItem[];
  catalogue?: NavCatalogue;
}) {
  const headerRef = useRef<HTMLDivElement | null>(null);
  useHeaderHeightCssVar(headerRef);

  const stickyMenu = useSticky(80);
  const [navigationOpen, setNavigationOpen] = useState(false);
  useLockBodyScroll(navigationOpen);

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Mirror the active query so a shared /shop-with-sidebar?search=… link
  // shows what it is filtered by, and the box empties when leaving the shop.
  const activeSearch = searchParams.get("search") ?? "";
  const [searchQuery, setSearchQuery] = useState(activeSearch);
  useEffect(() => setSearchQuery(activeSearch), [activeSearch, pathname]);
  const [selectedCategory, setSelectedCategory] = useState("0");

  const { openCartModal } = useCartModalContext();
  const product = useAppSelector((state) => state.cartReducer.items);

  useEffect(() => setNavigationOpen(false), [pathname]);

  // Keep the search box in step with the URL the shop is currently showing.
  const queryKey = searchParams.toString();
  useEffect(() => {
    const nextCat = searchParams.get("category") || "0";
    const nextSearch = searchParams.get("search") || "";

    setSelectedCategory((prev) => (prev === nextCat ? prev : nextCat));
    setSearchQuery((prev) => (prev === nextSearch ? prev : nextSearch));
  }, [queryKey, searchParams]);

  /** A fresh install with no saved navigation still needs a usable menu. */
  const navItems = useMemo<NavItem[]>(
    () =>
      megaNav.length
        ? megaNav
        : [
            // A fresh install with no categories and no saved menu yet.
            { label: "Shop", href: "/shop-with-sidebar" },
            { label: "Lenses", href: "/lenses" },
            { label: "Offers", href: "/shop-with-sidebar?onSale=true", accent: true },
            { label: "Eye test", href: "/contact", badge: "Book" },
          ],
    [megaNav]
  );

  const handleSearchSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== "0")
        params.set("category", selectedCategory);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      const qs = params.toString();
      router.push(`/shop-with-sidebar${qs ? `?${qs}` : ""}`);
    },
    [router, searchQuery, selectedCategory]
  );

  const handleLogout = useCallback(async () => {
    clearUserSession();
    await signOut({ callbackUrl: "/log-in" });
  }, []);

  const iconButton =
    "inline-flex h-10 w-10 items-center justify-center rounded-full text-dark transition-colors hover:bg-blue-light-5 hover:text-blue";

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b border-gray-3 bg-gray-2 transition-shadow duration-200 ${
        stickyMenu ? "shadow-3" : "shadow-none"
      }`}
    >
      <div ref={headerRef} className="relative z-40 bg-gray-2">
      <Container>
        <div
          className={`flex items-center gap-4 transition-[padding] ${
            stickyMenu ? "py-2" : "py-3"
          }`}
        >
          {/* Mobile menu toggle sits first so the logo stays optically centred */}
          <button
            aria-label="Toggle navigation"
            aria-expanded={navigationOpen}
            className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-lg text-dark transition-colors hover:text-blue lg:hidden"
            onClick={() => setNavigationOpen((s) => !s)}
          >
            <IconMenu open={navigationOpen} />
          </button>

          <Logo />

          <div className="hidden min-w-0 flex-1 lg:block">
            <div className="mx-auto max-w-[560px]">
              <SearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSubmit={handleSearchSubmit}
              />
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
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
          </div>
        </div>

        {/* Search moves to its own row below the logo on small screens. */}
        <div className="pb-3 lg:hidden">
          <SearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSubmit={handleSearchSubmit}
          />
        </div>
      </Container>

      <MegaMenu items={navItems} catalogue={catalogue} />
      </div>

      {navigationOpen && (
        <>
          <div
            className="fixed inset-x-0 bottom-0 z-30 bg-dark/20 lg:hidden"
            style={{ top: "var(--site-header-height)" }}
            onClick={() => setNavigationOpen(false)}
          />
          <div className="relative z-40 border-t border-gray-3 bg-gray-2 shadow-lg lg:hidden">
            <Container>
              <MobileNav
                items={navItems}
                catalogue={catalogue}
                onNavigate={() => setNavigationOpen(false)}
              />
            </Container>
          </div>
        </>
      )}
    </header>
  );
}
