"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import { getProducts } from "@/features/products/api/product-api";
import { ProductQueryParams, ProductsResponse } from "@/features/products/types/product";
import {
  setProductsCacheStatus,
  upsertProductsCache,
  invalidateAllProductsCache,
  invalidateProductsCacheKey,
  ProductsCacheKey,
} from "@/store/features/products-cache";
import { useAppSelector } from "@/store/store";

const buildProductsCacheKey = (params?: ProductQueryParams) => {
  const entries = Object.entries(params || {})
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b));

  const stable = entries.reduce<Record<string, string | number | string[]>>(
    (acc, [key, value]) => {
      acc[key] = value as string | number | string[];
      return acc;
    },
    {}
  );

  return JSON.stringify(stable);
};

type UseProductsCacheOptions = {
  staleTimeMs?: number;
};

export const useProductsCache = (
  params?: ProductQueryParams,
  options: UseProductsCacheOptions = {}
) => {
  const dispatch = useDispatch();
  const staleTimeMs = options.staleTimeMs ?? 120000;
  const key = useMemo(() => buildProductsCacheKey(params), [params]);
  const entry = useAppSelector((state) => state.productsCache.entries[key]);

  const fetchProducts = useCallback(
    async (force = false) => {
      if (!force && entry?.status === "loading") return;

      dispatch(
        setProductsCacheStatus({ key, status: "loading", error: null })
      );
      try {
        const data: ProductsResponse = await getProducts(params);
        dispatch(
          upsertProductsCache({
            key,
            products: data.products || [],
            pagination: data.pagination || {
              total: 0,
              page: params?.page ?? 1,
              limit: params?.limit ?? 12,
              totalPages: 1,
            },
          })
        );
      } catch (error: any) {
        dispatch(
          setProductsCacheStatus({
            key,
            status: "failed",
            error: error?.message || "Failed to load products",
          })
        );
      }
    },
    [dispatch, entry?.status, key, params]
  );

  useEffect(() => {
    const now = Date.now();
    const isStale =
      !entry?.lastFetched || now - entry.lastFetched > staleTimeMs;

    if (!entry || isStale) {
      void fetchProducts();
    }
  }, [entry, fetchProducts, key, staleTimeMs]);

  const refresh = useCallback(() => {
    void fetchProducts(true);
  }, [fetchProducts]);

  const invalidateAll = useCallback(() => {
    dispatch(invalidateAllProductsCache());
  }, [dispatch]);

  const invalidateKey = useCallback(() => {
    dispatch(invalidateProductsCacheKey({ key }));
  }, [dispatch, key]);

  return {
    key,
    data: entry,
    isLoading: entry?.status === "loading" || !entry,
    error: entry?.error || null,
    refresh,
    invalidateAll,
    invalidateKey,
  };
};
