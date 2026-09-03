/**
 * Reading, normalising and describing a spectacle prescription.
 *
 * The single most important function here is `toMinusCylinder`. The same pair
 * of glasses can be written two ways — "+1.00 -2.00 x 90" and "-1.00 +2.00 x
 * 180" are the identical lens — and which one you get depends on which
 * machine the optometrist used. The price list is written one way, so every
 * prescription is transposed into that form before it is priced or stored.
 * Without it the same customer gets two different prices for the same eyes.
 */

import {
  AXIS_MAX,
  AXIS_MIN,
  CYL_MAX,
  CYL_MIN,
  SPH_MAX,
  SPH_MIN,
  ADD_MAX,
  ADD_MIN,
  PD_MAX,
  PD_MIN,
  PD_MONO_MAX,
  PD_MONO_MIN,
  PRISM_BASES,
  PRISM_MAX,
  formatAxis,
  formatDiopter,
  isOnDioptreStep,
  roundToStep,
} from "@/features/lenses/constants/optics";

export type EyeValues = {
  sph: number | null;
  cyl: number | null;
  axis: number | null;
  add: number | null;
  prism: number | null;
  base: string | null;
};

export type PrescriptionValues = {
  right: EyeValues;
  left: EyeValues;
  pdSingle: number | null;
  pdRight: number | null;
  pdLeft: number | null;
};

export const EMPTY_EYE: EyeValues = {
  sph: null,
  cyl: null,
  axis: null,
  add: null,
  prism: null,
  base: null,
};

export const EMPTY_PRESCRIPTION: PrescriptionValues = {
  right: { ...EMPTY_EYE },
  left: { ...EMPTY_EYE },
  pdSingle: null,
  pdRight: null,
  pdLeft: null,
};

/* ----------------------------- transposition ---------------------------- */

/**
 * Rewrite an eye in minus-cylinder form, which is what the price bands are
 * written in.
 *
 * The transposition is the standard one:
 *   new sphere   = sphere + cylinder
 *   new cylinder = -cylinder
 *   new axis     = axis ± 90, wrapped into 1–180
 *
 * An eye already in minus cyl (or with no cylinder at all) comes back
 * untouched, so this is safe to run on everything.
 */
export function toMinusCylinder(eye: EyeValues): EyeValues {
  const { sph, cyl, axis } = eye;
  if (cyl === null || cyl <= 0) return { ...eye };

  const nextSph = sph === null ? null : roundToStep(sph + cyl);
  const nextCyl = roundToStep(-cyl);

  // 180 rather than 0: the axis scale is 1–180, and an axis of 0 is written
  // 180. Adding 90 to 90 gives 180; adding 90 to 100 gives 190 -> 10.
  let nextAxis: number | null = null;
  if (axis !== null) {
    const rotated = (Math.round(axis) + 90) % 180;
    nextAxis = rotated === 0 ? 180 : rotated;
  }

  return { ...eye, sph: nextSph, cyl: nextCyl, axis: nextAxis };
}

/** The whole prescription in minus-cylinder form. */
export function normalisePrescription(
  values: PrescriptionValues,
): PrescriptionValues {
  return {
    ...values,
    right: toMinusCylinder(values.right),
    left: toMinusCylinder(values.left),
  };
}

/* ------------------------------- validation ----------------------------- */

export type FieldErrors = Record<string, string>;

type ValidateOptions = {
  /** Bifocal and progressive: the reading addition is not optional. */
  requiresAdd?: boolean;
  /** Plano lenses need no powers at all, only a PD. */
  requiresPower?: boolean;
};

const inRange = (value: number, min: number, max: number) =>
  value >= min && value <= max;

/**
 * What is wrong with these numbers, keyed by form field.
 *
 * Deliberately strict about the things that produce unwearable glasses — a
 * cylinder with no axis, an axis outside 1–180, a power off the quarter-
 * dioptre step — and deliberately quiet about the things that are merely
 * unusual, because unusual prescriptions are real and the shop can ring the
 * customer.
 */
