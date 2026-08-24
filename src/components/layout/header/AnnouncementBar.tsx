import React from "react";
import Link from "next/link";
import type { BlockData } from "@/features/site-content/types/site-content";

/**
 * The strip above the header.
 *
 * It sits in normal document flow, above the sticky header, so it scrolls away
 * on its own. It used to live *inside* the fixed header and unmount once the
 * page scrolled past 80px — which changed the header's height mid-scroll, and
 * with it the `--site-header-height` offset every page was padded by. The
 * result was the page heading sliding up underneath the header.
 */
export default function AnnouncementBar({ data }: { data: BlockData }) {
  if (!data?.enabled || !data?.message) return null;

  return (
    <div className="bg-dark">
      <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-center gap-x-6 gap-y-1 px-4 py-2.5 text-center sm:justify-between sm:px-6 sm:text-left lg:px-8">
        <p className="text-[12px] font-medium text-white">
          {data.message}
          {data.ctaLabel && (
            <Link
              href={data.ctaHref || "#"}
              className="ml-2 font-bold text-blue-light underline underline-offset-2 hover:text-white"
            >
              {data.ctaLabel}
            </Link>
          )}
        </p>

        {data.rightLabel && (
          <Link
            href={data.rightHref || "#"}
            className="shrink-0 text-[12px] font-semibold text-white underline underline-offset-2 transition-colors hover:text-blue-light"
          >
            {data.rightLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
