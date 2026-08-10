"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import {
  getDashboardDataOnce,
  GetDashboardParams,
} from "@/features/dashboard/api/dashboard-api";
import {
  setDashboardCacheStatus,
  upsertDashboardCache,
  invalidateAllDashboardCache,
  invalidateDashboardCacheKey,
  DashboardCacheKey,
} from "@/store/features/dashboard-cache";
import { useAppSelector } from "@/store/store";

const buildDashboardCacheKey = (params?: GetDashboardParams) => {
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

type UseDashboardCacheOptions = {
  staleTimeMs?: number;
};

export const useDashboardCache = (
  params?: GetDashboardParams,
  options: UseDashboardCacheOptions = {}
) => {
  const dispatch = useDispatch();
  const staleTimeMs = options.staleTimeMs ?? 120000;
  const key = useMemo(() => buildDashboardCacheKey(params), [params]);
  const entry = useAppSelector((state) => state.dashboardCache.entries[key]);

  const fetchDashboard = useCallback(
    async (force = false) => {
      if (!force && entry?.status === "loading") return;

      dispatch(
        setDashboardCacheStatus({ key, status: "loading", error: null })
      );
      try {
        const data = await getDashboardDataOnce(params);
        dispatch(
          upsertDashboardCache({
            key,
            data,
          })
        );
      } catch (error: any) {
        dispatch(
          setDashboardCacheStatus({
            key,
            status: "failed",
            error: error?.message || "Failed to load dashboard data",
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
      void fetchDashboard();
    }
  }, [entry, fetchDashboard, key, staleTimeMs]);

  const refresh = useCallback(() => {
    void fetchDashboard(true);
  }, [fetchDashboard]);

  const invalidateAll = useCallback(() => {
    dispatch(invalidateAllDashboardCache());
  }, [dispatch]);

  const invalidateKey = useCallback(() => {
    dispatch(invalidateDashboardCacheKey({ key }));
  }, [dispatch, key]);

  return {
    key,
    data: entry?.data || null,
    isLoading: entry?.status === "loading" || !entry,
    error: entry?.error || null,
    refresh,
    invalidateAll,
    invalidateKey,
  };
};
