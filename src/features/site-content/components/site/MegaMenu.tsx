"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { getAdvertisementImageUrl, getBrandLogoUrl } from "@/lib/storageUtils";

export type NavLink = {
  label?: string;
  href?: string;
  accent?: boolean;
  /** Set on catalogue-sourced brand rows so the panel can draw the mark. */
  logo?: string | null;
};

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

export type NavCatalogueRow = {
  label: string;
  value: string;
  logo?: string | null;
};

export type NavCatalogue = {
  brands: NavCatalogueRow[];
  shapes: NavCatalogueRow[];
  genders: NavCatalogueRow[];
};

const EMPTY_CATALOGUE: NavCatalogue = { brands: [], shapes: [], genders: [] };

/** Which query parameter each catalogue source filters on. */
const SOURCE_PARAM: Record<Exclude<NavSource, "">, keyof NavCatalogue> = {
  brands: "brands",
  shapes: "shapes",
  genders: "genders",
};

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
          logo: row.logo ?? null,
        })),
      };
    })
    .filter((column) => (column.links ?? []).length > 0);
}

const hasPanel = (item: NavItem, catalogue: NavCatalogue) =>
  resolveColumns(item, catalogue).length > 0;

/* ------------------------------------------------------- the brands panel */

function BrandColumn({
  column,
  onNavigate,
  shopAllHref,
}: {
  column: NavColumn;
  onNavigate: () => void;
  shopAllHref?: string;
}) {
  const links = column.links ?? [];

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-dark-5">
          {column.title || "Brands"}
        </p>
        {shopAllHref && (
          <Link
            href={shopAllHref}
            onClick={onNavigate}
            className="text-[12px] font-bold text-blue underline-offset-2 hover:underline"
          >
            View all
          </Link>
        )}
      </div>

      {/* Fixed-width tiles rather than a stretching grid: a shop with three
          brands would otherwise draw three tiles the width of the panel. */}
      <ul className="flex flex-wrap gap-3">
        {links.map((link, index) => {
          const logo = getBrandLogoUrl(link.logo);

          return (
            <li key={index}>
              <Link
                href={link.href || "#"}
                onClick={onNavigate}
                title={link.label}
                className="group/brand flex h-[104px] w-[168px] flex-col items-center justify-center rounded-xl border border-gray-3 bg-gray-1 px-3 py-3 transition-all hover:-translate-y-0.5 hover:border-blue/40 hover:shadow-2"
              >
                {logo ? (
                  <>
                    <span className="relative flex h-11 w-full items-center justify-center overflow-hidden">
                      <Image
                        src={logo}
                        alt={link.label || ""}
                        fill
                        sizes="168px"
                        unoptimized={logo.endsWith(".svg")}
                        className="object-contain"
                      />
                    </span>
                    <span className="mt-2.5 block w-full truncate text-center text-[12.5px] font-semibold text-dark-2 transition-colors group-hover/brand:text-blue">
                      {link.label}
                    </span>
                  </>
                ) : (
                  // No logo uploaded: the name set as a wordmark is the tile.
                  <span className="text-center text-[13px] font-bold uppercase leading-snug tracking-[0.08em] text-dark transition-colors group-hover/brand:text-blue">
                    {link.label}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------- the panel */

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
        {columns.map((column, index) =>
          column.source === "brands" ? (
            <BrandColumn
              key={index}
              column={column}
              onNavigate={onNavigate}
              shopAllHref={item.href}
            />
          ) : (
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
          ),
        )}
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

  // Close on navigation  otherwise the panel hangs over the new page.
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
    [],
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
