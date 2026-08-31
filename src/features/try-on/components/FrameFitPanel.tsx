"use client";

import React, { useState } from "react";
import { Minus, Plus, Ruler } from "lucide-react";
import { PD_RANGE } from "@/features/try-on/config";
import type { FaceMetrics } from "@/features/try-on/engine/measure";

/**
 * "Frame fit": the customer's pupillary distance. Estimated from the eyes
 * by default; typed in if they know it from a prescription, which then sets
 * the scale exactly for them  the single most accurate calibration there
 * is, and the one every good try-on offers.
 */
export default function FrameFitPanel({
  metrics,
  knownPd,
  onKnownPd,
  disabled,
}: {
  metrics: FaceMetrics | null;
  knownPd: number | null;
  onKnownPd: (mm: number | null) => void;
  disabled?: boolean;
}) {
  const estimated = metrics ? Math.round(metrics.pdMm) : null;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<number>(knownPd ?? estimated ?? PD_RANGE.default);

  const startEditing = () => {
    setDraft(knownPd ?? estimated ?? PD_RANGE.default);
    setEditing(true);
  };
  const step = (delta: number) =>
    setDraft((d) => Math.min(PD_RANGE.max, Math.max(PD_RANGE.min, d + delta)));

  return (
    <section className="rounded-2xl border border-gray-3 bg-gray-2 p-4">
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-blue">
        <Ruler className="h-4 w-4" />
        Frame fit
      </p>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-dark">Pupillary distance</p>
          <p className="text-[12px] text-dark-5">
            {knownPd != null
              ? `Using your PD of ${knownPd} mm`
              : estimated != null
                ? `About ${estimated} mm, estimated from your eyes`
                : "Measured once your face is found"}
          </p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={knownPd != null ? () => onKnownPd(null) : startEditing}
            disabled={disabled}
            className="text-[12.5px] font-semibold text-blue hover:underline disabled:opacity-50"
          >
            {knownPd != null ? "Back to automatic" : "I know my PD"}
          </button>
        )}
      </div>

      {editing && (
        <div className="mt-3 rounded-xl border border-gray-3 bg-gray-1 p-3">
          <p className="text-[12px] leading-relaxed text-body">
            It is on your prescription or your last lens receipt. Entering it
            sets the size exactly for you.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Decrease PD"
              className="grid h-10 w-10 place-items-center rounded-xl border border-blue text-blue hover:bg-blue-light-5"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[70px] text-center text-[18px] font-bold text-dark">
              {draft} <span className="text-[13px] font-semibold text-dark-4">mm</span>
            </span>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Increase PD"
              className="grid h-10 w-10 place-items-center rounded-xl border border-dark text-dark hover:bg-gray-8"
            >
              <Plus className="h-4 w-4" />
            </button>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => {
                onKnownPd(draft);
                setEditing(false);
              }}
              className="inline-flex h-10 items-center rounded-xl bg-blue px-4 text-[13px] font-bold text-white hover:bg-blue-dark"
            >
              Use this PD
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-[12.5px] font-semibold text-dark-4 hover:text-dark"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
