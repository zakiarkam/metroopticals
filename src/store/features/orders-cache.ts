import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Order } from "@/features/orders/types/order";

export type OrdersCacheKey = string;

export type OrdersCacheEntry = {
  orders: Order[];
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

type OrdersCacheState = {
  entries: Record<OrdersCacheKey, OrdersCacheEntry | undefined>;
};

const emptyEntry: OrdersCacheEntry = {
  orders: [],
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

const initialState: OrdersCacheState = {
  entries: {},
};

const ordersCache = createSlice({
  name: "ordersCache",
  initialState,
  reducers: {
    setOrdersCacheStatus: (
      state,
      action: PayloadAction<{
        key: OrdersCacheKey;
        status: OrdersCacheEntry["status"];
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
    upsertOrdersCache: (
      state,
      action: PayloadAction<{
        key: OrdersCacheKey;
        orders: Order[];
        pagination: OrdersCacheEntry["pagination"];
        receivedAt?: number;
      }>
    ) => {
      const { key, orders, pagination, receivedAt } = action.payload;
      state.entries[key] = {
        orders,
        pagination,
        status: "succeeded",
        error: null,
        lastFetched: receivedAt ?? Date.now(),
      };
    },
    invalidateOrdersCacheKey: (
      state,
      action: PayloadAction<{ key: OrdersCacheKey }>
    ) => {
      delete state.entries[action.payload.key];
    },
    invalidateAllOrdersCache: (state) => {
      state.entries = {};
    },
  },
});

export const {
  setOrdersCacheStatus,
  upsertOrdersCache,
  invalidateOrdersCacheKey,
  invalidateAllOrdersCache,
} = ordersCache.actions;

export default ordersCache.reducer;
