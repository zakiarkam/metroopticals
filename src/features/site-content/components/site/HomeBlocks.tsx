import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Section } from "@/components/common/Section";
import SiteContainer from "@/components/common/SiteContainer";
import { getAdvertisementImageUrl, getBrandLogoUrl } from "@/lib/storageUtils";
import TestimonialCarousel, {
  type TestimonialReview,
} from "@/features/reviews/components/site/TestimonialCarousel";
import type { BlockData } from "@/features/site-content/types/site-content";

/** Content images may be R2 file names, site paths, or the bundled SVGs. */
const img = (value?: string | null) => getAdvertisementImageUrl(value);
const isSvg = (value: string) => value.endsWith(".svg");

/* ----------------------------------------------------------- brand strip */

export function BrandStrip({
  brands,
}: {
  brands: {
    id: number;
    name: string;
    slug: string;
    logo: string | null;
    productCount?: number;
  }[];
}) {
  if (!brands.length) return null;

  const minTiles = 8;
  const base =
    brands.length >= minTiles
      ? brands
      : Array.from(
          { length: Math.ceil(minTiles / brands.length) },
          () => brands,
        ).flat();
  const track = [...base, ...base];
  const animate = brands.length > 1;

  return (
    <section className="bg-gray-1 pb-6 pt-8 sm:pb-8 sm:pt-10">
      <SiteContainer>
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-dark-5">
            Shop by brand
          </h2>
          <Link
            href="/shop-with-sidebar"
            className="text-[12.5px] font-bold text-blue underline-offset-2 hover:underline"
          >
            View all
          </Link>
        </div>
      </SiteContainer>

      <div
        className="group/rail relative overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
        }}
      >
        <ul
          className={`flex w-max gap-3 px-3 py-2 ${
            animate
              ? "animate-marquee group-hover/rail:[animation-play-state:paused] motion-reduce:animate-none"
              : ""
          }`}
        >
          {track.map((brand, index) => {
            const logo = getBrandLogoUrl(brand.logo);
            // Duplicated tiles are decorative; only the first copy is
            // exposed to assistive tech so links are not announced twice.
            const decorative = index >= base.length;

            return (
              <li
                key={`${brand.id}-${index}`}
                aria-hidden={decorative || undefined}
                className="w-[140px] shrink-0 sm:w-[180px]"
              >
                <Link
                  href={`/shop-with-sidebar?brands=${encodeURIComponent(brand.slug)}`}
                  aria-label={`Shop ${brand.name}`}
                  tabIndex={decorative ? -1 : undefined}
                  className="flex h-[88px] items-center justify-center rounded-2xl border border-gray-3 bg-white px-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue/40 hover:shadow-2"
                >
                  {logo ? (
                    <span className="relative block h-11 w-full">
                      <Image
                        src={logo}
                        alt={brand.name}
                        fill
                        sizes="180px"
                        unoptimized={isSvg(logo)}
                        className="object-contain"
                      />
                    </span>
                  ) : (
                    <span className="line-clamp-2 text-center text-[13px] font-bold uppercase tracking-[0.1em] text-dark">
                      {brand.name}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- promos */

/** Two campaign banners with the headline set in HTML rather than baked in. */
export function PromoBanners({ data }: { data: BlockData }) {
  const items = (data?.items ?? []) as any[];
  if (!items.length) return null;

  return (
    <Section className="!pb-0">
      <div className="grid gap-5 lg:grid-cols-2">
        {items.map((item, index) => {
          const image = img(item.image);

          return (
            <Link
              key={index}
              href={item.href || "#"}
              className="group relative flex min-h-[220px] items-end overflow-hidden rounded-2xl bg-dark"
            >
              {image && (
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  unoptimized={isSvg(image)}
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
              )}

              {/* The scrim is what makes the copy legible over any artwork. */}
              <span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-r from-dark/80 via-dark/45 to-transparent"
              />

              <span className="relative block w-full max-w-sm p-6 sm:p-9">
                {item.eyebrow && (
                  <span className="block text-[11px] font-bold uppercase tracking-[0.22em] text-blue-light">
                    {item.eyebrow}
                  </span>
                )}
                <span className="mt-2 block break-words font-display text-[1.5rem] font-bold leading-[1.15] text-white sm:text-[1.85rem]">
                  {item.title}
                </span>
                {item.ctaLabel && (
                  <span className="mt-5 inline-block rounded-lg bg-white px-6 py-2.5 text-[13.5px] font-bold text-dark transition-colors group-hover:bg-blue-light">
                    {item.ctaLabel}
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------- reviews */

export function LiveReviews({ reviews }: { reviews: TestimonialReview[] }) {
  if (!reviews.length) return null;

  return (
    <Section tone="raised">
      <TestimonialCarousel reviews={reviews} />
    </Section>
  );
}
