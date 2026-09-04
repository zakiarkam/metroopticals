/**
 * Turning a prescription into a price.
 *
 * The rule the shop works to, written once here so the picker, the cart and
 * the invoice cannot disagree:
 *
 *   1. Transpose the prescription into minus-cylinder form, because that is
 *      how the price list is written.
 *   2. Decide the SHAPE of each eye - sphere only, cylinder only, both, and
 *      whether a reading addition is being made into it. That picks the block
 *      of the price list to read; a sphere is never priced off a toric row.
 *   3. Inside that block, find the first row that covers the eye, in the
 *      order the shop put them in - a narrow special case above a broad
 *      catch-all.
 *   4. Charge the dearer of the two eyes. A pair is made to the harder eye;
 *      you cannot buy the cheap half on its own.
 *   5. Add the tint surcharge, if a colour was chosen.
 *
 * An eye that fits no row is not guessed at. It comes back unpriced, and the
 * storefront asks the customer to talk to us - which is the honest answer for
 * a power the shop has not put a price against.
 */

import {
  normalisePrescription,
  type EyeValues,
  type PrescriptionValues,
} from "@/features/lenses/utils/prescription";

export type LensDesignKind = "SINGLE_VISION" | "BIFOCAL" | "PROGRESSIVE";

/** Whether this way of making a lens needs a reading addition at all. */
export const designNeedsAdd = (kind: LensDesignKind) =>
  kind !== "SINGLE_VISION";

/** The three ways every lens is made, in the order they are offered. */
export const LENS_DESIGN_KINDS: LensDesignKind[] = [
  "SINGLE_VISION",
  "BIFOCAL",
  "PROGRESSIVE",
];

export const DESIGN_KIND_LABELS: Record<LensDesignKind, string> = {
  SINGLE_VISION: "Single vision",
  BIFOCAL: "Bifocal",
  PROGRESSIVE: "Progressive",
};

export const DESIGN_KIND_HINTS: Record<LensDesignKind, string> = {
  SINGLE_VISION: "One power across the whole lens.",
  BIFOCAL: "Distance and reading with a visible line.",
  PROGRESSIVE: "Distance to reading with no line.",
};

/**
 * The seven blocks a lens price sheet is written in.
 *
 * The first three price a pair made to one power. The last four are the same
 * shapes made with a reading addition - once as a bifocal, once as a
 * progressive - because those are two different lenses to make and a sheet
 * prices them separately.
 */
export type LensPowerCategory =
  | "SPH"
  | "CYL"
  | "SPH_CYL"
  | "SPH_ADD_BIFOCAL"
  | "SPH_ADD_PROGRESSIVE"
  | "SPH_CYL_ADD_BIFOCAL"
  | "SPH_CYL_ADD_PROGRESSIVE";

export const LENS_POWER_CATEGORIES: LensPowerCategory[] = [
  "SPH",
  "CYL",
  "SPH_CYL",
  "SPH_ADD_BIFOCAL",
  "SPH_ADD_PROGRESSIVE",
  "SPH_CYL_ADD_BIFOCAL",
  "SPH_CYL_ADD_PROGRESSIVE",
];

/** What each block is called on the sheet. */
export const CATEGORY_LABELS: Record<LensPowerCategory, string> = {
  SPH: "SPH only",
  CYL: "CYL only",
  SPH_CYL: "SPH + CYL",
  SPH_ADD_BIFOCAL: "SPH + ADD · Bifocal",
  SPH_ADD_PROGRESSIVE: "SPH + ADD · Progressive",
  SPH_CYL_ADD_BIFOCAL: "SPH + CYL + ADD · Bifocal",
  SPH_CYL_ADD_PROGRESSIVE: "SPH + CYL + ADD · Progressive",
};

