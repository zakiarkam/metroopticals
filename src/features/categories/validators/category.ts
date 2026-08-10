import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug is required")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain only lowercase letters, numbers, and hyphens"
    ),
  description: z.string().optional(),
  image: z.string().optional().nullable(),
  status: z.enum(["active", "inactive"]).default("active"),
  parentId: z.coerce.number().int().positive().optional().nullable(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  description: z.string().optional(),
  image: z.string().optional().nullable(),
  status: z.enum(["active", "inactive"]).optional(),
  parentId: z.coerce.number().int().positive().optional().nullable(),
});

export const updateCategoryStatusSchema = z.object({
  status: z.enum(["active", "inactive"]),
});

export const getCategoriesQuerySchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(50),
  search: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type UpdateCategoryStatusInput = z.infer<
  typeof updateCategoryStatusSchema
>;
export type GetCategoriesQuery = z.infer<typeof getCategoriesQuerySchema>;
