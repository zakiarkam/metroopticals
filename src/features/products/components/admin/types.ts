import {
  EyewearSpec,
  ProductStatus,
} from "@/features/products/types/product";

export type EyewearFormFields = {
  lensWidth: string;
  bridgeWidth: string;
  templeLength: string;
  /** Comma-separated in the form; split into an array on submit. */
  frameColors: string;
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
  frameColors: "",
  frameMaterial: "",
  weightGrams: "",
  frameShape: "",
  gender: "",
  rimType: "",
};

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

  return {
    lensWidth: num(v.lensWidth),
    bridgeWidth: num(v.bridgeWidth),
    templeLength: num(v.templeLength),
    frameColors: (v.frameColors ?? "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean),
    frameMaterial: text(v.frameMaterial),
    weightGrams: num(v.weightGrams),
    frameShape: (text(v.frameShape) as EyewearSpec["frameShape"]) ?? null,
    gender: (text(v.gender) as EyewearSpec["gender"]) ?? null,
    rimType: (text(v.rimType) as EyewearSpec["rimType"]) ?? null,
  };
};

/** Populate the form from an existing product record. */
export const toEyewearFormFields = (p: EyewearSpec): EyewearFormFields => ({
  lensWidth: p.lensWidth?.toString() ?? "",
  bridgeWidth: p.bridgeWidth?.toString() ?? "",
  templeLength: p.templeLength?.toString() ?? "",
  frameColors: (p.frameColors ?? []).join(", "),
  frameMaterial: p.frameMaterial ?? "",
  weightGrams: p.weightGrams?.toString() ?? "",
  frameShape: p.frameShape ?? "",
  gender: p.gender ?? "",
  rimType: p.rimType ?? "",
});

export type ProductFormData = EyewearFormFields & {
  title: string;
  slug: string;
  categoryId: number | null;
  brandId?: number | null;
  stock: number;
  price: number;
  discountedPrice?: number;
  status: ProductStatus;
  description: string;
  images: string[];
  catalogueFile: string | null;
  unitType: "METER" | "PIECES" | "BOX" | "DRUM";
};
