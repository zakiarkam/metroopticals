import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";

const SIZES = {
  lg: {
    frame: "min-h-[320px] sm:min-h-[380px] lg:min-h-[440px]",
    title: "text-[1.4rem] sm:text-[1.7rem] lg:text-[2rem]",
    body: true,
    cta: true,
  },
  md: {
    frame: "min-h-[280px] lg:min-h-[320px]",
    title: "text-[1.2rem] sm:text-[1.35rem]",
    body: true,
    cta: true,
  },
  sm: {
    frame: "min-h-[220px] lg:min-h-[240px]",
    title: "text-[1.05rem] sm:text-[1.15rem]",
    body: false,
    cta: false,
  },
} as const;

export type PhotoTileSize = keyof typeof SIZES;

export default function PhotoTile({
  href,
  image,
  imageAlt,
  eyebrow,
  title,
  meta,
  body,
  ctaLabel = "Explore collection",
  size = "md",
  priority = false,
  unoptimized = false,
}: {
  href: string;
  image: string;
  imageAlt: string;
  /** Small label above the title  the group or category kicker. */
  eyebrow?: string;
  title: string;
  /** The line under the title: a count, a piece total, a short qualifier. */
  meta?: string;
  /** Optional sentence, shown on `lg` and `md` only. */
  body?: string;
  ctaLabel?: string;
  size?: PhotoTileSize;
  priority?: boolean;
  unoptimized?: boolean;
}) {
  const config = SIZES[size];

  return (
    <Link
      href={href}
      className={`group relative flex h-full overflow-hidden rounded-2xl bg-dark ${config.frame}`}
    >
      <Image
        src={image}
        alt={imageAlt}
        fill
        priority={priority}
        unoptimized={unoptimized}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 45vw"
        className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
      />

      {/* Warm near-black rather than neutral grey: a cool scrim over these
          gold-lit photographs turned them muddy. */}
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(27,23,19,0.94) 0%, rgba(27,23,19,0.72) 32%, rgba(27,23,19,0.28) 62%, rgba(27,23,19,0.10) 100%)",
        }}
      />

      <span className="relative mt-auto flex w-full flex-col p-5 sm:p-6 lg:p-7">
        {eyebrow && (
          <span className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.2em] text-blue-light">
            {eyebrow}
          </span>
        )}

        <span
          className={`font-display font-bold leading-[1.12] tracking-[-0.03em] text-white ${config.title}`}
        >
          {title}
        </span>

        {meta && (
          <span className="mt-1.5 text-[13px] font-medium text-gray-3">
            {meta}
          </span>
        )}

        {config.body && body && (
          <span className="mt-2.5 max-w-md text-[13.5px] leading-relaxed text-gray-3">
            {body}
          </span>
        )}

        {config.cta && (
          <span className="mt-5 inline-flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.16em] text-white">
            {ctaLabel}
            <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </span>
        )}

        {/* `sm` tiles still need an affordance, just a quieter one. */}
        {!config.cta && (
          <span
            aria-hidden
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100"
          >
            <ArrowUpRight className="h-4 w-4" />
          </span>
        )}
      </span>
    </Link>
  );
}
