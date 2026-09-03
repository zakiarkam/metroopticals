/**
 * Bill arithmetic, shared by the counter screen and the server.
 *
 * The cashier sees a total before the sale is saved, and the server recomputes
 * that same total from the same inputs when it saves. Both go through these
 * functions so the printed bill can never disagree with what was charged.
 *
 * Money is rounded to two decimals at every step: a 1/3-of-a-rupee line
 * discount must not leave a balance of Rs 0.004 that no one can ever pay off.
 */

export type BillLineInput = {
  quantity: number;
  /** Price per unit actually being charged, after any override by the cashier. */
  unitPrice: number;
  /** Discount in rupees on this line, applied to the line total. */
  lineDiscount?: number;
};

export type BillTotalsInput = {
  items: BillLineInput[];
  /** Discount in rupees on the whole bill, applied after the line discounts. */
  discountAmount?: number;
  /** Sum of what has been collected so far. */
  amountPaid?: number;
};

export type BillTotals = {
  /** Sum of the lines before any discount. */
  grossSubtotal: number;
  /** Sum of the per-line discounts. */
  lineDiscountTotal: number;
  /** What the lines come to after their own discounts. */
  subtotal: number;
  /** The bill-level discount, clamped so a bill can never go negative. */
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  /** What is still to be collected. Never negative  see `changeDue`. */
  balanceDue: number;
  /** Cash handed over above the total, to be given back. */
  changeDue: number;
};

/** Two decimals, and never `-0`. */
export const roundMoney = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100 + 0;
};

export const lineGross = (line: BillLineInput): number =>
  roundMoney(Math.max(0, line.unitPrice) * Math.max(0, line.quantity));

/** A line discount is capped at the line itself: a line never goes negative. */
export const lineDiscountApplied = (line: BillLineInput): number =>
  roundMoney(Math.min(Math.max(0, line.lineDiscount ?? 0), lineGross(line)));

export const lineNet = (line: BillLineInput): number =>
  roundMoney(lineGross(line) - lineDiscountApplied(line));

export function calculateBillTotals({
  items,
  discountAmount = 0,
  amountPaid = 0,
}: BillTotalsInput): BillTotals {
  const grossSubtotal = roundMoney(
    items.reduce((sum, line) => sum + lineGross(line), 0),
  );
  const lineDiscountTotal = roundMoney(
    items.reduce((sum, line) => sum + lineDiscountApplied(line), 0),
  );
  const subtotal = roundMoney(grossSubtotal - lineDiscountTotal);

  const billDiscount = roundMoney(
    Math.min(Math.max(0, discountAmount), subtotal),
  );
  const totalAmount = roundMoney(subtotal - billDiscount);

  const paid = roundMoney(Math.max(0, amountPaid));
  const balanceDue = roundMoney(Math.max(0, totalAmount - paid));
  const changeDue = roundMoney(Math.max(0, paid - totalAmount));

  return {
    grossSubtotal,
    lineDiscountTotal,
    subtotal,
    discountAmount: billDiscount,
    totalAmount,
    amountPaid: paid,
    balanceDue,
    changeDue,
  };
}

export type PaymentState = "PENDING" | "PARTIAL" | "PAID" | "REFUNDED";

/**
 * Fully paid within a cent. Floating point makes an exact-cash sale come out
 * at Rs 4,499.999999 often enough that a strict `>=` would leave bills sitting
 * as PARTIAL forever.
 */
export function resolvePaymentStatus(
  totalAmount: number,
  amountPaid: number,
): PaymentState {
  // A bill that comes to nothing  everything discounted, or a free
  // replacement  is settled, not owed. Left as PENDING it would sit in the
  // "money to collect" list forever.
  if (totalAmount <= 0.005) return "PAID";
  if (amountPaid <= 0.005) return "PENDING";
  if (amountPaid >= totalAmount - 0.005) return "PAID";
  return "PARTIAL";
}

/**
 * What one saved line came to on the bill.
 *
 * The stored shape is deliberate: `price` is what the catalogue asked,
 * `discountedPrice` is what the cashier actually charged per unit, and
 * `lineDiscount` is money taken off the line as a whole. Keeping the discount
 * out of the per-unit price is what lets a bill like "3 frames, Rs 100 off"
 * add up exactly  a discount divided into thirds never would. Everything that
 * displays or totals a saved line goes through here so no screen invents its
 * own arithmetic.
 */
export type SavedLine = {
  quantity: number;
  price: number;
  discountedPrice?: number | null;
  lineDiscount?: number | null;
  /**
   * Prescription lenses fitted to this line, per unit. Zero or absent on a
   * counter line and on any frame sold bare — which is every line written
   * before lenses were sold online, so nothing already on file moves.
   */
  lensPrice?: number | null;
};

/**
 * The unit price actually charged, discount aside.
 *
 * The frame and the lenses ground for it are one saleable thing: a customer
 * buys "this frame with these lenses" and pays one figure for it. Splitting
 * them here would leave every total on every screen short by the lenses.
 */
export const savedLineUnitPrice = (line: SavedLine): number =>
  (line.discountedPrice ?? line.price) + (line.lensPrice ?? 0);

/** Before this line's own discount. */
export const savedLineGross = (line: SavedLine): number =>
  roundMoney(savedLineUnitPrice(line) * line.quantity);

/** What the line contributes to the bill's subtotal. */
export const savedLineTotal = (line: SavedLine): number =>
  roundMoney(savedLineGross(line) - Math.max(0, line.lineDiscount || 0));
