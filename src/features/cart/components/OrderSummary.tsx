"use client";

import React from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { AlertTriangle, ArrowRight, Lock } from "lucide-react";

import { selectTotalPrice } from "@/store/features/cart-slice";
import { useCart } from "@/features/cart/hooks/use-cart";
import { getAvailability } from "@/features/products/utils/availability";

const money = (value: number) =>
  `Rs ${Number(value ?? 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** Sticky totals panel beside the cart list. */
const OrderSummary = () => {
  const { cartItems } = useCart();
  const totalPrice = useSelector(selectTotalPrice);
  const itemCount = cartItems.reduce(
    (sum: number, item: { quantity: number }) => sum + item.quantity,
    0
  );

  const hasUnavailableItems = cartItems.some(
    (item: { status?: string; stock?: number }) =>
      !getAvailability(item.status, item.stock).canBuy
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-3 bg-gray-2 shadow-2 lg:sticky lg:top-32">
      <div className="border-b border-gray-3 px-6 py-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue">
          Cart summary
        </p>
        <h2 className="mt-1.5 text-lg font-bold text-dark">Order total</h2>
      </div>

      <div className="space-y-4 px-6 py-6">
        <div className="flex items-center justify-between text-[14px]">
          <span className="text-dark-4">Items</span>
          <span className="font-semibold text-dark">{itemCount}</span>
        </div>

        <div className="flex items-center justify-between text-[14px]">
          <span className="text-dark-4">Subtotal</span>
          <span className="font-semibold text-dark">{money(totalPrice)}</span>
        </div>

        <div className="flex items-center justify-between text-[14px]">
          <span className="text-dark-4">Delivery</span>
          <span className="font-semibold text-green">
            Calculated at checkout
          </span>
        </div>

        <div className="flex items-baseline justify-between rounded-xl border border-blue/25 bg-blue/[0.08] px-4 py-4">
          <span className="text-[15px] font-bold text-dark">Total</span>
          <span className="text-xl font-bold text-blue">
            {money(totalPrice)}
          </span>
        </div>

        {hasUnavailableItems && (
          <div className="flex gap-2.5 rounded-xl border border-red/30 bg-red/10 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red" />
            <p className="text-[12.5px] leading-relaxed text-red">
              Some items are unavailable. Remove them to continue to checkout.
            </p>
          </div>
        )}

        <Link
          href={hasUnavailableItems ? "#" : "/checkout"}
          onClick={(e) => hasUnavailableItems && e.preventDefault()}
          aria-disabled={hasUnavailableItems}
          className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue text-[14px] font-bold text-gray-1 transition-colors ${
            hasUnavailableItems
              ? "cursor-not-allowed opacity-50"
              : "hover:bg-blue-light"
          }`}
        >
          Proceed to checkout
          <ArrowRight className="h-4 w-4" />
        </Link>

        <Link
          href="/shop-with-sidebar"
          className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-gray-3 text-[14px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue"
        >
          Continue shopping
        </Link>

        <p className="flex items-center justify-center gap-1.5 pt-1 text-[11.5px] text-dark-5">
          <Lock className="h-3.5 w-3.5" />
          Secure checkout · Your details are never shared
        </p>
      </div>
    </div>
  );
};

export default OrderSummary;
