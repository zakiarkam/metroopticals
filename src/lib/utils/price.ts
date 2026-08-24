"use strict";

export type DisplayPriceResult = {
  displayPrice: number;
  hasDiscount: boolean;
  discountPercent: number | null;
  originalPrice?: number;
};

export const resolveDisplayPrice = (
  price: number,
  discountedPrice: number | null | undefined,
  canViewDiscount = false
): DisplayPriceResult => {
  const normalizedDiscount =
    typeof discountedPrice === "number" ? discountedPrice : undefined;
  const hasDiscount =
    canViewDiscount &&
    normalizedDiscount !== undefined &&
    normalizedDiscount < price &&
    price > 0;
  const displayPrice = hasDiscount ? normalizedDiscount! : price;
  const discountPercent =
    hasDiscount && price > 0
      ? Math.round(((price - displayPrice) / price) * 100)
      : null;

  return {
    displayPrice,
    hasDiscount,
    discountPercent,
    originalPrice: hasDiscount ? price : undefined,
  };
};

export const getUnitLabel = (unitType?: string | null) => {
  switch (unitType) {
    case "METER":
      return "per meter";
    case "BOX":
      return "per box";
    case "DRUM":
      return "per drum";
    case "PIECES":
    default:
      return "per piece";
  }
};

/**
 * Rupee amount for display, e.g. `Rs 4,900.00`.
 *
 * Six components had grown their own identical `money()` helper and a seventh
 * used a bare `Intl.NumberFormat`, so a rounding or currency change had to be
 * made in seven places. This is the one formatter the storefront uses.
 */
export const formatPrice = (value?: number | null) =>
  `Rs ${Number(value ?? 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
