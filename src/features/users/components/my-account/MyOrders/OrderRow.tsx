"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Order, OrderStatus } from "@/features/orders/types/order";
import { getProductImageUrl } from "@/lib/storageUtils";

type OrderRowProps = {
  order: Order;
  onPrintInvoice: (order: Order) => void;
  isPrintPending: boolean;
};

const statusStyles: Record<OrderStatus, string> = {
  PENDING: "text-yellow-500",
  CONFIRMED: "text-blue-600",
  PROCESSING: "text-blue-600",
  SHIPPED: "text-purple-600",
  DELIVERED: "text-green-600",
  CANCELLED: "text-red-600",
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
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
  if (!images) {
    return null;
  }

  const flatList: string[] = [];
  if (Array.isArray(images)) {
    flatList.push(...images);
  } else {
    if (images.previews?.length) {
      flatList.push(...images.previews);
    }
    if (images.thumbnails?.length) {
      flatList.push(...images.thumbnails);
    }
  }

  const resolved = flatList
    .map((value) => getProductImageUrl(value))
    .find(Boolean);
  return resolved || null;
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
  const orderedDate = formatDate(order.createdAt);

  const statusLabel = order.status
    .toLowerCase()
    .split("_")
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(" ");

  return (
    <article className="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-gray-2 p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-6">
        <div className="w-20">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={firstItem?.product?.title ?? "Order Image"}
              width={80}
              height={80}
              className="h-20 w-20 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-xs font-semibold text-gray-400">
              No image
            </div>
          )}
        </div>
        <div className="flex-1 min-w-[180px]">
          <p className="text-xs font-semibold uppercase tracking-wider text-dark-3">
            Ordered {orderedDate}
          </p>
          <p className="text-lg capitalize font-semibold text-dark">
            {productUrl ? (
              <Link
                href={productUrl}
                className="hover:text-blue"
              >
                {firstItem?.product?.title ?? "Order items"}
              </Link>
            ) : (
              firstItem?.product?.title ?? "Order items"
            )}
          </p>
          <p className="text-sm text-dark-3">
            {order.items.length} item{order.items.length === 1 ? "" : "s"} ·{" "}
            {formatPrice(order.totalAmount)}
          </p>
        </div>
        <div className="min-w-[150px] text-right">
          <p className="text-xs uppercase tracking-wide text-dark-3">Status</p>
          <p className={`text-sm font-semibold ${statusStyles[order.status]}`}>
            {statusLabel}
          </p>
        </div>
        {/* <div className="min-w-[220px] text-right">
          <p className="text-xs uppercase tracking-wide text-dark-3">
            Delivery expected by
          </p>
          <p className="text-sm font-semibold text-dark">{orderedDate}</p>
        </div> */}
      </div>

      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
        <button
          type="button"
          onClick={() => onPrintInvoice(order)}
          disabled={isPrintPending}
          className="w-full rounded-xl border border-blue px-4 py-3 text-center text-sm font-semibold text-blue transition hover:bg-blue hover:text-white disabled:border-blue/50 disabled:text-blue/50"
        >
          {isPrintPending ? "Preparing…" : "Download Invoice"}
        </button>
        <p className="mt-2 text-[11px] text-dark-3">
          Downloads the receipt with all items and totals.
        </p>
      </div>
    </article>
  );
};

export default OrderRow;
