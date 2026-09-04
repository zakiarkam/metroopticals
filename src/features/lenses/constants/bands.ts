/**
 * The rows an optical price list is actually written in.
 *
 * A price sheet is not a flat list of ranges, it is a grid of BLOCKS, and the
 * block a prescription falls in is decided before any number is compared:
 *
 *   SPH          a spherical lens, no astigmatism      (CR SV SPH / CR SV +SPH)
 *   CYL          astigmatism with a plano sphere       (CR SV CYL)
 *   SPH + CYL    both together                         (CR TORIC / HI TORIC)
 *   SPH + ADD    a sphere with a reading addition, bifocal or progressive
 *   SPH+CYL+ADD  all three - the made-to-order corner of the sheet
 *
 * The last two are each written TWICE, once as a bifocal and once as a
 * progressive: the same powers made either way are different lenses to grind
 * and different money, and the sheet prices them apart. That is why there are
 * seven blocks rather than five.
 *
 * Inside a block the ranges are inclusive, written in MINUS CYLINDER, and cut
 * in even steps - 3.00 dioptres by default, plano out to ±20.00, because the
 * sheet prices minus and plus separately and a single band spanning both
 * would quietly charge every long-sighted customer the short-sighted price.
 *
 * These are a STARTING POINT for transcribing a price list, not a rule about
 * one. Every figure below is a default the shop can retype, and the generator
 * takes the step, the reach and the number of addition bands as arguments so
 * a shop that bands differently can regenerate rather than delete.
 */

import {
  ADD_MAX,
  ADD_MIN,
  CYL_MIN,
  DIOPTRE_STEP,
  SPH_MAX,
  SPH_MIN,
  formatDiopter,
  roundToStep,
} from "@/features/lenses/constants/optics";
import {
  LENS_POWER_CATEGORIES,
  categoriesForDesignKind,
  type LensDesignKind,
  type LensPowerCategory,
} from "@/features/lenses/utils/pricing";

export type StandardBand = {
  category: LensPowerCategory;
  label: string;
  sphMin: number;
  sphMax: number;
  cylMin: number;
  cylMax: number;
  addMin: number | null;
  addMax: number | null;
  isOrderLens: boolean;
};

/** How the grid is cut, when nobody says otherwise. */
export const BAND_DEFAULTS = {
  /** Sphere reach either side of plano, and the step it is cut in. */
  sphReach: 20,
  sphStep: 3,
  /** Cylinder reach (always minus) and its step. */
  cylReach: 6,
  cylStep: 3,
  /** How many bands the reading addition is split into. */
  addBands: 3,
} as const;

export type BandGridOptions = {
  sphReach?: number;
  sphStep?: number;
  cylReach?: number;
  cylStep?: number;
  addBands?: number;
};

type Range = { min: number; max: number; label: string };

/* ------------------------------ the ranges ------------------------------ */

/**
 * Sphere ranges from plano outwards, one sign at a time.
 *
 * Minus and plus are generated separately and never merged: they are separate
 * columns on the sheet and separate money at the lab.
 *
 * `includePlano` is what keeps the blocks from overlapping. A plano sphere
 * with a cylinder is a CYL prescription, not a weak toric one, so the toric
 * block starts at the first quarter step away from zero instead of at zero.
 */
function sphereRanges(
  reach: number,
  step: number,
  includePlano: boolean,
): Range[] {
  const out: Range[] = [];

  for (const sign of [-1, 1] as const) {
    for (let index = 0; index * step < reach - 1e-9; index += 1) {
      // Band k covers the magnitudes just past k steps up to k+1 steps, so
      // -3.00 belongs to the first band and -3.25 opens the second. Plano is
      // given to the minus side alone, or to neither on a toric block.
      const openAt = index * step;
      const magFrom =
        index === 0 && includePlano && sign === -1
          ? 0
          : roundToStep(openAt + DIOPTRE_STEP);
      const magTo = roundToStep(Math.min(openAt + step, reach));
      if (magFrom > magTo + 1e-9) break;

      const from = roundToStep(sign * magFrom);
      const to = roundToStep(sign * magTo);

      out.push({
        min: Math.min(from, to),
        max: Math.max(from, to),
        // Written the way it is read: outwards from plano, not left to right.
        label: `${formatDiopter(from)} to ${formatDiopter(to)}`,
      });
    }
  }

  return out;
}

/** Cylinder ranges, minus only, starting at the first real astigmatism. */
function cylinderRanges(reach: number, step: number): Range[] {
  const out: Range[] = [];

  for (let index = 0; index * step < reach - 1e-9; index += 1) {
    const from = roundToStep(-(index * step + DIOPTRE_STEP));
    const to = roundToStep(-Math.min(index * step + step, reach));
    if (from < to - 1e-9) break;

    out.push({
      min: to,
      max: from,
      label: `${formatDiopter(from)} to ${formatDiopter(to)}`,
    });
  }

  return out;
}

