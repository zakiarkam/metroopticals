export type AvailabilityTone = "in" | "low" | "out" | "inactive";

export type Availability = {
  tone: AvailabilityTone;
  /** Short label for pills and badges. */
  label: string;
  /** Label for the primary action button when the item cannot be bought. */
  actionLabel: string;
  canBuy: boolean;
};

/** Stock at or below this shows as "Low stock" to nudge the customer. */
export const LOW_STOCK_THRESHOLD = 5;

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

  if (count <= LOW_STOCK_THRESHOLD) {
    return {
      tone: "low",
      label: `Only ${count} left`,
      actionLabel: "Add to cart",
      canBuy: true,
    };
  }

  return {
    tone: "in",
    label: "In stock",
    actionLabel: "Add to cart",
    canBuy: true,
  };
}

/** Tailwind classes per tone, for pills rendered on the card surface. */
export const AVAILABILITY_PILL_CLASSES: Record<AvailabilityTone, string> = {
  in: "border-green/30 bg-green/10 text-green",
  low: "border-yellow/30 bg-yellow/10 text-yellow",
  out: "border-red/30 bg-red/10 text-red",
  inactive: "border-gray-4 bg-gray-8 text-dark-4",
};

/** Bare text colour, for inline status lines without a chip. */
export const AVAILABILITY_TEXT_CLASSES: Record<AvailabilityTone, string> = {
  in: "text-green",
  low: "text-yellow",
  out: "text-red",
  inactive: "text-dark-4",
};
