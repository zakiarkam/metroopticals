import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Section, SectionHeading } from "@/components/common/Section";
import SiteContainer from "@/components/common/SiteContainer";
import { getAdvertisementImageUrl, getBrandLogoUrl } from "@/lib/storageUtils";
import { StarRating } from "@/features/reviews/components/site/StarRating";
import type { BlockData } from "@/features/site-content/types/site-content";

/**
 * The content-driven home page sections.
 *
 * There are three left. Shape, price, category and brand shortcuts used to
 * live here as hand-maintained editable lists; they are now filter links into
 * `/shop-with-sidebar`, drawn from the catalogue itself, so the home page can
 * never advertise a shape or a price band the shop has nothing to show for.
 *
 * Each section bails out to `null` when its block is empty, so an admin can
 * clear a section to hide it without needing a separate on/off switch.
 */

/** Content images may be R2 file names, site paths, or the bundled SVGs. */
const img = (value?: string | null) => getAdvertisementImageUrl(value);
const isSvg = (value: string) => value.endsWith(".svg");

/* ----------------------------------------------------------- brand strip */

/**
 * The designer-brand row under the hero.
 *
 * Reads the Brand table rather than a content block: brands are catalogue data
 * that products point at and the shop sidebar filters on, so a second, editable
 * copy of the list would drift out of step with what is actually stocked.
 *
 * Logos sit on their own white tile at full contrast. The row used to print
 * them straight onto the page at 55% opacity, which is a common "logo garden"
 * treatment but made dark wordmarks like Ray-Ban and Swarovski hard to read
 * and gave every brand a different apparent weight depending on its artwork.
 */
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
  // A brand with nothing behind it links to an empty shop, so it is not shown.
  const stocked = brands.filter((brand) => (brand.productCount ?? 0) > 0);
  if (!stocked.length) return null;

  return (
    <section className="border-y border-gray-3 bg-gray-2 py-8 sm:py-10">
      <SiteContainer>
        <div className="mb-5 flex items-baseline justify-between gap-4">
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

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {stocked.slice(0, 12).map((brand) => {
            const logo = getBrandLogoUrl(brand.logo);

            return (
              <li key={brand.id}>
                <Link
                  href={`/shop-with-sidebar?brands=${encodeURIComponent(brand.slug)}`}
                  aria-label={`Shop ${brand.name}`}
                  className="group flex h-full flex-col items-center justify-center rounded-2xl border border-gray-3 bg-gray-1 px-4 py-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue/40 hover:shadow-2"
                >
                  {/* With a logo the name is repeated underneath, the way a
                      brand wall reads. Without one the wordmark *is* the name,
                      so printing it twice would just be a stutter. */}
                  {logo ? (
                    <>
                      <span className="relative flex h-10 w-full items-center justify-center overflow-hidden">
                        <Image
                          src={logo}
                          alt={brand.name}
                          fill
                          sizes="(max-width: 768px) 45vw, 180px"
                          unoptimized={isSvg(logo)}
                          className="object-contain"
                        />
                      </span>
                      <span className="mt-3 line-clamp-1 text-center text-[13px] font-semibold text-dark-2 transition-colors group-hover:text-blue">
                        {brand.name}
                      </span>
                    </>
                  ) : (
                    <span className="flex min-h-[3.25rem] items-center text-center text-[15px] font-bold uppercase tracking-[0.1em] text-dark transition-colors group-hover:text-blue">
                      {brand.name}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </SiteContainer>
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

              <span className="relative block max-w-sm p-7 sm:p-9">
                {item.eyebrow && (
                  <span className="block text-[11px] font-bold uppercase tracking-[0.22em] text-blue-light">
                    {item.eyebrow}
                  </span>
                )}
                <span className="mt-2 block font-display text-[1.5rem] font-bold leading-[1.15] text-white sm:text-[1.85rem]">
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

/**
 * Home page social proof, drawn from published customer reviews.
 *
 * Nothing here is authored by the shop  if no review has been approved yet the
 * section hides itself rather than showing invented testimonials.
 */
export function LiveReviews({
  reviews,
}: {
  reviews: {
    id: number;
    rating: number;
    title: string | null;
    body: string;
    user?: { name: string | null } | null;
    product?: { id: number; title: string } | null;
  }[];
}) {
  if (!reviews.length) return null;

  return (
    <Section>
      <SectionHeading
        eyebrow="Verified buyers"
        title="What our customers say"
        align="center"
      />

      <div className="grid gap-5 md:grid-cols-3">
        {reviews.slice(0, 3).map((review) => (
          <figure
            key={review.id}
            className="flex h-full flex-col rounded-2xl border border-gray-3 bg-gray-2 p-6"
          >
            <StarRating value={review.rating} />

            {review.title && (
              <h3 className="mt-3 text-[15px] font-semibold text-dark">
                {review.title}
              </h3>
            )}

            <blockquote className="mt-2 flex-1 text-[14.5px] leading-relaxed text-body">
              {review.body}
            </blockquote>

            <figcaption className="mt-5 border-t border-gray-3 pt-4">
              <span className="block text-[14px] font-bold text-dark">
                {review.user?.name || "Verified customer"}
              </span>
              {review.product && (
                <Link
                  href={`/shop-details/${review.product.id}`}
                  className="block truncate text-[12.5px] text-dark-4 transition-colors hover:text-blue"
                >
                  on {review.product.title}
                </Link>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}
