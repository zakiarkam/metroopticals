/**
 * Turning a prescription into a price.
 *
 * The rule the shop works to, written once here so the picker, the cart and
 * the invoice cannot disagree:
 *
 *   1. Transpose the prescription into minus-cylinder form, because that is
 *      how the price list is written.
 *   2. Find the first band that covers each eye, in the order the shop put
 *      them in — a narrow special case above a broad catch-all.
 *   3. Charge the dearer of the two. A pair is made to the harder eye; you
 *      cannot buy the cheap half on its own.
 *   4. Add the tint surcharge, if a colour was chosen.
 *
 * An eye that fits no band is not guessed at. It comes back unpriced, and the
 * storefront asks the customer to talk to us — which is the honest answer for
 * a power the shop has not put a price against.
 */

import {
  normalisePrescription,
  type EyeValues,
  type PrescriptionValues,
} from "@/features/lenses/utils/prescription";

export type LensDesignKind = "SINGLE_VISION" | "BIFOCAL" | "PROGRESSIVE";

/** Whether this build needs a reading addition to be made at all. */
export const designNeedsAdd = (kind: LensDesignKind) => kind !== "SINGLE_VISION";

export type PowerBand = {
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

/**
 * One way a lens type is built, with the prices for it.
 *
 * The shop's sheet is a grid — coatings across, designs down — so the design
 * carries the bands and the type carries the designs. A blue cut progressive
 * is priced from the blue cut lens's progressive rows, not from a separate
 * lens type that would have to be maintained twice.
 */
export type PriceableDesign = {
  id: number;
  kind: LensDesignKind;
  name: string;
  powerPrices: PowerBand[];
};

export type PriceableLensType = {
  id: number;
  slug: string;
  name: string;
  requiresPrescription: boolean;
  basePrice: number;
  designs: PriceableDesign[];
};

export type PriceableTint = {
  id: number;
  name: string;
  surcharge: number;
};

export type LensQuote = {
  /** Whether we can actually sell this online at a published price. */
  priced: boolean;
  /** Which build was priced. Null only for a lens with no designs at all. */
  designId: number | null;
  /** Lens price for the pair, before the tint. */
  lensPrice: number;
  tintSurcharge: number;
  /** What the line adds to the basket: `lensPrice + tintSurcharge`. */
  total: number;
  /** Which band each eye landed in, for the admin and for support calls. */
  rightBandId: number | null;
  leftBandId: number | null;
  bandLabel: string | null;
  /** Set when `priced` is false — shown to the customer as-is. */
  reason: string | null;
};

const withinInclusive = (value: number, min: number, max: number) =>
  value >= Math.min(min, max) - 1e-9 && value <= Math.max(min, max) + 1e-9;

/** Bands in the order the shop meant them to be tried. */
function orderedBands(bands: PowerBand[]): PowerBand[] {
  return [...bands].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id - b.id,
  );
}

/**
 * The first band covering this eye. An eye with no sphere recorded is treated
 * as plano (0.00) rather than skipped: someone with astigmatism only really
 * does have a sphere of zero, and dropping the eye would price the pair off
 * the other one alone.
 */
export function matchBand(
  bands: PowerBand[],
  eye: EyeValues,
  addOverride: number | null = null,
): PowerBand | null {
  const sph = eye.sph ?? 0;
  const cyl = eye.cyl ?? 0;
  const add = eye.add ?? addOverride;

  return (
    orderedBands(bands).find((band) => {
      if (!withinInclusive(sph, band.sphMin, band.sphMax)) return false;
      if (!withinInclusive(cyl, band.cylMin, band.cylMax)) return false;

      // A band with no addition range priced on it covers every addition;
      // one that names a range only covers prescriptions inside it.
      if (band.addMin !== null || band.addMax !== null) {
        const min = band.addMin ?? 0;
        const max = band.addMax ?? Number.POSITIVE_INFINITY;
        if (add === null) return false;
        if (!withinInclusive(add, min, max)) return false;
      }

      return true;
    }) ?? null
  );
}

