import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";

import quickViewReducer from "./features/quickView-slice";
import cartReducer, { syncCartItems } from "./features/cart-slice";
import wishlistReducer, { syncWishlistItems } from "./features/wishlist-slice";
import productDetailsReducer from "./features/product-details";
import categoriesCacheReducer from "./features/categories-cache";
import { api } from "./services/api";

import { TypedUseSelectorHook, useSelector } from "react-redux";

const CART_STORAGE_KEY = "metro_cart_v1";
const WISHLIST_STORAGE_KEY = "metro_wishlist_v1";

const readStorage = (key: string): { items?: unknown } | undefined => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
};

// Called after mount so server and first client render agree (no hydration mismatch).
export const hydrateFromStorage = () => {
  if (typeof window === "undefined") return;
  const cart = readStorage(CART_STORAGE_KEY);
  if (Array.isArray(cart?.items)) store.dispatch(syncCartItems(cart.items));
  const wishlist = readStorage(WISHLIST_STORAGE_KEY);
  if (Array.isArray(wishlist?.items)) {
    store.dispatch(syncWishlistItems(wishlist.items));
  }
};

export const store = configureStore({
  reducer: {
    quickViewReducer,
    cartReducer,
    wishlistReducer,
    productDetailsReducer,
    categoriesCache: categoriesCacheReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
});

// Enable refetchOnFocus/refetchOnReconnect behaviors
setupListeners(store.dispatch);

if (typeof window !== "undefined") {
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  store.subscribe(() => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        const cartState = store.getState().cartReducer;
        window.localStorage.setItem(
          CART_STORAGE_KEY,
          JSON.stringify(cartState)
        );
        const wishlistState = store.getState().wishlistReducer;
        window.localStorage.setItem(
          WISHLIST_STORAGE_KEY,
          JSON.stringify(wishlistState)
        );
      } catch (error) {
        console.warn("Failed to save cache to storage:", error);
      }
    }, 300);
  });
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
