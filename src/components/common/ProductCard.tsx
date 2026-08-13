"use client";

import React, { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useDispatch } from "react-redux";
import { Eye, Heart, Loader2, ShoppingBag } from "lucide-react";

import { useModalContext } from "@/app/context/QuickViewModalContext";
import { updateQuickView } from "@/store/features/quickView-slice";
import { updateproductDetails } from "@/store/features/product-details";
import type { AppDispatch } from "@/store/store";
import { useCart } from "@/features/cart/hooks/use-cart";
import { useWishlist } from "@/features/wishlist/hooks/use-wishlist";
import { useDiscountVisibility } from "@/features/cart/hooks/use-discount";
import { resolveDisplayPrice } from "@/lib/utils/price";
import { normalizeImageArray } from "@/lib/storageUtils";
import {
  AVAILABILITY_PILL_CLASSES,
  getAvailability,
} from "@/features/products/utils/availability";

export const PRODUCT_FALLBACK_IMAGE = "/images/placeholder-product.jpg";

/**
 * The one product card used across the storefront — home carousels, best
 * sellers and the shop grid all render this. Previously each of those owned a
 * near-identical copy, which is why hover behaviour, price formatting and
 * stock wording were all slightly different depending on where you looked.
 *
 * Layout is a fixed-ratio media plate over a text block, so cards in a row line
 * up regardless of title length or whether a description is present.
 */

export type ProductCardItem = {
  id: number;
  title: string;
  price: number;
  discountedPrice?: number | null;
  images?: string[] | null;
  stock?: number | null;
  status?: string | null;
  description?: string | null;
  categoryName?: string | null;
  brandName?: string | null;
  /** Raw record forwarded to quick view / details so nothing is lost. */
  raw?: unknown;
};

