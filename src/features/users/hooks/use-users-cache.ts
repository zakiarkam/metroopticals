"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import { getUsers } from "@/features/users/api/user-api";
import { UserQueryParams, UsersResponse } from "@/features/users/types/user";
import {
  setUsersCacheStatus,
  upsertUsersCache,
  invalidateAllUsersCache,
  invalidateUsersCacheKey,
  UsersCacheKey,
} from "@/store/features/users-cache";
import { useAppSelector } from "@/store/store";

const buildUsersCacheKey = (params?: UserQueryParams) => {
  const entries = Object.entries(params || {})
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
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

type UseUsersCacheOptions = {
  staleTimeMs?: number;
};

export const useUsersCache = (
  params?: UserQueryParams,
  options: UseUsersCacheOptions = {}
) => {
  const dispatch = useDispatch();
  const staleTimeMs = options.staleTimeMs ?? 120000;
  const key = useMemo(() => buildUsersCacheKey(params), [params]);
  const entry = useAppSelector((state) => state.usersCache.entries[key]);

  const fetchUsers = useCallback(
    async (force = false) => {
      if (!force && entry?.status === "loading") return;

      dispatch(setUsersCacheStatus({ key, status: "loading", error: null }));
      try {
        const data: UsersResponse = await getUsers(params);
        dispatch(
          upsertUsersCache({
            key,
            items: data.items || [],
            pagination: data.pagination || {
              total: 0,
              page: params?.page ?? 1,
              limit: params?.limit ?? 12,
              pages: 1,
            },
          })
        );
      } catch (error: any) {
        dispatch(
          setUsersCacheStatus({
            key,
            status: "failed",
            error: error?.message || "Failed to load users",
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
      void fetchUsers();
    }
  }, [entry, fetchUsers, key, staleTimeMs]);

  const refresh = useCallback(() => {
    void fetchUsers(true);
  }, [fetchUsers]);

  const invalidateAll = useCallback(() => {
    dispatch(invalidateAllUsersCache());
  }, [dispatch]);

  const invalidateKey = useCallback(() => {
    dispatch(invalidateUsersCacheKey({ key }));
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
