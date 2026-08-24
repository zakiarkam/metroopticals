import { z } from "zod";

export const createBrandSchema = z.object({
  name: z.string().min(1, "Brand name is required").max(60),
  slug: z.string().max(80).optional(),
  logo: z.string().max(255).nullable().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const updateBrandSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  slug: z.string().max(80).optional(),
  logo: z.string().max(255).nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
