"use client";

import React from "react";
import { Clock } from "lucide-react";

import { describeOrderLens } from "@/features/lenses/utils/pricing";

/**
 * "Order lens - made to order, about 7 working days".
 *
 * Said wherever a made-to-order pair can be seen, and said BEFORE the money
 * is taken. A power the shop has to order in is not a worse pair of glasses,
 * it is a longer wait, and a customer who finds that out after paying has
 * been told late rather than told honestly.
 *
 * Renders nothing at all for a stock lens, so callers can drop it in without
 * a conditional of their own.
 */
export default function OrderLensNote({
  isOrderLens,
  leadTimeDays = null,
  variant = "pill",
  className = "",
}: {
  isOrderLens: boolean | null | undefined;
  leadTimeDays?: number | null;
  /** `pill` sits beside a price; `panel` explains itself on its own line. */
  variant?: "pill" | "panel";
  className?: string;
}) {
  const text = describeOrderLens({
    isOrderLens: Boolean(isOrderLens),
    leadTimeDays: leadTimeDays ?? null,
  });
  if (!text) return null;

  if (variant === "pill") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-orange/15 px-2.5 py-1 text-[11px] font-bold text-orange-dark ${className}`}
      >
        <Clock className="h-3 w-3 shrink-0" />
        {text}
      </span>
    );
  }

  return (
    <p
      className={`flex items-start gap-2 rounded-xl border border-orange/35 bg-orange/[0.07] px-3.5 py-2.5 text-[12px] leading-relaxed text-dark-3 ${className}`}
    >
      <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-dark" />
      <span>
        <span className="font-bold text-dark">{text}.</span>{" "}
        {leadTimeDays
          ? "Your frame is held for you and the glasses are ready once the lenses arrive."
          : "This power is not cut from stock - we'll confirm the date when the order is placed."}
      </span>
    </p>
  );
}
