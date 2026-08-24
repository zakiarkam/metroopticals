"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { getAdvertisementImageUrl } from "@/lib/storageUtils";

/**
 * Primary navigation with drop-down panels.
 *
 * Labels and link columns come from the `header.nav` content block, so
 * merchandising changes never require a deploy. Two panels fill themselves
 * from the catalogue instead: `source: "brands"` lists the live Brand table
 * and `source: "shapes"` lists the frame shapes the shop filters on. Both
 * deep-link into `/shop-with-sidebar` with the matching filter applied, which
 * keeps one set of facets rather than a hand-maintained copy in the menu.
 *
 * Opening is hover-with-intent on pointer devices and click on touch, and the
 * panel closes on Escape or on route change. A pure-CSS `group-hover` version
 * was simpler but stayed stuck open after navigating on touch devices.
 */

export type NavLink = { label?: string; href?: string; accent?: boolean };

/** Columns that fill themselves from catalogue data rather than content. */
export type NavSource = "" | "brands" | "shapes" | "genders";

export type NavColumn = {
  title?: string;
  source?: NavSource;
  links?: NavLink[];
};

export type NavItem = {
  label?: string;
  href?: string;
  accent?: boolean;
  badge?: string;
  columns?: NavColumn[];
  promoImage?: string;
  promoTitle?: string;
  promoCopy?: string;
  promoCtaLabel?: string;
  promoCtaHref?: string;
};

/** Live catalogue rows the menu can render without another round trip. */
export type NavCatalogue = {
  brands: { label: string; value: string }[];
  shapes: { label: string; value: string }[];
  genders: { label: string; value: string }[];
};

const EMPTY_CATALOGUE: NavCatalogue = { brands: [], shapes: [], genders: [] };

/** Which query parameter each catalogue source filters on. */
const SOURCE_PARAM: Record<Exclude<NavSource, "">, keyof NavCatalogue> = {
  brands: "brands",
  shapes: "shapes",
  genders: "genders",
};

/**
 * The link columns a panel will actually draw.
 *
 * A column either lists authored links or fills itself from the catalogue.
 * Catalogue columns only ever contain values that have stock behind them, so
 * the menu cannot offer a filter that lands on an empty grid — "Kids" and
 * "Browline" both used to do exactly that.
 */
function resolveColumns(item: NavItem, catalogue: NavCatalogue): NavColumn[] {
  return (item.columns ?? [])
    .map((column) => {
      if (!column.source) return column;

      const key = SOURCE_PARAM[column.source];
      const rows = catalogue[key] ?? [];

      return {
        ...column,
        links: rows.map((row) => ({
          label: row.label,
          href: `/shop-with-sidebar?${key}=${encodeURIComponent(row.value)}`,
        })),
      };
    })
    .filter((column) => (column.links ?? []).length > 0);
}

const hasPanel = (item: NavItem, catalogue: NavCatalogue) =>
  resolveColumns(item, catalogue).length > 0;

/* -------------------------------------------------------------- the panel */

/**
 * A single drop-down.
 *
 * Columns are capped at 220px and the promo at a fixed 280px so a panel with
 * one column looks the same weight as a panel with three — the previous
 * `minmax(0,1fr)` filler stretched a lone column across the viewport.
 */
