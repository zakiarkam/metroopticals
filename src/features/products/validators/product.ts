import { z } from "zod";

export const createProductSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().optional(),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be positive"),
  discountedPrice: z.number().min(0).optional().nullable(),
  images: z.array(z.string()).optional(),
  catalogueFile: z.string().optional().nullable(),
  categoryId: z.coerce.number().int().positive().optional(),
  subcategoryId: z.coerce.number().int().positive().optional().nullable(),
  stock: z.number().int().min(0, "Stock must be non-negative"),
  unitType: z.enum(["METER", "PIECES", "BOX", "DRUM"]).default("PIECES"),
  status: z.enum(["ACTIVE", "INACTIVE", "OUT_OF_STOCK"]).default("ACTIVE"),
});

export const updateProductSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  discountedPrice: z.number().min(0).optional().nullable(),
  images: z.array(z.string()).optional(),
  catalogueFile: z.string().optional().nullable(),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  subcategoryId: z.coerce.number().int().positive().optional().nullable(),
  stock: z.number().int().min(0).optional(),
  unitType: z.enum(["METER", "PIECES", "BOX", "DRUM"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "OUT_OF_STOCK"]).optional(),
});

export const incrementProductStockSchema = z.object({
  count: z.number().int().positive("Count must be a positive integer"),
});

export const decrementProductStockSchema = z.object({
  count: z.number().int().positive("Count must be a positive integer"),
});

export const updateProductStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "OUT_OF_STOCK"]),
});

const categoryArraySchema = z
  .preprocess((value) => {
    if (Array.isArray(value)) {
      return value
        .map((slug) => (typeof slug === "string" ? slug.trim() : ""))
        .filter((slug) => slug.length > 0);
    }
    if (typeof value === "string") {
      return value
        .split(",")
        .map((slug) => slug.trim())
        .filter((slug) => slug.length > 0);
    }
    return value;
  }, z.array(z.string().min(1)).nonempty())
  .optional();

export const productQuerySchema = z.object({
  category: z.string().optional(),
  subcategory: z.string().optional(),
  subcategories: categoryArraySchema,
  categories: categoryArraySchema,
  search: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "OUT_OF_STOCK"]).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  sortBy: z.enum(["createdAt", "price", "title"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(12),
});

export const productStatusQuerySchema = productQuerySchema.extend({
  status: z.enum(["ACTIVE", "INACTIVE", "OUT_OF_STOCK"]),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
export type IncrementProductStockInput = z.infer<
  typeof incrementProductStockSchema
>;
export type DecrementProductStockInput = z.infer<
  typeof decrementProductStockSchema
>;
export type UpdateProductStatusInput = z.infer<
  typeof updateProductStatusSchema
>;