export const CATEGORY_HINTS: Record<LensPowerCategory, string> = {
  SPH: "Short or long sight with no astigmatism. Priced on the sphere alone.",
  CYL: "Astigmatism with a plano sphere. Priced on the cylinder alone.",
  SPH_CYL: "Sphere and cylinder together - the toric block.",
  SPH_ADD_BIFOCAL: "A sphere with a reading addition, made with a line.",
  SPH_ADD_PROGRESSIVE: "The same powers made as a progressive, with no line.",
  SPH_CYL_ADD_BIFOCAL:
    "Sphere, cylinder and an addition, made with a line - usually ordered in.",
  SPH_CYL_ADD_PROGRESSIVE:
    "The same made as a progressive - usually ordered in.",
};

/** True for the four blocks that price a reading addition. */
export const categoryNeedsAdd = (category: LensPowerCategory) =>
  category !== "SPH" && category !== "CYL" && category !== "SPH_CYL";

/** True for the blocks that price a cylinder. */
export const categoryHasCyl = (category: LensPowerCategory) =>
  category === "CYL" ||
  category === "SPH_CYL" ||
  category === "SPH_CYL_ADD_BIFOCAL" ||
  category === "SPH_CYL_ADD_PROGRESSIVE";

/** True for the blocks that price a sphere the customer actually has. */
export const categoryHasSph = (category: LensPowerCategory) =>
  category !== "CYL";

/** How a pair priced from this block is made. */
export function designKindForCategory(
  category: LensPowerCategory,
): LensDesignKind {
  if (category === "SPH_ADD_BIFOCAL" || category === "SPH_CYL_ADD_BIFOCAL") {
    return "BIFOCAL";
  }
  if (
    category === "SPH_ADD_PROGRESSIVE" ||
    category === "SPH_CYL_ADD_PROGRESSIVE"
  ) {
    return "PROGRESSIVE";
  }
  return "SINGLE_VISION";
}

/** The blocks a pair made this way is priced from. */
export function categoriesForDesignKind(
  kind: LensDesignKind,
): LensPowerCategory[] {
  if (kind === "BIFOCAL") {
    return ["SPH_ADD_BIFOCAL", "SPH_CYL_ADD_BIFOCAL"];
  }
  if (kind === "PROGRESSIVE") {
    return ["SPH_ADD_PROGRESSIVE", "SPH_CYL_ADD_PROGRESSIVE"];
  }
  return ["SPH", "CYL", "SPH_CYL"];
}

export type PowerBand = {
  id: number;
  category: LensPowerCategory;
  label: string | null;
  sphMin: number;
  sphMax: number;
  cylMin: number;
  cylMax: number;
  addMin: number | null;
  addMax: number | null;
  price: number;
  /** Made to order rather than cut from stock. */
  isOrderLens: boolean;
  /** Working days quoted for an order lens, when the shop publishes one. */
  leadTimeDays: number | null;
  sortOrder: number;
};

/**
 * One lens on the shop's sheet, with the whole price list for it.
 *
 * The sheet is a grid: coatings across the top, blocks down the side. The
 * rows hang off the coating directly - a "blue cut progressive" is not a
 * lens of its own, it is the blue cut lens quoted from its progressive
 * blocks, which is why there is no third table between the two.
 */
export type PriceableLensType = {
  id: number;
  slug: string;
  name: string;
  requiresPrescription: boolean;
  basePrice: number;
  powerPrices: PowerBand[];
};

export type PriceableTint = {
  id: number;
  name: string;
  surcharge: number;
};

export type LensQuote = {
  /** Whether we can actually sell this online at a published price. */
  priced: boolean;
  /** How the pair was priced to be made. */
  designKind: LensDesignKind;
  /** Lens price for the pair, before the tint. */
  lensPrice: number;
  tintSurcharge: number;
  /** What the line adds to the basket: `lensPrice + tintSurcharge`. */
  total: number;
  /** Which band each eye landed in, for the admin and for support calls. */
  rightBandId: number | null;
  leftBandId: number | null;
  bandLabel: string | null;
  /** The shape of prescription this was priced as, for the picker to show. */
  category: LensPowerCategory | null;
  /** True when the matched row is a lens the shop has to order in. */
  isOrderLens: boolean;
  /** Working days quoted for it, when the shop publishes a figure. */
  leadTimeDays: number | null;
  /** Set when `priced` is false - shown to the customer as-is. */
  reason: string | null;
};

