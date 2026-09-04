"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, ChevronDown, Info, Sparkles } from "lucide-react";
import Link from "next/link";

import PowerSelect from "@/features/lenses/components/checkout/PowerSelect";
import {
  ADD_OPTIONS,
  AXIS_OPTIONS,
  CYL_OPTIONS,
  PD_MONO_OPTIONS,
  PD_OPTIONS,
  PRISM_BASES,
  PRISM_BASE_LABELS,
  PRISM_OPTIONS,
  SPH_OPTIONS,
  formatAxis,
} from "@/features/lenses/constants/optics";
import type {
  EyeValues,
  FieldErrors,
  PrescriptionValues,
} from "@/features/lenses/utils/prescription";

const EYES = [
  { side: "right" as const, code: "OD", label: "right eye" },
  { side: "left" as const, code: "OS", label: "left eye" },
];

/**
 * The prescription grid: two eyes, four powers, and a PD.
 *
 * Laid out the way the slip is - OD above OS, sphere then cylinder then axis -
 * so a customer can copy across without translating anything. The axis cell is
 * disabled until there is a cylinder to go with it, because an axis on its own
 * is not a thing that can be made.
 */
export type PrescribedDesign = "SINGLE_VISION" | "BIFOCAL" | "PROGRESSIVE";

/** How the question reads at the counter, not how the software spells it. */
const PRESCRIBED_OPTIONS: {
  value: PrescribedDesign | null;
  label: string;
  hint: string;
}[] = [
  {
    value: "BIFOCAL",
    label: "Bifocal",
    hint: "There is a visible line across the lens.",
  },
  {
    value: "PROGRESSIVE",
    label: "Progressive",
    hint: "No line - the power changes gradually. Sometimes written PAL or varifocal.",
  },
  {
    value: null,
    label: "I'm not sure",
    hint: "We'll show you both and our optician will check before cutting.",
  },
];

