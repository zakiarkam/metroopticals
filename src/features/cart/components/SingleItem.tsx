"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Minus, Plus, Trash2 } from "lucide-react";

import { useCart } from "@/features/cart/hooks/use-cart";
import { normalizeImageArray } from "@/lib/storageUtils";
import {
  AVAILABILITY_PILL_CLASSES,
  getAvailability,
} from "@/features/products/utils/availability";
import { formatPrice } from "@/lib/utils/price";

type CartItem = {
  id: number;
  productId?: number;
  title: string;
  price: number;
  discountedPrice: number;
  quantity: number;
  stock?: number;
  status?: string;
  imgs?: {
    thumbnails: string[];
    previews: string[];
  };
};


/** One row in the cart. Shows the line total as well as the unit price — the old row only showed the unit price, which did not add up to the summary. */
const SingleItem = ({ item }: { item: CartItem }) => {
  const { updateQuantity, removeFromCart } = useCart();
  const [isUpdating, setIsUpdating] = useState(false);

  const availability = getAvailability(item.status, item.stock);
  const isUnavailable = !availability.canBuy;

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 1 || isUpdating) return;
    if (typeof item.stock === "number" && newQuantity > item.stock) {
      toast.error("Maximum stock reached");
      return;
    }

    setIsUpdating(true);
    await updateQuantity(item.id, newQuantity);
    setIsUpdating(false);
  };

  const handleRemove = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    await removeFromCart(item.id);
    setIsUpdating(false);
  };

  const resolvedImages = normalizeImageArray(item.imgs?.previews ?? []);
  const displayImage =
    resolvedImages[0] ?? "/images/placeholder-product.svg";
  const productUrl = `/shop-details/${item.productId || item.id}`;

  const hasReachedStock =
    typeof item.stock === "number" && item.quantity >= item.stock;

  return (
    <div
      className={`flex flex-col gap-4 p-5 transition-opacity sm:flex-row sm:items-center sm:gap-5 sm:p-6 ${
        isUpdating ? "opacity-60" : ""
      }`}
    >
      <Link
        href={productUrl}
        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-3 bg-gray-1"
      >
        <Image
          src={displayImage}
          alt={item.title}
          fill
          sizes="80px"
          className="object-contain p-2"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={productUrl}
          className="line-clamp-2 text-[14.5px] font-semibold capitalize text-dark transition-colors hover:text-blue"
        >
          {item.title}
        </Link>

        <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
          <span className="text-[13px] text-dark-4">
            {formatPrice(item.discountedPrice)} each
          </span>
          {isUnavailable && (
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${
                AVAILABILITY_PILL_CLASSES[availability.tone]
              }`}
            >
              {availability.label}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <div className="flex items-center overflow-hidden rounded-xl border border-gray-3 bg-gray-1">
          <button
            type="button"
            onClick={() => handleQuantityChange(item.quantity - 1)}
            disabled={isUpdating || item.quantity <= 1 || isUnavailable}
            aria-label="Decrease quantity"
            className="grid h-10 w-10 place-items-center text-dark transition-colors hover:text-blue disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>

          <span className="grid h-10 w-11 place-items-center border-x border-gray-3 text-[13.5px] font-bold text-dark">
            {item.quantity}
          </span>

          <button
            type="button"
            onClick={() => handleQuantityChange(item.quantity + 1)}
            disabled={isUpdating || hasReachedStock || isUnavailable}
            aria-label="Increase quantity"
            title={hasReachedStock ? "Maximum stock reached" : undefined}
            className="grid h-10 w-10 place-items-center text-dark transition-colors hover:text-blue disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <p className="w-[110px] shrink-0 text-right text-[15px] font-bold text-dark">
          {formatPrice(item.discountedPrice * item.quantity)}
        </p>

        <button
          type="button"
          onClick={handleRemove}
          disabled={isUpdating}
          aria-label={`Remove ${item.title} from cart`}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-3 text-dark-4 transition-colors hover:border-red hover:text-red disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-[17px] w-[17px]" />
        </button>
      </div>
    </div>
  );
};

export default SingleItem;
