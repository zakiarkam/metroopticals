/**
 * The numbers an optometrist actually writes, and the ranges a lens can
 * actually be made in.
 *
 * Every power on a spectacle prescription moves in quarter-dioptre steps —
 * that is the step the trial lens set is built in, and it is why a customer
 * typing "-2.30" has mistyped something. Keeping the option lists here means
 * the picker, the validator and the price list all agree on what a legal
 * value is, instead of each inventing its own bounds.
 */

/** Sphere: the main power. Beyond ±20 is surgical territory, not spectacles. */
export const SPH_MIN = -20;
export const SPH_MAX = 20;

/**
 * Cylinder: the astigmatism correction. Most sit inside ±4, but ±6 is made
 * to order and refusing it would turn a real customer away at the form.
 */
export const CYL_MIN = -6;
export const CYL_MAX = 6;

/** Axis is an angle on a half-circle: 1–180, where 180 is horizontal. */
export const AXIS_MIN = 1;
export const AXIS_MAX = 180;

/** Reading addition, only ever plus, and only on a multifocal or reader. */
export const ADD_MIN = 0.75;
export const ADD_MAX = 3.5;

/** Binocular pupillary distance. Adults are 54–74; children go lower. */
export const PD_MIN = 43;
export const PD_MAX = 82;

/** One eye's half of the PD, when the slip gives the two separately. */
export const PD_MONO_MIN = 21;
export const PD_MONO_MAX = 41;

/** Prism, in prism dioptres. Rare, and always with a base direction. */
export const PRISM_MIN = 0;
export const PRISM_MAX = 10;

/** The four directions a prism can be based in. */
export const PRISM_BASES = ["UP", "DOWN", "IN", "OUT"] as const;
export type PrismBase = (typeof PRISM_BASES)[number];

export const PRISM_BASE_LABELS: Record<PrismBase, string> = {
  UP: "Base Up",
  DOWN: "Base Down",
  IN: "Base In",
  OUT: "Base Out",
};

/** The step every dioptric value moves in. */
export const DIOPTRE_STEP = 0.25;

/** Build an inclusive list of values from `min` to `max` in `step`. */
export function stepRange(min: number, max: number, step: number): number[] {
  const out: number[] = [];
  // Counted rather than accumulated: adding 0.25 eighty times drifts far
  // enough in binary floating point to turn 0 into 1.4e-16, which then
  // formats as "+0.00" but fails an equality check against zero.
  const count = Math.round((max - min) / step);
  for (let i = 0; i <= count; i += 1) {
    out.push(roundToStep(min + i * step, step));
  }
  return out;
}

/** Snap a number onto the nearest legal step, killing float drift with it. */
export function roundToStep(value: number, step = DIOPTRE_STEP): number {
  return Math.round(value / step) * step + 0;
}

/** True when the value sits exactly on a quarter-dioptre. */
export function isOnDioptreStep(value: number): boolean {
  return Math.abs(value / DIOPTRE_STEP - Math.round(value / DIOPTRE_STEP)) < 1e-6;
}

/**
 * "-2.25", "+0.50", "0.00" — the way a power is written on a slip, always to
 * two decimals and always signed, because "2.25" and "-2.25" are different
 * glasses and an unsigned number on a form is an invitation to get it wrong.
 */
export function formatDiopter(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const fixed = Math.abs(value).toFixed(2);
  if (value > 0) return `+${fixed}`;
  if (value < 0) return `-${fixed}`;
  return "0.00";
}

/** Axis is written as three digits with no sign: 005, 090, 180. */
export function formatAxis(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return String(Math.round(value)).padStart(3, "0");
}

export function formatPd(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${Number(value.toFixed(1))} mm`;
}

/* --------------------------- ready-made lists --------------------------- */

export const SPH_OPTIONS = stepRange(SPH_MIN, SPH_MAX, DIOPTRE_STEP);
export const CYL_OPTIONS = stepRange(CYL_MIN, CYL_MAX, DIOPTRE_STEP);
export const ADD_OPTIONS = stepRange(ADD_MIN, ADD_MAX, DIOPTRE_STEP);
export const AXIS_OPTIONS = stepRange(AXIS_MIN, AXIS_MAX, 1);
export const PD_OPTIONS = stepRange(PD_MIN, PD_MAX, 0.5);
export const PD_MONO_OPTIONS = stepRange(PD_MONO_MIN, PD_MONO_MAX, 0.5);
export const PRISM_OPTIONS = stepRange(PRISM_MIN, PRISM_MAX, DIOPTRE_STEP);

/** The PD to fall back to when the customer genuinely does not know theirs. */
export const PD_DEFAULT = 63;
