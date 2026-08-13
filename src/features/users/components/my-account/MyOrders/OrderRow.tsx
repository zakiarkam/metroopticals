"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Download, ImageOff, Loader2 } from "lucide-react";

import { Order, OrderStatus } from "@/features/orders/types/order";
import { getProductImageUrl } from "@/lib/storageUtils";

type OrderRowProps = {
  order: Order;
  onPrintInvoice: (order: Order) => void;
  isPrintPending: boolean;
};

/** Status chips — dark-theme tints rather than the light-theme text colours the row used before. */
const statusStyles: Record<OrderStatus, string> = {
  PENDING: "border-yellow/30 bg-yellow/10 text-yellow",
  CONFIRMED: "border-blue/30 bg-blue/10 text-blue",
  PROCESSING: "border-blue/30 bg-blue/10 text-blue",
  SHIPPED: "border-blue/30 bg-blue/10 text-blue-light",
  DELIVERED: "border-green/30 bg-green/10 text-green",
  CANCELLED: "border-red/30 bg-red/10 text-red",
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatPrice = (value: number) =>
  `Rs ${new Intl.NumberFormat("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;

const resolveImage = (
  images?: string[] | { previews?: string[]; thumbnails?: string[] }
) => {
  if (!images) return null;

  const flatList: string[] = [];
  if (Array.isArray(images)) {
    flatList.push(...images);
  } else {
    if (images.previews?.length) flatList.push(...images.previews);
    if (images.thumbnails?.length) flatList.push(...images.thumbnails);
  }

  return flatList.map((value) => getProductImageUrl(value)).find(Boolean) || null;
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

  const statusLabel = order.status
    .toLowerCase()
    .split("_")
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(" ");

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-3 bg-gray-1 transition-colors hover:border-blue/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-3 px-5 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-[13px] font-bold text-dark">
            {order.orderNumber}
          </span>
          <span className="text-[12px] text-dark-5">
            Placed {formatDate(order.createdAt)}
          </span>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] ${
            statusStyles[order.status]
          }`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-5 p-5">
        <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl border border-gray-3 bg-gray-2">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={firstItem?.product?.title ?? "Order item"}
              fill
              sizes="72px"
              className="object-contain p-2"
            />
          ) : (
            <span className="grid h-full w-full place-items-center text-dark-5">
              <ImageOff className="h-5 w-5" />
            </span>
          )}
        </div>

        <div className="min-w-[180px] flex-1">
          <p className="text-[15px] font-semibold capitalize text-dark">
            {productUrl ? (
              <Link href={productUrl} className="transition-colors hover:text-blue">
                {firstItem?.product?.title ?? "Order items"}
              </Link>
            ) : (
              (firstItem?.product?.title ?? "Order items")
            )}
          </p>
          <p className="mt-1 text-[12.5px] text-dark-5">
            {extraItems > 0
              ? `+ ${extraItems} more ${extraItems === 1 ? "item" : "items"}`
              : "1 item"}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-dark-5">
            Total
          </p>
          <p className="mt-1 text-[16px] font-bold text-dark">
            {formatPrice(order.totalAmount)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onPrintInvoice(order)}
          disabled={isPrintPending}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-3 px-5 text-[13px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue disabled:cursor-wait disabled:opacity-60"
        >
          {isPrintPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Invoice
        </button>
      </div>
    </article>
  );
};

export default OrderRow;