const money = (value: number) =>
  `Rs ${Number(value ?? 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function ProductCard({
  item,
  showDescription = false,
  className = "",
}: {
  item: ProductCardItem;
  /** Grid listings stay tight; home carousels can afford two lines of copy. */
  showDescription?: boolean;
  className?: string;
}) {
  const { openModal } = useModalContext();
  const dispatch = useDispatch<AppDispatch>();
  const { addToCart } = useCart();
  const { addToWishlist, isInWishlist } = useWishlist();
  const canViewDiscount = useDiscountVisibility();

  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isSavingWishlist, setIsSavingWishlist] = useState(false);

  const images = useMemo(
    () => normalizeImageArray(item.images ?? []),
    [item.images]
  );
  const primaryImage = images[0] ?? PRODUCT_FALLBACK_IMAGE;
  const hoverImage = images[1];

  const { displayPrice, hasDiscount, discountPercent } = resolveDisplayPrice(
    item.price,
    item.discountedPrice ?? null,
    canViewDiscount
  );

  const availability = getAvailability(item.status, item.stock);
  const saved = isInWishlist(item.id);

  const quickViewPayload = useMemo(
    () => ({
      ...(item.raw as Record<string, unknown> | undefined),
      id: item.id,
      title: item.title,
      price: item.price,
      discountedPrice: item.discountedPrice ?? item.price,
      images,
      stock: item.stock ?? 0,
      status: item.status,
    }),
    [images, item]
  );

  const openQuickView = useCallback(() => {
    dispatch(updateQuickView(quickViewPayload as never));
    openModal();
  }, [dispatch, openModal, quickViewPayload]);

  const handleAddToCart = useCallback(async () => {
    if (isAddingToCart || !availability.canBuy) return;
    setIsAddingToCart(true);
    await addToCart(
      {
        id: item.id,
        title: item.title,
        price: item.price,
        discountedPrice: item.discountedPrice ?? item.price,
        images,
        stock: item.stock ?? 0,
      } as never,
      1
    );
    setIsAddingToCart(false);
  }, [addToCart, availability.canBuy, images, isAddingToCart, item]);

  const handleAddToWishlist = useCallback(async () => {
    if (isSavingWishlist || saved) return;
    setIsSavingWishlist(true);
    await addToWishlist({
      id: item.id,
      title: item.title,
      price: item.price,
      discountedPrice: item.discountedPrice ?? item.price,
      images,
      stock: item.stock ?? 0,
    } as never);
    setIsSavingWishlist(false);
  }, [addToWishlist, images, isSavingWishlist, item, saved]);

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-3 bg-gray-2 shadow-2 transition-all duration-300 hover:-translate-y-1 hover:border-blue/45 hover:shadow-gold ${className}`}
    >
      {/* ---------------- media ---------------- */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-1">
        {/* gold pool behind the frame, revealed on hover */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 55%, rgba(192,156,108,0.20) 0%, transparent 70%)",
          }}
        />

        <Link
          href={`/shop-details/${item.id}`}
          onClick={() => dispatch(updateproductDetails(quickViewPayload as never))}
          aria-label={item.title}
          className="absolute inset-0 z-10 flex items-center justify-center p-6"
        >
          <Image
            src={primaryImage}
            alt={item.title}
            width={520}
            height={390}
            sizes="(max-width: 640px) 90vw, (max-width: 1280px) 45vw, 24vw"
            className={`h-full w-full object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.55)] transition-all duration-500 ease-out group-hover:scale-[1.06] ${
              hoverImage ? "group-hover:opacity-0" : ""
            }`}
          />
          {hoverImage && (
            <Image
              src={hoverImage}
              alt=""
              aria-hidden
              width={520}
              height={390}
              sizes="(max-width: 640px) 90vw, (max-width: 1280px) 45vw, 24vw"
              className="absolute inset-0 m-auto h-[calc(100%-3rem)] w-[calc(100%-3rem)] object-contain opacity-0 drop-shadow-[0_18px_28px_rgba(0,0,0,0.55)] transition-opacity duration-500 group-hover:opacity-100"
            />
          )}
        </Link>

        {/* discount flag */}
        {hasDiscount && discountPercent ? (
          <span className="absolute left-3 top-3 z-20 rounded-full bg-blue px-2.5 py-1 text-[11px] font-bold tracking-wide text-gray-1">
            −{discountPercent}%
          </span>
        ) : null}

        {/* availability chip */}
        <span
          className={`absolute right-3 top-3 z-20 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] backdrop-blur-sm ${
            AVAILABILITY_PILL_CLASSES[availability.tone]
          }`}
        >
          {availability.label}
        </span>

        {/* hover tools */}
        <div className="absolute inset-x-0 bottom-0 z-20 flex translate-y-3 items-center justify-center gap-2 p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <button
            type="button"
            onClick={openQuickView}
            aria-label={`Quick view ${item.title}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-3 bg-gray-2/95 text-dark backdrop-blur transition-colors hover:border-blue hover:text-blue"
          >
            <Eye className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={handleAddToWishlist}
            disabled={isSavingWishlist || saved}
            aria-label={saved ? "Saved to wishlist" : `Save ${item.title}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-3 bg-gray-2/95 text-dark backdrop-blur transition-colors hover:border-blue hover:text-blue disabled:cursor-not-allowed disabled:border-blue/40 disabled:text-blue"
          >
            <Heart className={`h-[18px] w-[18px] ${saved ? "fill-blue" : ""}`} />
          </button>
        </div>
      </div>

      {/* ---------------- body ---------------- */}
      <div className="flex flex-1 flex-col gap-2.5 border-t border-gray-3 p-5">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-dark-4">
          <span className="truncate">{item.categoryName || "Eyewear"}</span>
          {item.brandName && (
            <>
              <span className="text-gray-4">·</span>
              <span className="truncate text-blue/80">{item.brandName}</span>
            </>
          )}
        </div>

        <h3 className="text-[15px] font-semibold capitalize leading-snug text-dark">
          <Link
            href={`/shop-details/${item.id}`}
            onClick={() =>
              dispatch(updateproductDetails(quickViewPayload as never))
            }
            className="line-clamp-2 transition-colors hover:text-blue"
          >
            {item.title}
          </Link>
        </h3>

        {showDescription && item.description ? (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-body">
            {item.description}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-baseline gap-2 pt-1">
          <span className="text-[17px] font-bold text-dark">
            {money(displayPrice)}
          </span>
          {hasDiscount && (
            <span className="text-[13px] font-medium text-dark-5 line-through">
              {money(item.price)}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isAddingToCart || !availability.canBuy}
          className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue text-[13px] font-bold text-gray-1 transition-all duration-200 hover:bg-blue-light disabled:cursor-not-allowed disabled:bg-gray-8 disabled:text-dark-5"
        >
          {isAddingToCart ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Adding…
            </>
          ) : (
            <>
              {availability.canBuy && <ShoppingBag className="h-4 w-4" />}
              {availability.actionLabel}
            </>
          )}
        </button>
      </div>
    </article>
  );
}
