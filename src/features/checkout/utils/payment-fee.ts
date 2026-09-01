import { ONLINE_PAYMENT_METHOD } from "@/features/checkout/constants/payment";

/**
 * The surcharge for paying online, worked out the same way on both sides.
 *
 * The checkout previews it and the order service charges it, and neither may
 * be the one that decides: they read the same percentage out of the same
 * build-time variable and round it the same way, so the figure the shopper
 * agreed to is the figure on the invoice. The server still computes its own
 * total from the catalogue price — the browser's arithmetic is shown, never
 * trusted.
 */

/** Rupees, to the cent. Kept off binary-float dust like 349.99999999999994. */
export const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const parsePercent = (raw: string | undefined) => {
  const parsed = Number.parseFloat((raw ?? "").trim());
  // A missing, unparseable or absurd value charges nothing rather than
  // guessing: a surcharge nobody configured must never appear on a bill.
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return 0;
  return parsed;
};

/** Percent added to a card payment, e.g. 2.5. */
export const ONLINE_PAYMENT_FEE_PERCENT = parsePercent(
  process.env.NEXT_PUBLIC_PAYHERE_FEE_PERCENT,
);

const formattedPercent = ONLINE_PAYMENT_FEE_PERCENT.toString();

/**
 * What the line is called on the checkout, the invoice and the receipt.
 * Overridable because what this charge may legally be called depends on how
 * the business is registered, and that is not something code should assume.
 */
export const ONLINE_PAYMENT_FEE_LABEL =
  process.env.NEXT_PUBLIC_PAYHERE_FEE_LABEL?.trim() ||
  `Online payment fee (${formattedPercent}%)`;

/** The surcharge on `amount`, in rupees. Zero for every offline method. */
export const onlinePaymentFee = (
  amount: number,
  paymentMethod: string | null | undefined,
) => {
  if (paymentMethod !== ONLINE_PAYMENT_METHOD) return 0;
  if (!(amount > 0) || ONLINE_PAYMENT_FEE_PERCENT <= 0) return 0;
  return roundMoney((amount * ONLINE_PAYMENT_FEE_PERCENT) / 100);
};
