import { z } from "zod";

export const FRAME_SHAPES = [
  "RECTANGLE",
  "SQUARE",
  "ROUND",
  "OVAL",
  "CAT_EYE",
  "AVIATOR",
  "GEOMETRIC",
  "BROWLINE",
] as const;

export const RIM_TYPES = ["FULL_RIM", "SEMI_RIMLESS", "RIMLESS"] as const;

export const GENDERS = ["MEN", "WOMEN", "UNISEX", "KIDS"] as const;
export const FRAME_SIZES = ["SMALL", "MEDIUM", "LARGE"] as const;

const mm = (min: number, max: number, label: string) =>
  z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
    z
      .number()
      .int(`${label} must be a whole number of millimetres`)
      .min(min, `${label} must be at least ${min}mm`)
      .max(max, `${label} must be at most ${max}mm`)
      .nullable()
      .optional()
  );

const optionalText = z.preprocess((v) => {
  if (typeof v !== "string") return v;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}, z.string().max(60).nullable().optional());

/** Shared eyewear fields, spread into both create and update schemas. */
const eyewearSpecFields = {
  lensWidth: mm(20, 90, "Lens width"),
  bridgeWidth: mm(8, 40, "Bridge width"),
  templeLength: mm(100, 200, "Temple length"),
  frameColors: z
    .preprocess((v) => {
      if (v === undefined || v === null || v === "") return [];
      const arr = Array.isArray(v) ? v : String(v).split(",");
      return Array.from(
        new Set(
          arr
            .map((c) => (typeof c === "string" ? c.trim() : ""))
            .filter((c) => c.length > 0)
        )
      );
    }, z.array(z.string().min(1).max(40)).max(20))
    .optional(),
  frameMaterial: optionalText,
  weightGrams: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
    z
      .number()
      .min(1, "Weight must be at least 1g")
      .max(200, "Weight must be at most 200g")
      .nullable()
      .optional()
  ),
  frameShape: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.enum(FRAME_SHAPES).nullable().optional()
  ),
  rimType: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.enum(RIM_TYPES).nullable().optional()
  ),
  gender: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.enum(GENDERS).nullable().optional()
  ),
};

/**
 * Per-colour rows, sent alongside `frameColors`. A null stock keeps the
 * colour uncounted (it falls back to the product total), so a colour can
 * carry a photo before anyone has counted it; `image` names one of the
 * product's own gallery images. Optional so products recorded before
 * per-colour stock existed keep working without rows at all.
 */
const colorStocksSchema = z
  .array(
    z.object({
      color: z.string().trim().min(1).max(40),
      stock: z.preprocess(
        (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
        z
          .number()
          .int("Stock must be a whole number")
          .min(0, "Stock must be non-negative")
          .nullable(),
      ),
      image: z.preprocess(
        (v) => (typeof v === "string" && v.trim() === "" ? null : v),
        z.string().trim().max(300).nullable().optional(),
      ),
    }),
  )
  .max(20)
  .optional();

export const createProductSchema = z.object({
  ...eyewearSpecFields,
  colorStocks: colorStocksSchema,
  title: z.string().min(1, "Title is required"),
  slug: z.string().optional(),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be positive"),
  discountedPrice: z.number().min(0).optional().nullable(),
  images: z.array(z.string()).optional(),
  catalogueFile: z.string().optional().nullable(),
  categoryId: z.coerce.number().int().positive().optional(),
  brandId: z.coerce.number().int().positive().optional().nullable(),
  stock: z.number().int().min(0, "Stock must be non-negative"),
  /** The shop's own code, and what a scanner reads at the counter. */
  sku: z.string().trim().max(60).optional().nullable(),
  barcode: z.string().trim().max(60).optional().nullable(),
  unitType: z.enum(["METER", "PIECES", "BOX", "DRUM"]).default("PIECES"),
  status: z.enum(["ACTIVE", "INACTIVE", "OUT_OF_STOCK"]).default("ACTIVE"),
}).refine(
  (d) => d.discountedPrice == null || d.discountedPrice < d.price,
  { message: "Discounted price must be lower than price", path: ["discountedPrice"] },
);

export const updateProductSchema = z.object({
  ...eyewearSpecFields,
  colorStocks: colorStocksSchema,
  title: z.string().min(1).optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  discountedPrice: z.number().min(0).optional().nullable(),
  images: z.array(z.string()).optional(),
  catalogueFile: z.string().optional().nullable(),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  brandId: z.coerce.number().int().positive().optional().nullable(),
  stock: z.number().int().min(0).optional(),
  sku: z.string().trim().max(60).optional().nullable(),
  barcode: z.string().trim().max(60).optional().nullable(),
  unitType: z.enum(["METER", "PIECES", "BOX", "DRUM"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "OUT_OF_STOCK"]).optional(),
});

export const incrementProductStockSchema = z.object({
  count: z.number().int().positive("Count must be a positive integer"),
  /** Which colourway the units belong to. Omitted for colourless products. */
  color: z.string().trim().min(1).max(40).optional(),
});

export const decrementProductStockSchema = z.object({
  count: z.number().int().positive("Count must be a positive integer"),
  /** Which colourway the units belong to. Omitted for colourless products. */
  color: z.string().trim().min(1).max(40).optional(),
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

/** Accepts `?x=a,b` or repeated `?x=a&x=b`, and drops blanks. */
const csvList = <T extends z.ZodTypeAny>(inner: T) =>
  z
    .preprocess((value) => {
      const parts = Array.isArray(value) ? value : [value];
      const flat = parts
        .flatMap((v) => (typeof v === "string" ? v.split(",") : v))
        .map((v) => (typeof v === "string" ? v.trim() : v))
        .filter((v) => v !== "" && v !== undefined && v !== null);
      return flat.length ? flat : undefined;
    }, z.array(inner).nonempty())
    .optional();

export const productQuerySchema = z.object({
  category: z.string().optional(),
  categories: categoryArraySchema,
  brands: csvList(z.string().min(1)),
  genders: csvList(z.enum(GENDERS)),
  shapes: csvList(z.enum(FRAME_SHAPES)),
  rimTypes: csvList(z.enum(RIM_TYPES)),
  materials: csvList(z.string().min(1)),
  colors: csvList(z.string().min(1)),
  sizes: csvList(z.enum(FRAME_SIZES)),
  search: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "OUT_OF_STOCK"]).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  /** Only products whose discounted price actually undercuts the list price. */
  onSale: z
    .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
    .transform((value) => value === true || value === "true" || value === "1")
    .optional(),
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
