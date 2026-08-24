import { z } from "zod";
import {
  AD_PLACEMENT_IDS,
  AD_PLACEMENTS,
} from "@/features/advertisements/constants/advertisement";
import type { AdvertisementPlacement } from "@/features/advertisements/types/advertisement";

const placementEnum = z.enum(
  AD_PLACEMENT_IDS as [AdvertisementPlacement, ...AdvertisementPlacement[]]
);

/**
 * Images and links may be absolute (R2 public URL) or site-relative
 * (`/images/ads/…`, `/shop-details/12`). A bare `z.string().url()` rejects the
 * relative form, which is exactly what the upload flow and internal CTAs use.
 */
const imageRef = z
  .string()
  .trim()
  .min(1, "An image is required")
  .refine(
    (value) => /^https?:\/\//i.test(value) || value.startsWith("/"),
    "Must be an uploaded image or a URL"
  );

const linkRef = z
  .string()
  .trim()
  .refine(
    (value) => /^https?:\/\//i.test(value) || value.startsWith("/"),
    "Must be a full URL or a path starting with /"
  );

const baseAdvertisementSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  imageUrl: imageRef,
  link: linkRef.optional().nullable(),
  placement: placementEnum,
  status: z.enum(["active", "inactive"]).default("active"),
  priority: z.number().int().min(0).default(0),
  slot: z.number().int().min(1).max(3).default(1),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  productId: z.coerce.number().int().positive().optional().nullable(),
});

/**
 * Cross-field rules shared by create and update:
 *  - product placements must name a product, banner placements must not need one
 *  - the slot has to be one the placement actually renders
 *  - an end date cannot precede the start date
 */
const applyPlacementRules = (
  data: {
    placement?: AdvertisementPlacement;
    productId?: number | null;
    slot?: number;
    startDate?: string | null;
    endDate?: string | null;
  },
  ctx: z.RefinementCtx
) => {
  const meta = data.placement ? AD_PLACEMENTS[data.placement] : null;

  if (meta && meta.kind === "product" && !data.productId) {
    ctx.addIssue({
      code: "custom",
      path: ["productId"],
      message: `${meta.label} is driven by a product — pick one.`,
    });
  }

  if (meta && data.slot !== undefined && !meta.slots.includes(data.slot)) {
    ctx.addIssue({
      code: "custom",
      path: ["slot"],
      message: `${meta.label} only has slot ${meta.slots.join(", ")}.`,
    });
  }

  if (data.startDate && data.endDate) {
    if (new Date(data.endDate).getTime() < new Date(data.startDate).getTime()) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date must be after the start date.",
      });
    }
  }
};

export const createAdvertisementSchema =
  baseAdvertisementSchema.superRefine(applyPlacementRules);

export const updateAdvertisementSchema = baseAdvertisementSchema
  .partial()
  .superRefine((data, ctx) => {
    // On update the placement may be absent, in which case there is nothing to
    // validate the product/slot against — the service keeps the stored values.
    if (!data.placement) return;
    applyPlacementRules(data, ctx);
  });

export const updateAdvertisementStatusSchema = z.object({
  status: z.enum(["active", "inactive"]),
});

export const advertisementQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  placement: placementEnum.optional(),
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
