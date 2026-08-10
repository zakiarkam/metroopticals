import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Product } from "@/features/products/types/product";

export type ProductsCacheKey = string;

export type ProductsCacheEntry = {
  products: Product[];
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

type ProductsCacheState = {
  entries: Record<ProductsCacheKey, ProductsCacheEntry | undefined>;
};

const emptyEntry: ProductsCacheEntry = {
  products: [],
  pagination: {
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 1,
  },
  status: "idle",
  error: null,
  lastFetched: null,
};

const initialState: ProductsCacheState = {
  entries: {},
};

const productsCache = createSlice({
  name: "productsCache",
  initialState,
  reducers: {
    setProductsCacheStatus: (
      state,
      action: PayloadAction<{
        key: ProductsCacheKey;
        status: ProductsCacheEntry["status"];
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
    upsertProductsCache: (
      state,
      action: PayloadAction<{
        key: ProductsCacheKey;
        products: Product[];
        pagination: ProductsCacheEntry["pagination"];
        receivedAt?: number;
      }>
    ) => {
      const { key, products, pagination, receivedAt } = action.payload;
      state.entries[key] = {
        products,
        pagination,
        status: "succeeded",
        error: null,
        lastFetched: receivedAt ?? Date.now(),
      };
    },
    invalidateProductsCacheKey: (
      state,
      action: PayloadAction<{ key: ProductsCacheKey }>
    ) => {
      delete state.entries[action.payload.key];
    },
    invalidateAllProductsCache: (state) => {
      state.entries = {};
    },
  },
});

export const {
  setProductsCacheStatus,
  upsertProductsCache,
  invalidateProductsCacheKey,
  invalidateAllProductsCache,
} = productsCache.actions;

export default productsCache.reducer;
