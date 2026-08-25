import { z } from "zod";

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.coerce.number().int().positive(),
        quantity: z.number().int().min(1),
        price: z.number().positive(),
        /** The colourway as chosen in the cart; blank for colour-less items. */
        color: z.string().trim().max(60).optional(),
      })
    )
    .min(1),
  paymentMethod: z.enum(["cod"]),
  shippingMethod: z.enum(["standard"]),
  notes: z.string().trim().max(1000).optional(),
  billingName: z.string().min(1),
  billingEmail: z.string().email(),
  billingPhone: z.string().min(1),
  billingAddress: z.string().min(1),
  billingCity: z.string().min(1),
  billingCountry: z.string().optional(),
  billingPostalCode: z.string().optional(),
  shippingName: z.string().min(1),
  shippingEmail: z.string().email(),
  shippingPhone: z.string().min(1),
  shippingAddress: z.string().min(1),
  shippingCity: z.string().min(1),
  shippingCountry: z.string().optional(),
  shippingPostalCode: z.string().optional(),
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
  paymentStatus: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]).optional(),
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
