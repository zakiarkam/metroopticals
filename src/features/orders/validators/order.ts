import { z } from "zod";

import {
  FULFILMENT_METHODS,
  PAYMENT_METHODS,
} from "@/features/checkout/constants/payment";

/**
 * A phone number as a person types one: digits, and the punctuation phones
 * are written with. Deliberately loose — the shop calls these numbers, it
 * does not parse them — but tight enough that free text cannot be smuggled
 * into a field that ends up on a picking slip and in a WhatsApp message.
 */
const phone = z
  .string()
  .trim()
  .min(9, "Enter a valid phone number")
  .max(20)
  .regex(/^[+()\d][\d\s()+-]*$/, "Enter a valid phone number");

const shortText = (max: number) => z.string().trim().max(max);
const requiredText = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max);

const optionalText = (max: number) =>
  shortText(max)
    .optional()
    .transform((value) => (value ? value : undefined));

export const createOrderSchema = z
  .object({
    items: z
      .array(
        z.object({
          productId: z.coerce.number().int().positive(),
          quantity: z.number().int().min(1).max(99),
          price: z.number().positive(),
          /** The colourway as chosen in the cart; blank for colour-less items. */
          color: shortText(60).optional(),
          /**
           * Which basket line this is. Sent so the server can find the lens
           * choice attached to it — the lens type, tint and prescription are
           * never taken from the request, only the line's identity is, and
           * everything about the lenses is read back off our own row and
           * re-priced from the live price list.
           */
          cartItemId: z.coerce.number().int().positive().optional(),
        }),
      )
      .min(1)
      .max(50),
    paymentMethod: z.enum(PAYMENT_METHODS),
    /** `standard` is island-wide delivery; `pickup` is collection at the shop. */
    shippingMethod: z.enum(FULFILMENT_METHODS),
    notes: shortText(1000).optional(),

    billingName: requiredText(120, "Enter the name for the invoice"),
    billingEmail: z.string().trim().email().max(120),
    billingPhone: phone,
    billingAddress: optionalText(200),
    billingCity: optionalText(60),
    billingCountry: optionalText(60),
    billingPostalCode: optionalText(20),

    // Optional in shape, required by the refinement below whenever the order
    // is actually being delivered. A collection order has nothing to ship, so
    // demanding an address for it would only teach people to type "N/A".
    shippingName: optionalText(120),
    shippingEmail: z.string().trim().email().max(120).optional().or(z.literal("")),
    shippingPhone: phone.optional().or(z.literal("")),
    shippingAddress: optionalText(200),
    shippingCity: optionalText(60),
    shippingCountry: optionalText(60),
    shippingPostalCode: optionalText(20),
  })
  .superRefine((data, ctx) => {
    if (data.shippingMethod !== "standard") return;

    const required: Array<[keyof typeof data, string]> = [
      ["billingAddress", "Enter the billing address"],
      ["billingCity", "Enter the billing city"],
      ["shippingName", "Enter who the delivery is for"],
      ["shippingAddress", "Enter the delivery address"],
      ["shippingCity", "Enter the delivery city"],
      ["shippingPhone", "Enter a phone number for the delivery"],
    ];

    for (const [field, message] of required) {
      if (!data[field]) {
        ctx.addIssue({ code: "custom", message, path: [field] });
      }
    }
  });

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ]),
});

export const orderQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
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
  search: z.string().optional(),
  /** Website checkouts, counter bills, or both. */
  channel: z.enum(["ONLINE", "POS", "ALL"]).default("ALL"),
  ownOnly: z
    .preprocess((value) => {
      if (value === "true") return true;
      if (value === "false") return false;
      return value;
    }, z.boolean())
    .default(false),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type OrderQueryInput = z.infer<typeof orderQuerySchema>;
