"use client";

import { useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useDispatch } from "react-redux";
import { AppDispatch, useAppSelector } from "@/store/store";
import {
  addItemToCart,
  syncCartItems,
  removeItemFromCart,
  updateCartItemQuantity,
  removeAllItemsFromCart,
} from "@/store/features/cart-slice";
import {
  getCartItems,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from "@/features/cart/api/cart-api";
import { toast } from "react-hot-toast";
import { normalizeImageArray } from "@/lib/storageUtils";

let cartPollIntervalId: number | null = null;
let cartPollSubscribers = 0;
let cartPollInFlight = false;

export const useCart = () => {
  const { data: session, status } = useSession();
  const dispatch = useDispatch<AppDispatch>();
  const cartItems = useAppSelector((state) => state.cartReducer.items);
  const synced = useAppSelector((state) => state.cartReducer.synced);
  const lastFetched = useAppSelector((state) => state.cartReducer.lastFetched);
  const hasRequestedRef = useRef(false);
  const staleTimeMs = 10 * 60 * 1000;
  const pollIntervalMs = 60 * 1000;

  const resolveStatus = useCallback(
    (statusValue?: string | null, stock?: number) => {
      const normalized = (statusValue || "").toUpperCase();
      if (normalized === "INACTIVE" || normalized === "OUT_OF_STOCK") {
        return normalized;
      }
      if (typeof stock === "number" && stock <= 0) {
        return "OUT_OF_STOCK";
      }
      return "ACTIVE";
    },
    []
  );

  const loadCart = useCallback(async () => {
    try {
      if (cartPollInFlight) return;
      cartPollInFlight = true;
      const { cartItems: items } = await getCartItems();
      const mappedItems = items.map((item) => ({
        id: item.id,
        productId: item.productId,
        title: item.product.title,
        price: item.product.price,
        discountedPrice: item.product.discountedPrice || item.product.price,
        quantity: item.quantity,
        color: item.color || "",
        colorOptions: item.product.frameColors ?? [],
        stock: item.product.stock,
        status: resolveStatus(item.product.status, item.product.stock),
        imgs: {
          previews: normalizeImageArray(item.product.images),
          thumbnails: normalizeImageArray(item.product.images),
        },
      }));
      dispatch(syncCartItems(mappedItems));
    } catch (error) {
      console.error("Failed to load cart:", error);
    } finally {
      cartPollInFlight = false;
    }
  }, [dispatch, resolveStatus]);

  useEffect(() => {
    const isStale = !lastFetched || Date.now() - lastFetched > staleTimeMs;
    if (
      status === "authenticated" &&
      (!synced || isStale) &&
      !hasRequestedRef.current
    ) {
      hasRequestedRef.current = true;
      void loadCart();
    }
  }, [status, synced, lastFetched, loadCart, staleTimeMs]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const handleRefresh = () => {
      const isStale = !lastFetched || Date.now() - lastFetched > staleTimeMs;
      if (isStale) {
        void loadCart();
      }
    };

    window.addEventListener("focus", handleRefresh);
    document.addEventListener("visibilitychange", handleRefresh);

    return () => {
      window.removeEventListener("focus", handleRefresh);
      document.removeEventListener("visibilitychange", handleRefresh);
    };
  }, [status, lastFetched, loadCart, staleTimeMs]);

  useEffect(() => {
    if (status !== "authenticated" || cartItems.length === 0) return;

    cartPollSubscribers += 1;

    if (!cartPollIntervalId) {
      cartPollIntervalId = window.setInterval(() => {
        if (document.visibilityState !== "visible") return;
        void loadCart();
      }, pollIntervalMs);
    }

    return () => {
      cartPollSubscribers -= 1;
      if (cartPollSubscribers <= 0 && cartPollIntervalId) {
        window.clearInterval(cartPollIntervalId);
        cartPollIntervalId = null;
        cartPollSubscribers = 0;
      }
    };
  }, [status, cartItems.length, loadCart, pollIntervalMs]);

  const handleAddToCart = useCallback(
    async (
      product: {
        id: number;
        title: string;
        price: number;
        discountedPrice: number | null;
        images: string[];
        stock: number;
        status?: string | null;
        frameColors?: string[] | null;
      },
      quantity: number = 1,
      /**
       * The colourway the shopper picked. Omitted from listing cards, where
       * there is no choice on screen — the server then settles on the first
       * colour the product lists so the line is never colour-less.
       */
      color?: string
    ) => {
      if (status !== "authenticated") {
        toast.error("Please login to add items to cart");
        return false;
      }

      try {
        const loadingToast = toast.loading("Adding to cart...");

        const response = await addToCart({
          productId: product.id,
          quantity,
          ...(color ? { color } : {}),
        });

        const normalizedImages = normalizeImageArray(product.images);

        dispatch(
          addItemToCart({
            id: response.cartItem.id,
            productId: product.id,
            title: product.title,
            price: product.price,
            discountedPrice: product.discountedPrice || product.price,
            quantity,
            color: response.cartItem?.color ?? color ?? "",
            colorOptions: product.frameColors ?? [],
            imgs: {
              previews: normalizedImages,
              thumbnails: normalizedImages,
            },
            stock: product.stock,
            status: resolveStatus(product.status, product.stock),
          })
        );

        toast.dismiss(loadingToast);
        toast.success("Added to cart!");

        await loadCart();
        return true;
      } catch (error: any) {
        const message =
          error.response?.data?.message || "Failed to add to cart";
        toast.error(message);
        return false;
      }
    },
    [status, dispatch, loadCart, resolveStatus]
  );

  const handleUpdateQuantity = useCallback(
    async (id: number, quantity: number, color?: string) => {
      if (quantity < 1) {
        toast.error("Quantity must be at least 1");
        return false;
      }

      const existingItem = cartItems.find((item) => item.id === id);
      if (
        existingItem &&
        typeof existingItem.stock === "number" &&
        quantity > existingItem.stock
      ) {
        toast.error("Maximum stock reached");
        return false;
      }

      try {
        // Optimistic update
        dispatch(updateCartItemQuantity({ id, quantity }));

        await updateCartItem(id, {
          quantity,
          ...(color !== undefined ? { color } : {}),
        });
        toast.success("Cart updated");

        // Sync with server
        await loadCart();
        return true;
      } catch (error) {
        toast.error("Failed to update quantity");
        // Revert on error
        await loadCart();
        return false;
      }
    },
    [dispatch, loadCart, cartItems]
  );

  const handleRemoveFromCart = useCallback(
    async (id: number) => {
      try {
        const loadingToast = toast.loading("Removing item...");

        // Optimistic update
        dispatch(removeItemFromCart(id));

        await removeFromCart(id);

        toast.dismiss(loadingToast);
        toast.success("Removed from cart");

        // Sync with server
        await loadCart();
        return true;
      } catch (error) {
        toast.error("Failed to remove item");
        // Revert on error
        await loadCart();
        return false;
      }
    },
    [dispatch, loadCart]
  );

  const handleClearCart = useCallback(async () => {
    try {
      const loadingToast = toast.loading("Clearing cart...");

      await clearCart();
      dispatch(removeAllItemsFromCart());

      toast.dismiss(loadingToast);
      toast.success("Cart cleared");
      return true;
    } catch (error) {
      toast.error("Failed to clear cart");
      return false;
    }
  }, [dispatch]);

  return {
    cartItems,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    addToCart: handleAddToCart,
    updateQuantity: handleUpdateQuantity,
    removeFromCart: handleRemoveFromCart,
    clearCart: handleClearCart,
    refreshCart: loadCart,
  };
};
