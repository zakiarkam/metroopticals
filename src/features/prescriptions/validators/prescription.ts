import { z } from "zod";

import { prescriptionValuesSchema } from "@/features/lenses/validators/lens";

const label = z.string().trim().min(1, "Give it a name").max(60);
const notes = z.string().trim().max(500).optional().or(z.literal(""));

const isoDate = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
  .nullable()
  .optional();

export const createPrescriptionSchema = z.object({
  label: label.default("My prescription"),
  values: prescriptionValuesSchema,
  source: z.enum(["MANUAL", "UPLOAD"]).default("MANUAL"),
  /**
   * What the prescriber said to make. Null is a real answer — plenty of
   * customers do not know, and a reading addition alone does not settle it.
   */
  prescribedDesign: z
    .enum(["SINGLE_VISION", "BIFOCAL", "PROGRESSIVE"])
    .nullable()
    .optional(),
  /**
   * The SHA-256 of the slip this was read from, as returned by the extract
   * endpoint.
   *
   * Deliberately the hash and NOT the storage key. A client that could name
   * its own key could point a prescription it owns at any object in the
   * bucket and then read it back through the authenticated file route. A hash
   * cannot be produced without already holding the file it came from.
   */
  extractionHash: z
    .string()
    .trim()
    .regex(/^[0-9a-f]{64}$/, "Not a valid file reference")
    .nullable()
    .optional(),
  ocrConfidence: z.number().min(0).max(1).nullable().optional(),
  issuedAt: isoDate,
  expiresAt: isoDate,
  notes,
  /**
   * Set when this is a re-test of a prescription already on file. The saved
   * row is never overwritten: this becomes the next version of that chain, so
   * an order placed against the old powers still says what it was made to.
   */
  supersedesId: z.coerce.number().int().positive().nullable().optional(),
});

/**
 * Only the things that can be changed without changing the glasses. Powers
 * are not here on purpose — editing those means a new version, which is what
 * `supersedesId` on a create is for.
 */
export const updatePrescriptionSchema = z.object({
  label: label.optional(),
  /** Correctable after the fact: the customer may ask their optician later. */
  prescribedDesign: z
    .enum(["SINGLE_VISION", "BIFOCAL", "PROGRESSIVE"])
    .nullable()
    .optional(),
  notes,
  expiresAt: isoDate,
  isArchived: z.boolean().optional(),
});

export const prescriptionQuerySchema = z.object({
  /** Superseded versions are hidden unless the customer asks for the history. */
  includeHistory: z
    .preprocess((value) => value === "true" || value === true, z.boolean())
    .default(false),
  includeArchived: z
    .preprocess((value) => value === "true" || value === true, z.boolean())
    .default(false),
});

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
export type UpdatePrescriptionInput = z.infer<typeof updatePrescriptionSchema>;
export type PrescriptionQueryInput = z.infer<typeof prescriptionQuerySchema>;
