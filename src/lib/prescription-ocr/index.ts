/**
 * Reading a prescription off a photo.
 *
 * One interface, so the reader is a configuration detail rather than an
 * architecture decision. Today it is Gemini 2.5 Flash - a vision model that
 * can be told it is an optical dispenser and asked for our exact fields as
 * schema-enforced JSON - and swapping it later is one new file implementing
 * `PrescriptionOcrProvider` plus an entry in the map below.
 *
 * Whatever the reader is, nothing downstream trusts it. An extraction only
 * ever pre-fills the form; the customer confirms every number before anything
 * is priced, saved or sent to the lab.
 */

import { logger, serializeError } from "@/lib/logger";
import type { PrescriptionValues } from "@/features/lenses/utils/prescription";
import {
  extractWithGemini,
  isGeminiConfigured,
} from "@/lib/prescription-ocr/gemini";

export type PrescribedDesign = "SINGLE_VISION" | "BIFOCAL" | "PROGRESSIVE";

export type OcrExtraction = {
  provider: string;
  values: PrescriptionValues;
  /** What the prescriber said to make, when the slip says. Null otherwise. */
  prescribedDesign: PrescribedDesign | null;
  /** Field names the reader actually supplied, e.g. ["rightSph", "pdSingle"]. */
  found: string[];
  /** The reader's own confidence in the read, 0–1, when it reports one. */
  confidence: number | null;
  /** The date on the slip, "YYYY-MM-DD", when one was recognised. */
  issuedAt: string | null;
  /** A human sentence worth showing - e.g. "this is not a prescription". */
  warning: string | null;
  /** Untouched provider response, stored for debugging a bad read. */
  raw: unknown;
};

export type PrescriptionOcrProvider = {
  name: string;
  isConfigured: () => boolean;
  extract: (file: {
    bytes: Buffer;
    fileName: string;
    contentType: string;
  }) => Promise<OcrExtraction>;
};

const PROVIDERS: Record<string, PrescriptionOcrProvider> = {
  gemini: {
    name: "gemini",
    isConfigured: isGeminiConfigured,
    extract: extractWithGemini,
  },
};

/** Which reader this deployment uses. Unset means uploads are switched off. */
export function getOcrProvider(): PrescriptionOcrProvider | null {
  const name = (process.env.PRESCRIPTION_OCR_PROVIDER || "gemini")
    .trim()
    .toLowerCase();

  const provider = PROVIDERS[name];
  if (!provider) {
    logger.warn("Unknown prescription OCR provider configured", { name });
    return null;
  }

  return provider.isConfigured() ? provider : null;
}

/** True when the storefront should offer "Upload a photo" at all. */
export function isOcrAvailable(): boolean {
  return getOcrProvider() !== null;
}

/**
 * Run the configured reader, turning any provider failure into a null rather
 * than an exception: a reader that is down must degrade to "type it in
 * yourself", never to a checkout that cannot be completed.
 */
export async function extractPrescription(file: {
  bytes: Buffer;
  fileName: string;
  contentType: string;
}): Promise<OcrExtraction | null> {
  const provider = getOcrProvider();
  if (!provider) return null;

  try {
    return await provider.extract(file);
  } catch (error) {
    logger.error("Prescription OCR failed", {
      provider: provider.name,
      error: serializeError(error),
    });
    return null;
  }
}
