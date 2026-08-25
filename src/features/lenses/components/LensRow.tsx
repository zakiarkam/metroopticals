import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { LensType } from "@/config/lenses";

/**
 * A lens type as a directory row.
 *
 * The counterpart to `LensTile`: where a page has already spent its budget on
 * photography, listing the remaining lens types as ruled rows keeps them
 * available without adding a third grid of pictures competing for attention.
 */
export default function LensRow({ lens }: { lens: LensType }) {
  return (
    <Link
      href={`/lenses/${lens.slug}`}
      className="group flex items-center gap-5 border-b border-gray-3 py-5 transition-colors hover:border-blue/40 sm:gap-7"
    >
      <span className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-1 sm:h-[72px] sm:w-28">
        <Image
          src={lens.image}
          alt=""
          fill
          sizes="112px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[10.5px] font-bold uppercase tracking-[0.18em] text-dark-5">
          {lens.group}
        </span>
        <span className="mt-1 block font-display text-[1.05rem] font-bold leading-snug tracking-[-0.02em] text-dark transition-colors group-hover:text-blue sm:text-[1.15rem]">
          {lens.name}
        </span>
        <span className="mt-1 hidden text-[13.5px] leading-relaxed text-body sm:block">
          {lens.tagline}
        </span>
      </span>

      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-3 text-dark-4 transition-colors group-hover:border-blue group-hover:bg-blue group-hover:text-white">
        <ArrowUpRight className="h-4 w-4" />
      </span>
    </Link>
  );
}
