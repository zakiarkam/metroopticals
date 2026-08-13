import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Shared section shell + heading used by every customer-facing section.
 *
 * The old code repeated a bespoke `<section>` + icon + `<h2>` block in each
 * feature folder, so vertical rhythm and heading sizes drifted apart. These two
 * components are the single source of truth: change the spacing scale or the
 * eyebrow treatment here and the whole storefront follows.
 */

export function Section({
  children,
  className = "",
  tone = "page",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  /** `raised` paints the section on the card surface to break up long pages. */
  tone?: "page" | "raised";
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`relative ${
        tone === "raised" ? "bg-gray-2/40" : "bg-transparent"
      } py-14 sm:py-16 lg:py-20 ${className}`}
    >
      <div className="mx-auto w-full max-w-[1560px] px-4 sm:px-6 lg:px-10">
        {children}
      </div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  hrefLabel = "View all",
  align = "between",
  className = "",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
  /** `between` puts the CTA on the right; `center` stacks and centres. */
  align?: "between" | "center";
  className?: string;
}) {
  const centered = align === "center";

  return (
    <div
      className={`mb-9 flex flex-col gap-5 sm:mb-11 ${
        centered
          ? "items-center text-center"
          : "sm:flex-row sm:items-end sm:justify-between"
      } ${className}`}
    >
      <div className={centered ? "max-w-2xl" : "max-w-2xl"}>
        {eyebrow && (
          <span
            className={`mb-3 inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.24em] text-blue ${
              centered ? "justify-center" : ""
            }`}
          >
            <span className="h-px w-7 bg-blue/50" />
            {eyebrow}
          </span>
        )}

        <h2 className="text-[1.7rem] font-bold leading-[1.12] tracking-tight text-dark sm:text-[2.05rem] lg:text-[2.35rem]">
          {title}
        </h2>

        {description && (
          <p className="mt-3 text-[15px] leading-relaxed text-body">
            {description}
          </p>
        )}
      </div>

      {href && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-gray-3 bg-gray-2 px-5 py-2.5 text-[13px] font-semibold text-dark transition-colors duration-200 hover:border-blue hover:text-blue sm:self-auto"
        >
          {hrefLabel}
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

export default Section;
