/**
 * The power ranges an optical price list is actually written in.
 *
 * Modelled on this shop's own printed sheet rather than on symmetry, because
 * the two are not the same thing. The sheet prices MINUS and PLUS separately —
 * in the CR MC column, -6.50 to -8.00 is 4500 while +6.50 to +8.00 is 5000 —
 * so a single band spanning -8.00 to +8.00 cannot express it, and would
 * quietly charge every long-sighted customer the short-sighted price.
 *
 * It also separates three shapes of prescription, which is how a lab quotes:
 *
 *   SPH    a spherical lens, no cylinder            (CR SV SPH / CR SV +SPH)
 *   CYL    cylinder only, no sphere                 (CR SV CYL)
 *   TORIC  both together, priced by the pair        (CR TORIC / HI TORIC)
 *
 * The ranges are inclusive, in MINUS CYLINDER, and disjoint — no row shadows
 * another, so the order they are tried in does not change the answer.
 *
 * A shop that bands differently can retype or delete any row: this is a
 * starting point for transcribing a price list, not a rule about one.
 */
export type StandardBand = {
  label: string;
  sphMin: number;
  sphMax: number;
  cylMin: number;
  cylMax: number;
  addMin?: number | null;
  addMax?: number | null;
};

/** Spherical: a cylinder of zero. Minus first, as the sheet lists them. */
const SPHERE_ONLY: StandardBand[] = [
  { label: "SPH plano to -3.00", sphMin: -3, sphMax: 0, cylMin: 0, cylMax: 0 },
  { label: "SPH -3.25 to -6.00", sphMin: -6, sphMax: -3.25, cylMin: 0, cylMax: 0 },
  { label: "SPH -6.50 to -8.00", sphMin: -8, sphMax: -6.5, cylMin: 0, cylMax: 0 },
  { label: "SPH -8.50 to -10.00", sphMin: -10, sphMax: -8.5, cylMin: 0, cylMax: 0 },
  { label: "SPH -11.00 to -16.00", sphMin: -16, sphMax: -11, cylMin: 0, cylMax: 0 },
  { label: "SPH -17.00 to -20.00", sphMin: -20, sphMax: -17, cylMin: 0, cylMax: 0 },

  { label: "+SPH +0.25 to +3.00", sphMin: 0.25, sphMax: 3, cylMin: 0, cylMax: 0 },
  { label: "+SPH +3.25 to +6.00", sphMin: 3.25, sphMax: 6, cylMin: 0, cylMax: 0 },
  { label: "+SPH +6.50 to +8.00", sphMin: 6.5, sphMax: 8, cylMin: 0, cylMax: 0 },
  { label: "+SPH +8.50 to +10.00", sphMin: 8.5, sphMax: 10, cylMin: 0, cylMax: 0 },
];

/** Cylinder with no sphere. */
const CYLINDER_ONLY: StandardBand[] = [
  { label: "CYL -0.25 to -2.00", sphMin: 0, sphMax: 0, cylMin: -2, cylMax: -0.25 },
  { label: "CYL -2.25 to -4.00", sphMin: 0, sphMax: 0, cylMin: -4, cylMax: -2.25 },
  { label: "CYL -4.25 to -6.00", sphMin: 0, sphMax: 0, cylMin: -6, cylMax: -4.25 },
];

