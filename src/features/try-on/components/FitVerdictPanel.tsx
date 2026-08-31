"use client";

import React from "react";
import Link from "next/link";
import { CreditCard, Check, AlertTriangle, X, ScanFace } from "lucide-react";
import type { FitVerdict, FitStatus, TryOnSource } from "@/features/try-on/types";
import type { FaceMetrics } from "@/features/try-on/engine/measure";
import type { EngineStatus } from "@/features/try-on/engine";
import type { FrameShape } from "@/features/products/types/product";

type Props = {
  status: EngineStatus;
  verdict: FitVerdict | null;
  metrics: FaceMetrics | null;
  calibrated: boolean;
  /** Where the millimetre scale came from. */
  scaleSource: "iris" | "card" | "pd";
  source: TryOnSource | null;
  frameShape?: FrameShape | null;
  onCalibrate: () => void;
  canCalibrate: boolean;
};

const TONE: Record<FitStatus, { text: string; dot: string; badge: string }> = {
  good: { text: "text-green-dark", dot: "bg-green", badge: "bg-green-light-5 text-green-dark" },
  note: { text: "text-yellow-dark", dot: "bg-yellow-light", badge: "bg-yellow-light-4 text-yellow-dark" },
  poor: { text: "text-red-dark", dot: "bg-red", badge: "bg-red-light-5 text-red-dark" },
};

const Icon = ({ status }: { status: FitStatus }) =>
  status === "good" ? (
    <Check className="h-3.5 w-3.5" strokeWidth={3} />
  ) : status === "note" ? (
    <AlertTriangle className="h-3.5 w-3.5" />
  ) : (
    <X className="h-3.5 w-3.5" strokeWidth={3} />
  );

/**
 * The fit readout: a verdict with its millimetres, an honest note on how
 * accurate the measurement is, and  when the answer is "not this one" 
 * a link straight to the frames that would fit.
 */
export default function FitVerdictPanel({
  status,
  verdict,
  metrics,
  calibrated,
  scaleSource,
  source,
  frameShape,
  onCalibrate,
  canCalibrate,
}: Props) {
  const waiting = !verdict;
  const tone = verdict && verdict.overall !== "unknown" ? TONE[verdict.overall] : null;

  const alternativesHref = (() => {
    if (!verdict?.recommendedSize || verdict.overall === "good") return null;
    const params = new URLSearchParams({ sizes: verdict.recommendedSize });
    if (frameShape) params.set("shapes", frameShape);
    return `/shop-with-sidebar?${params.toString()}`;
  })();

  return (
    <section className="rounded-2xl border border-gray-3 bg-gray-2 p-4 sm:p-5">
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-blue">
        <ScanFace className="h-4 w-4" />
        Your fit
      </p>

      {waiting ? (
        <p className="mt-3 text-[13.5px] leading-relaxed text-body">
          {status === "no-face"
            ? "We can't see your face. Move into the light and hold the phone at arm's length."
            : status === "ready"
              ? "Look straight at the camera for a moment to measure your fit."
              : "Finding your face…"}
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-bold ${tone?.badge ?? "bg-gray-8 text-dark-4"}`}
            >
              {verdict.overall !== "unknown" && <Icon status={verdict.overall} />}
              {verdict.headline}
            </span>
            {metrics && (
              <span className="text-[12px] text-dark-5">
                Face {Math.round(metrics.faceWidthMm)} mm · PD {Math.round(metrics.pdMm)} mm
              </span>
            )}
          </div>

          <ul className="mt-4 space-y-2.5">
            {verdict.checks.map((check) => (
              <li key={check.key} className="flex gap-2.5">
                <span
                  className={`mt-[5px] h-2 w-2 shrink-0 rounded-full ${TONE[check.status].dot}`}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className={`text-[12.5px] font-bold ${TONE[check.status].text}`}>
                    {check.label}
                  </p>
                  <p className="text-[12.5px] leading-relaxed text-body">{check.detail}</p>
                </div>
              </li>
            ))}
          </ul>

          {alternativesHref && (
            <Link
              href={alternativesHref}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-blue px-4 text-[13px] font-bold text-white transition-colors hover:bg-blue-dark"
            >
              Show frames in my size
            </Link>
          )}
        </>
      )}

      <div className="mt-4 border-t border-gray-3 pt-3">
        <p className="text-[11.5px] leading-relaxed text-dark-5">
          {scaleSource === "pd"
            ? "Sized from your own PD  accurate to about a millimetre."
            : calibrated
              ? "Measured with card calibration  accurate to about a millimetre."
              : "Estimated from the size of your eyes  usually within about 5 mm. Enter your PD above for an exact reading."}
        </p>
        {!calibrated && canCalibrate && (
          <button
            type="button"
            onClick={onCalibrate}
            className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-blue hover:underline"
          >
            <CreditCard className="h-4 w-4" />
            Calibrate with a bank card for a precise reading
          </button>
        )}
        <p className="mt-2 text-[11.5px] leading-relaxed text-dark-5">
          A guide only. Your PD and fitting height are confirmed in the shop
          before lenses are made; progressive lenses always need an in-store
          measurement.
        </p>
        {source === "TEMPLATE" && (
          <p className="mt-2 text-[11.5px] leading-relaxed text-dark-5">
            The 3D shape shown is representative of this style; the size is
            exact.
          </p>
        )}
      </div>
    </section>
  );
}
