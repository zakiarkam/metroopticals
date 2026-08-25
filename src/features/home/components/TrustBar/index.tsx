import React from "react";
import SiteContainer from "@/components/common/SiteContainer";
import { ContentIcon } from "@/features/site-content/components/site/icons";
import type { BlockData } from "@/features/site-content/types/site-content";

export default function TrustBar({ data }: { data?: BlockData }) {
  const promises = (data?.items ?? []) as {
    icon?: string;
    label?: string;
    copy?: string;
  }[];

  if (!promises.length) return null;

  return (
    <section className="relative overflow-hidden bg-dark">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(80% 140% at 12% 0%, rgba(192,156,108,0.16) 0%, transparent 62%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(233,218,192,0.5) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <SiteContainer className="relative">
        {/* `divide-*` draws the separators rather than five conditional border
            classes per cell, which used to double up at the `sm` breakpoint. */}
        <ul className="grid grid-cols-1 divide-y divide-white/10 sm:grid-cols-2 sm:divide-x lg:grid-cols-4 lg:divide-y-0">
          {promises.map(({ icon, label, copy }, i) => (
            <li
              key={`${label}-${i}`}
              className="group px-0 py-7 sm:px-7 sm:py-9 lg:first:pl-0 lg:last:pr-0"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-blue-light/30 bg-blue-light/10 text-blue-light transition-colors duration-300 group-hover:border-blue-light/60 group-hover:bg-blue-light/20">
                <ContentIcon name={icon} className="h-5 w-5" />
              </span>

              <p className="mt-5 font-display text-[15.5px] font-bold leading-snug tracking-[-0.01em] text-white">
                {label}
              </p>
              {copy && (
                <p className="mt-2 text-[13px] leading-relaxed text-gray-4">
                  {copy}
                </p>
              )}
            </li>
          ))}
        </ul>
      </SiteContainer>
    </section>
  );
}
