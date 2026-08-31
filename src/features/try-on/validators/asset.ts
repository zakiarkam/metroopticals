import { z } from "zod";

export const TRYON_SOURCES = ["TEMPLATE", "SCAN", "VENDOR", "PHOTO"] as const;

// A stored filename, never a path: the upload route sanitises names to this
// character set, so anything else did not come from it.
const storedFileName = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[a-zA-Z0-9._-]+$/, "Invalid file name")
  .nullable()
  .optional();

export const upsertTryOnAssetSchema = z.object({
  colour: z.string().trim().min(1, "Colour is required").max(40),
  overlayImage: storedFileName,
  modelGlb: storedFileName,
  // The widest and narrowest adult frames on sale sit well inside this band.
  frameWidthMm: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
    z
      .number()
      .min(90, "Frame width must be at least 90mm")
      .max(200, "Frame width must be at most 200mm")
      .nullable()
      .optional(),
  ),
  source: z.enum(TRYON_SOURCES).optional(),
  isActive: z.boolean().optional(),
});

export const deleteTryOnAssetSchema = z.object({
  colour: z.string().trim().min(1, "Colour is required").max(40),
});

export type UpsertTryOnAssetInput = z.infer<typeof upsertTryOnAssetSchema>;
