import {
  EyewearSpec,
  ProductColorStock,
  ProductStatus,
} from "@/features/products/types/product";

/** One colourway row in the form: name, shelf count, and gallery photo. */
export type ColorStockRow = {
  color: string;
  /** Kept as a string so the field can be blank on legacy products. */
  stock: string;
  /** One of the product's gallery image filenames; "" for no photo. */
  image: string;
};

export type EyewearFormFields = {
  lensWidth: string;
  bridgeWidth: string;
  templeLength: string;
  /** One row per colourway; quantities blank until the colours are counted. */
  colorStocks: ColorStockRow[];
  frameMaterial: string;
  weightGrams: string;
  frameShape: string;
  gender: string;
  rimType: string;
};

export const EMPTY_EYEWEAR_FIELDS: EyewearFormFields = {
  lensWidth: "",
  bridgeWidth: "",
  templeLength: "",
  colorStocks: [],
  frameMaterial: "",
  weightGrams: "",
  frameShape: "",
  gender: "",
  rimType: "",
};

/** Rows with a colour typed in, whatever the quantity box says. */
export const namedColorRows = (rows: ColorStockRow[]) =>
  rows.filter((row) => row.color.trim().length > 0);

/**
 * True once any colour has been given a count. Until then the product keeps
 * one combined stock figure, exactly as before per-colour counts existed.
 */
export const colorRowsHaveCounts = (rows: ColorStockRow[] | undefined) =>
  (rows ?? []).some(
    (row) => row.color.trim().length > 0 && row.stock.trim() !== "",
  );

/**
 * True when some colours are counted and others are not - an ambiguous form
 * the dialogs refuse, because a blank would otherwise silently become zero
 * and mark the colour sold out.
 */
export const colorRowsPartiallyCounted = (
  rows: ColorStockRow[] | undefined,
) => {
  const named = namedColorRows(rows ?? []);
  const counted = named.filter((row) => row.stock.trim() !== "").length;
  return counted > 0 && counted < named.length;
};

/** The stock total the rows add up to; blank quantities count as zero. */
export const sumColorRows = (rows: ColorStockRow[] | undefined) =>
  namedColorRows(rows ?? []).reduce((total, row) => {
    const value = parseInt(row.stock, 10);
    return total + (Number.isFinite(value) && value > 0 ? value : 0);
  }, 0);

/** Convert the string-based form values into the API payload shape. */
export const toEyewearPayload = (v: EyewearFormFields): EyewearSpec => {
  const num = (s: string) => {
    const t = s?.trim?.() ?? "";
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };
  const text = (s: string) => {
    const t = s?.trim?.() ?? "";
    return t === "" ? null : t;
  };

  const seen = new Set<string>();
  const frameColors: string[] = [];
  for (const row of namedColorRows(v.colorStocks ?? [])) {
    const name = row.color.trim();
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    frameColors.push(name);
  }

  return {
    lensWidth: num(v.lensWidth),
    bridgeWidth: num(v.bridgeWidth),
    templeLength: num(v.templeLength),
    frameColors,
    frameMaterial: text(v.frameMaterial),
    weightGrams: num(v.weightGrams),
    frameShape: (text(v.frameShape) as EyewearSpec["frameShape"]) ?? null,
    gender: (text(v.gender) as EyewearSpec["gender"]) ?? null,
    rimType: (text(v.rimType) as EyewearSpec["rimType"]) ?? null,
  };
};

/**
 * The per-colour rows for the API - undefined only when the product has no
 * colours at all. A blank quantity is sent as null (the colour stays
 * uncounted and falls back to the product total), so a colour can carry a
 * photo before anyone has counted it.
 */
export const toColorStocksPayload = (
  rows: ColorStockRow[] | undefined,
):
  | { color: string; stock: number | null; image: string | null }[]
  | undefined => {
  const named = namedColorRows(rows ?? []);
  if (!named.length) return undefined;

  return named.map((row) => {
    const value = parseInt(row.stock, 10);
    return {
      color: row.color.trim(),
      stock:
        row.stock.trim() === ""
          ? null
          : Number.isFinite(value) && value > 0
            ? value
            : 0,
      image: row.image.trim() || null,
    };
  });
};

/** Populate the form from an existing product record. */
export const toEyewearFormFields = (
  p: EyewearSpec & { colorStocks?: ProductColorStock[] },
): EyewearFormFields => {
  const rows = new Map(
    (p.colorStocks ?? []).map((row) => [row.color.trim().toLowerCase(), row]),
  );

  return {
    lensWidth: p.lensWidth?.toString() ?? "",
    bridgeWidth: p.bridgeWidth?.toString() ?? "",
    templeLength: p.templeLength?.toString() ?? "",
    colorStocks: (p.frameColors ?? []).map((color) => {
      const row = rows.get(color.trim().toLowerCase());
      return {
        color,
        stock: row?.stock != null ? String(row.stock) : "",
        image: row?.image ?? "",
      };
    }),
    frameMaterial: p.frameMaterial ?? "",
    weightGrams: p.weightGrams?.toString() ?? "",
    frameShape: p.frameShape ?? "",
    gender: p.gender ?? "",
    rimType: p.rimType ?? "",
  };
};

export type ProductFormData = EyewearFormFields & {
  title: string;
  slug: string;
  categoryId: number | null;
  brandId?: number | null;
  stock: number;
  /** The shop's own code, printed on the bill and searched at the counter. */
  sku: string;
  /** What a barcode scanner reads at the till. */
  barcode: string;
  price: number;
  discountedPrice?: number;
  status: ProductStatus;
  description: string;
  images: string[];
  catalogueFile: string | null;
  unitType: "METER" | "PIECES" | "BOX" | "DRUM";
};
