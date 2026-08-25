"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import { getCategoriesOnce } from "@/features/categories/api/category-api";
import {
  setCategoriesCacheStatus,
  upsertCategoriesCache,
  invalidateAllCategoriesCache,
  invalidateCategoriesCacheKey,
  CategoriesCacheKey,
} from "@/store/features/categories-cache";
import { useAppSelector } from "@/store/store";

export type CategoriesQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "inactive";
};

const buildCategoriesCacheKey = (params?: CategoriesQueryParams) => {
  const entries = Object.entries(params || {})
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b));

  const stable = entries.reduce<Record<string, string | number>>(
    (acc, [key, value]) => {
      acc[key] = value as string | number;
      return acc;
    },
    {}
  );

  return JSON.stringify(stable);
};

type UseCategoriesCacheOptions = {
  staleTimeMs?: number;
  enabled?: boolean;
};

export const useCategoriesCache = (
  params?: CategoriesQueryParams,
  options: UseCategoriesCacheOptions = {}
) => {
  const dispatch = useDispatch();
  const staleTimeMs = options.staleTimeMs ?? 120000;
  const isEnabled = options.enabled ?? true;
  const key = useMemo(() => buildCategoriesCacheKey(params), [params]);
  const entry = useAppSelector((state) => state.categoriesCache.entries[key]);

  const fetchCategories = useCallback(
    async (force = false) => {
      if (!force && (entry?.status === "loading" || entry?.status === "failed")) return;

      dispatch(
        setCategoriesCacheStatus({ key, status: "loading", error: null })
      );
      try {
        const data = await getCategoriesOnce(params);
        dispatch(
          upsertCategoriesCache({
            key,
            categories: data.categories || [],
            pagination: data.pagination || {
              total: 0,
              page: params?.page ?? 1,
              limit: params?.limit ?? 50,
              totalPages: 1,
            },
          })
        );
      } catch (error: any) {
        dispatch(
          setCategoriesCacheStatus({
            key,
            status: "failed",
            error: error?.message || "Failed to load categories",
          })
        );
      }
    },
    [dispatch, entry?.status, key, params]
  );

  useEffect(() => {
    if (!isEnabled) return;
    const now = Date.now();
    const isStale =
      !entry?.lastFetched || now - entry.lastFetched > staleTimeMs;

    if (!entry || isStale) {
      void fetchCategories();
    }
  }, [entry, fetchCategories, isEnabled, key, staleTimeMs]);

  const refresh = useCallback(() => {
    void fetchCategories(true);
  }, [fetchCategories]);

  const invalidateAll = useCallback(() => {
    dispatch(invalidateAllCategoriesCache());
  }, [dispatch]);

  const invalidateKey = useCallback(() => {
    dispatch(invalidateCategoriesCacheKey({ key }));
  }, [dispatch, key]);

  return {
    key,
    data: entry,
    isLoading: isEnabled ? entry?.status === "loading" || !entry : false,
    error: isEnabled ? entry?.error || null : null,
    refresh,
    invalidateAll,
    invalidateKey,
  };
};
