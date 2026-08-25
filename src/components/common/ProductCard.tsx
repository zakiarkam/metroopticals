"use client";

import React, { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useDispatch } from "react-redux";
import {
  Eye,
  Heart,
  Loader2,
  ShoppingBag,
  ShoppingCart,
  Star,
  X,
} from "lucide-react";

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
import {
  getColorSwatch,
  normalizeColorOptions,
} from "@/features/products/utils/colors";

export const PRODUCT_FALLBACK_IMAGE = "/images/placeholder-product.svg";

/**
 * The one product card used across the storefront  home carousels, best
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
  /** Colourways this frame is sold in; drawn as swatches under the title. */
  frameColors?: string[] | null;
  /** Raw record forwarded to quick view / details so nothing is lost. */
  raw?: unknown;
};

export default function ProductCard({
  item,
  layout = "grid",
  showDescription = false,
  featured = false,
  onRemove,
  className = "",
}: {
  item: ProductCardItem;
  layout?: "grid" | "list";
  showDescription?: boolean;
  /**
   * The lifted card in a carousel  larger type and a full-width buy button
   * instead of the icon, so one card in view reads as the one being offered.
   */
  featured?: boolean;
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
    [item.images],
  );

  const colorOptions = useMemo(
    () => normalizeColorOptions(item.frameColors),
    [item.frameColors],
  );
  /**
   * Which photo the card is showing.
   *
   * A frame shot from three angles used to be a single static thumbnail plus a
   * hidden hover swap, so two of the three were invisible on touch. The dots
   * under the image expose them all and are keyboard reachable.
   */
  const [imageIndex, setImageIndex] = useState(0);
  const hasPhoto = images.length > 0;
  const activeImage = images[imageIndex] ?? images[0] ?? PRODUCT_FALLBACK_IMAGE;

  const { displayPrice, hasDiscount, discountPercent } = resolveDisplayPrice(
    item.price,
    item.discountedPrice ?? null,
    canViewDiscount,
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
      // Quick view offers the same colour chooser as the product page, so the
      // options have to survive the hop through the store.
      frameColors: colorOptions,
    }),
    [colorOptions, images, item],
  );

  const openQuickView = useCallback(() => {
    dispatch(updateQuickView(quickViewPayload as never));
    openModal();
  }, [dispatch, openModal, quickViewPayload]);

  const rememberForDetails = useCallback(
    () => dispatch(updateproductDetails(quickViewPayload as never)),
    [dispatch, quickViewPayload],
  );

  const handleAddToCart = useCallback(async () => {
    if (isAddingToCart || !availability.canBuy) return;
    setIsAddingToCart(true);
    // No colour is passed: there is no chooser on a card, so the server settles
    // on the first colourway the product lists and the cart row lets the
    // shopper switch it without going back to the product page.
    await addToCart(
      {
        id: item.id,
        title: item.title,
        price: item.price,
        discountedPrice: item.discountedPrice ?? item.price,
        images,
        stock: item.stock ?? 0,
        frameColors: colorOptions,
      } as never,
      1,
    );
    setIsAddingToCart(false);
  }, [
    addToCart,
    availability.canBuy,
    colorOptions,
    images,
    isAddingToCart,
    item,
  ]);

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

  const rating =
    item.rating != null && (item.reviewCount ?? 0) > 0 ? (
      <div className="flex items-center gap-1.5">
        <Star className="h-[15px] w-[15px] fill-blue-light text-blue-light" />
        <span className="text-[13px] font-bold text-dark">
          {item.rating.toFixed(1)}
        </span>
        <span className="text-[12.5px] text-dark-4">({item.reviewCount})</span>
      </div>
    ) : null;

  /**
   * The colourways, as dots.
   *
   * A frame sold in four finishes reads as four separate products if the card
   * never says so. Named here as well as drawn, via the title attribute, since
   * the dots alone carry nothing for a screen reader.
   */
  const colors = colorOptions.length ? (
    <div className="flex items-center gap-1.5">
      <span className="flex items-center gap-1" aria-hidden>
        {colorOptions.slice(0, 5).map((color) => {
          const swatch = getColorSwatch(color);

          return swatch ? (
            <span
              key={color}
              title={color}
              className={`h-3.5 w-3.5 rounded-full ${
                swatch.needsBorder ? "ring-1 ring-inset ring-dark/20" : ""
              }`}
              style={{ background: swatch.background }}
            />
          ) : null;
        })}
      </span>
      <span className="text-[11.5px] text-dark-4">
        {colorOptions.length === 1
          ? colorOptions[0]
          : `${colorOptions.length} colours`}
      </span>
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
            src={activeImage}
            alt={item.title}
            fill
            sizes="240px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
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
          {colors}

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

  /**
   * The image fills its frame edge to edge. The old card inset it by 24px,
   * which left every product floating in a box of ivory.
   */
  const imageDots =
    images.length > 1 ? (
      <div className="flex items-center justify-center gap-1.5">
        {images.slice(0, 5).map((_, index) => (
          <button
            key={index}
            type="button"
            onMouseEnter={() => setImageIndex(index)}
            onFocus={() => setImageIndex(index)}
            onClick={() => setImageIndex(index)}
            aria-label={`Show photo ${index + 1} of ${item.title}`}
            aria-current={index === imageIndex}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === imageIndex
                ? "w-5 bg-blue"
                : "w-1.5 bg-gray-4 hover:bg-blue-light"
            }`}
          />
        ))}
      </div>
    ) : null;

  return (
    <article
      /* Every card carries the same shadow. The lifted card used to take a
         heavier one plus a gold ring, which read as a second, competing border
         once the pair was already a size larger than its neighbours  the size
         difference alone says which cards are in focus. */
      className={`group relative flex h-full flex-col overflow-hidden rounded-3xl bg-gray-2 shadow-2 ring-1 ring-gray-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-gold ${className}`}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-gray-1">
        {/* Gold pool sits behind the placeholder so the line art has a ground;
            a real photograph covers it entirely. */}
        {!hasPhoto && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 60% at 50% 55%, rgba(192,156,108,0.18) 0%, transparent 70%)",
            }}
          />
        )}

        <Link
          href={detailsHref}
          onClick={rememberForDetails}
          aria-label={item.title}
          className="absolute inset-0 z-10"
        >
          <Image
            src={activeImage}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 90vw, (max-width: 1280px) 45vw, 24vw"
            /* `cover` for everything, placeholder included: the brief was that
               the photo fills its frame with no ivory gutter around it, and a
               `contain` fallback reintroduced exactly that gutter on every
               product still waiting for real photography. */
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          />
        </Link>

        <div className="pointer-events-none absolute left-3.5 top-3.5 z-20 flex flex-col items-start gap-2">
          {hasDiscount && discountPercent ? (
            <span className="rounded-full bg-blue px-2.5 py-1 text-[11px] font-bold tracking-wide text-white shadow-1">
              −{discountPercent}%
            </span>
          ) : null}

          {availability.tone !== "in" && (
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] shadow-1 backdrop-blur-sm ${
                availability.tone === "low"
                  ? "bg-gray-2/95 text-dark"
                  : "bg-dark/85 text-white"
              }`}
            >
              {availability.label}
            </span>
          )}
        </div>

        <div className="absolute right-3.5 top-3.5 z-20 flex flex-col gap-2">
          {removeButton ?? wishlistButton}
          {/* Quick view is secondary, so it waits for hover on pointer devices
              and is simply always there on touch, which has no hover. */}
          <span className="transition-all duration-300 lg:-translate-y-1 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100">
            {quickViewButton}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-5">
        {imageDots && <div className="pb-1">{imageDots}</div>}

        {meta}

        <h3
          className={`font-display font-bold capitalize leading-snug tracking-[-0.02em] text-dark ${
            featured ? "text-[1.15rem]" : "text-[15.5px]"
          }`}
        >
          {title}
        </h3>

        {showDescription && item.description ? (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-body">
            {item.description}
          </p>
        ) : null}

        {rating}
        {colors}

        {/* Price and buy sit on one line: the button is the card's only action
            once the image is a link, so it does not need a full row of its own
            unless this is the lifted card. */}
        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          {price}

          {featured ? null : (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isAddingToCart || !availability.canBuy}
              aria-label={`${availability.actionLabel}  ${item.title}`}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-light-4 text-blue-dark transition-colors hover:bg-blue hover:text-white disabled:cursor-not-allowed disabled:bg-gray-8 disabled:text-dark-5"
            >
              {isAddingToCart ? (
                <Loader2 className="h-[18px] w-[18px] animate-spin" />
              ) : (
                <ShoppingCart className="h-[18px] w-[18px]" />
              )}
            </button>
          )}
        </div>

        {featured && addToCartButton("mt-3 w-full rounded-full")}
      </div>
    </article>
  );
}
