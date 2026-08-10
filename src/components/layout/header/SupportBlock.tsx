"use client";

import React, { memo } from "react";

const SupportBlock = memo(function SupportBlock() {
  return (
    <div className="hidden md:flex items-center gap-3.5 py-2">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue/10">
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
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      </div>

      <div className="text-end">
        <span className="block text-2xs text-dark-4 uppercase">
          24/7 SUPPORT
        </span>
        <a
          href="tel:0112822821"
          className="font-medium text-custom-sm text-dark hover:text-blue transition-colors"
          aria-label="Call 0112 822 821"
        >
          0112 822 821
        </a>
      </div>
    </div>
  );
});

export default SupportBlock;
