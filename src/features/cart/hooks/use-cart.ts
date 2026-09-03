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
  setCartItemLens,
} from "@/features/cart/api/cart-api";
import { describePrescription, valuesFromRow } from "@/features/lenses/utils/prescription";
import { toast } from "react-hot-toast";
import { normalizeImageArray } from "@/lib/storageUtils";
import { getEffectiveStock } from "@/features/products/utils/availability";

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
    [],
  );

  const loadCart = useCallback(async () => {
    try {
      if (cartPollInFlight) return;
      cartPollInFlight = true;
      const { cartItems: items } = await getCartItems();
      const mappedItems = items.map((item) => {
        // The line's ceiling is its own colourway's count, not the product
        // total — a black frame in the cart is out of stock when black is,
        // even while tortoise is still on the shelf.
        const lineStock = getEffectiveStock(
          item.product.stock,
          item.product.colorStocks,
          item.color || undefined,
        );
        return {
          id: item.id,
          productId: item.productId,
          title: item.product.title,
          price: item.product.price,
          discountedPrice: item.product.discountedPrice || item.product.price,
          quantity: item.quantity,
          color: item.color || "",
          colorOptions: item.product.frameColors ?? [],
          stock: lineStock,
          status: resolveStatus(item.product.status, lineStock),
          imgs: {
            previews: normalizeImageArray(item.product.images),
            thumbnails: normalizeImageArray(item.product.images),
          },
          // Flattened here rather than in every component that shows a cart
          // row: the row wants a name and a price, not four nested relations.
          lens: item.lensType
            ? {
                lensTypeId: item.lensType.id,
                lensTypeName: item.lensType.name,
                lensTypeSlug: item.lensType.slug,
                designId: item.lensDesign?.id ?? null,
                designName: item.lensDesign?.name ?? null,
                designKind: item.lensDesign?.kind ?? null,
                tintId: item.lensTint?.id ?? null,
                tintName: item.lensTint?.name ?? null,
                tintHex: item.lensTint?.hex ?? null,
                prescriptionId: item.prescription?.id ?? null,
                prescriptionLabel: item.prescription?.label ?? null,
                prescriptionVersion: item.prescription?.version ?? null,
                summary: item.prescription
                  ? describePrescription(valuesFromRow(item.prescription))
                  : null,
                price: item.lensPrice ?? 0,
              }
            : null,
        };
      });
      dispatch(syncCartItems(mappedItems));
    } catch (error) {
      // A signed-out or expired session is not a cart failure — the basket is
      // simply empty until they sign in again. Anything else is worth seeing.
      if ((error as any)?.response?.status !== 401) {
        console.error("Failed to load cart:", error);
      }
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
      color?: string,
    ) => {
      if (status !== "authenticated") {
        toast.error("Sign in to add items to your cart");
        if (typeof window !== "undefined") {
          const back = window.location.pathname + window.location.search;
          window.location.assign(`/log-in?redirect=${encodeURIComponent(back)}`);
        }
        return false;
      }

      const loadingToast = toast.loading("Adding to cart...");
      try {

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
          }),
        );

        toast.dismiss(loadingToast);
        toast.success("Added to cart!");

        await loadCart();
        return true;
      } catch (error: any) {
        toast.dismiss(loadingToast);
        const message =
          error.response?.data?.message || "Failed to add to cart";
        toast.error(message);
        return false;
      }
    },
    [status, dispatch, loadCart, resolveStatus],
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
    [dispatch, loadCart, cartItems],
  );

  // Drop the server-backed cart when the user signs out.
  useEffect(() => {
    if (status === "unauthenticated" && synced) {
      dispatch(removeAllItemsFromCart());
    }
  }, [dispatch, status, synced]);

  const handleRemoveFromCart = useCallback(
    async (id: number) => {
      const loadingToast = toast.loading("Removing item...");
      try {

        // Optimistic update
        dispatch(removeItemFromCart(id));

        await removeFromCart(id);

        toast.dismiss(loadingToast);
        toast.success("Removed from cart");

        // Sync with server
        await loadCart();
        return true;
      } catch (error) {
        toast.dismiss(loadingToast);
        toast.error("Failed to remove item");
        // Revert on error
        await loadCart();
        return false;
      }
    },
    [dispatch, loadCart],
  );

  /**
   * Fit lenses to a line, or take them off.
   *
   * The cart is reloaded rather than patched in place because the server may
   * have merged this line into an identical one — two pairs of the same frame
   * with the same lenses are one line of quantity two.
   */
  const handleSetLens = useCallback(
    async (
      itemId: number,
      selection: {
        lensTypeId: number | null;
        lensDesignId?: number | null;
        lensTintId?: number | null;
        prescriptionId?: number | null;
      },
    ) => {
      const loadingToast = toast.loading(
        selection.lensTypeId ? "Adding lenses…" : "Removing lenses…",
      );
      try {
        await setCartItemLens(itemId, selection);
        toast.dismiss(loadingToast);
        toast.success(
          selection.lensTypeId ? "Lenses added" : "Lenses removed",
        );
        await loadCart();
        return true;
      } catch (error: any) {
        toast.dismiss(loadingToast);
        toast.error(
          error?.response?.data?.message || "Couldn't update the lenses",
        );
        return false;
      }
    },
    [loadCart],
  );

  const handleClearCart = useCallback(async () => {
    const loadingToast = toast.loading("Clearing cart...");
    try {

      await clearCart();
      dispatch(removeAllItemsFromCart());

      toast.dismiss(loadingToast);
      toast.success("Cart cleared");
      return true;
    } catch (error) {
      toast.dismiss(loadingToast);
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
    setLens: handleSetLens,
    clearCart: handleClearCart,
    refreshCart: loadCart,
  };
};
