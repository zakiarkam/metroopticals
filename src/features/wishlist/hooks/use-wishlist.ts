"use client";

import { useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useDispatch } from "react-redux";
import { AppDispatch, useAppSelector } from "@/store/store";
import {
  addItemToWishlist,
  syncWishlistItems,
  removeItemFromWishlist,
  removeAllItemsFromWishlist,
} from "@/store/features/wishlist-slice";
import {
  getWishlistItems,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
} from "@/features/wishlist/api/wishlist-api";
import { toast } from "react-hot-toast";

type WishlistProductInput = {
  id: number;
  title: string;
  price: number;
  discountedPrice: number | null;
  images: string[];
  stock?: number;
  status?: string | null;
};

let wishlistPollIntervalId: number | null = null;
let wishlistPollSubscribers = 0;
let wishlistPollInFlight = false;

export const useWishlist = () => {
  const { status } = useSession();
  const dispatch = useDispatch<AppDispatch>();
  const wishlistItems = useAppSelector((state) => state.wishlistReducer.items);
  const synced = useAppSelector((state) => state.wishlistReducer.synced);
  const lastFetched = useAppSelector(
    (state) => state.wishlistReducer.lastFetched
  );
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

  const mapWishlistItem = useCallback((item: any) => {
    const rawImages = Array.isArray(item.product.images)
      ? item.product.images
      : [];
    const images = rawImages
      .map((img) => (typeof img === "string" ? img : ""))
      .filter(Boolean);
    const stock =
      typeof item.product.stock === "number" ? item.product.stock : 0;

    return {
      id: item.product.id,
      productId: item.product.id,
      wishlistItemId: item.id,
      title: item.product.title,
      price: item.product.price,
      discountedPrice: item.product.discountedPrice || item.product.price,
      quantity: 1,
      stock,
      status: resolveStatus(item.product.status, stock),
      imgs: {
        previews: images,
        thumbnails: images,
      },
    };
  }, [resolveStatus]);

  const loadWishlist = useCallback(async () => {
    try {
      if (wishlistPollInFlight) return;
      wishlistPollInFlight = true;
      const { wishlistItems: items } = await getWishlistItems();
      const mappedItems = items.map(mapWishlistItem);
      dispatch(syncWishlistItems(mappedItems));
    } catch (error) {
      console.error("Failed to load wishlist:", error);
    } finally {
      wishlistPollInFlight = false;
    }
  }, [dispatch, mapWishlistItem]);

  // Load wishlist when authenticated
  useEffect(() => {
    const hasCached = wishlistItems.length > 0 && !!lastFetched;
    const isStale = !lastFetched || Date.now() - lastFetched > staleTimeMs;
    if (
      status === "authenticated" &&
      ((!synced && !hasCached) || isStale) &&
      !hasRequestedRef.current
    ) {
      hasRequestedRef.current = true;
      void loadWishlist();
    }
  }, [status, synced, lastFetched, loadWishlist, wishlistItems, staleTimeMs]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const handleRefresh = () => {
      const isStale = !lastFetched || Date.now() - lastFetched > staleTimeMs;
      if (isStale) {
        void loadWishlist();
      }
    };

    window.addEventListener("focus", handleRefresh);
    document.addEventListener("visibilitychange", handleRefresh);

    return () => {
      window.removeEventListener("focus", handleRefresh);
      document.removeEventListener("visibilitychange", handleRefresh);
    };
  }, [status, lastFetched, loadWishlist, staleTimeMs]);

  useEffect(() => {
    if (status !== "authenticated" || wishlistItems.length === 0) return;

    wishlistPollSubscribers += 1;

    if (!wishlistPollIntervalId) {
      wishlistPollIntervalId = window.setInterval(() => {
        if (document.visibilityState !== "visible") return;
        void loadWishlist();
      }, pollIntervalMs);
    }

    return () => {
      wishlistPollSubscribers -= 1;
      if (wishlistPollSubscribers <= 0 && wishlistPollIntervalId) {
        window.clearInterval(wishlistPollIntervalId);
        wishlistPollIntervalId = null;
        wishlistPollSubscribers = 0;
      }
    };
  }, [status, wishlistItems.length, loadWishlist, pollIntervalMs]);

  // Clear local wishlist when user logs out
  useEffect(() => {
    if (status === "unauthenticated" && synced) {
      const hasServerItems = wishlistItems.some(
        (item) => !!item.wishlistItemId
      );
      if (hasServerItems) {
        dispatch(removeAllItemsFromWishlist());
      }
    }
  }, [dispatch, status, synced, wishlistItems]);

  const handleAddToWishlist = useCallback(
    async (product: WishlistProductInput) => {
      if (!product?.id) {
        toast.error("Product information is missing");
        return false;
      }

      if (status !== "authenticated") {
        toast.error("Please login to add items to wishlist");
        if (typeof window !== "undefined") {
          const back = window.location.pathname + window.location.search;
          window.location.assign(`/log-in?redirect=${encodeURIComponent(back)}`);
        }
        return false;
      }

      let loadingToast: string | undefined;

      try {
        loadingToast = toast.loading("Adding to wishlist...");
        const { wishlistItem } = await addToWishlist({ productId: product.id });

        const mappedItem = mapWishlistItem({
          ...wishlistItem,
          product: {
            ...wishlistItem.product,
            images: wishlistItem.product.images || product.images || [],
            stock:
              typeof wishlistItem.product.stock === "number"
                ? wishlistItem.product.stock
                : product.stock || 0,
            status: wishlistItem.product.status || product.status,
          },
        });

        dispatch(addItemToWishlist(mappedItem));

        toast.dismiss(loadingToast);
        toast.success("Added to wishlist!");

        await loadWishlist();
        return true;
      } catch (error: any) {
        if (loadingToast) {
          toast.dismiss(loadingToast);
        }
        const message =
          error?.response?.data?.message || "Failed to add to wishlist";
        toast.error(message);
        return false;
      }
    },
    [status, dispatch, loadWishlist, mapWishlistItem]
  );

  const handleRemoveFromWishlist = useCallback(
    async (productId: number) => {
      const wishlistEntry = wishlistItems.find(
        (item) => item.id === productId || item.productId === productId
      );

      if (!wishlistEntry) {
        toast.error("Item not found in wishlist");
        return false;
      }

      let loadingToast: string | undefined;

      try {
        loadingToast = toast.loading("Removing item...");

        // Optimistic update
        dispatch(removeItemFromWishlist(wishlistEntry.id));

        await removeFromWishlist(
          wishlistEntry.wishlistItemId || wishlistEntry.id
        );

        toast.dismiss(loadingToast);
        toast.success("Removed from wishlist");
        await loadWishlist();
        return true;
      } catch (error) {
        if (loadingToast) {
          toast.dismiss(loadingToast);
        }
        toast.error("Failed to remove item");
        await loadWishlist();
        return false;
      }
    },
    [dispatch, loadWishlist, wishlistItems]
  );

  const handleClearWishlist = useCallback(async () => {
    let loadingToast: string | undefined;

    try {
      loadingToast = toast.loading("Clearing wishlist...");
      await clearWishlist();
      dispatch(removeAllItemsFromWishlist());
      toast.dismiss(loadingToast);
      toast.success("Wishlist cleared");
      return true;
    } catch (error) {
      if (loadingToast) {
        toast.dismiss(loadingToast);
      }
      toast.error("Failed to clear wishlist");
      return false;
    }
  }, [dispatch]);

  const isInWishlist = useCallback(
    (productId: number | undefined) => {
      if (!productId) return false;
      return wishlistItems.some(
        (item) => item.id === productId || item.productId === productId
      );
    },
    [wishlistItems]
  );

  return {
    wishlistItems,
    isAuthenticated: status === "authenticated",
    addToWishlist: handleAddToWishlist,
    removeFromWishlist: handleRemoveFromWishlist,
    clearWishlist: handleClearWishlist,
    isInWishlist,
    refreshWishlist: loadWishlist,
  };
};