const withinInclusive = (value: number, min: number, max: number) =>
  value >= Math.min(min, max) - 1e-9 && value <= Math.max(min, max) + 1e-9;

/** A power counts as present once it is at least half a quarter-step away. */
const isZero = (value: number | null | undefined) =>
  value === null || value === undefined || Math.abs(value) < 0.125;

/** Bands in the order the shop meant them to be tried. */
function orderedBands(bands: PowerBand[]): PowerBand[] {
  return [...bands].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
}

/**
 * Which block of the price list one eye is read from.
 *
 * The KIND decides half of it and the eye the other half. Kind, not the
 * slip: a single vision pair is priced on its sphere and cylinder even when
 * the customer's prescription carries an addition for the separate readers
 * they also own, and a bifocal is priced with the addition even when only one
 * eye's is written down.
 *
 * A plano sphere with a cylinder is CYL rather than a weak toric; the same
 * prescription with an addition is a toric ADD block, because no price sheet
 * has a cylinder-and-addition block of its own.
 */
export function categoryForEye(
  eye: EyeValues,
  kind: LensDesignKind,
): LensPowerCategory {
  const hasCyl = !isZero(eye.cyl);
  const hasSph = !isZero(eye.sph);

  if (kind === "BIFOCAL") {
    return hasCyl ? "SPH_CYL_ADD_BIFOCAL" : "SPH_ADD_BIFOCAL";
  }
  if (kind === "PROGRESSIVE") {
    return hasCyl ? "SPH_CYL_ADD_PROGRESSIVE" : "SPH_ADD_PROGRESSIVE";
  }

  if (!hasCyl) return "SPH";
  return hasSph ? "SPH_CYL" : "CYL";
}

/**
 * The first band covering this eye, within its own block.
 *
 * An eye with no sphere recorded is treated as plano (0.00) rather than
 * skipped: someone with astigmatism only really does have a sphere of zero,
 * and dropping the eye would price the pair off the other one alone.
 */
export function matchBand(
  bands: PowerBand[],
  eye: EyeValues,
  { kind, add = null }: { kind: LensDesignKind; add?: number | null },
): PowerBand | null {
  const sph = eye.sph ?? 0;
  const cyl = eye.cyl ?? 0;
  const reading = eye.add ?? add;
  const category = categoryForEye(eye, kind);

  return (
    orderedBands(bands).find((band) => {
      if (band.category !== category) return false;
      if (!withinInclusive(sph, band.sphMin, band.sphMax)) return false;
      if (!withinInclusive(cyl, band.cylMin, band.cylMax)) return false;

      if (categoryNeedsAdd(category)) {
        if (reading === null || reading === undefined) return false;
        const min = band.addMin ?? Number.NEGATIVE_INFINITY;
        const max = band.addMax ?? Number.POSITIVE_INFINITY;
        if (!withinInclusive(reading, min, max)) return false;
      }

      return true;
    }) ?? null
  );
}

