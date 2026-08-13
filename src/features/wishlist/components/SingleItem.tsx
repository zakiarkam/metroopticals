"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, ShoppingBag, X } from "lucide-react";

import { useWishlist } from "@/features/wishlist/hooks/use-wishlist";
import { useCart } from "@/features/cart/hooks/use-cart";
import { normalizeImageArray } from "@/lib/storageUtils";
import {
  AVAILABILITY_PILL_CLASSES,
  getAvailability,
} from "@/features/products/utils/availability";

type WishlistItemProps = {
  item: {
    id: number;
    wishlistItemId?: number;
    title: string;
    price: number;
    discountedPrice: number;
    unitType?: string | null;
    quantity: number;
    stock?: number;
    status?: string;
    imgs?: {
      thumbnails: string[];
      previews: string[];
    };
  };
};

const money = (value: number) =>
  `Rs ${Number(value ?? 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * Wishlist tile.
 *
 * The old wishlist was a 1170px-wide table that forced horizontal scrolling on
 * anything smaller than a laptop. A card grid carries the same four facts —
 * image, name, price, stock — and works down to a phone.
 */
const SingleItem = ({ item }: WishlistItemProps) => {
  const { removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const productUrl = `/shop-details/${item.id}`;

  const rawImages =
    item.imgs?.thumbnails?.filter(Boolean) ||
    item.imgs?.previews?.filter(Boolean) ||
    [];
  const images = normalizeImageArray(rawImages);
  const availability = getAvailability(item.status, item.stock);

  const handleRemove = async () => {
    if (isRemoving) return;
    setIsRemoving(true);
    await removeFromWishlist(item.id);
    setIsRemoving(false);
  };

  const handleAddToCart = async () => {
    if (isAdding || !availability.canBuy) return;
    setIsAdding(true);
    await addToCart(
      {
        id: item.id,
        title: item.title,
        price: item.price,
        discountedPrice: item.discountedPrice || item.price,
        images,
        stock: item.stock ?? 0,
        status: item.status,
      } as never,
      1
    );
    setIsAdding(false);
  };

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-3 bg-gray-2 shadow-2 transition-all duration-300 hover:border-blue/45 ${
        isRemoving ? "opacity-50" : ""
      }`}
    >
      <button
        type="button"
        onClick={handleRemove}
        disabled={isRemoving}
        aria-label={`Remove ${item.title} from wishlist`}
        className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-3 bg-gray-2/95 text-dark-4 backdrop-blur transition-colors hover:border-red hover:text-red"
      >
        <X className="h-4 w-4" />
      </button>

      <Link
        href={productUrl}
        className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gray-1 p-6"
      >
        <Image
          src={images[0] || "/images/placeholder-product.jpg"}
          alt={item.title}
          width={420}
          height={315}
          sizes="(max-width: 640px) 90vw, 300px"
          className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
        />
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 border-t border-gray-3 p-5">
        <span
          className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${
            AVAILABILITY_PILL_CLASSES[availability.tone]
          }`}
        >
          {availability.label}
        </span>

        <h3 className="text-[14.5px] font-semibold capitalize leading-snug text-dark">
          <Link
            href={productUrl}
            className="line-clamp-2 transition-colors hover:text-blue"
          >
            {item.title}
          </Link>
        </h3>

        <p className="mt-auto pt-1 text-[16px] font-bold text-dark">
          {money(item.discountedPrice || item.price)}
        </p>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isAdding || !availability.canBuy}
          className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue text-[13px] font-bold text-gray-1 transition-colors hover:bg-blue-light disabled:cursor-not-allowed disabled:bg-gray-8 disabled:text-dark-5"
        >
          {isAdding ? (
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
};

export default SingleItem;
