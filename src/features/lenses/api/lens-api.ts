import axiosInstance from "@/lib/axiosInstance";
import type { PrescriptionValues } from "@/features/lenses/utils/prescription";

export type LensTint = {
  id: number;
  name: string;
  hex: string | null;
  description: string | null;
  surcharge: number;
  sortOrder: number;
  isActive: boolean;
};

export type LensPowerBand = {
  id: number;
  label: string | null;
  sphMin: number;
  sphMax: number;
  cylMin: number;
  cylMax: number;
  addMin: number | null;
  addMax: number | null;
  price: number;
  sortOrder: number;
};

export type LensDesignKind = "SINGLE_VISION" | "BIFOCAL" | "PROGRESSIVE";

/** One way a lens type is built, with the price rows that belong to it. */
export type LensDesign = {
  id: number;
  kind: LensDesignKind;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  powerPrices: LensPowerBand[];
};

export type LensType = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  groupLabel: string | null;
  requiresPrescription: boolean;
  basePrice: number;
  sortOrder: number;
  isActive: boolean;
  designs: LensDesign[];
  tints: LensTint[];
  /** Link to the guide page for this lens, when the site has one. */
  guideHref: string | null;
  guideTagline: string | null;
  image: string | null;
  priceFrom: number;
};

/** A price for one build of one lens type. */
export type DesignQuote = {
  designId: number | null;
  kind: LensDesignKind;
  name: string;
  description: string | null;
  priced: boolean;
  lensPrice: number;
  tintSurcharge: number;
  total: number;
  bandLabel: string | null;
  reason: string | null;
};

export type LensQuote = {
  lensTypeId: number;
  designId?: number | null;
  priced: boolean;
  lensPrice: number;
  tintSurcharge: number;
  total: number;
  rightBandId: number | null;
  leftBandId: number | null;
  bandLabel: string | null;
  reason: string | null;
  /** Every build of this lens, priced. Present on the batch endpoint. */
  designs?: DesignQuote[];
  tints?: { id: number; name: string; surcharge: number }[];
};

export const getLensCatalogue = async (): Promise<{
  lensTypes: LensType[];
  uploadEnabled: boolean;
}> => {
  const { data } = await axiosInstance.get("/lenses");
  const payload = data.data ?? data;
  return {
    lensTypes: payload.lensTypes ?? [],
    uploadEnabled: Boolean(payload.uploadEnabled),
  };
};

/**
 * Price every lens type against one prescription in a single request.
 *
 * This is what makes changing your mind free: the picker asks once and then
 * switching between lens types is a lookup in what came back, not another
 * round trip and certainly not another paid extraction.
 */
export const quoteLensTypes = async (input: {
  lensTypeIds: number[];
  prescriptionId?: number | null;
  prescription?: PrescriptionValues | null;
}): Promise<LensQuote[]> => {
  const { data } = await axiosInstance.post("/lenses/quote", input);
  return (data.data ?? data).quotes ?? [];
};

/** One lens type, with a tint applied. */
export const quoteLensType = async (input: {
  lensTypeId: number;
  lensDesignId?: number | null;
  lensTintId?: number | null;
  prescriptionId?: number | null;
  prescription?: PrescriptionValues | null;
}): Promise<LensQuote> => {
  const { data } = await axiosInstance.post("/lenses/quote", input);
  return (data.data ?? data).quote;
};

/* ------------------------------- admin ---------------------------------- */

export type LensTypePayload = {
  slug: string;
  name: string;
  description?: string;
  groupLabel?: string;
  requiresPrescription: boolean;
  basePrice: number;
  sortOrder: number;
  isActive: boolean;
  designs: Array<
    Omit<LensDesign, "id" | "powerPrices"> & {
      id?: number;
      powerPrices: Array<Omit<LensPowerBand, "id"> & { id?: number }>;
    }
  >;
  tints: Array<Omit<LensTint, "id"> & { id?: number }>;
};

export const adminGetLensTypes = async (): Promise<{
  lensTypes: LensType[];
  /** What the guide sync added on this load, so the screen can say so. */
  added: { createdTypes: number; createdTints: number };
}> => {
  const { data } = await axiosInstance.get("/admin/lens-types");
  const payload = data.data ?? data;
  return {
    lensTypes: payload.lensTypes ?? [],
    added: payload.added ?? { createdTypes: 0, createdTints: 0 },
  };
};

export const adminCreateLensType = async (
  payload: LensTypePayload,
): Promise<LensType> => {
  const { data } = await axiosInstance.post("/admin/lens-types", payload);
  return (data.data ?? data).lensType;
};

export const adminUpdateLensType = async (
  id: number,
  payload: Partial<LensTypePayload>,
): Promise<LensType> => {
  const { data } = await axiosInstance.put(`/admin/lens-types/${id}`, payload);
  return (data.data ?? data).lensType;
};

export const adminDeleteLensType = async (
  id: number,
): Promise<{ message: string }> => {
  const { data } = await axiosInstance.delete(`/admin/lens-types/${id}`);
  return data.data ?? data;
};