/** What this lens type, built this way, in this tint, costs for a prescription. */
export function quoteLens({
  lensType,
  designKind,
  tint,
  prescription,
}: {
  lensType: PriceableLensType;
  /** How the customer wants the pair made. */
  designKind: LensDesignKind;
  tint?: PriceableTint | null;
  prescription: PrescriptionValues | null;
}): LensQuote {
  const tintSurcharge = tint?.surcharge ?? 0;

  const unpriced = (reason: string): LensQuote => ({
    priced: false,
    designKind,
    lensPrice: 0,
    tintSurcharge,
    total: 0,
    rightBandId: null,
    leftBandId: null,
    bandLabel: null,
    category: null,
    isOrderLens: false,
    leadTimeDays: null,
    reason,
  });

  const flat = (price: number): LensQuote => ({
    priced: true,
    designKind,
    lensPrice: price,
    tintSurcharge,
    total: round(price + tintSurcharge),
    rightBandId: null,
    leftBandId: null,
    bandLabel: null,
    category: null,
    isOrderLens: false,
    leadTimeDays: null,
    reason: null,
  });

  // A plano lens has no powers to band on - it is one price, full stop.
  if (!lensType.requiresPrescription) return flat(lensType.basePrice);

  if (!prescription) {
    return unpriced("Add your prescription to see the price");
  }

  const bands = lensType.powerPrices;

  // No price list filled in yet: fall back to the type's base price rather
  // than blocking the sale, so a shop that prices lenses flat can simply
  // leave the blocks empty.
  if (bands.length === 0) {
    if (lensType.basePrice <= 0) {
      return unpriced("Call us for a price on this lens");
    }
    return flat(lensType.basePrice);
  }

  const minusCyl = normalisePrescription(prescription);
  const needsAdd = designNeedsAdd(designKind);

  // Bifocals and progressives are made to one addition; the slip usually
  // writes it once. Take whichever eye has it when the other is blank.
  const sharedAdd = minusCyl.right.add ?? minusCyl.left.add ?? null;

  // A lens built for two distances cannot be made without knowing the second
  // one. Said plainly here rather than quietly falling through to "outside
  // the range we price", which would send the customer hunting for the wrong
  // problem.
  if (needsAdd && sharedAdd === null) {
    return unpriced(
      `${DESIGN_KIND_LABELS[designKind]} lenses need your reading addition (ADD) - add it to your prescription.`,
    );
  }

  const right = matchBand(bands, minusCyl.right, {
    kind: designKind,
    add: sharedAdd,
  });
  const left = matchBand(bands, minusCyl.left, {
    kind: designKind,
    add: sharedAdd,
  });

  if (!right || !left) {
    const missing =
      !right && !left
        ? "This prescription"
        : !right
          ? "Your right eye"
          : "Your left eye";
    const shape =
      CATEGORY_LABELS[
        categoryForEye(!right ? minusCyl.right : minusCyl.left, designKind)
      ];
    return unpriced(
      `${missing} (${shape}) is outside the range we price online - message us and we'll quote it.`,
    );
  }

  // The pair is made to the harder eye.
  const band = right.price >= left.price ? right : left;

  // Either eye needing an ordered lens makes the pair one: both lenses are
  // cut together and the glasses are ready when the slower one is.
  const isOrderLens = right.isOrderLens || left.isOrderLens;
  const leadTimeDays = isOrderLens
    ? Math.max(
        right.isOrderLens ? (right.leadTimeDays ?? 0) : 0,
        left.isOrderLens ? (left.leadTimeDays ?? 0) : 0,
      ) || null
    : null;

  return {
    priced: true,
    designKind,
    lensPrice: band.price,
    tintSurcharge,
    total: round(band.price + tintSurcharge),
    rightBandId: right.id,
    leftBandId: left.id,
    bandLabel: band.label,
    category: band.category,
    isOrderLens,
    leadTimeDays,
    reason: null,
  };
}

/** "Order lens - made to order, about 7 days", or the shorter truth. */
export function describeOrderLens(quote: {
  isOrderLens: boolean;
  leadTimeDays: number | null;
}): string | null {
  if (!quote.isOrderLens) return null;
  return quote.leadTimeDays
    ? `Order lens - made to order, about ${quote.leadTimeDays} working ${
        quote.leadTimeDays === 1 ? "day" : "days"
      }`
    : "Order lens - made to order for your power";
}

/**
 * The cheapest a lens type can possibly be, for the "from Rs X" on the
 * picker before a prescription has been entered.
 */
