"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Glasses, X } from "lucide-react";

import { getLensType } from "@/config/lenses";
import {
  clearLensIntent,
  setLensIntent,
} from "@/features/lenses/utils/lens-intent";

/**
 * "You are shopping for a frame to put Blue Cut lenses in."
 *
 * Shown when the shopper arrived from a lens guide's call to action. It does
 * two jobs: it keeps the errand visible while they browse a hundred frames,
 * and it parks the choice for the lens picker so they are not asked which lens
 * they wanted two pages after telling us.
 *
 * Dismissable, because a shopper who changed their mind should not have to
 * argue with a banner.
 */
export default function LensIntentBanner() {
  const params = useSearchParams();
  const slug = params.get("lens");
  const [dismissed, setDismissed] = useState(false);

  const lens = slug ? getLensType(slug) : undefined;

  useEffect(() => {
    if (lens) setLensIntent(lens.slug);
  }, [lens]);

  if (!lens || dismissed) return null;

  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-blue/25 bg-blue/[0.07] px-5 py-3.5">
      <span className="inline-flex items-center gap-2 text-[13.5px] font-bold text-dark">
        <Glasses className="h-[18px] w-[18px] shrink-0 text-blue" />
        Choosing a frame for {lens.shortName} lenses
      </span>

      <span className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-dark-4">
        Pick any frame and add it to your cart — the lens picker will already be
        set to {lens.shortName}.
      </span>

      <Link
        href={`/lenses/${lens.slug}`}
        className="text-[12.5px] font-semibold text-blue underline underline-offset-4"
      >
        Back to the guide
      </Link>

      <button
        type="button"
        onClick={() => {
          clearLensIntent();
          setDismissed(true);
        }}
        aria-label="Stop shopping for this lens"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-dark-4 transition-colors hover:bg-white hover:text-dark"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
