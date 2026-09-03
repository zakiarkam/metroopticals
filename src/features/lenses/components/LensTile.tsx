import PhotoTile, { type PhotoTileSize } from "@/components/common/PhotoTile";
import type { LensType } from "@/config/lenses";
import { formatPrice } from "@/lib/utils/price";

export default function LensTile({
  lens,
  size = "md",
  priority = false,
  priceFrom,
}: {
  lens: LensType;
  size?: PhotoTileSize;
  priority?: boolean;
  /** From the live price list. Absent when the shop has not priced this lens. */
  priceFrom?: number;
}) {
  return (
    <PhotoTile
      href={`/lenses/${lens.slug}`}
      image={lens.image}
      imageAlt={lens.imageAlt}
      eyebrow={lens.group}
      title={lens.name}
      // A price turns a guide page into something you can act on. Left off
      // rather than guessed at when the lens has not been priced.
      meta={priceFrom ? `From ${formatPrice(priceFrom)} the pair` : undefined}
      body={lens.tagline}
      ctaLabel={priceFrom ? "See prices & buy" : "Read the guide"}
      size={size}
      priority={priority}
    />
  );
}
