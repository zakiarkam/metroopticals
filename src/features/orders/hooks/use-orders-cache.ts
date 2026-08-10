"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import { getOrders } from "@/features/orders/api/orders-api";
import { OrdersResponse, OrderStatus } from "@/features/orders/types/order";
import {
  setOrdersCacheStatus,
  upsertOrdersCache,
  invalidateAllOrdersCache,
  invalidateOrdersCacheKey,
  OrdersCacheKey,
} from "@/store/features/orders-cache";
import { useAppSelector } from "@/store/store";

export type OrdersQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: OrderStatus;
  scope?: "admin" | "my";
};

const buildOrdersCacheKey = (params?: OrdersQueryParams) => {
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

type UseOrdersCacheOptions = {
  staleTimeMs?: number;
};

export const useOrdersCache = (
  params?: OrdersQueryParams,
  options: UseOrdersCacheOptions = {}
) => {
  const dispatch = useDispatch();
  const staleTimeMs = options.staleTimeMs ?? 120000;
  const key = useMemo(() => buildOrdersCacheKey(params), [params]);
  const entry = useAppSelector((state) => state.ordersCache.entries[key]);

  const fetchOrders = useCallback(
    async (force = false) => {
      if (!force && entry?.status === "loading") return;

      dispatch(setOrdersCacheStatus({ key, status: "loading", error: null }));
      try {
        const { scope, ...apiParams } = params || {};
        const data: OrdersResponse = await getOrders(apiParams);
        dispatch(
          upsertOrdersCache({
            key,
            orders: data.orders || [],
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
          setOrdersCacheStatus({
            key,
            status: "failed",
            error: error?.message || "Failed to load orders",
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
      void fetchOrders();
    }
  }, [entry, fetchOrders, key, staleTimeMs]);

  const refresh = useCallback(() => {
    void fetchOrders(true);
  }, [fetchOrders]);

  const invalidateAll = useCallback(() => {
    dispatch(invalidateAllOrdersCache());
  }, [dispatch]);

  const invalidateKey = useCallback(() => {
    dispatch(invalidateOrdersCacheKey({ key }));
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
