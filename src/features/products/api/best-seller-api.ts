"use client";

import axiosInstance from "@/lib/axiosInstance";
import type { TopProduct } from "@/features/dashboard/types/dashboard";

const BEST_SELLERS_TTL_MS = 5 * 60 * 1000;

let bestSellersCache: { data: TopProduct[]; expiresAt: number } | null = null;
let bestSellersInFlight: Promise<TopProduct[]> | null = null;

export const getBestSellersCached = async (): Promise<TopProduct[]> => {
  const now = Date.now();
  if (bestSellersCache && bestSellersCache.expiresAt > now) {
    return bestSellersCache.data;
  }

  if (bestSellersInFlight) {
    return bestSellersInFlight;
  }

  bestSellersInFlight = axiosInstance
    .get("/best-sellers")
    .then((response) => {
      const data = response.data;
      const topProducts = data.data?.topProducts || [];
      bestSellersCache = {
        data: topProducts,
        expiresAt: now + BEST_SELLERS_TTL_MS,
      };
      return topProducts;
    })
    .finally(() => {
      bestSellersInFlight = null;
    });

  return bestSellersInFlight;
};
