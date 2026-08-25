import PhotoTile, { type PhotoTileSize } from "@/components/common/PhotoTile";
import type { LensType } from "@/config/lenses";

/**
 * A lens type as a full-bleed photo tile.
 *
 * Thin wrapper over the shared `PhotoTile` so the lens bento and the home
 * category bento are literally the same tile, and a change to the scrim or the
 * type scale lands on both.
 */
export default function LensTile({
  lens,
  size = "md",
  priority = false,
}: {
  lens: LensType;
  size?: PhotoTileSize;
  priority?: boolean;
}) {
  return (
    <PhotoTile
      href={`/lenses/${lens.slug}`}
      image={lens.image}
      imageAlt={lens.imageAlt}
      eyebrow={lens.group}
      title={lens.name}
      body={lens.tagline}
      ctaLabel="Read the guide"
      size={size}
      priority={priority}
    />
  );
}
