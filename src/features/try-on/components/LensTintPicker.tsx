"use client";

import React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { LENS_GROUPS, LENS_TINTS, type LensTint } from "@/features/try-on/config";

const swatchStyle = (tint: LensTint): React.CSSProperties => {
  if (!tint.color) return { background: "#f7f5f0" };
  if (tint.gradient) {
    return { background: `linear-gradient(180deg, ${tint.color} 0%, ${tint.color}22 100%)` };
  }
  // A light tint reads better as a wash over white than as a solid block.
  if (tint.opacity < 0.3) {
    const alpha = Math.round(tint.opacity * 2.2 * 255).toString(16).padStart(2, "0");
    return { background: `linear-gradient(135deg, #ffffff 0%, ${tint.color}${alpha} 100%)` };
  }
  return { background: tint.color };
};

/**
 * The lens types the shop sells, previewed on the frame. The look only 
 * the counter quotes the real range and price  with a link to each lens
 * page for the customer who wants to know what they are looking at.
 */
export default function LensTintPicker({
  value,
  onChange,
  disabled,
}: {
  value: LensTint;
  onChange: (tint: LensTint) => void;
  disabled?: boolean;
}) {
  const activeGroup = LENS_GROUPS.find((g) => g.key === value.group) ?? LENS_GROUPS[0];

  return (
    <div>
      <p className="text-[13px] font-semibold text-dark">
        Lenses <span className="font-normal text-dark-4">{value.label}</span>
      </p>
      <div className="mt-2.5 space-y-2">
        {LENS_GROUPS.map((group) => {
          const tints = LENS_TINTS.filter((t) => t.group === group.key);
          return (
            <div key={group.key} className="flex items-center gap-2">
              <span className="w-[92px] shrink-0 whitespace-nowrap text-[12px] font-semibold text-dark-4">
                {group.label}
              </span>
              <div role="radiogroup" aria-label={`${group.label} lenses`} className="flex flex-wrap gap-1.5">
                {tints.map((tint) => {
                  const selected = tint.id === value.id;
                  return (
                    <button
                      key={tint.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={tint.label}
                      title={tint.label}
                      disabled={disabled}
                      onClick={() => onChange(tint)}
                      className={`grid h-8 w-10 place-items-center rounded-[10px] border transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                        selected
                          ? "border-blue shadow-[0_0_0_2px_rgba(143,106,55,0.3)]"
                          : "border-gray-3 hover:border-blue/50"
                      }`}
                      style={swatchStyle(tint)}
                    >
                      {selected && (
                        <Check
                          className={`h-3.5 w-3.5 ${tint.color && tint.opacity >= 0.3 ? "text-white" : "text-dark"}`}
                          strokeWidth={3}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11.5px] leading-relaxed text-dark-5">
        {disabled ? "Lens looks are not available for this picture. " : `${activeGroup.note} `}
        <Link href={`/lenses/${activeGroup.slug}`} className="font-semibold text-blue hover:underline">
          About {activeGroup.label.toLowerCase()} lenses
        </Link>
      </p>
    </div>
  );
}
