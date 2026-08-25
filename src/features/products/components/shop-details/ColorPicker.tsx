"use client";

import React from "react";
import { Check } from "lucide-react";
import { getColorSwatch } from "@/features/products/utils/colors";

/**
 * The colourway chooser on the product page.
 *
 * A frame is usually stocked in several finishes and the one a shopper wants is
 * part of what they are buying, so the choice is made here rather than left to
 * a note at checkout. The selection travels with the cart line all the way to
 * the order, which is what the picking slip reads.
 *
 * Chips carry both a swatch and the name. The swatch alone would fail anyone
 * who cannot distinguish the colours, and several eyewear finishes ("Havana",
 * "Demi") are names first and colours second.
 */
const ColorPicker = ({
  colors,
  value,
  onChange,
  className = "",
}: {
  colors: string[];
  value: string;
  onChange: (color: string) => void;
  className?: string;
}) => {
  if (!colors.length) return null;

  return (
    <div className={className}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-[13px] font-semibold text-dark">Colour</span>
        <span className="text-[13px] text-dark-4">{value}</span>
      </div>

      <div
        role="radiogroup"
        aria-label="Frame colour"
        className="mt-3 flex flex-wrap gap-2.5"
      >
        {colors.map((color) => {
          const swatch = getColorSwatch(color);
          const selected = color === value;

          return (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(color)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-semibold transition-all ${
                selected
                  ? "border-blue bg-blue/[0.07] text-dark shadow-[0_0_0_1px_rgba(37,89,168,0.35)]"
                  : "border-gray-3 bg-gray-2 text-dark-2 hover:border-blue/45 hover:text-dark"
              }`}
            >
              {swatch ? (
                <span
                  aria-hidden
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                    swatch.needsBorder ? "ring-1 ring-inset ring-dark/20" : ""
                  }`}
                  style={{ background: swatch.background }}
                >
                  {selected && (
                    <Check
                      className="h-3 w-3 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]"
                      strokeWidth={3.5}
                    />
                  )}
                </span>
              ) : (
                selected && <Check className="h-3.5 w-3.5 shrink-0 text-blue" />
              )}

              {color}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ColorPicker;
