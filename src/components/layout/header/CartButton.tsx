"use client";

import React, { memo } from "react";

interface CartButtonProps {
  count: number;
  onOpen: () => void;
}

const CartButton = memo(
  function CartButton({ count, onOpen }: CartButtonProps) {
    return (
      <button
        onClick={onOpen}
        className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-3 text-dark transition-colors hover:border-blue hover:text-blue"
        aria-label={
          count > 0 ? `Open cart, ${count} item(s)` : "Open cart, empty"
        }
        title="Cart"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
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
          <span className="absolute -right-1 -top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-blue text-[10px] font-semibold text-white ring-2 ring-gray-2">
            {count}
          </span>
        )}
      </button>
    );
  },
  // Only re-render when the item count changes.
  (prevProps, nextProps) => prevProps.count === nextProps.count
);

export default CartButton;
