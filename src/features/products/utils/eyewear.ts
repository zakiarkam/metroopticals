import type {
  EyewearSpec,
  FrameShape,
  Gender,
  RimType,
} from "@/features/products/types/product";

export const GENDER_LABELS: Record<Gender, string> = {
  MEN: "Men",
  WOMEN: "Women",
  UNISEX: "Unisex",
  KIDS: "Kids",
};

export const FRAME_SHAPE_LABELS: Record<FrameShape, string> = {
  RECTANGLE: "Rectangle",
  SQUARE: "Square",
  ROUND: "Round",
  OVAL: "Oval",
  CAT_EYE: "Cat-Eye",
  AVIATOR: "Aviator",
  GEOMETRIC: "Geometric",
  BROWLINE: "Browline",
};

export const RIM_TYPE_LABELS: Record<RimType, string> = {
  FULL_RIM: "Full-Rim",
  SEMI_RIMLESS: "Semi-Rimless",
  RIMLESS: "Rimless",
};

/** True when a product carries any frame specification at all. */
export const hasEyewearSpec = (spec: EyewearSpec) =>
  spec.lensWidth != null ||
  spec.bridgeWidth != null ||
  spec.templeLength != null ||
  (spec.frameColors?.length ?? 0) > 0 ||
  !!spec.frameMaterial ||
  spec.weightGrams != null ||
  !!spec.frameShape ||
  !!spec.gender ||
  !!spec.rimType;

export const formatFrameSizeCode = ({
  lensWidth,
  bridgeWidth,
  templeLength,
}: EyewearSpec) => {
  if (lensWidth == null || bridgeWidth == null || templeLength == null) {
    return null;
  }
  return `${lensWidth} □ ${bridgeWidth} - ${templeLength}`;
};

/**
 * How much rim sits outside each lens, by construction. Used only when the
 * caliper width of a frame has not been recorded; the caliper always wins.
 */
export const RIM_THICKNESS_MM: Record<RimType, number> = {
  FULL_RIM: 6,
  SEMI_RIMLESS: 3,
  RIMLESS: 1,
};

type FrameWidthSpec = Pick<
  EyewearSpec,
  "lensWidth" | "bridgeWidth" | "rimType"
> & { frameWidthMm?: number | null };

/**
 * Total width across the front of the frame, in mm  what has to match the
 * face. The recorded caliper reading if there is one, else derived from the
 * printed measurements plus an allowance for the rim.
 */
export const frameFrontWidthMm = (spec: FrameWidthSpec): number | null => {
  if (spec.frameWidthMm != null) return spec.frameWidthMm;
  if (spec.lensWidth == null || spec.bridgeWidth == null) return null;
  const rim = RIM_THICKNESS_MM[spec.rimType ?? "FULL_RIM"];
  return 2 * spec.lensWidth + spec.bridgeWidth + 2 * rim;
};

/**
 * Distance between the geometric centres of the two lenses. A frame fits
 * optically when this is at, or a little above, the wearer's PD.
 */
export const opticalCentreDistanceMm = (
  spec: Pick<EyewearSpec, "lensWidth" | "bridgeWidth">,
): number | null => {
  if (spec.lensWidth == null || spec.bridgeWidth == null) return null;
  return spec.lensWidth + spec.bridgeWidth;
};

export const getFrameSizeLabel = (lensWidth?: number | null) => {
  if (lensWidth == null) return null;
  if (lensWidth < 48) return "Small";
  if (lensWidth <= 53) return "Medium";
  return "Large";
};

/** "Lightweight (11g)"  the qualifier only appears when it is genuinely light. */
export const formatWeight = (weightGrams?: number | null) => {
  if (weightGrams == null) return null;
  const rounded = Number.isInteger(weightGrams)
    ? weightGrams
    : Math.round(weightGrams * 10) / 10;
  return weightGrams <= 20 ? `Lightweight (${rounded}g)` : `${rounded}g`;
};

/** Ordered rows for the spec list on the product page. */
export const buildSpecRows = (spec: EyewearSpec) => {
  const sizeCode = formatFrameSizeCode(spec);
  const sizeLabel = getFrameSizeLabel(spec.lensWidth);

  const rows: { label: string; value: string }[] = [];

  if (sizeCode) {
    rows.push({
      label: "Size",
      value: sizeLabel ? `${sizeLabel} (${sizeCode})` : sizeCode,
    });
  }
  if (spec.frameColors?.length) {
    rows.push({ label: "Colour", value: spec.frameColors.join(", ") });
  }

  const weight = formatWeight(spec.weightGrams);
  if (weight) rows.push({ label: "Weight", value: weight });

  if (spec.frameMaterial)
    rows.push({ label: "Material", value: spec.frameMaterial });
  if (spec.frameShape)
    rows.push({ label: "Shape", value: FRAME_SHAPE_LABELS[spec.frameShape] });
  if (spec.rimType)
    rows.push({ label: "Rim", value: RIM_TYPE_LABELS[spec.rimType] });
  if (spec.gender)
    rows.push({ label: "Suits", value: GENDER_LABELS[spec.gender] });

  return rows;
};
