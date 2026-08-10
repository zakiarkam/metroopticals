import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DashboardData } from "@/features/dashboard/types/dashboard";

export type DashboardCacheKey = string;

export type DashboardCacheEntry = {
  data: DashboardData | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  lastFetched: number | null;
};

type DashboardCacheState = {
  entries: Record<DashboardCacheKey, DashboardCacheEntry | undefined>;
};

const emptyEntry: DashboardCacheEntry = {
  data: null,
  status: "idle",
  error: null,
  lastFetched: null,
};

const initialState: DashboardCacheState = {
  entries: {},
};

const dashboardCache = createSlice({
  name: "dashboardCache",
  initialState,
  reducers: {
    setDashboardCacheStatus: (
      state,
      action: PayloadAction<{
        key: DashboardCacheKey;
        status: DashboardCacheEntry["status"];
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
    upsertDashboardCache: (
      state,
      action: PayloadAction<{
        key: DashboardCacheKey;
        data: DashboardData;
        receivedAt?: number;
      }>
    ) => {
      const { key, data, receivedAt } = action.payload;
      state.entries[key] = {
        data,
        status: "succeeded",
        error: null,
        lastFetched: receivedAt ?? Date.now(),
      };
    },
    invalidateDashboardCacheKey: (
      state,
      action: PayloadAction<{ key: DashboardCacheKey }>
    ) => {
      delete state.entries[action.payload.key];
    },
    invalidateAllDashboardCache: (state) => {
      state.entries = {};
    },
  },
});

export const {
  setDashboardCacheStatus,
  upsertDashboardCache,
  invalidateDashboardCacheKey,
  invalidateAllDashboardCache,
} = dashboardCache.actions;

export default dashboardCache.reducer;