export default function PrescriptionForm({
  values,
  onChange,
  errors,
  requiresAdd,
  prescribedDesign,
  onPrescribedDesignChange,
  prescribedFromSlip = false,
  highlight = [],
  confidence = null,
}: {
  values: PrescriptionValues;
  onChange: (next: PrescriptionValues) => void;
  errors: FieldErrors;
  /** Bifocals and progressives: the reading addition is opened and required. */
  requiresAdd: boolean;
  /** What the prescriber said to make, when anyone has said. */
  prescribedDesign: PrescribedDesign | null;
  onPrescribedDesignChange: (next: PrescribedDesign | null) => void;
  /** True when we read it off the uploaded slip rather than being told. */
  prescribedFromSlip?: boolean;
  /** Fields that came off a photo, ringed so they get checked. */
  highlight?: string[];
  confidence?: number | null;
}) {
  const [twoPd, setTwoPd] = useState(
    values.pdRight !== null || values.pdLeft !== null,
  );
  // Opened when there is anything in there worth seeing: a lens that needs an
  // addition, or a prescription that already has one - the type question lives
  // in here and must not be hidden behind a disclosure the customer never taps.
  const [showMore, setShowMore] = useState(
    requiresAdd || (values.right.add ?? values.left.add ?? 0) > 0,
  );

  const highlighted = useMemo(() => new Set(highlight), [highlight]);

  const sharedAdd = values.right.add ?? values.left.add ?? null;
  /** An addition means a second distance - which needs a decision. */
  const hasAdd = (sharedAdd ?? 0) > 0;

  // An upload that filled in an addition has to reveal the section holding it,
  // or the customer confirms a prescription without ever seeing the type
  // question that came with it. Declared above this on purpose: reading
  // `hasAdd` before its own `const` would be a dead-zone crash, not a warning.
  useEffect(() => {
    if (hasAdd) setShowMore(true);
  }, [hasAdd]);

  const setEye = (side: "right" | "left", patch: Partial<EyeValues>) => {
    onChange({ ...values, [side]: { ...values[side], ...patch } });
  };

  /**
   * The addition is one number for the pair on virtually every slip, so
   * typing it once fills both eyes. Anyone who genuinely has two different
   * ones can still set them apart afterwards.
   */
  const setAdd = (next: number | null) => {
    onChange({
      ...values,
      right: { ...values.right, add: next },
      left: { ...values.left, add: next },
    });
  };

  const togglePdMode = (useTwo: boolean) => {
    setTwoPd(useTwo);
    onChange(
      useTwo
        ? { ...values, pdSingle: null }
        : { ...values, pdRight: null, pdLeft: null },
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/lenses"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue underline underline-offset-4 hover:text-blue-dark"
        >
          <Info className="h-4 w-4" />
          Learn how to read your prescription
        </Link>

        {confidence !== null && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue/10 px-3 py-1 text-[11.5px] font-semibold text-blue">
            <Sparkles className="h-3.5 w-3.5" />
            Read from your photo - please check every number
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-gray-3 bg-gray-2 p-4 sm:p-5">
        {/* Column headings, on every width. On a phone the cells are too
            narrow to carry their own labels, which makes the headings the
            ONLY thing telling sphere from cylinder - hiding them there had it
            exactly backwards. */}
        <div className="grid grid-cols-[44px_repeat(3,minmax(0,1fr))] gap-2 pb-2 sm:grid-cols-[54px_repeat(3,minmax(0,1fr))] sm:gap-2.5">
          <span />
          {["SPH", "CYL", "AXIS"].map((heading) => (
            <span
              key={heading}
              className="text-center text-[10px] font-bold uppercase tracking-[0.12em] text-dark-4 sm:text-[11px] sm:tracking-[0.14em]"
            >
              {heading}
            </span>
          ))}
        </div>

        <div className="space-y-3">
          {EYES.map(({ side, code, label }) => {
            const eye = values[side];
            const hasCyl = (eye.cyl ?? 0) !== 0;

            return (
              <div
                key={side}
                className="grid grid-cols-[44px_repeat(3,minmax(0,1fr))] items-center gap-2 sm:grid-cols-[54px_repeat(3,minmax(0,1fr))] sm:gap-2.5"
              >
                <div className="text-left">
                  <p className="text-[13.5px] font-bold text-dark">{code}</p>
                  <p className="text-[10.5px] leading-tight text-dark-5">
                    {label}
                  </p>
                </div>

                <PowerSelect
                  id={`${side}-sph`}
                  label={`Sphere, ${label}`}
                  value={eye.sph}
                  options={SPH_OPTIONS}
                  onChange={(next) => setEye(side, { sph: next })}
                  placeholder="0.00"
                  error={errors[`${side}Sph`]}
                  highlighted={highlighted.has(`${side}Sph`)}
                />

                <PowerSelect
                  id={`${side}-cyl`}
                  label={`Cylinder, ${label}`}
                  value={eye.cyl}
                  options={CYL_OPTIONS}
                  onChange={(next) =>
                    // Clearing the cylinder clears the axis with it: an axis
                    // left behind on a lens with no cylinder is meaningless
                    // and would fail validation the shopper cannot see.
                    setEye(side, {
                      cyl: next,
                      ...(next === null || next === 0 ? { axis: null } : {}),
                    })
                  }
                  placeholder="0.00"
                  error={errors[`${side}Cyl`]}
                  highlighted={highlighted.has(`${side}Cyl`)}
                />

                <PowerSelect
                  id={`${side}-axis`}
                  label={`Axis, ${label}`}
                  value={eye.axis}
                  options={AXIS_OPTIONS}
                  onChange={(next) => setEye(side, { axis: next })}
                  format={(value) => formatAxis(value)}
                  placeholder="-"
                  disabled={!hasCyl}
                  error={errors[`${side}Axis`]}
                  highlighted={highlighted.has(`${side}Axis`)}
                />
              </div>
            );
          })}
        </div>

        {/* ------------------------------ PD ------------------------------ */}
        <div className="mt-5 border-t border-gray-3 pt-4">
          <div className="grid grid-cols-[44px_repeat(3,minmax(0,1fr))] items-center gap-2 sm:grid-cols-[54px_repeat(3,minmax(0,1fr))] sm:gap-2.5">
            <div className="text-left">
              <p className="text-[13.5px] font-bold text-dark">PD</p>
              <p className="text-[10.5px] leading-tight text-dark-5">mm</p>
            </div>

            {twoPd ? (
              <>
                <PowerSelect
                  id="pd-right"
                  label="Right pupillary distance"
                  value={values.pdRight}
                  options={PD_MONO_OPTIONS}
                  onChange={(next) => onChange({ ...values, pdRight: next })}
                  format={(value) => (value === null ? "-" : String(value))}
                  placeholder="Right"
                  error={errors.pdRight}
                  highlighted={highlighted.has("pdRight")}
                />
                <PowerSelect
                  id="pd-left"
                  label="Left pupillary distance"
                  value={values.pdLeft}
                  options={PD_MONO_OPTIONS}
                  onChange={(next) => onChange({ ...values, pdLeft: next })}
                  format={(value) => (value === null ? "-" : String(value))}
                  placeholder="Left"
                  error={errors.pdLeft}
                  highlighted={highlighted.has("pdLeft")}
                />
                <span />
              </>
            ) : (
              <>
                <PowerSelect
                  id="pd-single"
                  label="Pupillary distance"
                  value={values.pdSingle}
                  options={PD_OPTIONS}
                  onChange={(next) => onChange({ ...values, pdSingle: next })}
                  format={(value) => (value === null ? "-" : String(value))}
                  placeholder="Choose"
                  error={errors.pdSingle}
                  highlighted={highlighted.has("pdSingle")}
                />
                <span className="col-span-2 text-[11.5px] leading-snug text-dark-5">
                  The distance between your pupils. It is on most prescriptions;
                  if not, ask us and we&apos;ll measure it.
                </span>
              </>
            )}
          </div>

          <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-[12.5px] font-medium text-dark-3">
            <input
              type="checkbox"
              checked={twoPd}
              onChange={(event) => togglePdMode(event.target.checked)}
              className="h-4 w-4 accent-blue-light"
            />
            My prescription gives two PD numbers
          </label>
        </div>

        {/* -------------------------- more options ------------------------- */}
        <div className="mt-4 border-t border-gray-3 pt-4">
          <button
            type="button"
            onClick={() => setShowMore((open) => !open)}
            aria-expanded={showMore}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-dark-3 underline underline-offset-4 hover:text-blue"
          >
            {hasAdd ? "Reading addition & lens type" : "More options"}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showMore ? "rotate-180" : ""}`}
            />
          </button>

          {showMore && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-[44px_repeat(3,minmax(0,1fr))] items-center gap-2 sm:grid-cols-[54px_repeat(3,minmax(0,1fr))] sm:gap-2.5">
                <div className="text-left">
                  <p className="text-[13.5px] font-bold text-dark">ADD</p>
                  <p className="text-[10.5px] leading-tight text-dark-5">
                    reading
                  </p>
                </div>
                <PowerSelect
                  id="add-power"
                  label="Reading addition"
                  value={sharedAdd}
                  options={ADD_OPTIONS}
                  onChange={setAdd}
                  placeholder="None"
                  error={errors.rightAdd || errors.leftAdd}
                  highlighted={
                    highlighted.has("rightAdd") || highlighted.has("leftAdd")
                  }
                />
                <span className="col-span-2 text-[11.5px] leading-snug text-dark-5">
                  {requiresAdd
                    ? "This lens is made for near and far, so it needs your reading addition."
                    : "Only on a bifocal, progressive or reading prescription."}
                </span>
              </div>

              {/* ---------------------- lens type --------------------- */}
              {/* Sits with the addition because that is what it belongs to: a
                  reading addition means a second distance, and the TYPE is how
                  the optician said to build it. It is part of the prescription
                  rather than a shopping choice, which is why it is asked here
                  and not as a step of its own. */}
              {hasAdd && (
                <div className="grid grid-cols-[44px_repeat(3,minmax(0,1fr))] items-start gap-2 sm:grid-cols-[54px_repeat(3,minmax(0,1fr))] sm:gap-2.5">
                  <div className="pt-2 text-left">
                    <p className="text-[13.5px] font-bold text-dark">Type</p>
                    <p className="text-[10.5px] leading-tight text-dark-5">
                      lens
                    </p>
                  </div>

                  <div className="col-span-3">
                    <div className="grid gap-2 sm:grid-cols-3">
                      {PRESCRIBED_OPTIONS.map((option) => {
                        const selected = prescribedDesign === option.value;
                        return (
                          <button
                            key={option.label}
                            type="button"
                            onClick={() =>
                              onPrescribedDesignChange(option.value)
                            }
                            aria-pressed={selected}
                            className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                              selected
                                ? "border-blue bg-blue/[0.08]"
                                : "border-gray-3 bg-white hover:border-blue/50"
                            }`}
                          >
                            <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-dark">
                              {selected && (
                                <Check className="h-3.5 w-3.5 shrink-0 text-blue" />
                              )}
                              {option.label}
                            </span>
                            <span className="mt-0.5 block text-[11px] leading-snug text-dark-5">
                              {option.hint}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {prescribedFromSlip && prescribedDesign ? (
                      <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue/10 px-2.5 py-1 text-[11px] font-semibold text-blue">
                        <Sparkles className="h-3.5 w-3.5" />
                        Read off your prescription - change it if it&apos;s
                        wrong
                      </p>
                    ) : (
                      <p className="mt-2 text-[11px] leading-relaxed text-dark-5">
                        Usually written at the bottom of your prescription -
                        &ldquo;Bifocal&rdquo;, &ldquo;PAL&rdquo;,
                        &ldquo;Progressive&rdquo;.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {EYES.map(({ side, code, label }) => (
                <div
                  key={side}
                  className="grid grid-cols-[44px_repeat(3,minmax(0,1fr))] items-center gap-2 sm:grid-cols-[54px_repeat(3,minmax(0,1fr))] sm:gap-2.5"
                >
                  <div className="text-left">
                    <p className="text-[12.5px] font-bold text-dark">{code}</p>
                    <p className="text-[10.5px] leading-tight text-dark-5">
                      prism
                    </p>
                  </div>

                  <PowerSelect
                    id={`${side}-prism`}
                    label={`Prism, ${label}`}
                    value={values[side].prism}
                    options={PRISM_OPTIONS}
                    onChange={(next) =>
                      setEye(side, {
                        prism: next,
                        ...(next === null || next === 0 ? { base: null } : {}),
                      })
                    }
                    placeholder="None"
                    error={errors[`${side}Prism`]}
                  />

                  <div className="relative col-span-2">
                    <label htmlFor={`${side}-base`} className="sr-only">
                      Prism base, {label}
                    </label>
                    <select
                      id={`${side}-base`}
                      value={values[side].base ?? ""}
                      disabled={(values[side].prism ?? 0) === 0}
                      onChange={(event) =>
                        setEye(side, { base: event.target.value || null })
                      }
                      aria-invalid={errors[`${side}Base`] ? true : undefined}
                      className={`h-11 w-full cursor-pointer appearance-none rounded-lg border bg-white px-3 text-[13.5px] font-semibold text-dark outline-none disabled:cursor-not-allowed disabled:bg-gray-2 disabled:text-dark-5 ${
                        errors[`${side}Base`]
                          ? "border-red"
                          : "border-gray-3 focus:border-blue"
                      }`}
                    >
                      <option value="">Base direction</option>
                      {PRISM_BASES.map((base) => (
                        <option key={base} value={base}>
                          {PRISM_BASE_LABELS[base]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Errors are shown once, together, under the grid: a message inside a
          54-pixel cell is unreadable and the cells are already ringed red. */}
      {Object.keys(errors).length > 0 && (
        <ul className="space-y-1.5 rounded-xl border border-red/30 bg-red/[0.07] px-4 py-3">
          {[...new Set(Object.values(errors))].map((message) => (
            <li
              key={message}
              className="flex items-start gap-2 text-[12.5px] font-medium text-red"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
