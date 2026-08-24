"use client";

import React, { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useDispatch } from "react-redux";
import { Eye, Heart, Loader2, ShoppingBag, X } from "lucide-react";

import { useModalContext } from "@/app/context/QuickViewModalContext";
import { updateQuickView } from "@/store/features/quickView-slice";
import { updateproductDetails } from "@/store/features/product-details";
import type { AppDispatch } from "@/store/store";
import { StarRating } from "@/features/reviews/components/site/StarRating";
import { useCart } from "@/features/cart/hooks/use-cart";
import { useWishlist } from "@/features/wishlist/hooks/use-wishlist";
import { useDiscountVisibility } from "@/features/cart/hooks/use-discount";
import { formatPrice, resolveDisplayPrice } from "@/lib/utils/price";
import { normalizeImageArray } from "@/lib/storageUtils";
import {
  AVAILABILITY_PILL_CLASSES,
  getAvailability,
} from "@/features/products/utils/availability";

export const PRODUCT_FALLBACK_IMAGE = "/images/placeholder-product.svg";

/**
 * The one product card used across the storefront — home carousels, best
 * sellers, the wishlist and both shop views all render this.
 *
 * `layout` picks the arrangement. The list view used to be a separate 247-line
 * component, so switching the shop from grid to list swapped you between two
 * independently maintained cards that showed different information about the
 * same product. Both layouts now read from the same data and the same actions.
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
  /** Denormalised from published reviews; null until a product has one. */
  rating?: number | null;
  reviewCount?: number | null;
  /** Raw record forwarded to quick view / details so nothing is lost. */
  raw?: unknown;
};

