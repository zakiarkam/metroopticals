import PhotoTile, { type PhotoTileSize } from "@/components/common/PhotoTile";
import type { LensType } from "@/config/lenses";

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
