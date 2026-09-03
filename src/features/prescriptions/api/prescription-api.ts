import axiosInstance from "@/lib/axiosInstance";
import type { PrescriptionValues } from "@/features/lenses/utils/prescription";

export type SavedPrescription = {
  id: number;
  label: string;
  version: number;
  rootId: number | null;
  source: "MANUAL" | "UPLOAD" | "STAFF";
  /** What the prescriber said to make, when anyone has said. */
  prescribedDesign: "SINGLE_VISION" | "BIFOCAL" | "PROGRESSIVE" | null;
  isArchived: boolean;
  /** Whether an uploaded slip is on file. The key itself never leaves the server. */
  hasImage: boolean;
  ocrConfidence: number | null;
  issuedAt: string | null;
  expiresAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  values: PrescriptionValues;
  /** "OD -2.25 / -0.75 x 090 · OS …" — ready to print in a list. */
  summary: string;
};

export type Extraction = {
  values: PrescriptionValues;
  /** Read off the slip — "Bifocals", "PAL" — or null when it does not say. */
  prescribedDesign: "SINGLE_VISION" | "BIFOCAL" | "PROGRESSIVE" | null;
  found: string[];
  confidence: number | null;
  issuedAt: string | null;
  /** A sentence worth showing — e.g. "this is not a spectacle prescription". */
  warning: string | null;
  cached: boolean;
  /** Whether the slip was kept for the shop to check against. */
  stored: boolean;
  fileHash: string;
  provider: string;
};

/**
 * Where to fetch a saved slip from.
 *
 * An authenticated route, not a storage URL: the browser sends its session
 * cookie, the server decides whether this viewer may see it.
 */
export const prescriptionImageUrl = (id: number) =>
  `/api/prescriptions/${id}/file`;

export const getPrescriptions = async (options?: {
  includeHistory?: boolean;
  includeArchived?: boolean;
}): Promise<SavedPrescription[]> => {
  const { data } = await axiosInstance.get("/prescriptions", {
    params: {
      ...(options?.includeHistory ? { includeHistory: "true" } : {}),
      ...(options?.includeArchived ? { includeArchived: "true" } : {}),
    },
  });
  return (data.data ?? data).prescriptions ?? [];
};

export const getPrescriptionHistory = async (
  id: number,
): Promise<SavedPrescription[]> => {
  const { data } = await axiosInstance.get(`/prescriptions/${id}`);
  return (data.data ?? data).versions ?? [];
};

export const createPrescription = async (payload: {
  label: string;
  values: PrescriptionValues;
  source?: "MANUAL" | "UPLOAD";
  prescribedDesign?: "SINGLE_VISION" | "BIFOCAL" | "PROGRESSIVE" | null;
  /** SHA-256 of the uploaded slip, so the server can attach the stored file. */
  extractionHash?: string | null;
  ocrConfidence?: number | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
  notes?: string;
  /** Set to write the next version of a prescription already on file. */
  supersedesId?: number | null;
}): Promise<SavedPrescription> => {
  const { data } = await axiosInstance.post("/prescriptions", payload);
  return (data.data ?? data).prescription;
};

export const updatePrescription = async (
  id: number,
  payload: {
    label?: string;
    notes?: string;
    expiresAt?: string | null;
    isArchived?: boolean;
    prescribedDesign?: "SINGLE_VISION" | "BIFOCAL" | "PROGRESSIVE" | null;
  },
): Promise<SavedPrescription> => {
  const { data } = await axiosInstance.patch(`/prescriptions/${id}`, payload);
  return (data.data ?? data).prescription;
};

export const deletePrescription = async (
  id: number,
): Promise<{ message: string }> => {
  const { data } = await axiosInstance.delete(`/prescriptions/${id}`);
  return data.data ?? data;
};

/**
 * Read a prescription off a photo.
 *
 * Uses its own timeout: the reader is an outside service and a slow read is
 * still a good read, where the shared 20s default would abandon it.
 */
export const extractPrescription = async (file: File): Promise<Extraction> => {
  const form = new FormData();
  form.append("file", file);

  const { data } = await axiosInstance.post("/prescriptions/extract", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60_000,
  });

  return (data.data ?? data).extraction;
};