function Panel({
  item,
  catalogue,
  onNavigate,
}: {
  item: NavItem;
  catalogue: NavCatalogue;
  onNavigate: () => void;
}) {
  const columns = resolveColumns(item, catalogue);
  const promo = getAdvertisementImageUrl(item.promoImage);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] items-start gap-10 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex min-w-0 flex-1 flex-wrap gap-x-12 gap-y-7">
        {columns.map((column, index) => (
          <div key={index} className="min-w-[168px]">
            {column.title && (
              <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-dark-5">
                {column.title}
              </p>
            )}
            <ul className="space-y-2">
              {(column.links ?? []).map((link, linkIndex) => (
                <li key={linkIndex}>
                  <Link
                    href={link.href || "#"}
                    onClick={onNavigate}
                    className={`text-[14px] font-medium transition-colors hover:text-blue ${
                      link.accent ? "text-red" : "text-dark-2"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {promo && (
        <Link
          href={item.promoCtaHref || item.href || "#"}
          onClick={onNavigate}
          className="group/promo hidden w-[280px] shrink-0 overflow-hidden rounded-xl border border-gray-3 bg-gray-1 xl:block"
        >
          <span className="relative block aspect-[16/9]">
            <Image
              src={promo}
              alt={item.promoTitle || ""}
              fill
              sizes="280px"
              unoptimized={promo.endsWith(".svg")}
              className="object-cover transition-transform duration-500 group-hover/promo:scale-105"
            />
          </span>

          {(item.promoTitle || item.promoCtaLabel) && (
            <span className="block px-4 py-3.5">
              {item.promoTitle && (
                <span className="block text-[14px] font-bold leading-snug text-dark">
                  {item.promoTitle}
                </span>
              )}
              {item.promoCopy && (
                <span className="mt-1 block text-[12.5px] leading-relaxed text-dark-4">
                  {item.promoCopy}
                </span>
              )}
              {item.promoCtaLabel && (
                <span className="mt-2 inline-block text-[12.5px] font-bold text-blue underline-offset-2 group-hover/promo:underline">
                  {item.promoCtaLabel}
                </span>
              )}
            </span>
          )}
        </Link>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- the bar */

export default function MegaMenu({
  items,
  catalogue = EMPTY_CATALOGUE,
}: {
  items: NavItem[];
  catalogue?: NavCatalogue;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const pathname = usePathname();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = () => setOpenIndex(null);

  // Close on navigation — otherwise the panel hangs over the new page.
  useEffect(close, [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    []
  );

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  // A short grace period lets the pointer cross the gap between the trigger
  // and the panel without the menu snapping shut underneath it.
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(close, 140);
  };

  if (!items.length) return null;

  return (
    <nav
      aria-label="Main"
      className="relative hidden border-t border-gray-3 bg-gray-2 lg:block"
      onMouseLeave={scheduleClose}
    >
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-center px-4 sm:px-6 lg:px-8">
        {items.map((item, index) => {
          const expandable = hasPanel(item, catalogue);
          const open = openIndex === index;

          return (
            <div
              key={index}
              onMouseEnter={() => {
                cancelClose();
                setOpenIndex(expandable ? index : null);
              }}
            >
              <Link
                href={item.href || "#"}
                onClick={close}
                aria-expanded={expandable ? open : undefined}
                className={`relative flex items-center gap-1.5 px-5 py-3.5 text-[14px] font-semibold transition-colors ${
                  item.accent ? "text-red" : "text-dark"
                } hover:text-blue`}
              >
                {item.label}

                {item.badge && (
                  <span className="rounded-full bg-blue-light-4 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-blue-dark">
                    {item.badge}
                  </span>
                )}

                {expandable && (
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                )}

                <span
                  aria-hidden
                  className={`absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-blue transition-opacity ${
                    open ? "opacity-100" : "opacity-0"
                  }`}
                />
              </Link>
            </div>
          );
        })}
      </div>

      {openIndex !== null && hasPanel(items[openIndex], catalogue) && (
        <div
          onMouseEnter={cancelClose}
          className="absolute inset-x-0 top-full z-50 border-t border-gray-3 bg-gray-2 shadow-[0_24px_48px_-24px_rgba(27,23,19,0.35)]"
        >
          <Panel
            item={items[openIndex]}
            catalogue={catalogue}
            onNavigate={close}
          />
        </div>
      )}
    </nav>
  );
}

/** Shared with the mobile drawer so both menus expand the same panels. */
export { resolveColumns, hasPanel, EMPTY_CATALOGUE };
