import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User } from "@/features/users/types/user";

export type UsersCacheKey = string;

export type UsersCacheEntry = {
  items: User[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  lastFetched: number | null;
};

type UsersCacheState = {
  entries: Record<UsersCacheKey, UsersCacheEntry | undefined>;
};

const emptyEntry: UsersCacheEntry = {
  items: [],
  pagination: {
    total: 0,
    page: 1,
    limit: 12,
    pages: 1,
  },
  status: "idle",
  error: null,
  lastFetched: null,
};

const initialState: UsersCacheState = {
  entries: {},
};

const usersCache = createSlice({
  name: "usersCache",
  initialState,
  reducers: {
    setUsersCacheStatus: (
      state,
      action: PayloadAction<{
        key: UsersCacheKey;
        status: UsersCacheEntry["status"];
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
    upsertUsersCache: (
      state,
      action: PayloadAction<{
        key: UsersCacheKey;
        items: User[];
        pagination: UsersCacheEntry["pagination"];
        receivedAt?: number;
      }>
    ) => {
      const { key, items, pagination, receivedAt } = action.payload;
      state.entries[key] = {
        items,
        pagination,
        status: "succeeded",
        error: null,
        lastFetched: receivedAt ?? Date.now(),
      };
    },
    invalidateUsersCacheKey: (
      state,
      action: PayloadAction<{ key: UsersCacheKey }>
    ) => {
      delete state.entries[action.payload.key];
    },
    invalidateAllUsersCache: (state) => {
      state.entries = {};
    },
  },
});

export const {
  setUsersCacheStatus,
  upsertUsersCache,
  invalidateUsersCacheKey,
  invalidateAllUsersCache,
} = usersCache.actions;

export default usersCache.reducer;