export function priceFrom(lensType: PriceableLensType): number {
  if (!lensType.requiresPrescription) return lensType.basePrice;
  if (lensType.powerPrices.length === 0) return lensType.basePrice;

  return lensType.powerPrices.reduce(
    (lowest, band) => Math.min(lowest, band.price),
    Number.POSITIVE_INFINITY,
  );
}

/** The cheapest this lens can be when made this way, for the picker. */
export function designPriceFrom(
  lensType: PriceableLensType,
  kind: LensDesignKind,
): number {
  if (!lensType.requiresPrescription) return lensType.basePrice;

  const blocks = categoriesForDesignKind(kind);
  const rows = lensType.powerPrices.filter((band) =>
    blocks.includes(band.category),
  );
  if (rows.length === 0) return lensType.basePrice;

  return rows.reduce(
    (lowest, band) => Math.min(lowest, band.price),
    Number.POSITIVE_INFINITY,
  );
}

/**
 * Which of the three ways the shop has actually priced this lens.
 *
 * A lens with no rows at all is not "sold no way": it is sold flat at its
 * base price, which is how a plano lens and a shop that has not banded this
 * coating yet both work. Those are single vision, so that is what comes back
 * - an empty list here would leave the picker with nothing to quote and the
 * lens looking broken rather than simple.
 */
export function pricedDesignKinds(
  lensType: PriceableLensType,
): LensDesignKind[] {
  const priced = LENS_DESIGN_KINDS.filter((kind) =>
    lensType.powerPrices.some((band) =>
      categoriesForDesignKind(kind).includes(band.category),
    ),
  );
  return priced.length ? priced : ["SINGLE_VISION"];
}

/**
 * Rows whose ranges overlap, so the admin can be told which of two bands will
 * never be reached. Not an error - a deliberate narrow-then-broad list
 * overlaps by design - but worth surfacing beside the price list.
 *
 * Compared within a block only. Two rows in different blocks can hold the
 * same powers and never meet, because the shape of the prescription decides
 * which block is read before any number is compared.
 */
export function overlappingBands(bands: PowerBand[]): Array<[number, number]> {
  const ordered = orderedBands(bands);
  const clashes: Array<[number, number]> = [];

  const overlaps = (aMin: number, aMax: number, bMin: number, bMax: number) =>
    Math.min(aMax, bMax) >= Math.max(aMin, bMin) - 1e-9;

  const span = (min: number | null, max: number | null): [number, number] => [
    Math.min(min ?? Number.NEGATIVE_INFINITY, max ?? Number.POSITIVE_INFINITY),
    Math.max(min ?? Number.NEGATIVE_INFINITY, max ?? Number.POSITIVE_INFINITY),
  ];

  for (let i = 0; i < ordered.length; i += 1) {
    for (let j = i + 1; j < ordered.length; j += 1) {
      const a = ordered[i];
      const b = ordered[j];
      if (a.category !== b.category) continue;

      const [aSphMin, aSphMax] = span(a.sphMin, a.sphMax);
      const [bSphMin, bSphMax] = span(b.sphMin, b.sphMax);
      const [aCylMin, aCylMax] = span(a.cylMin, a.cylMax);
      const [bCylMin, bCylMax] = span(b.cylMin, b.cylMax);
      const [aAddMin, aAddMax] = span(a.addMin, a.addMax);
      const [bAddMin, bAddMax] = span(b.addMin, b.addMax);

      if (
        overlaps(aSphMin, aSphMax, bSphMin, bSphMax) &&
        overlaps(aCylMin, aCylMax, bCylMin, bCylMax) &&
        (!categoryNeedsAdd(a.category) ||
          overlaps(aAddMin, aAddMax, bAddMin, bAddMax))
      ) {
        clashes.push([a.id, b.id]);
      }
    }
  }

  return clashes;
}

const round = (value: number) => Math.round(value * 100) / 100;
