"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { CreditCard, Download, ImageOff, Loader2, Star } from "lucide-react";

import { Order, OrderStatus } from "@/features/orders/types/order";
import {
  createPayHereSession,
  submitPayHereCheckout,
} from "@/features/checkout/api/payhere-api";
import { getProductImageUrl } from "@/lib/storageUtils";
import { formatPrice } from "@/lib/utils/price";
import { orderLineName } from "@/features/orders/utils/order-display";

type OrderRowProps = {
  order: Order;
  onPrintInvoice: (order: Order) => void;
  isPrintPending: boolean;
};

/** Status chips. Every label is an AA-contrast token on its own tint  `SHIPPED` used to be `text-blue-light`, which is decoration-only gold. */
const statusStyles: Record<OrderStatus, string> = {
  PENDING: "border-yellow/30 bg-yellow/10 text-yellow",
  CONFIRMED: "border-blue/30 bg-blue/10 text-blue",
  PROCESSING: "border-blue/30 bg-blue/10 text-blue",
  SHIPPED: "border-blue/30 bg-blue/10 text-blue-dark",
  DELIVERED: "border-green/30 bg-green/10 text-green",
  CANCELLED: "border-red/30 bg-red/10 text-red",
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const resolveImage = (
  images?: string[] | { previews?: string[]; thumbnails?: string[] },
) => {
  if (!images) return null;

  const flatList: string[] = [];
  if (Array.isArray(images)) {
    flatList.push(...images);
  } else {
    if (images.previews?.length) flatList.push(...images.previews);
    if (images.thumbnails?.length) flatList.push(...images.thumbnails);
  }

  return (
    flatList.map((value) => getProductImageUrl(value)).find(Boolean) || null
  );
};

const OrderRow: React.FC<OrderRowProps> = ({
  order,
  onPrintInvoice,
  isPrintPending,
}) => {
  const firstItem = order.items[0];
  const productUrl = firstItem?.product?.id
    ? `/shop-details/${firstItem.product.id}`
    : null;
  const imageUrl = resolveImage(firstItem?.product?.images);
  const extraItems = order.items.length - 1;

  const [isPaying, setIsPaying] = useState(false);

  // A card payment the customer walked away from: the order is real and its
  // stock is held, but no money has arrived. Rather than leave them to place
  // it again, the row offers the payment page back.
  const awaitingPayment =
    order.paymentMethod === "payhere" &&
    order.paymentStatus !== "PAID" &&
    order.status !== "CANCELLED";

  const handlePayNow = async () => {
    if (isPaying) return;
    setIsPaying(true);
    try {
      submitPayHereCheckout(await createPayHereSession(order.id));
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "We couldn't open the payment page. Please try again.",
      );
      setIsPaying(false);
    }
  };

  const canReview = order.status === "DELIVERED";
  const reviewableExtras = canReview
    ? order.items.slice(1).filter((item) => item.product?.id)
    : [];

  const statusLabel = order.status
    .toLowerCase()
    .split("_")
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(" ");

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-3 bg-gray-1 transition-colors hover:border-blue/40">
      {/* Header: number + date on the left, status on the right, on one line
          even at 360px. */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-3 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <span className="block truncate text-[13px] font-bold text-dark">
            {order.orderNumber}
          </span>
          <span className="block text-[12px] text-dark-5">
            Placed {formatDate(order.createdAt)}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {awaitingPayment && (
            <span className="rounded-full border border-orange/30 bg-orange/10 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.1em] text-orange">
              Unpaid
            </span>
          )}
          <span
            className={`rounded-full border px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.1em] ${
              statusStyles[order.status]
            }`}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Body: thumbnail + title, with the total on the right on wide screens
          and under the title on phones. */}
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-gray-3 bg-gray-2 sm:h-[72px] sm:w-[72px]">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={firstItem?.product?.title ?? "Order item"}
                fill
                sizes="72px"
                className="object-cover"
              />
            ) : (
              <span className="grid h-full w-full place-items-center text-dark-5">
                <ImageOff className="h-5 w-5" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold capitalize text-dark">
              {productUrl ? (
                <Link
                  href={productUrl}
                  className="transition-colors hover:text-blue"
                >
                  {firstItem?.product?.title ?? "Order items"}
                </Link>
              ) : (
                (firstItem?.product?.title ?? "Order items")
              )}
            </p>
            <p className="mt-0.5 text-[12.5px] text-dark-5">
              {/* The colourway is part of what was bought, so the summary line
                  names it rather than making the customer open the invoice. */}
              {firstItem?.color ? `${firstItem.color} · ` : ""}
              {extraItems > 0
                ? `+ ${extraItems} more ${extraItems === 1 ? "item" : "items"}`
                : "1 item"}
            </p>
            <p className="mt-1 text-[15px] font-bold text-dark sm:hidden">
              {formatPrice(order.totalAmount)}
            </p>
          </div>

          <div className="hidden text-right sm:block">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-dark-5">
              Total
            </p>
            <p className="mt-1 text-[16px] font-bold text-dark">
              {formatPrice(order.totalAmount)}
            </p>
          </div>
        </div>

        {/* Actions: side by side, each taking half the width on phones. */}
        <div className="mt-4 flex gap-2.5 sm:justify-end">
          {awaitingPayment && (
            <button
              type="button"
              onClick={handlePayNow}
              disabled={isPaying}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-blue px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-blue-dark disabled:cursor-wait disabled:opacity-60 sm:flex-none sm:px-5 sm:text-[13px]"
            >
              {isPaying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              Pay now
            </button>
          )}

          {canReview && productUrl && (
            <Link
              href={`${productUrl}#reviews`}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-blue px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-blue-dark sm:flex-none sm:px-5 sm:text-[13px]"
            >
              <Star className="h-4 w-4" />
              Write a review
            </Link>
          )}

          <button
            type="button"
            onClick={() => onPrintInvoice(order)}
            disabled={isPrintPending}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-gray-3 px-3 text-[12.5px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue disabled:cursor-wait disabled:opacity-60 sm:flex-none sm:px-5 sm:text-[13px]"
          >
            {isPrintPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Invoice
          </button>
        </div>
      </div>

      {reviewableExtras.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-gray-3 bg-gray-2 px-4 py-3 sm:px-5">
          <span className="text-[12px] font-semibold text-dark-5">
            Also review:
          </span>
          {reviewableExtras.map((item) => (
            <Link
              key={item.id}
              href={`/shop-details/${item.product?.id}#reviews`}
              className="text-[12.5px] font-semibold text-blue underline-offset-2 hover:underline"
            >
              {orderLineName(item)}
            </Link>
          ))}
        </div>
      )}
    </article>
  );
};

export default OrderRow;
