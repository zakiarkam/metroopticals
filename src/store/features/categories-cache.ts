import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Category } from "@/features/categories/types/category";

export type CategoriesCacheKey = string;

export type CategoriesCacheEntry = {
  categories: Category[];
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

type CategoriesCacheState = {
  entries: Record<CategoriesCacheKey, CategoriesCacheEntry | undefined>;
};

const emptyEntry: CategoriesCacheEntry = {
  categories: [],
  pagination: {
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 1,
  },
  status: "idle",
  error: null,
  lastFetched: null,
};

const initialState: CategoriesCacheState = {
  entries: {},
};

const categoriesCache = createSlice({
  name: "categoriesCache",
  initialState,
  reducers: {
    setCategoriesCacheStatus: (
      state,
      action: PayloadAction<{
        key: CategoriesCacheKey;
        status: CategoriesCacheEntry["status"];
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
    upsertCategoriesCache: (
      state,
      action: PayloadAction<{
        key: CategoriesCacheKey;
        categories: Category[];
        pagination: CategoriesCacheEntry["pagination"];
        receivedAt?: number;
      }>
    ) => {
      const { key, categories, pagination, receivedAt } = action.payload;
      state.entries[key] = {
        categories,
        pagination,
        status: "succeeded",
        error: null,
        lastFetched: receivedAt ?? Date.now(),
      };
    },
    invalidateCategoriesCacheKey: (
      state,
      action: PayloadAction<{ key: CategoriesCacheKey }>
    ) => {
      delete state.entries[action.payload.key];
    },
    invalidateAllCategoriesCache: (state) => {
      state.entries = {};
    },
  },
});

export const {
  setCategoriesCacheStatus,
  upsertCategoriesCache,
  invalidateCategoriesCacheKey,
  invalidateAllCategoriesCache,
} = categoriesCache.actions;

export default categoriesCache.reducer;
