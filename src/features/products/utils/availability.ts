export type AvailabilityTone = "in" | "out" | "inactive";

export type Availability = {
  tone: AvailabilityTone;
  /** Short label for pills and badges. */
  label: string;
  /** Label for the primary action button when the item cannot be bought. */
  actionLabel: string;
  canBuy: boolean;
};

/**
 * Availability as the storefront states it: in stock, out of stock, or
 * retired. Counts are deliberately not surfaced — "Only 3 left" reads as
 * pressure, and the shop preferred not to say it.
 */
export function getAvailability(
  status?: string | null,
  stock?: number | null,
): Availability {
  const count = typeof stock === "number" ? stock : 0;

  if (status === "INACTIVE") {
    return {
      tone: "inactive",
      label: "Unavailable",
      actionLabel: "Unavailable",
      canBuy: false,
    };
  }

  if (status === "OUT_OF_STOCK" || count <= 0) {
    return {
      tone: "out",
      label: "Out of stock",
      actionLabel: "Out of stock",
      canBuy: false,
    };
  }

  return {
    tone: "in",
    label: "In stock",
    actionLabel: "Add to cart",
    canBuy: true,
  };
}

/**
 * One colourway's row, as the API serialises it. A null stock means the
 * colour has not been counted and falls back to the product total; `image`
 * names the gallery photo to jump to when the colour is picked.
 */
export type ColorStock = {
  color: string;
  stock: number | null;
  image?: string | null;
};

/** Colour names are free text entered by the admin, so match loosely. */
const findColorStock = (
  colorStocks: ColorStock[] | null | undefined,
  color: string,
) => {
  const key = color.trim().toLowerCase();
  if (!key) return undefined;
  return colorStocks?.find((row) => row.color.trim().toLowerCase() === key);
};

/**
 * How many units of one colourway a shopper can actually order.
 *
 * An uncounted colour — no row, or a row with a null count — falls back to
 * the product total, so nothing recorded before per-colour counts existed
 * becomes unbuyable. A recorded count never exceeds the total: the total is
 * what the POS and the ledger keep honest.
 */
export function getEffectiveStock(
  totalStock?: number | null,
  colorStocks?: ColorStock[] | null,
  color?: string | null,
): number {
  const total = typeof totalStock === "number" ? Math.max(0, totalStock) : 0;
  if (!color) return total;

  const row = findColorStock(colorStocks, color);
  if (row?.stock == null) return total;

  return Math.max(0, Math.min(row.stock, total));
}

/** True only when the colourway has a recorded count and it has run out. */
export function isColorSoldOut(
  colorStocks: ColorStock[] | null | undefined,
  color: string,
): boolean {
  const row = findColorStock(colorStocks, color);
  return row?.stock != null && row.stock <= 0;
}

/** The gallery photo tagged to one colourway, when the admin tagged one. */
export function getColorImage(
  colorStocks: ColorStock[] | null | undefined,
  color: string | null | undefined,
): string | null {
  if (!color) return null;
  return findColorStock(colorStocks, color)?.image ?? null;
}

/** The subset of `colors` recorded as sold out, in their original order. */
export function getSoldOutColors(
  colors: string[],
  colorStocks?: ColorStock[] | null,
): string[] {
  if (!colorStocks?.length) return [];
  return colors.filter((color) => isColorSoldOut(colorStocks, color));
}

/** Tailwind classes per tone, for pills rendered on the card surface. */
export const AVAILABILITY_PILL_CLASSES: Record<AvailabilityTone, string> = {
  in: "border-green/30 bg-green/10 text-green",
  out: "border-red/30 bg-red/10 text-red",
  inactive: "border-gray-4 bg-gray-8 text-dark-4",
};
