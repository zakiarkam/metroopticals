import { z } from "zod";

/** Rupee amount: two decimals, and never absurd enough to be a typo for cents. */
const money = z.coerce.number().min(0).max(100_000_000);

const phone = z
  .string()
  .trim()
  .min(6, "Enter a valid phone number")
  .max(20)
  .regex(/^[0-9+()\s-]+$/, "Phone number can only contain digits and + ( ) -");

export const posCustomerSchema = z.object({
  /** An existing customer-book entry, when the cashier picked one. */
  id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1).max(120).optional(),
  phone: phone.optional(),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
  /**
   * Whether to keep these details in the book at all. Someone who gives a
   * number only so a bill can be chased can still ask not to be kept.
   */
  saveToBook: z.boolean().default(true),
  /** They said yes to offers. Never inferred; only ever set from a tick. */
  marketingOptIn: z.boolean().default(false),
});

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required").max(120),
  phone,
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
  marketingOptIn: z.boolean().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const customerQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  /** Only people who said yes to offers  the marketing list. */
  optedInOnly: z
    .preprocess((value) => {
      if (value === "true") return true;
      if (value === "false") return false;
      return value;
    }, z.boolean())
    .default(false),
  sort: z.enum(["recent", "spend", "visits", "name"]).default("recent"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * One line on a bill.
 *
 * Either it points at a catalogue product, or it is a service the shop
 * performs (an eye test, a lens fitting, a repair) and carries only a name.
 */
export const posSaleItemSchema = z
  .object({
    productId: z.coerce.number().int().positive().optional(),
    /** Required for a service line; ignored for a product line. */
    title: z.string().trim().min(1).max(160).optional(),
    quantity: z.coerce.number().int().min(1).max(9999),
    /** What is actually being charged per unit, override included. */
    unitPrice: money,
    lineDiscount: money.default(0),
    color: z.string().trim().max(60).optional(),
  })
  .refine((line) => line.productId != null || !!line.title, {
    message: "A line needs either a product or a name",
    path: ["title"],
  });

export const posPaymentSchema = z.object({
  method: z.enum(["CASH", "CARD", "BANK_TRANSFER", "ONLINE"]),
  amount: money,
  reference: z.string().trim().max(120).optional(),
});

export const createSaleSchema = z.object({
  items: z
    .array(posSaleItemSchema)
    .min(1, "Add at least one item to the bill")
    // No real counter bill runs to 200 lines; the cap is what stops one
    // request from holding a database transaction open indefinitely.
    .max(200, "That is too many lines for one bill"),
  /** Bill-level discount in rupees, on top of the per-line discounts. */
  discountAmount: money.default(0),
  payments: z.array(posPaymentSchema).default([]),
  customer: posCustomerSchema.optional(),
  notes: z.string().trim().max(1000).optional(),
  /**
   * The goods stay in the shop  lenses being fitted, a frame on order  so
   * the bill is still open rather than handed over.
   */
  collectLater: z.boolean().default(false),
  /**
   * When the rest of the money is expected, `YYYY-MM-DD`. Only meaningful on a
   * bill that is leaving the counter part paid.
   */
  balanceDueDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const addPaymentSchema = posPaymentSchema.extend({
  amount: money.refine((value) => value > 0, "Enter an amount"),
  /** Push the promise date out when a customer pays part of what they owe. */
  balanceDueDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const voidSaleSchema = z.object({
  reason: z.string().trim().min(3, "Say why the bill is being cancelled").max(300),
});

export const returnSaleSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().min(1).max(9999),
      }),
    )
    .min(1, "Choose what is being returned")
    .max(200)
    // One entry per line. Without this, the same line sent twice would each
    // pass the "how many are left to return" check on its own and the bill
    // would give back more than it ever sold.
    .refine(
      (items) => new Set(items.map((item) => item.itemId)).size === items.length,
      { message: "Each line can only be returned once per request" },
    ),
  /** Money handed back. Zero is valid  an exchange refunds nothing. */
  refundAmount: money.default(0),
  refundMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER", "ONLINE"]).default("CASH"),
  /** Damaged goods go back on the shelf only if the shop can resell them. */
  restock: z.boolean().default(true),
  reason: z.string().trim().max(300).optional(),
});

export const saleQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().max(120).optional(),
  /** Inclusive, `YYYY-MM-DD` in the shop's own day. */
  startDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  paymentStatus: z.enum(["PENDING", "PARTIAL", "PAID", "REFUNDED"]).optional(),
  paymentMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER", "ONLINE"]).optional(),
  cashierId: z.coerce.number().int().positive().optional(),
  /** POS by default; the sales screen is about counter bills. */
  channel: z.enum(["POS", "ONLINE", "ALL"]).default("POS"),
  /** Only bills with money still to collect, oldest promise first. */
  outstandingOnly: z
    .preprocess((value) => {
      if (value === "true") return true;
      if (value === "false") return false;
      return value;
    }, z.boolean())
    .default(false),
  status: z
    .enum([
      "PENDING",
      "CONFIRMED",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
    ])
    .optional(),
});

export const posProductQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  brandId: z.coerce.number().int().positive().optional(),
  /** Hide what cannot be sold today. On by default at the counter. */
  inStockOnly: z
    .preprocess((value) => {
      if (value === "true") return true;
      if (value === "false") return false;
      return value;
    }, z.boolean())
    .default(false),
  limit: z.coerce.number().int().positive().max(60).default(24),
});

export const stockAdjustSchema = z
  .object({
    productId: z.coerce.number().int().positive(),
    /** `add` receives goods, `set` corrects the count to what is on the shelf. */
    mode: z.enum(["add", "remove", "set"]),
    quantity: z.coerce.number().int().min(0).max(1_000_000),
    reason: z.enum(["PURCHASE", "ADJUSTMENT", "RETURN"]).default("ADJUSTMENT"),
    note: z.string().trim().max(300).optional(),
  })
  .refine((data) => data.mode === "set" || data.quantity > 0, {
    message: "Enter a quantity",
    path: ["quantity"],
  });

export const stockMovementQuerySchema = z.object({
  productId: z.coerce.number().int().positive().optional(),
  reason: z
    .enum(["SALE", "ONLINE_ORDER", "RETURN", "VOID", "PURCHASE", "ADJUSTMENT"])
    .optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});

export const dailyReportQuerySchema = z.object({
  /** `YYYY-MM-DD`; defaults to today at the shop. */
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type PosCustomerInput = z.infer<typeof posCustomerSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerQueryInput = z.infer<typeof customerQuerySchema>;
export type PosSaleItemInput = z.infer<typeof posSaleItemSchema>;
export type PosPaymentInput = z.infer<typeof posPaymentSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type AddPaymentInput = z.infer<typeof addPaymentSchema>;
export type VoidSaleInput = z.infer<typeof voidSaleSchema>;
export type ReturnSaleInput = z.infer<typeof returnSaleSchema>;
export type SaleQueryInput = z.infer<typeof saleQuerySchema>;
export type PosProductQueryInput = z.infer<typeof posProductQuerySchema>;
export type StockAdjustInput = z.infer<typeof stockAdjustSchema>;
export type StockMovementQueryInput = z.infer<typeof stockMovementQuerySchema>;
export type DailyReportQueryInput = z.infer<typeof dailyReportQuerySchema>;
