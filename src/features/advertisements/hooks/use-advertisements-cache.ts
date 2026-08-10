"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import { getAdvertisements } from "@/features/advertisements/api/advertisement-api";
import { AdvertisementPlacement } from "@/features/advertisements/types/advertisement";
import {
  setAdsCacheStatus,
  upsertAdsCache,
  invalidateAllAdsCache,
  invalidateAdsCacheKey,
  AdsCacheKey,
} from "@/store/features/ads-cache";
import { useAppSelector } from "@/store/store";

export type AdvertisementsQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "inactive";
  placement?: AdvertisementPlacement;
};

const buildAdsCacheKey = (params?: AdvertisementsQueryParams) => {
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

type UseAdsCacheOptions = {
  staleTimeMs?: number;
};

export const useAdvertisementsCache = (
  params?: AdvertisementsQueryParams,
  options: UseAdsCacheOptions = {}
) => {
  const dispatch = useDispatch();
  const staleTimeMs = options.staleTimeMs ?? 120000;
  const key = useMemo(() => buildAdsCacheKey(params), [params]);
  const entry = useAppSelector((state) => state.adsCache.entries[key]);

  const fetchAds = useCallback(
    async (force = false) => {
      if (!force && entry?.status === "loading") return;

      dispatch(setAdsCacheStatus({ key, status: "loading", error: null }));
      try {
        const data = await getAdvertisements(params);
        dispatch(
          upsertAdsCache({
            key,
            advertisements: data.advertisements || [],
            pagination: data.pagination || {
              total: 0,
              page: params?.page ?? 1,
              limit: params?.limit ?? 10,
              totalPages: 1,
            },
          })
        );
      } catch (error: any) {
        dispatch(
          setAdsCacheStatus({
            key,
            status: "failed",
            error: error?.message || "Failed to load advertisements",
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
      void fetchAds();
    }
  }, [entry, fetchAds, key, staleTimeMs]);

  const refresh = useCallback(() => {
    void fetchAds(true);
  }, [fetchAds]);

  const invalidateAll = useCallback(() => {
    dispatch(invalidateAllAdsCache());
  }, [dispatch]);

  const invalidateKey = useCallback(() => {
    dispatch(invalidateAdsCacheKey({ key }));
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
