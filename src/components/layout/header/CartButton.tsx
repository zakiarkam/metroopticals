"use client";

import React, { memo } from "react";

interface CartButtonProps {
  count: number;
  totalPrice: number;
  onOpen: () => void;
}

const CartButton = memo(
  function CartButton({ count, totalPrice, onOpen }: CartButtonProps) {
    return (
      <button
        onClick={onOpen}
        className="group flex items-center gap-2.5 transition-all hover:opacity-80"
        aria-label="Open cart"
      >
        <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-blue/10 group-hover:bg-blue/20 transition-colors">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3C50E0"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>

          {count > 0 && (
            <span className="flex items-center justify-center font-semibold text-[10px] absolute -right-1 -top-1 bg-blue w-4.5 h-4.5 rounded-full text-white ring-2 ring-white shadow-sm">
              {count}
            </span>
          )}
        </div>

        <div className="hidden sm:block">
          <span className="block text-2xs text-dark-4 uppercase group-hover:text-blue transition-colors">
            cart
          </span>
          <p className="font-medium text-custom-sm text-dark group-hover:text-blue transition-colors">
            Rs.{totalPrice.toFixed(2)}
          </p>
        </div>
      </button>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if count or totalPrice changes
    return (
      prevProps.count === nextProps.count &&
      prevProps.totalPrice === nextProps.totalPrice
    );
  }
);

export default CartButton;
