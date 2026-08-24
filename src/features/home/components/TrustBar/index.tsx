import React from "react";
import SiteContainer from "@/components/common/SiteContainer";
import { ContentIcon } from "@/features/site-content/components/site/icons";
import type { BlockData } from "@/features/site-content/types/site-content";

/**
 * Reassurance strip directly under the hero.
 *
 * Sits between the hero and the catalogue so the things customers ask about
 * most (fit, lens quality, delivery, aftercare) are answered before they start
 * browsing. The promises come from the `site.trust` content block.
 */

export default function TrustBar({ data }: { data?: BlockData }) {
  const promises = (data?.items ?? []) as {
    icon?: string;
    label?: string;
    copy?: string;
  }[];

  if (!promises.length) return null;

  return (
    <section className="border-y border-gray-3 bg-gray-2">
      <SiteContainer>
        {/* `divide-*` draws the separators rather than five conditional border
            classes per cell, which used to double up at the `sm` breakpoint. */}
        <ul className="grid grid-cols-1 divide-y divide-gray-3 sm:grid-cols-2 sm:divide-x lg:grid-cols-4 lg:divide-y-0">
          {promises.map(({ icon, label, copy }, i) => (
            <li
              key={`${label}-${i}`}
              className="flex items-start gap-4 px-0 py-6 sm:px-6 sm:py-7 lg:first:pl-0 lg:last:pr-0"
            >
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue/25 bg-blue/10 text-blue">
                <ContentIcon name={icon} className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-dark">{label}</p>
                {copy && (
                  <p className="mt-1 text-[12.5px] leading-relaxed text-body">
                    {copy}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </SiteContainer>
    </section>
  );
}