/** Sphere and cylinder together. The sheet's TORIC and HI TORIC blocks. */
const TORIC: StandardBand[] = [
  // Minus sphere with a low cylinder.
  { label: "TORIC -0.25/-3.00 with -0.25/-2.00", sphMin: -3, sphMax: -0.25, cylMin: -2, cylMax: -0.25 },
  { label: "TORIC -3.25/-6.00 with -0.25/-2.00", sphMin: -6, sphMax: -3.25, cylMin: -2, cylMax: -0.25 },
  { label: "TORIC -6.50/-8.00 with -0.25/-2.00", sphMin: -8, sphMax: -6.5, cylMin: -2, cylMax: -0.25 },
  { label: "TORIC -8.50/-10.00 with -0.25/-2.00", sphMin: -10, sphMax: -8.5, cylMin: -2, cylMax: -0.25 },
  { label: "TORIC -10.50/-12.00 with -0.25/-2.00", sphMin: -12, sphMax: -10.5, cylMin: -2, cylMax: -0.25 },
  { label: "TORIC -12.50/-14.00 with -0.25/-2.00", sphMin: -14, sphMax: -12.5, cylMin: -2, cylMax: -0.25 },
  { label: "TORIC -14.50/-16.00 with -0.25/-2.00", sphMin: -16, sphMax: -14.5, cylMin: -2, cylMax: -0.25 },

  // Minus sphere with a higher cylinder.
  { label: "HI TORIC -0.25/-3.00 with -2.25/-3.00", sphMin: -3, sphMax: -0.25, cylMin: -3, cylMax: -2.25 },
  { label: "HI TORIC -3.25/-6.00 with -2.25/-3.00", sphMin: -6, sphMax: -3.25, cylMin: -3, cylMax: -2.25 },
  { label: "HI TORIC -6.50/-8.00 with -2.25/-3.00", sphMin: -8, sphMax: -6.5, cylMin: -3, cylMax: -2.25 },
  { label: "HI TORIC -8.50/-10.00 with -2.25/-3.00", sphMin: -10, sphMax: -8.5, cylMin: -3, cylMax: -2.25 },
  { label: "HI TORIC -0.25/-3.00 with -3.25/-4.00", sphMin: -3, sphMax: -0.25, cylMin: -4, cylMax: -3.25 },
  { label: "HI TORIC -3.25/-6.00 with -3.25/-4.00", sphMin: -6, sphMax: -3.25, cylMin: -4, cylMax: -3.25 },
  { label: "HI TORIC -0.25/-3.00 with -4.25/-5.00", sphMin: -3, sphMax: -0.25, cylMin: -5, cylMax: -4.25 },
  { label: "HI TORIC -4.25/-6.00 with -4.25/-5.00", sphMin: -6, sphMax: -4.25, cylMin: -5, cylMax: -4.25 },

  // Plus sphere with a minus cylinder — the sheet's "+/- TORIC" block.
  { label: "+/- TORIC +0.25/+3.00 with -0.25/-2.00", sphMin: 0.25, sphMax: 3, cylMin: -2, cylMax: -0.25 },
  { label: "+/- TORIC +3.25/+6.00 with -0.25/-2.00", sphMin: 3.25, sphMax: 6, cylMin: -2, cylMax: -0.25 },
  { label: "+/- TORIC +0.25/+3.00 with -2.25/-3.00", sphMin: 0.25, sphMax: 3, cylMin: -3, cylMax: -2.25 },
  { label: "+/- TORIC +3.25/+6.00 with -2.25/-3.00", sphMin: 3.25, sphMax: 6, cylMin: -3, cylMax: -2.25 },
  { label: "+/- TORIC +0.25/+3.00 with -3.25/-4.00", sphMin: 0.25, sphMax: 3, cylMin: -4, cylMax: -3.25 },
  { label: "+/- TORIC +3.25/+6.00 with -3.25/-4.00", sphMin: 3.25, sphMax: 6, cylMin: -4, cylMax: -3.25 },
];

/**
 * A bifocal or progressive is quoted on a much shorter list — the sheet gives
 * two rows for each, split on the sign of the sphere, both capped at a +3.00
 * reading addition. There is no separate toric block: the addition is what
 * drives the price.
 */
const MULTIFOCAL: StandardBand[] = [
  {
    label: "Plano to +3.00, ADD to +3.00",
    sphMin: 0,
    sphMax: 3,
    cylMin: -2,
    cylMax: 0,
    addMin: 0.75,
    addMax: 3,
  },
  {
    label: "-0.25 to -3.00, ADD to +3.00",
    sphMin: -3,
    sphMax: -0.25,
    cylMin: -2,
    cylMax: 0,
    addMin: 0.75,
    addMax: 3,
  },
];

/**
 * The rows to start from for one build.
 *
 * Kind-aware because the sheet is: a single vision lens is priced across
 * thirty-odd sphere, cylinder and toric rows, a progressive across two.
 * Offering the single vision grid for a progressive would be thirty rows of
 * busywork that the shop would have to delete.
 */
export function standardBandsFor(
  kind: "SINGLE_VISION" | "BIFOCAL" | "PROGRESSIVE",
): StandardBand[] {
  if (kind === "SINGLE_VISION") {
    return [...SPHERE_ONLY, ...CYLINDER_ONLY, ...TORIC];
  }
  return MULTIFOCAL;
}
