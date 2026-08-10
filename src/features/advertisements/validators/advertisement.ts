import { z } from "zod";

export const createAdvertisementSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  imageUrl: z.string().url("Must be a valid URL"),
  link: z.string().url("Must be a valid URL").optional().nullable(),
  placement: z.enum(["hero", "promobanner", "countdown"]),
  status: z.enum(["active", "inactive"]).default("active"),
  priority: z.number().int().min(0).default(0),
  slot: z.number().int().min(1).max(3).default(1),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  productId: z.coerce.number().int().positive(),
});

export const updateAdvertisementSchema = createAdvertisementSchema.partial();

export const updateAdvertisementStatusSchema = z.object({
  status: z.enum(["active", "inactive"]),
});

export const advertisementQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  placement: z.enum(["hero", "promobanner", "countdown"]).optional(),
});

export type CreateAdvertisementInput = z.infer<
  typeof createAdvertisementSchema
>;
export type UpdateAdvertisementInput = z.infer<
  typeof updateAdvertisementSchema
>;
export type UpdateAdvertisementStatusInput = z.infer<
  typeof updateAdvertisementStatusSchema
>;
export type AdvertisementQueryInput = z.infer<typeof advertisementQuerySchema>;
