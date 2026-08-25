import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import SiteContainer from "@/components/common/SiteContainer";

/* --------------------------------------------------------------- buttons */

export function PillLink({
  href,
  children,
  tone = "accent",
}: {
  href: string;
  children: React.ReactNode;
  tone?: "accent" | "light" | "outline" | "quiet";
}) {
  const shell = {
    accent: "bg-blue text-white hover:bg-blue-dark",
    light: "bg-gray-2 text-dark hover:bg-white",
    outline: "border border-white/25 text-white hover:border-white/60",
    quiet: "border border-gray-3 text-dark hover:border-blue hover:text-blue",
  }[tone];

  const badge = {
    accent: "bg-dark text-white",
    light: "bg-blue text-white",
    outline: "bg-white/10 text-white",
    quiet: "bg-blue text-white",
  }[tone];

  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-3 rounded-full py-2 pl-6 pr-2 text-[12px] font-bold uppercase tracking-[0.12em] transition-colors ${shell}`}
    >
      {children}
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-200 group-hover:rotate-45 ${badge}`}
      >
        <ArrowUpRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

/** Understated text link  uppercase, underlined, used on photo tiles. */
export function QuietLink({
  href,
  children,
  onDark = false,
}: {
  href: string;
  children: React.ReactNode;
  onDark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 border-b pb-1 text-[11.5px] font-bold uppercase tracking-[0.16em] transition-colors ${
        onDark
          ? "border-white/40 text-white hover:border-white"
          : "border-blue/40 text-blue hover:border-blue"
      }`}
    >
      {children}
    </Link>
  );
}

/* ------------------------------------------------------- section heading */

export function SectionIntro({
  eyebrow,
  title,
  titleAccent,
  body,
  action,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  /** Second line, drawn in gold. */
  titleAccent?: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 ${className}`}
    >
      <div>
        {eyebrow && (
          <span className="mb-4 block text-[11px] font-bold uppercase tracking-[0.24em] text-blue">
            {eyebrow}
          </span>
        )}
        <h2 className="break-words font-display text-[2rem] font-bold leading-[1.05] tracking-[-0.035em] text-dark sm:text-[2.6rem] lg:text-[3rem]">
          {title}
          {titleAccent && (
            <>
              <br />
              <span className="text-blue-light">{titleAccent}</span>
            </>
          )}
        </h2>
      </div>

      {(body || action) && (
        <div className="flex flex-col items-start justify-center gap-6">
          {body && (
            <p className="text-[16px] leading-relaxed text-body">{body}</p>
          )}
          {action}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------- numbered steps */

export type Step = { title: string; body: string };

export function NumberedSteps({
  steps,
  columns = 4,
}: {
  steps: Step[];
  columns?: 3 | 4;
}) {
  const grid =
    columns === 3
      ? "sm:grid-cols-2 lg:grid-cols-3"
      : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={`grid grid-cols-1 gap-x-10 gap-y-10 ${grid}`}>
      {steps.map((step, index) => (
        <div key={step.title} className="border-t border-gray-3 pt-6">
          <span
            aria-hidden
            className="block font-display text-[3.25rem] font-bold leading-none tracking-[-0.04em] text-gray-3"
          >
            {String(index + 1).padStart(2, "0")}
          </span>

          <h3 className="mt-5 text-[15px] font-bold leading-snug text-dark">
            {step.title}
          </h3>
          <p className="mt-2.5 text-[14px] leading-relaxed text-body">
            {step.body}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ dark band */

export function ConsultBand({
  eyebrow = "Talk to us",
  title,
  titleAccent,
  body,
  image,
  imageAlt,
  primary,
  secondary,
}: {
  eyebrow?: string;
  title: string;
  titleAccent?: string;
  body: string;
  image: string;
  imageAlt: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <section className="relative overflow-hidden bg-dark">
      {/* Warm gold wash plus a faint dot grid  the flat fill alone looked
          like a missing image rather than a deliberate change of ground. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 120% at 15% 0%, rgba(192,156,108,0.18) 0%, transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(233,218,192,0.5) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <SiteContainer className="relative py-12 sm:py-14 lg:py-20">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <span className="mb-4 block text-[11px] font-bold uppercase tracking-[0.24em] text-blue-light">
              {eyebrow}
            </span>
            <h2 className="font-display text-[1.9rem] font-bold leading-[1.08] tracking-[-0.035em] text-white sm:text-[2.4rem]">
              {title}
              {titleAccent && (
                <>
                  <br />
                  <span className="text-blue-light">{titleAccent}</span>
                </>
              )}
            </h2>
            <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-gray-4">
              {body}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <PillLink href={primary.href} tone="light">
                {primary.label}
              </PillLink>
              {secondary && (
                <PillLink href={secondary.href} tone="outline">
                  {secondary.label}
                </PillLink>
              )}
            </div>
          </div>

          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl ring-1 ring-white/10">
            <Image
              src={image}
              alt={imageAlt}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </SiteContainer>
    </section>
  );
}
