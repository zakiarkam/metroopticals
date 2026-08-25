import React from "react";
import Image from "next/image";
import Link from "next/link";
import type { Advertisement } from "@/features/advertisements/types/advertisement";
import {
  AD_PLACEMENTS,
  type AdPlacementMeta,
} from "@/features/advertisements/constants/advertisement";
import {
  getAdvertisementImageUrl,
  getProductImageUrl,
} from "@/lib/storageUtils";

type Slot = {
  key: string;
  image: string;
  alt: string;
  href: string | null;
  isPlaceholder: boolean;
};

/** Zones whose slots sit side by side rather than stacked. */
const COLUMNS: Partial<Record<AdPlacementMeta["id"], string>> = {};

const buildSlots = (meta: AdPlacementMeta, ads: Advertisement[]): Slot[] =>
  meta.slots.map((slotNumber, index) => {
    // Prefer the ad that claimed this slot; otherwise fall back to position, so
    // a single ad saved with the wrong slot still shows rather than vanishing.
    const ad =
      ads.find((item) => item.slot === slotNumber) ??
      (ads.length === meta.slots.length ? ads[index] : undefined);

    // Artwork is optional: an ad with a linked product but no upload runs on
    // the product's own photo rather than falling through to dummy artwork.
    const image = ad
      ? (getAdvertisementImageUrl(ad.imageUrl) ??
        getProductImageUrl(ad.product?.images?.[0]))
      : null;

    if (ad && image) {
      return {
        key: `ad-${ad.id}`,
        image,
        alt: ad.title || meta.label,
        href:
          ad.link || (ad.productId ? `/shop-details/${ad.productId}` : null),
        isPlaceholder: false,
      };
    }

    return {
      key: `placeholder-${meta.id}-${slotNumber}`,
      image:
        meta.placeholders[index % meta.placeholders.length] ??
        meta.placeholders[0],
      alt: `${meta.label}  sample artwork`,
      href: null,
      isPlaceholder: true,
    };
  });

const AdImage = ({
  slot,
  meta,
  sizes,
  priority,
}: {
  slot: Slot;
  meta: AdPlacementMeta;
  sizes: string;
  priority: boolean;
}) => (
  <div
    className="relative w-full overflow-hidden"
    style={{ aspectRatio: meta.aspect }}
  >
    <Image
      src={slot.image}
      alt={slot.alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={slot.isPlaceholder}
      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
    />
  </div>
);

export default function AdZoneView({
  placement,
  ads,
  className = "",
  priority = false,
}: {
  placement: AdPlacementMeta["id"];
  ads: Advertisement[];
  className?: string;
  priority?: boolean;
}) {
  const meta = AD_PLACEMENTS[placement];
  if (!meta) return null;

  const slots = buildSlots(meta, ads);
  const columns = COLUMNS[placement] ?? "grid-cols-1";

  // A single-column zone spanning the full width does not need a grid gap, but
  // keeping one grid keeps the markup identical across every placement.
  const sizes =
    columns === "grid-cols-1"
      ? "(max-width: 1600px) 100vw, 1600px"
      : "(max-width: 768px) 100vw, 50vw";

  return (
    <div
      className={`grid gap-4 sm:gap-5 ${columns} ${className}`}
      aria-label={`${meta.label} advertisements`}
    >
      {slots.map((slot, index) => {
        const frame = (
          <>
            <AdImage
              slot={slot}
              meta={meta}
              sizes={sizes}
              priority={priority && index === 0}
            />
            {/* Hairline inner edge  keeps light artwork from bleeding into
                the ivory page background without adding a heavy border. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-dark/[0.07]"
            />
          </>
        );

        const shell =
          "group relative block overflow-hidden rounded-2xl bg-gray-2 shadow-[0_1px_2px_rgba(27,23,19,0.04),0_8px_24px_-12px_rgba(27,23,19,0.14)] sm:rounded-3xl";

        return slot.href ? (
          <Link
            key={slot.key}
            href={slot.href}
            className={`${shell} transition-shadow duration-300 hover:shadow-[0_2px_4px_rgba(27,23,19,0.05),0_16px_36px_-14px_rgba(27,23,19,0.24)]`}
          >
            {frame}
          </Link>
        ) : (
          <div key={slot.key} className={shell}>
            {frame}
          </div>
        );
      })}
    </div>
  );
}
