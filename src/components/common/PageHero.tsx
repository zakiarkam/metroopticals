import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import SiteContainer from "./SiteContainer";

export type Crumb = { label: string; href?: string };

/**
 * Header band for every inner customer page (cart, wishlist, contact, …).
 *
 * Replaces the old `<Breadcrumb />`, which hard-coded a large top padding to
 * clear the fixed header. The site layout now offsets content with the
 * `--site-header-height` variable, so this component only owns its own design.
 */
export default function PageHero({
  title,
  description,
  crumbs = [],
  eyebrow,
  actions,
}: {
  title: string;
  description?: string;
  crumbs?: Crumb[];
  eyebrow?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="relative overflow-hidden border-b border-gray-3 bg-gray-2">
      {/* faint gold wash so the band separates from the page without a hard fill */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(120% 140% at 88% -30%, rgba(192,156,108,0.16) 0%, transparent 58%)",
        }}
      />

      <SiteContainer className="relative py-8 sm:py-10">
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex flex-wrap items-center gap-1.5 text-[12px] text-dark-4">
            <li>
              <Link href="/" className="transition-colors hover:text-blue">
                Home
              </Link>
            </li>
            {crumbs.map((crumb, i) => (
              <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
                <ChevronRight className="h-3.5 w-3.5 text-gray-4" />
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="capitalize transition-colors hover:text-blue"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="capitalize text-blue">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            {eyebrow && (
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-blue">
                {eyebrow}
              </span>
            )}
            <h1 className="font-display text-[1.75rem] font-bold leading-[1.1] tracking-[-0.03em] text-dark sm:text-[2.25rem]">
              {title}
            </h1>
            {description && (
              <p className="mt-3 text-[15px] leading-relaxed text-body">
                {description}
              </p>
            )}
          </div>

          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      </SiteContainer>
    </header>
  );
}
