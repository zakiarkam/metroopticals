import { z } from "zod";

import {
  ADD_MAX,
  ADD_MIN,
  CYL_MAX,
  CYL_MIN,
  SPH_MAX,
  SPH_MIN,
} from "@/features/lenses/constants/optics";

const money = z.number().min(0, "Price cannot be negative").max(1_000_000);

/**
 * One row of the price list. Bounds are the same ones the customer's form is
 * held to, so a band cannot be written for a power nobody can ever enter.
 */
export const powerBandSchema = z
  .object({
    id: z.number().int().positive().optional(),
    label: z.string().trim().max(60).optional().or(z.literal("")),
    sphMin: z.number().min(SPH_MIN).max(SPH_MAX),
    sphMax: z.number().min(SPH_MIN).max(SPH_MAX),
    cylMin: z.number().min(CYL_MIN).max(CYL_MAX),
    cylMax: z.number().min(CYL_MIN).max(CYL_MAX),
    addMin: z.number().min(ADD_MIN).max(ADD_MAX).nullable().optional(),
    addMax: z.number().min(ADD_MIN).max(ADD_MAX).nullable().optional(),
    price: money,
    sortOrder: z.number().int().min(0).max(999).default(0),
  })
  .superRefine((band, ctx) => {
    if (band.sphMin > band.sphMax) {
      ctx.addIssue({
        code: "custom",
        message: "Sphere: the lower figure must come first",
        path: ["sphMin"],
      });
    }
    if (band.cylMin > band.cylMax) {
      ctx.addIssue({
        code: "custom",
        message: "Cylinder: the lower figure must come first",
        path: ["cylMin"],
      });
    }
    // Half an addition range prices nothing predictably — either the row
    // cares about the addition or it does not.
    const hasMin = band.addMin !== null && band.addMin !== undefined;
    const hasMax = band.addMax !== null && band.addMax !== undefined;
    if (hasMin !== hasMax) {
      ctx.addIssue({
        code: "custom",
        message: "Give both ends of the addition range, or neither",
        path: ["addMin"],
      });
    }
    if (hasMin && hasMax && band.addMin! > band.addMax!) {
      ctx.addIssue({
        code: "custom",
        message: "Addition: the lower figure must come first",
        path: ["addMin"],
      });
    }
  });

/**
 * One build of a lens — single vision, a named bifocal, a named progressive —
 * with the price rows that belong to it.
 *
 * The kind is what the software acts on (does this need a reading addition?);
 * the name is what the customer reads, because a shop sells more than one of
 * each kind and "Round Top" and "Flat Top" are different money.
 */
export const lensDesignSchema = z.object({
  id: z.number().int().positive().optional(),
  kind: z.enum(["SINGLE_VISION", "BIFOCAL", "PROGRESSIVE"]).default("SINGLE_VISION"),
  name: z.string().trim().min(1, "Name this build").max(60),
  description: z.string().trim().max(200).optional().or(z.literal("")),
  sortOrder: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
  powerPrices: z.array(powerBandSchema).max(60).default([]),
});

export const lensTintSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(1, "Name the colour").max(60),
  hex: z
    .string()
    .trim()
    .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Use a hex colour like #6b7280")
    .optional()
    .or(z.literal("")),
  description: z.string().trim().max(160).optional().or(z.literal("")),
  surcharge: money.default(0),
  sortOrder: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

const lensTypeBase = {
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Lower-case letters, numbers and dashes only"),
  name: z.string().trim().min(1, "Name the lens").max(80),
  description: z.string().trim().max(240).optional().or(z.literal("")),
  groupLabel: z.string().trim().max(60).optional().or(z.literal("")),
  requiresPrescription: z.boolean().default(true),
  basePrice: money.default(0),
  sortOrder: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
};

export const createLensTypeSchema = z.object({
  ...lensTypeBase,
  designs: z.array(lensDesignSchema).max(12).default([]),
  tints: z.array(lensTintSchema).max(30).default([]),
});

/**
 * The whole lens, price list included, saved in one go. A price list is edited
 * as a grid — rows added, retyped and deleted together — so sending it whole
 * is both what the screen does and what keeps the saved list identical to the
 * one on screen.
 */
export const updateLensTypeSchema = z.object({
  slug: lensTypeBase.slug.optional(),
  name: lensTypeBase.name.optional(),
  description: lensTypeBase.description,
  groupLabel: lensTypeBase.groupLabel,
  requiresPrescription: z.boolean().optional(),
  basePrice: money.optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  isActive: z.boolean().optional(),
  designs: z.array(lensDesignSchema).max(12).optional(),
  tints: z.array(lensTintSchema).max(30).optional(),
});

/* ------------------------------- quoting -------------------------------- */

const eyeSchema = z.object({
  sph: z.number().min(SPH_MIN).max(SPH_MAX).nullable().default(null),
  cyl: z.number().min(CYL_MIN).max(CYL_MAX).nullable().default(null),
  axis: z.number().int().min(1).max(180).nullable().default(null),
  add: z.number().min(ADD_MIN).max(ADD_MAX).nullable().default(null),
  prism: z.number().min(0).max(10).nullable().default(null),
  base: z.enum(["UP", "DOWN", "IN", "OUT"]).nullable().default(null),
});

export const prescriptionValuesSchema = z.object({
  right: eyeSchema,
  left: eyeSchema,
  pdSingle: z.number().min(43).max(82).nullable().default(null),
  pdRight: z.number().min(21).max(41).nullable().default(null),
  pdLeft: z.number().min(21).max(41).nullable().default(null),
});

/**
 * A quote asks for one lens type against one set of powers. The powers can
 * come either from a saved prescription or straight off the form, which is
 * what lets the picker re-price the moment the customer changes lens type
 * without saving anything first.
 */
export const lensQuoteSchema = z
  .object({
    lensTypeId: z.coerce.number().int().positive(),
    lensDesignId: z.coerce.number().int().positive().nullable().optional(),
    lensTintId: z.coerce.number().int().positive().nullable().optional(),
    prescriptionId: z.coerce.number().int().positive().nullable().optional(),
    prescription: prescriptionValuesSchema.nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.prescriptionId && !data.prescription) {
      ctx.addIssue({
        code: "custom",
        message: "Send either a saved prescription or the values themselves",
        path: ["prescription"],
      });
    }
  });

/** Several lens types priced against one prescription, in a single request. */
export const lensQuoteBatchSchema = z.object({
  lensTypeIds: z.array(z.coerce.number().int().positive()).min(1).max(40),
  prescriptionId: z.coerce.number().int().positive().nullable().optional(),
  prescription: prescriptionValuesSchema.nullable().optional(),
});

export type LensDesignInput = z.infer<typeof lensDesignSchema>;
export type CreateLensTypeInput = z.infer<typeof createLensTypeSchema>;
export type UpdateLensTypeInput = z.infer<typeof updateLensTypeSchema>;
export type LensQuoteInput = z.infer<typeof lensQuoteSchema>;
export type LensQuoteBatchInput = z.infer<typeof lensQuoteBatchSchema>;
export type PowerBandInput = z.infer<typeof powerBandSchema>;
export type LensTintInput = z.infer<typeof lensTintSchema>;
