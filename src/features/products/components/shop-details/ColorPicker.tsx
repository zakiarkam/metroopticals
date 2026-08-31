"use client";

import React from "react";
import { Check } from "lucide-react";
import { getColorSwatch } from "@/features/products/utils/colors";

/**
 * Colourway selector. Sold-out colours stay visible and selectable — hiding
 * them would read as "this frame only comes in black" — but they are struck
 * through, announced to screen readers, and the buy button goes to "Out of
 * stock" while one is selected.
 */
const ColorPicker = ({
  colors,
  value,
  onChange,
  soldOutColors = [],
  className = "",
}: {
  colors: string[];
  value: string;
  onChange: (color: string) => void;
  /** Colour names with a recorded count of zero, matched case-insensitively. */
  soldOutColors?: string[];
  className?: string;
}) => {
  if (!colors.length) return null;

  const soldOutSet = new Set(
    soldOutColors.map((color) => color.trim().toLowerCase()),
  );
  const isSoldOut = (color: string) =>
    soldOutSet.has(color.trim().toLowerCase());

  const selectedSoldOut = Boolean(value) && isSoldOut(value);

  return (
    <div className={className}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-[13px] font-semibold text-dark">Colour</span>
        <span className="text-[13px] text-dark-4">{value}</span>
        {selectedSoldOut && (
          <span className="text-[12px] font-semibold text-red">
            Out of stock
          </span>
        )}
      </div>

      <div
        role="radiogroup"
        aria-label="Frame colour"
        className="mt-3 flex flex-wrap gap-2.5"
      >
        {colors.map((color) => {
          const swatch = getColorSwatch(color);
          const selected = color === value;
          const soldOut = isSoldOut(color);

          return (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={soldOut ? `${color} — out of stock` : color}
              onClick={() => onChange(color)}
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-semibold transition-all ${
                selected
                  ? soldOut
                    ? "border-red/45 bg-red/[0.05] text-dark shadow-[0_0_0_1px_rgba(220,38,38,0.25)]"
                    : "border-blue bg-blue/[0.07] text-dark shadow-[0_0_0_1px_rgba(37,89,168,0.35)]"
                  : soldOut
                    ? "border-gray-3 bg-gray-1 text-dark-5 hover:border-dark-5/40"
                    : "border-gray-3 bg-gray-2 text-dark-2 hover:border-blue/45 hover:text-dark"
              }`}
            >
              {swatch ? (
                <span
                  aria-hidden
                  className={`relative grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded-full ${
                    swatch.needsBorder ? "ring-1 ring-inset ring-dark/20" : ""
                  } ${soldOut ? "opacity-45" : ""}`}
                  style={{ background: swatch.background }}
                >
                  {selected && !soldOut && (
                    <Check
                      className="h-3 w-3 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]"
                      strokeWidth={3.5}
                    />
                  )}
                  {soldOut && (
                    <span className="absolute left-1/2 top-1/2 h-[1.5px] w-[150%] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-red/80" />
                  )}
                </span>
              ) : (
                selected &&
                !soldOut && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-blue" />
                )
              )}

              <span className={soldOut ? "line-through decoration-dark-5" : ""}>
                {color}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ColorPicker;
