"use client";

import React, { useState } from "react";
import RangeSlider from "react-range-slider-input";
import "react-range-slider-input/dist/style.css";

interface PriceDropdownProps {
  priceRange: { from: number; to: number };
  onPriceChange: (range: { from: number; to: number }) => void;
  minPrice: number;
  maxPrice: number;
  /** Render bare, without the card chrome and its own "Price" header —
   *  used when the parent filter panel already provides the section. */
  embedded?: boolean;
}

export default function PriceDropdown({
  priceRange,
  onPriceChange,
  minPrice,
  maxPrice,
  embedded = false,
}: PriceDropdownProps) {
  const [open, setOpen] = useState(true);

  if (embedded) {
    return <PriceBody {...{ priceRange, onPriceChange, minPrice, maxPrice }} />;
  }

  return (
    <div className="bg-gray-2 shadow-sm rounded-xl border border-gray-100">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full cursor-pointer flex items-center justify-between py-3 px-4"
      >
        <p className="text-dark font-medium">Price</p>
        <span
          className={`text-dark ease-out duration-200 ${open ? "rotate-180" : ""}`}
        >
          <svg
            className="fill-current"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M4.43057 8.51192C4.70014 8.19743 5.17361 8.161 5.48811 8.43057L12 14.0122L18.5119 8.43057C18.8264 8.16101 19.2999 8.19743 19.5695 8.51192C19.839 8.82642 19.8026 9.29989 19.4881 9.56946L12.4881 15.5695C12.2072 15.8102 11.7928 15.8102 11.5119 15.5695L4.51192 9.56946C4.19743 9.29989 4.161 8.82641 4.43057 8.51192Z"
              fill=""
            />
          </svg>
        </span>
      </button>

      <div className={`p-4 ${open ? "block" : "hidden"}`}>
        <RangeSlider
          id="range-slider-gradient"
          min={minPrice}
          max={maxPrice}
          step={10}
          value={[priceRange.from, priceRange.to]}
          onInput={(values: number[]) =>
            onPriceChange({
              from: Math.floor(values[0]),
              to: Math.ceil(values[1]),
            })
          }
        />

        <div className="price-amount flex items-center justify-between pt-4">
          <div className="text-custom-xs text-dark-4 flex rounded border border-gray-200">
            <span className="block border-r border-gray-200 px-2.5 py-1.5">
              Rs
            </span>
            <span className="block px-3 py-1.5">{priceRange.from}</span>
          </div>

          <div className="text-custom-xs text-dark-4 flex rounded border border-gray-200">
            <span className="block border-r border-gray-200 px-2.5 py-1.5">
              Rs
            </span>
            <span className="block px-3 py-1.5">{priceRange.to}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The slider + read-outs, shared by the standalone card and embedded modes. */
function PriceBody({
  priceRange,
  onPriceChange,
  minPrice,
  maxPrice,
}: Omit<PriceDropdownProps, "embedded">) {
  const amount = (value: number) =>
    value.toLocaleString("en-LK", { maximumFractionDigits: 0 });

  return (
    <div className="px-2 pb-1">
      <RangeSlider
        min={minPrice}
        max={maxPrice}
        step={10}
        value={[priceRange.from, priceRange.to]}
        onInput={(values: number[]) =>
          onPriceChange({
            from: Math.floor(values[0]),
            to: Math.ceil(values[1]),
          })
        }
      />

      <div className="price-amount mt-5 flex items-center gap-3">
        {[
          { caption: "From", value: priceRange.from },
          { caption: "Up to", value: priceRange.to },
        ].map((bound) => (
          <div
            key={bound.caption}
            className="flex-1 rounded-lg border border-gray-3 bg-gray-1 px-3 py-2"
          >
            <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-dark-5">
              {bound.caption}
            </span>
            <span className="mt-0.5 block text-[13px] font-semibold text-dark">
              Rs {amount(bound.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