export default function ProductCard({
  item,
  layout = "grid",
  showDescription = false,
  onRemove,
  className = "",
}: {
  item: ProductCardItem;
  /** `list` is the wide row used by the shop's list view. */
  layout?: "grid" | "list";
  /** Grid listings stay tight; home carousels can afford two lines of copy. */
  showDescription?: boolean;
  /** Shown by the wishlist, which needs an "unsave" alongside the usual tools. */
  onRemove?: () => void | Promise<void>;
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
  const detailsHref = `/shop-details/${item.id}`;

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

  const rememberForDetails = useCallback(
    () => dispatch(updateproductDetails(quickViewPayload as never)),
    [dispatch, quickViewPayload]
  );

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

  /* ------------------------------------------------------ shared fragments */

  const meta = (
    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-dark-4">
      <span className="truncate">{item.categoryName || "Eyewear"}</span>
      {item.brandName && (
        <>
          <span aria-hidden className="text-gray-4">
            ·
          </span>
          <span className="truncate text-blue">{item.brandName}</span>
        </>
      )}
    </div>
  );

  const title = (
    <Link
      href={detailsHref}
      onClick={rememberForDetails}
      className="line-clamp-2 transition-colors hover:text-blue"
    >
      {item.title}
    </Link>
  );

  // Only shown once a product has been reviewed — an empty five-star row on
  // every card reads as "nobody rated this", which is worse than nothing.
  const rating =
    item.rating != null && (item.reviewCount ?? 0) > 0 ? (
      <div className="flex items-center gap-1.5">
        <StarRating value={item.rating} size={13} />
        <span className="text-[12px] text-dark-4">({item.reviewCount})</span>
      </div>
    ) : null;

  const price = (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className="text-[17px] font-bold text-dark">
        {formatPrice(displayPrice)}
      </span>
      {hasDiscount && (
        <span className="text-[13px] font-medium text-dark-5 line-through">
          {formatPrice(item.price)}
        </span>
      )}
    </div>
  );

  const addToCartButton = (className: string) => (
    <button
      type="button"
      onClick={handleAddToCart}
      disabled={isAddingToCart || !availability.canBuy}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue text-[13px] font-bold text-white transition-colors duration-200 hover:bg-blue-dark disabled:cursor-not-allowed disabled:bg-gray-8 disabled:text-dark-5 ${className}`}
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
  );

  const iconButtonClass =
    "inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-3 bg-gray-2/95 text-dark backdrop-blur transition-colors hover:border-blue hover:text-blue disabled:cursor-not-allowed disabled:border-blue/40 disabled:text-blue";

  const quickViewButton = (
    <button
      type="button"
      onClick={openQuickView}
      aria-label={`Quick view ${item.title}`}
      className={iconButtonClass}
    >
      <Eye className="h-[18px] w-[18px]" />
    </button>
  );

  const wishlistButton = (
    <button
      type="button"
      onClick={handleAddToWishlist}
      disabled={isSavingWishlist || saved}
      aria-label={saved ? "Saved to wishlist" : `Save ${item.title}`}
      className={iconButtonClass}
    >
      <Heart className={`h-[18px] w-[18px] ${saved ? "fill-blue" : ""}`} />
    </button>
  );

  const removeButton = onRemove ? (
    <button
      type="button"
      onClick={() => void onRemove()}
      aria-label={`Remove ${item.title}`}
      className={iconButtonClass}
    >
      <X className="h-[18px] w-[18px]" />
    </button>
  ) : null;

  const discountFlag =
    hasDiscount && discountPercent ? (
      <span className="inline-block whitespace-nowrap rounded-full bg-blue px-2.5 py-1 text-[11px] font-bold tracking-wide text-white">
        {discountPercent}% off
      </span>
    ) : null;

  const availabilityChip = (
    <span
      className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${
        AVAILABILITY_PILL_CLASSES[availability.tone]
      }`}
    >
      {availability.label}
    </span>
  );

  /* ------------------------------------------------------------ list view */

  if (layout === "list") {
    return (
      <article
        className={`group flex flex-col gap-5 rounded-2xl border border-gray-3 bg-gray-2 p-4 shadow-2 transition-colors hover:border-blue/45 sm:flex-row sm:p-5 ${className}`}
      >
        <Link
          href={detailsHref}
          onClick={rememberForDetails}
          aria-label={item.title}
          className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-gray-1 sm:w-[240px]"
        >
          <Image
            src={primaryImage}
            alt={item.title}
            fill
            sizes="240px"
            className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {meta}
            {discountFlag}
            {availabilityChip}
          </div>

          <h3 className="text-[16px] font-semibold capitalize leading-snug text-dark">
            {title}
          </h3>

          {rating}

          {item.description && (
            <p className="line-clamp-2 text-[13.5px] leading-relaxed text-body">
              {item.description}
            </p>
          )}

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
            {price}
            <div className="flex items-center gap-2">
              {quickViewButton}
              {removeButton ?? wishlistButton}
              {addToCartButton("px-6")}
            </div>
          </div>
        </div>
      </article>
    );
  }

  /* ------------------------------------------------------------ grid view */

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-3 bg-gray-2 shadow-2 transition-all duration-300 hover:-translate-y-1 hover:border-blue/45 hover:shadow-gold ${className}`}
    >
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
          href={detailsHref}
          onClick={rememberForDetails}
          aria-label={item.title}
          className="absolute inset-0 z-10 flex items-center justify-center p-6"
        >
          <Image
            src={primaryImage}
            alt={item.title}
            width={520}
            height={390}
            sizes="(max-width: 640px) 90vw, (max-width: 1280px) 45vw, 24vw"
            className={`h-full w-full object-contain drop-shadow-[0_10px_20px_rgba(39,30,20,0.12)] transition-all duration-500 ease-out group-hover:scale-[1.06] ${
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
              className="absolute inset-0 m-auto h-[calc(100%-3rem)] w-[calc(100%-3rem)] object-contain opacity-0 drop-shadow-[0_10px_20px_rgba(39,30,20,0.12)] transition-opacity duration-500 group-hover:opacity-100"
            />
          )}
        </Link>

        {/* Both chips are positioned directly. Wrapping them in an inline
            `<span>` collapsed the width and clipped "IN STOCK". */}
        {discountFlag && (
          <div className="absolute left-3 top-3 z-20">{discountFlag}</div>
        )}
        <div className="absolute right-3 top-3 z-20 backdrop-blur-sm">
          {availabilityChip}
        </div>

        {/* Quick view and save. Revealed on hover on pointer devices; always
            visible on touch, where there is no hover to reveal them with. */}
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-2 p-3 transition-all duration-300 lg:translate-y-3 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100">
          {quickViewButton}
          {removeButton ?? wishlistButton}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 border-t border-gray-3 p-5">
        {meta}

        <h3 className="text-[15px] font-semibold capitalize leading-snug text-dark">
          {title}
        </h3>

        {rating}

        {showDescription && item.description ? (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-body">
            {item.description}
          </p>
        ) : null}

        <div className="mt-auto pt-1">{price}</div>

        {addToCartButton("mt-2 w-full")}
      </div>
    </article>
  );
}