export function validatePrescription(
  values: PrescriptionValues,
  { requiresAdd = false, requiresPower = true }: ValidateOptions = {},
): FieldErrors {
  const errors: FieldErrors = {};

  (["right", "left"] as const).forEach((side) => {
    const eye = values[side];
    const p = (field: string) => `${side}${field}`;

    if (eye.sph !== null) {
      if (!inRange(eye.sph, SPH_MIN, SPH_MAX)) {
        errors[p("Sph")] = `Sphere must be between ${SPH_MIN} and +${SPH_MAX}`;
      } else if (!isOnDioptreStep(eye.sph)) {
        errors[p("Sph")] = "Powers move in steps of 0.25";
      }
    }

    if (eye.cyl !== null && eye.cyl !== 0) {
      if (!inRange(eye.cyl, CYL_MIN, CYL_MAX)) {
        errors[p("Cyl")] = `Cylinder must be between ${CYL_MIN} and +${CYL_MAX}`;
      } else if (!isOnDioptreStep(eye.cyl)) {
        errors[p("Cyl")] = "Powers move in steps of 0.25";
      }

      // A cylinder says how much astigmatism; the axis says which way round
      // it goes. One without the other cannot be made up.
      if (eye.axis === null) {
        errors[p("Axis")] = "Add the axis that goes with this cylinder";
      }
    }

    if (eye.axis !== null) {
      if (!Number.isInteger(eye.axis) || !inRange(eye.axis, AXIS_MIN, AXIS_MAX)) {
        errors[p("Axis")] = "Axis is a whole number from 1 to 180";
      } else if ((eye.cyl ?? 0) === 0) {
        errors[p("Axis")] = "An axis needs a cylinder value as well";
      }
    }

    if (eye.add !== null) {
      if (!inRange(eye.add, ADD_MIN, ADD_MAX)) {
        errors[p("Add")] = `Reading addition is between +${ADD_MIN} and +${ADD_MAX}`;
      } else if (!isOnDioptreStep(eye.add)) {
        errors[p("Add")] = "Powers move in steps of 0.25";
      }
    } else if (requiresAdd) {
      errors[p("Add")] = "This lens needs a reading addition (ADD)";
    }

    if (eye.prism !== null) {
      if (!inRange(eye.prism, 0, PRISM_MAX)) {
        errors[p("Prism")] = `Prism must be between 0 and ${PRISM_MAX}`;
      }
      if (eye.prism > 0 && !PRISM_BASES.includes(eye.base as never)) {
        errors[p("Base")] = "Choose the base direction for the prism";
      }
    }
  });

  // Either one binocular figure or both halves — a single half on its own
  // cannot be centred.
  const hasMono = values.pdRight !== null || values.pdLeft !== null;
  if (hasMono) {
    (["pdRight", "pdLeft"] as const).forEach((field) => {
      const value = values[field];
      if (value === null) {
        errors[field] = "Enter both eyes, or use a single PD";
      } else if (!inRange(value, PD_MONO_MIN, PD_MONO_MAX)) {
        errors[field] = `Each eye's PD is between ${PD_MONO_MIN} and ${PD_MONO_MAX} mm`;
      }
    });
  } else if (values.pdSingle !== null) {
    if (!inRange(values.pdSingle, PD_MIN, PD_MAX)) {
      errors.pdSingle = `PD is between ${PD_MIN} and ${PD_MAX} mm`;
    }
  } else {
    errors.pdSingle = "We need your PD to centre the lenses";
  }

  if (requiresPower && !hasAnyPower(values)) {
    errors.form = "Enter the powers for at least one eye";
  }

  return errors;
}

/** True once anything has been prescribed for either eye. */
export function hasAnyPower(values: PrescriptionValues): boolean {
  return (["right", "left"] as const).some((side) => {
    const eye = values[side];
    return (
      (eye.sph ?? 0) !== 0 ||
      (eye.cyl ?? 0) !== 0 ||
      (eye.add ?? 0) !== 0 ||
      eye.sph !== null
    );
  });
}

/** The effective PD, whichever way it was given. */
export function totalPd(values: PrescriptionValues): number | null {
  if (values.pdRight !== null && values.pdLeft !== null) {
    return Number((values.pdRight + values.pdLeft).toFixed(1));
  }
  return values.pdSingle;
}

/* ------------------------------- describing ----------------------------- */

/** "-2.25 / -0.75 x 090" — one eye on one line, the way a slip reads. */
export function describeEye(eye: EyeValues): string {
  if (eye.sph === null && eye.cyl === null) return "—";
  const parts = [formatDiopter(eye.sph ?? 0)];
  if ((eye.cyl ?? 0) !== 0) {
    parts.push(`${formatDiopter(eye.cyl)} x ${formatAxis(eye.axis)}`);
  }
  if ((eye.add ?? 0) !== 0) parts.push(`ADD ${formatDiopter(eye.add)}`);
  if ((eye.prism ?? 0) > 0) {
    parts.push(`${formatDiopter(eye.prism)}Δ ${eye.base ?? ""}`.trim());
  }
  return parts.join(" / ");
}

/** A one-line summary for a cart row or an order line. */
export function describePrescription(values: PrescriptionValues): string {
  return `OD ${describeEye(values.right)} · OS ${describeEye(values.left)}`;
}

/**
 * The strongest single power in the prescription, used to warn a shopper that
 * their prescription is beyond what the site prices online.
 */
export function strongestPower(values: PrescriptionValues): number {
  return (["right", "left"] as const).reduce((worst, side) => {
    const eye = values[side];
    const magnitude = Math.abs(eye.sph ?? 0) + Math.abs(eye.cyl ?? 0);
    return Math.max(worst, magnitude);
  }, 0);
}

/* ------------------------ database row <-> values ----------------------- */

/** Column names are flat (`rightSph`); the form is nested. Map both ways. */
export function valuesFromRow(row: Record<string, any>): PrescriptionValues {
  const eye = (side: "right" | "left"): EyeValues => ({
    sph: row[`${side}Sph`] ?? null,
    cyl: row[`${side}Cyl`] ?? null,
    axis: row[`${side}Axis`] ?? null,
    add: row[`${side}Add`] ?? null,
    prism: row[`${side}Prism`] ?? null,
    base: row[`${side}Base`] ?? null,
  });

  return {
    right: eye("right"),
    left: eye("left"),
    pdSingle: row.pdSingle ?? null,
    pdRight: row.pdRight ?? null,
    pdLeft: row.pdLeft ?? null,
  };
}

export function rowFromValues(values: PrescriptionValues) {
  const spread = (side: "right" | "left") => {
    const eye = values[side];
    return {
      [`${side}Sph`]: eye.sph,
      [`${side}Cyl`]: eye.cyl,
      [`${side}Axis`]: eye.axis,
      [`${side}Add`]: eye.add,
      [`${side}Prism`]: eye.prism,
      [`${side}Base`]: eye.base,
    };
  };

  return {
    ...spread("right"),
    ...spread("left"),
    pdSingle: values.pdSingle,
    pdRight: values.pdRight,
    pdLeft: values.pdLeft,
  };
}