/** What this lens type, built this way, in this tint, costs for a prescription. */
export function quoteLens({
  lensType,
  design,
  tint,
  prescription,
}: {
  lensType: PriceableLensType;
  /** Which build. Omitted only for a lens sold with no designs (plano). */
  design?: PriceableDesign | null;
  tint?: PriceableTint | null;
  prescription: PrescriptionValues | null;
}): LensQuote {
  const tintSurcharge = tint?.surcharge ?? 0;

  const unpriced = (reason: string): LensQuote => ({
    priced: false,
    designId: design?.id ?? null,
    lensPrice: 0,
    tintSurcharge,
    total: 0,
    rightBandId: null,
    leftBandId: null,
    bandLabel: null,
    reason,
  });

  // A plano lens has no powers to band on — it is one price, full stop.
  if (!lensType.requiresPrescription) {
    return {
      priced: true,
      designId: design?.id ?? null,
      lensPrice: lensType.basePrice,
      tintSurcharge,
      total: round(lensType.basePrice + tintSurcharge),
      rightBandId: null,
      leftBandId: null,
      bandLabel: null,
      reason: null,
    };
  }

  if (!prescription) {
    return unpriced("Add your prescription to see the price");
  }

  if (!design) {
    return unpriced("Choose single vision, bifocal or progressive first");
  }

  const bands = design.powerPrices;

  // No price list filled in yet: fall back to the type's base price rather
  // than blocking the sale, so a shop that prices lenses flat can simply
  // leave the bands empty.
  if (bands.length === 0) {
    if (lensType.basePrice <= 0) {
      return unpriced("Call us for a price on this lens");
    }
    return {
      priced: true,
      designId: design.id,
      lensPrice: lensType.basePrice,
      tintSurcharge,
      total: round(lensType.basePrice + tintSurcharge),
      rightBandId: null,
      leftBandId: null,
      bandLabel: null,
      reason: null,
    };
  }

  const minusCyl = normalisePrescription(prescription);

  // Bifocals and progressives are made to one addition; the slip usually
  // writes it once. Take whichever eye has it when the other is blank.
  const sharedAdd = minusCyl.right.add ?? minusCyl.left.add ?? null;

  // A lens built for two distances cannot be made without knowing the second
  // one. Said plainly here rather than quietly falling through to "outside
  // the range we price", which would send the customer hunting for the wrong
  // problem.
  if (designNeedsAdd(design.kind) && sharedAdd === null) {
    return unpriced(
      `${design.name} lenses need your reading addition (ADD) — add it to your prescription.`,
    );
  }

  const right = matchBand(bands, minusCyl.right, sharedAdd);
  const left = matchBand(bands, minusCyl.left, sharedAdd);

  if (!right || !left) {
    const missing = !right && !left ? "This prescription" : !right ? "Your right eye" : "Your left eye";
    return unpriced(
      `${missing} is outside the range we price online for ${design.name} — message us and we'll quote it.`,
    );
  }

  // The pair is made to the harder eye.
  const band = right.price >= left.price ? right : left;

  return {
    priced: true,
    designId: design.id,
    lensPrice: band.price,
    tintSurcharge,
    total: round(band.price + tintSurcharge),
    rightBandId: right.id,
    leftBandId: left.id,
    bandLabel: band.label,
    reason: null,
  };
}

/**
 * The cheapest a lens type can possibly be, for the "from Rs X" on the
 * picker before a prescription has been entered.
 */
export function priceFrom(lensType: PriceableLensType): number {
  if (!lensType.requiresPrescription) return lensType.basePrice;

  // Across every build: the "from" figure is the cheapest way to own this
  // lens, which is normally its single vision rows.
  const bands = lensType.designs.flatMap((design) => design.powerPrices);
  if (bands.length === 0) return lensType.basePrice;

  return bands.reduce(
    (lowest, band) => Math.min(lowest, band.price),
    Number.POSITIVE_INFINITY,
  );
}

/** The cheapest this particular build can be, for the design picker. */
export function designPriceFrom(
  lensType: PriceableLensType,
  design: PriceableDesign,
): number {
  if (!lensType.requiresPrescription) return lensType.basePrice;
  if (design.powerPrices.length === 0) return lensType.basePrice;
  return design.powerPrices.reduce(
    (lowest, band) => Math.min(lowest, band.price),
    Number.POSITIVE_INFINITY,
  );
}

/**
 * Rows whose ranges overlap, so the admin can be told which of two bands will
 * never be reached. Not an error — a deliberate narrow-then-broad list
 * overlaps by design — but worth surfacing beside the price list.
 */
export function overlappingBands(bands: PowerBand[]): Array<[number, number]> {
  const ordered = orderedBands(bands);
  const clashes: Array<[number, number]> = [];

  const overlaps = (aMin: number, aMax: number, bMin: number, bMax: number) =>
    Math.min(aMax, bMax) >= Math.max(aMin, bMin) - 1e-9;

  for (let i = 0; i < ordered.length; i += 1) {
    for (let j = i + 1; j < ordered.length; j += 1) {
      const a = ordered[i];
      const b = ordered[j];
      if (
        overlaps(
          Math.min(a.sphMin, a.sphMax),
          Math.max(a.sphMin, a.sphMax),
          Math.min(b.sphMin, b.sphMax),
          Math.max(b.sphMin, b.sphMax),
        ) &&
        overlaps(
          Math.min(a.cylMin, a.cylMax),
          Math.max(a.cylMin, a.cylMax),
          Math.min(b.cylMin, b.cylMax),
          Math.max(b.cylMin, b.cylMax),
        )
      ) {
        clashes.push([a.id, b.id]);
      }
    }
  }

  return clashes;
}

const round = (value: number) => Math.round(value * 100) / 100;
