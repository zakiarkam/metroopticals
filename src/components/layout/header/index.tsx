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
import { useSelector } from "react-redux";

import AccountMenu from "./AccountMenu";
import CartButton from "./CartButton";
import Dropdown from "./Dropdown";
import Logo from "./Logo";
import { menuData } from "./menuData";
import SearchBar from "./SearchBar";
import SupportBlock from "./SupportBlock";

import { useCartModalContext } from "@/app/context/CartSidebarModalContext";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { selectTotalPrice } from "@/store/features/cart-slice";
import { useAppSelector } from "@/store/store";

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
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  ) : (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
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

const NavLinks = ({
  sticky,
  pathname,
  onNavigate,
}: {
  sticky: boolean;
  pathname: string;
  onNavigate?: () => void;
}) => (
  <nav>
    <ul className="flex flex-wrap items-center  justify-self-center gap-5">
      {menuData.map((menuItem, i) =>
        menuItem.submenu ? (
          <Dropdown key={i} menuItem={menuItem} stickyMenu={sticky} />
        ) : (
          <li
            key={i}
            className={`group relative ${
              pathname === menuItem.path
                ? "before:w-full"
                : "before:w-0 hover:before:w-full"
            } before:h-[3px] before:bg-blue before:absolute before:left-0 before:-top-2 before:rounded-b-[3px] before:ease-out before:duration-200`}
          >
            <Link
              href={menuItem.path}
              onClick={onNavigate}
              className={`hover:text-blue text-sm font-medium text-dark flex transition-colors ${
                sticky ? "xl:py-3" : "xl:py-4"
              } ${pathname === menuItem.path ? "text-blue" : ""}`}
            >
              {menuItem.title}
            </Link>
          </li>
        )
      )}
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
  const totalPrice = useSelector(selectTotalPrice);

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

  const options = useMemo(() => {
    return [
      { label: "All Categories", value: "0" },
      ...(categories || [])
        .filter((c) => !c.parentId)
        .map((c) => ({ label: c.name, value: c.slug })),
    ];
  }, [categories]);

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

  return (
    <header
      ref={headerRef}
      className={`fixed left-0 top-0 w-full z-40 bg-white transition-all duration-200 shadow-sm ${
        stickyMenu ? "shadow-md" : ""
      }`}
    >
      <Container>
        {/* TOP ROW */}
        <div
          className={`flex flex-col gap-3 lg:gap-4 ${stickyMenu ? "py-3 sm:py-4" : "py-4 sm:py-5"}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full">
              <Logo />

              {/* Desktop search */}
              <div className="hidden lg:block w-full max-w-[820px]">
                <SearchBar
                  options={options}
                  selectedCategory={selectedCategory}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onSubmit={handleSearchSubmit}
                  onCategorySelect={(v) => navigateToShop(v, searchQuery)}
                />
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-3">
              <AccountMenu onLogout={handleLogout} />

              <CartButton
                count={product.length}
                totalPrice={totalPrice}
                onOpen={openCartModal}
              />

              {/* Mobile menu toggle */}
              <button
                aria-label="Toggle navigation"
                className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                onClick={() => setNavigationOpen((s) => !s)}
              >
                <IconMenu open={navigationOpen} />
              </button>
            </div>
          </div>

          {/* Mobile search */}
          <div className="lg:hidden">
            <SearchBar
              options={options}
              selectedCategory={selectedCategory}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSubmit={handleSearchSubmit}
              onCategorySelect={(v) => navigateToShop(v, searchQuery)}
            />
          </div>
        </div>
      </Container>

      {/* NAV ROW */}
      <div className="border-t border-gray-200">
        <Container>
          <div className="flex items-center justify-between md:py-2">
            <div className="hidden md:block">
              <NavLinks sticky={stickyMenu} pathname={pathname} />
            </div>
            <SupportBlock />
          </div>
        </Container>
      </div>

      {/* Mobile navigation */}
      {navigationOpen && (
        <>
          <div
            className="fixed  left-0 right-0 bottom-0 z-30"
            style={{ top: "var(--site-header-height)" }}
            onClick={() => setNavigationOpen(false)}
          />
          <div className="md:hidden  border-t border-gray-200 bg-white shadow-sm relative z-40">
            <Container>
              <div className="py-6">
                <NavLinks
                  sticky={stickyMenu}
                  pathname={pathname}
                  onNavigate={() => setNavigationOpen(false)}
                />
              </div>
            </Container>
          </div>
        </>
      )}
    </header>
  );
}
