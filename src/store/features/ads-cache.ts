import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Advertisement } from "@/features/advertisements/types/advertisement";

export type AdsCacheKey = string;

export type AdsCacheEntry = {
  advertisements: Advertisement[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  lastFetched: number | null;
};

type AdsCacheState = {
  entries: Record<AdsCacheKey, AdsCacheEntry | undefined>;
};

const emptyEntry: AdsCacheEntry = {
  advertisements: [],
  pagination: {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
  status: "idle",
  error: null,
  lastFetched: null,
};

const initialState: AdsCacheState = {
  entries: {},
};

const adsCache = createSlice({
  name: "adsCache",
  initialState,
  reducers: {
    setAdsCacheStatus: (
      state,
      action: PayloadAction<{
        key: AdsCacheKey;
        status: AdsCacheEntry["status"];
        error?: string | null;
      }>
    ) => {
      const { key, status, error } = action.payload;
      const existing = state.entries[key] || { ...emptyEntry };
      state.entries[key] = {
        ...existing,
        status,
        error: error ?? null,
      };
    },
    upsertAdsCache: (
      state,
      action: PayloadAction<{
        key: AdsCacheKey;
        advertisements: Advertisement[];
        pagination: AdsCacheEntry["pagination"];
        receivedAt?: number;
      }>
    ) => {
      const { key, advertisements, pagination, receivedAt } = action.payload;
      state.entries[key] = {
        advertisements,
        pagination,
        status: "succeeded",
        error: null,
        lastFetched: receivedAt ?? Date.now(),
      };
    },
    invalidateAdsCacheKey: (
      state,
      action: PayloadAction<{ key: AdsCacheKey }>
    ) => {
      delete state.entries[action.payload.key];
    },
    invalidateAllAdsCache: (state) => {
      state.entries = {};
    },
  },
});

export const {
  setAdsCacheStatus,
  upsertAdsCache,
  invalidateAdsCacheKey,
  invalidateAllAdsCache,
} = adsCache.actions;

export default adsCache.reducer;
