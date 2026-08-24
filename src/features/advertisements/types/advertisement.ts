import type { Product } from "@/features/products/types/product";

export type AdvertisementPlacement =
  // Product-driven home slot.
  | "promobanner"
  // Photo banner zones — see AD_PLACEMENTS in constants/advertisement.ts.
  | "home-billboard"
  | "shop-top"
  | "shop-sidebar"
  | "product-detail"
  | "cart-banner";

export interface Advertisement {
  id: number;
  title: string;
  imageUrl: string;
  link?: string | null;
  placement: AdvertisementPlacement;
  slot: number;
  status: "active" | "inactive";
  priority: number;
  startDate?: string | null;
  endDate?: string | null;
  clickCount: number;
  viewCount: number;
  product?: Product | null;
  productId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdvertisementsResponse {
  advertisements: Advertisement[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateAdvertisementInput {
  title: string;
  imageUrl: string;
  link?: string;
  placement: AdvertisementPlacement;
  status?: "active" | "inactive";
  priority?: number;
  slot?: number;
  startDate?: string;
  endDate?: string;
  /** Banner placements do not need a product; product placements do. */
  productId?: number | null;
}

export interface UpdateAdvertisementInput {
  title?: string;
  imageUrl?: string;
  link?: string;
  placement?: AdvertisementPlacement;
  status?: "active" | "inactive";
  priority?: number;
  slot?: number;
  startDate?: string;
  endDate?: string;
  productId?: number | null;
}

export interface UpdateAdvertisementStatusInput {
  status: "active" | "inactive";
}
