import { z } from "zod";

export const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Pick a star rating").max(5),
  title: z.string().trim().max(120).optional().nullable(),
  body: z
    .string()
    .trim()
    .min(10, "Tell us a little more  at least 10 characters")
    .max(2000),
});

export const updateReviewStatusSchema = z.object({
  status: z.enum(["PENDING", "PUBLISHED", "REJECTED"]),
});

export const reviewQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  status: z.enum(["PENDING", "PUBLISHED", "REJECTED"]).optional(),
  productId: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewStatusInput = z.infer<typeof updateReviewStatusSchema>;
export type ReviewQueryInput = z.infer<typeof reviewQuerySchema>;
