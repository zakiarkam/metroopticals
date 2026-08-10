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
