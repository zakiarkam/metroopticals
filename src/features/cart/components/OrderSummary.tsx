"use client";
import React from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { selectTotalPrice } from "@/store/features/cart-slice";
import { useCart } from "@/features/cart/hooks/use-cart";

const OrderSummary = () => {
  const { cartItems } = useCart();
  const totalPrice = useSelector(selectTotalPrice);
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const finalTotal = totalPrice;

  // Check if any items are unavailable
  const hasUnavailableItems = cartItems.some(
    (item: any) =>
      item.status === "INACTIVE" ||
      item.status === "OUT_OF_STOCK" ||
      (typeof item.stock === "number" && item.stock === 0)
  );

  return (
    <div className="w-full lg:max-w-[370px] bg-gradient-to-br from-gray-2 to-gray-50 rounded-2xl shadow-lg border border-gray-200">
      <div className="border-b border-gray-200 bg-gradient-to-r from-blue-light-5 to-blue-light-4 py-4 px-5 sm:px-6 rounded-t-2xl">
        <p className="text-xs uppercase tracking-wider text-body font-semibold">
          Cart Summary
        </p>
        <h3 className="font-bold text-xl text-dark mt-1">Order Summary</h3>
      </div>

      <div className="py-6 px-5 sm:px-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-dark-4">Items</p>
          <p className="font-medium text-dark">{itemCount}</p>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-dark-4">Subtotal</p>
          <p className="font-medium text-dark">Rs - {totalPrice.toFixed(2)}</p>
        </div>

        {/* <div className="flex items-center justify-between">
          <p className="text-dark-4">Shipping</p>
          <p className="font-medium text-dark">${shippingFee.toFixed(2)}</p>
        </div> */}

        <div className="rounded-lg bg-gradient-to-r from-blue-light-5 to-blue-light-4 px-4 py-4 flex items-center justify-between border border-blue-light-3">
          <p className="font-bold text-lg text-dark">Total</p>
          <p className="font-bold text-xl text-blue">
            Rs - {finalTotal.toFixed(2)}
          </p>
        </div>

        {hasUnavailableItems && (
          <div className="mb-3 p-3 bg-red/10 border border-red/20 rounded-lg">
            <p className="text-xs text-red font-medium">
              ⚠️ Some items in your cart are unavailable. Please remove them to
              proceed.
            </p>
          </div>
        )}

        <Link
          href={hasUnavailableItems ? "#" : "/checkout"}
          onClick={(e) => hasUnavailableItems && e.preventDefault()}
          className={`w-full flex justify-center font-bold text-white bg-gradient-to-r from-blue to-blue-dark py-3.5 px-6 rounded-lg ease-out duration-200 ${
            hasUnavailableItems
              ? "opacity-50 cursor-not-allowed"
              : "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          }`}
        >
          Proceed to Checkout
        </Link>

        <Link
          href="/shop-with-sidebar"
          className="w-full flex justify-center font-bold text-dark border-2 border-gray-300 py-3 px-6 rounded-lg ease-out duration-200 hover:bg-gray-100 hover:border-gray-400"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
};

export default OrderSummary;
