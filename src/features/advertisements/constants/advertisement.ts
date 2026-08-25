import type { AdvertisementPlacement } from "@/features/advertisements/types/advertisement";

export type AdPlacementKind = "product" | "banner";

export interface AdPlacementMeta {
  id: AdvertisementPlacement;
  label: string;
  /** Grouping used by the admin UI. */
  group: "Home" | "Shop" | "Product" | "Cart";
  description: string;
  /** Slots decide left-to-right order within a zone. */
  slots: number[];
  kind: AdPlacementKind;
  /** `width / height`  drives the reserved box so nothing shifts on load. */
  aspect: string;
  /** Pixel guidance shown next to the upload field. */
  recommended: string;
  /** Dummy artwork, one per slot, used when the zone has no active ads. */
  placeholders: string[];
}

export const AD_PLACEMENTS: Record<AdvertisementPlacement, AdPlacementMeta> = {
  promobanner: {
    id: "promobanner",
    label: "Home  Promo panel",
    group: "Home",
    description:
      "Feature panel plus a pair of smaller cards, shown between home sections.",
    slots: [1, 2, 3],
    kind: "product",
    aspect: "16 / 9",
    recommended: "1200 × 675px",
    placeholders: ["/images/ads/promo-1.svg"],
  },
  "home-billboard": {
    id: "home-billboard",
    label: "Home  Wide billboard",
    group: "Home",
    description:
      "Full-width photo banner below the category rail. The most prominent image-only slot on the site.",
    slots: [1],
    kind: "banner",
    aspect: "1440 / 420",
    recommended: "1440 × 420px",
    placeholders: ["/images/ads/billboard-1.svg"],
  },
  "shop-top": {
    id: "shop-top",
    label: "Shop  Top strip",
    group: "Shop",
    description: "Slim banner above the product grid on both shop layouts.",
    slots: [1],
    kind: "banner",
    aspect: "1200 / 220",
    recommended: "1200 × 220px",
    placeholders: ["/images/ads/shop-top-1.svg"],
  },
  "shop-sidebar": {
    id: "shop-sidebar",
    label: "Shop  Sidebar tower",
    group: "Shop",
    description:
      "Tall banner under the shop filters. Stacks vertically when two are active.",
    slots: [1, 2],
    kind: "banner",
    aspect: "400 / 520",
    recommended: "400 × 520px",
    placeholders: ["/images/ads/sidebar-1.svg", "/images/ads/sidebar-2.svg"],
  },
  "product-detail": {
    id: "product-detail",
    label: "Product page  Under details",
    group: "Product",
    description:
      "Banner beneath the product information block, above related products.",
    slots: [1],
    kind: "banner",
    aspect: "1200 / 300",
    recommended: "1200 × 300px",
    placeholders: ["/images/ads/product-detail-1.svg"],
  },
  "cart-banner": {
    id: "cart-banner",
    label: "Cart  Promo strip",
    group: "Cart",
    description:
      "Last-chance banner under the cart summary. Good for free-delivery or bundle offers.",
    slots: [1],
    kind: "banner",
    aspect: "1200 / 260",
    recommended: "1200 × 260px",
    placeholders: ["/images/ads/cart-1.svg"],
  },
};

export const AD_PLACEMENT_IDS = Object.keys(
  AD_PLACEMENTS,
) as AdvertisementPlacement[];

/** Placements whose creative is a plain uploaded photo. */
export const BANNER_PLACEMENT_IDS = AD_PLACEMENT_IDS.filter(
  (id) => AD_PLACEMENTS[id].kind === "banner",
);

/** Placements driven by a linked catalogue product. */
export const PRODUCT_PLACEMENT_IDS = AD_PLACEMENT_IDS.filter(
  (id) => AD_PLACEMENTS[id].kind === "product",
);

export const getPlacementMeta = (
  placement: string | null | undefined,
): AdPlacementMeta | null =>
  placement && placement in AD_PLACEMENTS
    ? AD_PLACEMENTS[placement as AdvertisementPlacement]
    : null;

export const getPlacementLabel = (placement: string | null | undefined) =>
  getPlacementMeta(placement)?.label ?? placement ?? "Unknown";

export const placementSlotOptions = AD_PLACEMENT_IDS.reduce(
  (acc, id) => {
    acc[id] = AD_PLACEMENTS[id].slots;
    return acc;
  },
  {} as Record<AdvertisementPlacement, number[]>,
);

/** Admin grouping order. */
export const AD_PLACEMENT_GROUPS: AdPlacementMeta["group"][] = [
  "Home",
  "Shop",
  "Product",
  "Cart",
];
