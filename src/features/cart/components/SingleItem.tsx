"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Minus, Plus, Trash2 } from "lucide-react";

import { useCart } from "@/features/cart/hooks/use-cart";
import LensLineButton from "@/features/lenses/components/checkout/LensLineButton";
import { normalizeImageArray } from "@/lib/storageUtils";
import {
  AVAILABILITY_PILL_CLASSES,
  getAvailability,
} from "@/features/products/utils/availability";
import { formatPrice } from "@/lib/utils/price";
import { getColorSwatch } from "@/features/products/utils/colors";

type CartItem = {
  id: number;
  productId?: number;
  title: string;
  price: number;
  discountedPrice: number;
  quantity: number;
  color?: string;
  colorOptions?: string[];
  stock?: number;
  status?: string;
  imgs?: {
    thumbnails: string[];
    previews: string[];
  };
  /** Prescription lenses fitted to this frame; null on a bare frame. */
  lens?: {
    lensTypeId: number;
    lensTypeName: string;
    designKind: "SINGLE_VISION" | "BIFOCAL" | "PROGRESSIVE";
    designName: string | null;
    tintId: number | null;
    tintName: string | null;
    tintHex: string | null;
    prescriptionId: number | null;
    prescriptionLabel: string | null;
    prescriptionVersion: number | null;
    summary: string | null;
    price: number;
    isOrderLens?: boolean;
    leadTimeDays?: number | null;
  } | null;
};

const ColorControl = ({
  item,
  onChange,
  disabled,
}: {
  item: CartItem;
  onChange: (color: string) => void;
  disabled: boolean;
}) => {
  const options = item.colorOptions ?? [];
  const color = item.color ?? "";
  const swatch = getColorSwatch(color);

  const dot = swatch && (
    <span
      aria-hidden
      className={`h-3.5 w-3.5 shrink-0 rounded-full ${
        swatch.needsBorder ? "ring-1 ring-inset ring-dark/20" : ""
      }`}
      style={{ background: swatch.background }}
    />
  );

  if (options.length < 2 && color) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-3 bg-gray-1 px-2.5 py-1 text-[12px] font-medium text-dark-2">
        {dot}
        {color}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border bg-gray-1 py-1 pl-2.5 pr-1 text-[12px] font-medium focus-within:border-blue ${
        color ? "border-gray-3 text-dark-2" : "border-blue/45 text-blue"
      }`}
    >
      {dot}
      <select
        value={color}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`Colour for ${item.title}`}
        className="cursor-pointer border-0 bg-transparent pr-1 text-[12px] font-medium text-inherit outline-none disabled:cursor-not-allowed"
      >
        {!color && (
          <option value="" disabled>
            Choose colour
          </option>
        )}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </span>
  );
};

/** One row in the cart. Shows the line total as well as the unit price  the old row only showed the unit price, which did not add up to the summary. */
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

  const handleColorChange = async (color: string) => {
    if (isUpdating || color === item.color) return;

    setIsUpdating(true);
    await updateQuantity(item.id, item.quantity, color);
    setIsUpdating(false);
  };

  const handleRemove = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    await removeFromCart(item.id);
    setIsUpdating(false);
  };

  const resolvedImages = normalizeImageArray(item.imgs?.previews ?? []);
  const displayImage = resolvedImages[0] ?? "/images/placeholder-product.svg";
  const productUrl = `/shop-details/${item.productId || item.id}`;

  const hasReachedStock =
    typeof item.stock === "number" && item.quantity >= item.stock;

  // The frame and its lenses are one saleable thing, so the line total is
  // both - showing the frame price alone would not add up to the summary.
  const unitPrice = item.discountedPrice + (item.lens?.price ?? 0);

  return (
    <div
      className={`p-5 transition-opacity sm:p-6 ${isUpdating ? "opacity-60" : ""}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
        <Link
          href={productUrl}
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-3 bg-gray-1"
        >
          <Image
            src={displayImage}
            alt={item.title}
            fill
            sizes="80px"
            className="object-cover"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <Link
            href={productUrl}
            className="line-clamp-2 break-words text-[14.5px] font-semibold capitalize text-dark transition-colors hover:text-blue"
          >
            {item.title}
          </Link>

          <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
            <span className="text-[13px] text-dark-4">
              {formatPrice(unitPrice)} each
            </span>
            {(item.color || (item.colorOptions?.length ?? 0) > 0) && (
              <ColorControl
                item={item}
                onChange={handleColorChange}
                disabled={isUpdating}
              />
            )}
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

        <div className="flex min-w-0 items-center justify-between gap-3 sm:gap-4 sm:justify-end">
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

          <p className="min-w-[80px] flex-1 text-right text-[15px] font-bold text-dark sm:w-[110px] sm:flex-none">
            {formatPrice(unitPrice * item.quantity)}
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

      {/* Under the frame rather than beside it: the lens choice is a second
          decision about the same line, and it needs room for a prescription
          summary that a price column has no space for. */}
      <LensLineButton
        item={item}
        variant="full"
        disabled={isUpdating || isUnavailable}
      />
    </div>
  );
};

export default SingleItem;
