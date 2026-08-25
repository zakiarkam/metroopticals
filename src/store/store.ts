import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";

import quickViewReducer from "./features/quickView-slice";
import cartReducer from "./features/cart-slice";
import wishlistReducer from "./features/wishlist-slice";
import productDetailsReducer from "./features/product-details";
import categoriesCacheReducer from "./features/categories-cache";
import { api } from "./services/api";

import { TypedUseSelectorHook, useSelector } from "react-redux";

const CART_STORAGE_KEY = "metro_cart_v1";
const WISHLIST_STORAGE_KEY = "metro_wishlist_v1";
const loadCartFromStorage = () => {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Failed to load cart from storage:", error);
    return undefined;
  }
};
const loadWishlistFromStorage = () => {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Failed to load wishlist from storage:", error);
    return undefined;
  }
};
const preloadedCart = loadCartFromStorage();
const preloadedWishlist = loadWishlistFromStorage();
const preloadedState =
  preloadedCart || preloadedWishlist
    ? {
        cartReducer: preloadedCart,
        wishlistReducer: preloadedWishlist,
      }
    : undefined;

export const store = configureStore({
  reducer: {
    quickViewReducer,
    cartReducer,
    wishlistReducer,
    productDetailsReducer,
    categoriesCache: categoriesCacheReducer,
    [api.reducerPath]: api.reducer,
  },
  preloadedState,
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
