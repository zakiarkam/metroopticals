import type { Product } from "@/features/products/types/product";

export type AdvertisementPlacement = "hero" | "promobanner" | "countdown";

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
  productId?: number;
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
  productId: number;
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
  productId?: number;
}

export interface UpdateAdvertisementStatusInput {
  status: "active" | "inactive";
}
