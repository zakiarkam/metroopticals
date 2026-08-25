import { z } from "zod";
import {
  AD_PLACEMENT_IDS,
  AD_PLACEMENTS,
} from "@/features/advertisements/constants/advertisement";
import type { AdvertisementPlacement } from "@/features/advertisements/types/advertisement";

const placementEnum = z.enum(
  AD_PLACEMENT_IDS as [AdvertisementPlacement, ...AdvertisementPlacement[]],
);

/**
 * Artwork may be an uploaded R2 file name (`hero-sale-2026-08-25.png`, which
 * is what the upload flow stores), an absolute URL, or a site-relative path
 * (`/images/ads/…`). Links may be absolute or site-relative.
 */
const R2_FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(jpe?g|png|webp|avif|gif|svg)$/i;

const imageRef = z
  .string()
  .trim()
  .refine(
    (value) =>
      /^https?:\/\//i.test(value) ||
      value.startsWith("/") ||
      R2_FILE_NAME.test(value),
    "Must be an uploaded image or a URL",
  );

const linkRef = z
  .string()
  .trim()
  .refine(
    (value) => /^https?:\/\//i.test(value) || value.startsWith("/"),
    "Must be a full URL or a path starting with /",
  );

/**
 * Nothing here is individually mandatory.
 *
 * An ad is a picture, a linked product, or both  a banner campaign is often
 * artwork with no name worth typing, and a product placement can run entirely
 * on the catalogue photo. The cross-field rules below enforce the one thing
 * that actually matters: the zone must end up with something to render.
 */
const baseAdvertisementSchema = z.object({
  title: z.string().trim().max(200).optional().nullable(),
  imageUrl: imageRef.optional().nullable(),
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
 *  - a banner zone has only artwork to show, so it needs an image
 *  - a product zone needs either its own artwork or a product to borrow from
 *  - the slot has to be one the placement actually renders
 *  - an end date cannot precede the start date
 */
const applyPlacementRules = (
  data: {
    placement?: AdvertisementPlacement;
    imageUrl?: string | null;
    productId?: number | null;
    slot?: number;
    startDate?: string | null;
    endDate?: string | null;
  },
  ctx: z.RefinementCtx,
  /**
   * A partial update that never mentions the artwork leaves the stored image
   * in place, so re-checking "does this zone have something to render" would
   * reject a perfectly valid rename.
   */
  checkCreative = true,
) => {
  const meta = data.placement ? AD_PLACEMENTS[data.placement] : null;
  const hasImage = Boolean(data.imageUrl && data.imageUrl.trim());

  if (checkCreative && meta && meta.kind === "banner" && !hasImage) {
    ctx.addIssue({
      code: "custom",
      path: ["imageUrl"],
      message: `${meta.label} is a photo banner  upload the artwork.`,
    });
  }

  if (
    checkCreative &&
    meta &&
    meta.kind === "product" &&
    !hasImage &&
    !data.productId
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["productId"],
      message: `${meta.label} needs either artwork or a linked product.`,
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
    // validate the product/slot against  the service keeps the stored values.
    if (!data.placement) return;
    applyPlacementRules(data, ctx, data.imageUrl !== undefined);
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