/**
 * The reading addition, cut into as many bands as asked for.
 *
 * Three by default, because a +1.00 and a +3.00 addition are not the same
 * lens to grind - the corridor of a progressive gets harder as the addition
 * rises - and pricing them as one row means either overcharging the first
 * customer or losing money on the last.
 *
 * Cut by quarter step rather than by dioptre so the bands come out even: the
 * legal additions are twelve values, and three bands are four values each.
 */
function additionRanges(count: number): Range[] {
  const bands = Math.max(1, Math.round(count));
  const steps = Math.round((ADD_MAX - ADD_MIN) / DIOPTRE_STEP) + 1;
  const out: Range[] = [];

  for (let index = 0; index < bands; index += 1) {
    const firstStep = Math.round((index * steps) / bands);
    const lastStep = Math.round(((index + 1) * steps) / bands) - 1;
    if (lastStep < firstStep) continue;

    const from = roundToStep(ADD_MIN + firstStep * DIOPTRE_STEP);
    const to = roundToStep(ADD_MIN + lastStep * DIOPTRE_STEP);

    out.push({
      min: from,
      max: to,
      label: `ADD ${formatDiopter(from)} to ${formatDiopter(to)}`,
    });
  }

  return out;
}

/* ------------------------------ the blocks ------------------------------ */

function clampReach(
  value: number | undefined,
  fallback: number,
  limit: number,
) {
  const wanted = Number.isFinite(value) ? Number(value) : fallback;
  return Math.min(Math.max(Math.abs(wanted), 1), limit);
}

function clampStep(value: number | undefined, fallback: number) {
  const wanted = Number.isFinite(value) ? Number(value) : fallback;
  return Math.min(Math.max(roundToStep(Math.abs(wanted)), DIOPTRE_STEP), 20);
}

/**
 * Every row of one block, for one build.
 *
 * The SPH+CYL+ADD block is marked as an order lens by default: a toric
 * multifocal is the one corner of the sheet a shop normally does not hold in
 * stock. It is a default on a row the shop can untick, not a rule.
 */
export function standardBandsForCategory(
  category: LensPowerCategory,
  options: BandGridOptions = {},
): StandardBand[] {
  const sphReach = clampReach(
    options.sphReach,
    BAND_DEFAULTS.sphReach,
    Math.min(Math.abs(SPH_MIN), SPH_MAX),
  );
  const sphStep = clampStep(options.sphStep, BAND_DEFAULTS.sphStep);
  const cylReach = clampReach(
    options.cylReach,
    BAND_DEFAULTS.cylReach,
    Math.abs(CYL_MIN),
  );
  const cylStep = clampStep(options.cylStep, BAND_DEFAULTS.cylStep);
  const addBands = Math.min(
    Math.max(Math.round(options.addBands ?? BAND_DEFAULTS.addBands), 1),
    6,
  );

  // A toric row prices a sphere that is actually there; plano-with-cylinder
  // is the CYL block's job. The toric ADD blocks do cover a plano sphere,
  // because there is nowhere else for a plano-with-cylinder reader to go.
  const spheres = sphereRanges(sphReach, sphStep, category !== "SPH_CYL");
  const cylinders = cylinderRanges(cylReach, cylStep);
  const additions = additionRanges(addBands);

  const row = (
    sph: Range | null,
    cyl: Range | null,
    add: Range | null,
    isOrderLens = false,
  ): StandardBand => ({
    category,
    label: [sph?.label, cyl && `CYL ${cyl.label}`, add?.label]
      .filter(Boolean)
      .join(" · "),
    sphMin: sph?.min ?? 0,
    sphMax: sph?.max ?? 0,
    cylMin: cyl?.min ?? 0,
    cylMax: cyl?.max ?? 0,
    addMin: add?.min ?? null,
    addMax: add?.max ?? null,
    isOrderLens,
  });

  switch (category) {
    case "SPH":
      return spheres.map((sph) => row(sph, null, null));

    case "CYL":
      return cylinders.map((cyl) => row(null, cyl, null));

    case "SPH_CYL":
      return spheres.flatMap((sph) =>
        cylinders.map((cyl) => row(sph, cyl, null)),
      );

    case "SPH_ADD_BIFOCAL":
    case "SPH_ADD_PROGRESSIVE":
      return spheres.flatMap((sph) =>
        additions.map((add) => row(sph, null, add)),
      );

    case "SPH_CYL_ADD_BIFOCAL":
    case "SPH_CYL_ADD_PROGRESSIVE":
      return spheres.flatMap((sph) =>
        cylinders.flatMap((cyl) =>
          additions.map((add) => row(sph, cyl, add, true)),
        ),
      );
  }
}

/** Every row of the whole sheet for one lens, in the order it is read. */
export function standardBandsForLens(
  options: BandGridOptions = {},
): StandardBand[] {
  return LENS_POWER_CATEGORIES.flatMap((category) =>
    standardBandsForCategory(category, options),
  );
}

/** The rows for the blocks a pair made this way is priced from. */
export function standardBandsFor(
  kind: LensDesignKind,
  options: BandGridOptions = {},
): StandardBand[] {
  return categoriesForDesignKind(kind).flatMap((category) =>
    standardBandsForCategory(category, options),
  );
}
