"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useDispatch } from "react-redux";
import { Eye, FileText, Heart, Loader2, ShoppingBag } from "lucide-react";

import { useModalContext } from "@/app/context/QuickViewModalContext";
import { updateQuickView } from "@/store/features/quickView-slice";
import { updateproductDetails } from "@/store/features/product-details";
import type { AppDispatch } from "@/store/store";
import { useCart } from "@/features/cart/hooks/use-cart";
import { useWishlist } from "@/features/wishlist/hooks/use-wishlist";
import { useDiscountVisibility } from "@/features/cart/hooks/use-discount";
import { resolveDisplayPrice } from "@/lib/utils/price";
import {
  getProductCatalogueUrl,
  normalizeImageArray,
} from "@/lib/storageUtils";
import {
  AVAILABILITY_PILL_CLASSES,
  getAvailability,
} from "@/features/products/utils/availability";
import { PRODUCT_FALLBACK_IMAGE } from "@/components/common/ProductCard";

type ProductItemData = {
  id: number;
  title: string;
  description?: string;
  price: number;
  discountedPrice?: number | null;
  unitType?: string | null;
  reviews?: number;
  images?: string[];
  stock?: number;
  catalogueFile?: string | null;
  status?: string;
  category?: { name?: string } | null;
  brand?: { name?: string } | null;
};

const money = (value: number) =>
  `Rs ${Number(value ?? 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** Wide row used by the shop list view — same content as the grid card, laid out horizontally. */
const SingleListItem = ({ item }: { item: ProductItemData }) => {
  const { openModal } = useModalContext();
  const dispatch = useDispatch<AppDispatch>();
  const { addToCart, isAuthenticated } = useCart();
  const { addToWishlist, isInWishlist } = useWishlist();
  const canViewDiscount = useDiscountVisibility();

  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const images = useMemo(
    () => normalizeImageArray(item.images ?? []),
    [item.images]
  );
  const primaryImage = images[0] ?? PRODUCT_FALLBACK_IMAGE;
  const catalogueUrl = getProductCatalogueUrl(item.catalogueFile);

  const { displayPrice, hasDiscount, discountPercent } = resolveDisplayPrice(
    item.price,
    item.discountedPrice ?? null,
    canViewDiscount
  );
  const availability = getAvailability(item.status, item.stock);
  const saved = isInWishlist(item.id);

  const payload = { ...item, images };

  const handleAddToCart = async () => {
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
  };

  const handleSave = async () => {
    if (isSaving || saved) return;
    setIsSaving(true);
    await addToWishlist({
      id: item.id,
      title: item.title,
      price: item.price,
      discountedPrice: item.discountedPrice ?? item.price,
      images,
      stock: item.stock ?? 0,
    } as never);
    setIsSaving(false);
  };

  return (
    <article className="group flex flex-col gap-5 rounded-2xl border border-gray-3 bg-gray-2 p-4 shadow-2 transition-colors duration-300 hover:border-blue/40 sm:flex-row sm:p-5">
      <Link
        href={`/shop-details/${item.id}`}
        onClick={() => dispatch(updateproductDetails(payload as never))}
        className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-gray-1 sm:aspect-square sm:w-[190px]"
      >
        <Image
          src={primaryImage}
          alt={item.title}
          fill
          sizes="(max-width: 640px) 90vw, 190px"
          className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
        />
        {hasDiscount && discountPercent ? (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-blue px-2 py-0.5 text-[10px] font-bold text-gray-1">
            −{discountPercent}%
          </span>
        ) : null}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-dark-4">
          <span className="truncate">{item.category?.name || "Eyewear"}</span>
          {item.brand?.name && (
            <>
              <span className="text-gray-4">·</span>
              <span className="truncate text-blue/80">{item.brand.name}</span>
            </>
          )}
        </div>

        <h3 className="mt-1.5 text-lg font-semibold capitalize leading-snug text-dark">
          <Link
            href={`/shop-details/${item.id}`}
            onClick={() => dispatch(updateproductDetails(payload as never))}
            className="transition-colors hover:text-blue"
          >
            {item.title}
          </Link>
        </h3>

        {item.description && (
          <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-body">
            {item.description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${
              AVAILABILITY_PILL_CLASSES[availability.tone]
            }`}
          >
            {availability.label}
          </span>
          {catalogueUrl && isAuthenticated && (
            <a
              href={catalogueUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-blue hover:underline"
            >
              <FileText className="h-3.5 w-3.5" />
              Catalogue
            </a>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-gray-3 pt-4">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-xl font-bold text-dark">
              {money(displayPrice)}
            </span>
            {hasDiscount && (
              <span className="text-[13px] font-medium text-dark-5 line-through">
                {money(item.price)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                dispatch(updateQuickView(payload as never));
                openModal();
              }}
              aria-label="Quick view"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-3 text-dark transition-colors hover:border-blue hover:text-blue"
            >
              <Eye className="h-[18px] w-[18px]" />
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || saved}
              aria-label={saved ? "Saved to wishlist" : "Save to wishlist"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-3 text-dark transition-colors hover:border-blue hover:text-blue disabled:cursor-not-allowed disabled:border-blue/40 disabled:text-blue"
            >
              <Heart className={`h-[18px] w-[18px] ${saved ? "fill-blue" : ""}`} />
            </button>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isAddingToCart || !availability.canBuy}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue px-6 text-[13px] font-bold text-gray-1 transition-colors hover:bg-blue-light disabled:cursor-not-allowed disabled:bg-gray-8 disabled:text-dark-5"
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
        </div>
      </div>
    </article>
  );
};

export default SingleListItem;
