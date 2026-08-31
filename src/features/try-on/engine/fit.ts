import { FIT } from "@/features/try-on/config";
import {
  FRAME_SIZE_RANGES,
  type FrameSizeBucket,
} from "@/features/products/types/product";
import {
  RIM_THICKNESS_MM,
  frameFrontWidthMm,
  opticalCentreDistanceMm,
} from "@/features/products/utils/eyewear";
import type {
  FitCheck,
  FitStatus,
  FitVerdict,
  FrameFitSpec,
} from "@/features/try-on/types";

/**
 * The fit engine: catalogue millimetres against measured millimetres.
 *
 * Pure  no DOM, no tracking  so the rules can be read, tested and tuned
 * with the optician without a camera. Every check carries the figures it was
 * decided on, because a bare "good fit" is something a customer will quote
 * back at the counter.
 */

type Band = { min: number; max: number };

const band = (value: number, good: Band, note: Band): FitStatus =>
  value >= good.min && value <= good.max
    ? "good"
    : value >= note.min && value <= note.max
      ? "note"
      : "poor";

const mm = (value: number) => `${Math.round(value)} mm`;

const WORST: Record<FitStatus, number> = { good: 0, note: 1, poor: 2 };

/**
 * The size bucket whose lens width would make a frame like this one match
 * the face  what the "show me ones that fit" link filters the shop by.
 */
export const recommendedSizeFor = (
  faceWidthMm: number,
  spec: FrameFitSpec,
): FrameSizeBucket | null => {
  if (spec.bridgeWidth == null) return null;
  const rim = RIM_THICKNESS_MM[spec.rimType ?? "FULL_RIM"];
  // One millimetre of ease: a frame sits best a touch wider than the face.
  // Rounded because the buckets are whole millimetres with no gap between
  // them; 47.5 must land in one of them.
  const lensWidth = Math.round((faceWidthMm + 1 - spec.bridgeWidth - 2 * rim) / 2);
  for (const [bucket, range] of Object.entries(FRAME_SIZE_RANGES)) {
    if (lensWidth >= range.min && lensWidth <= range.max) {
      return bucket as FrameSizeBucket;
    }
  }
  return null;
};

export function assessFit(
  spec: FrameFitSpec,
  face: { faceWidthMm: number; pdMm: number },
  calibrated: boolean,
): FitVerdict {
  const checks: FitCheck[] = [];

  const frameWidth = frameFrontWidthMm(spec);
  if (frameWidth != null) {
    const diff = frameWidth - face.faceWidthMm;
    const status = band(diff, FIT.widthGood, FIT.widthNote);
    let detail: string;
    if (status === "good") {
      detail = `A ${mm(frameWidth)} frame on a ${mm(face.faceWidthMm)} face  a comfortable width.`;
    } else if (diff > 0) {
      detail =
        status === "note"
          ? `About ${mm(diff)} wider than your face  it may sit low and the arms may splay.`
          : `${mm(diff)} wider than your face  likely too wide to sit well.`;
    } else {
      detail =
        status === "note"
          ? `About ${mm(-diff)} narrower than your face  it may press at the temples.`
          : `${mm(-diff)} narrower than your face  likely to pinch.`;
    }
    checks.push({
      key: "width",
      label: "Width",
      status,
      detail,
      frameMm: frameWidth,
      faceMm: face.faceWidthMm,
    });
  }

  const ocd = opticalCentreDistanceMm(spec);
  if (ocd != null) {
    const diff = ocd - face.pdMm;
    const status = band(diff, FIT.opticalGood, FIT.opticalNote);
    let detail: string;
    if (status === "good") {
      detail = `Lens centres ${mm(ocd)} apart against your ${mm(face.pdMm)} PD  your lenses will centre well.`;
    } else if (diff < 0) {
      detail = `The lens centres sit ${mm(-diff)} inside your pupils  ask us about a wider bridge.`;
    } else {
      detail = `The lens centres sit ${mm(diff)} outside your pupils  thicker lens edges are likely; ask us in store.`;
    }
    checks.push({
      key: "optical",
      label: "Lens centres",
      status,
      detail,
      frameMm: ocd,
      faceMm: face.pdMm,
    });
  }

  if (spec.weightGrams != null) {
    const grams = Math.round(spec.weightGrams * 10) / 10;
    const heavy = spec.weightGrams > FIT.heavyGrams;
    checks.push({
      key: "weight",
      label: "Weight",
      status: heavy ? "note" : "good",
      detail: heavy
        ? `${grams} g  on the heavier side; you will notice it through a long day.`
        : spec.weightGrams <= 20
          ? `${grams} g  light enough to forget you are wearing it.`
          : `${grams} g  a typical weight.`,
    });
  }

  // Weight is only ever a note; the verdict is decided by the two fit checks.
  const decisive = checks.filter((c) => c.key !== "weight");
  const overall: FitVerdict["overall"] = decisive.length
    ? decisive.reduce<FitStatus>(
        (worst, c) => (WORST[c.status] > WORST[worst] ? c.status : worst),
        "good",
      )
    : "unknown";

  const headline =
    overall === "good"
      ? "Good fit"
      : overall === "note"
        ? "Fits, with a note"
        : overall === "poor"
          ? "Not your size"
          : "No size data for this frame";

  return {
    overall,
    headline,
    checks,
    recommendedSize: recommendedSizeFor(face.faceWidthMm, spec),
    calibrated,
  };
}
