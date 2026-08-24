"use client";

import React from "react";

interface FrameMeasurementsProps {
  /** mm, width of a single lens */
  lensWidth?: number | null;
  /** mm, gap between the two lenses */
  bridgeWidth?: number | null;
  /** mm, length of the arm */
  templeLength?: number | null;
  className?: string;
}

/**
 * Technical diagram of a frame's three published measurements.
 *
 * Deliberately omits lens height and total frame width: those are not
 * collected, and showing unlabelled dimensions invites questions we cannot
 * answer. The drawing is schematic — it is not to scale, so a 48mm and a
 * 54mm lens render identically; the numbers carry the meaning.
 */
export default function FrameMeasurements({
  lensWidth,
  bridgeWidth,
  templeLength,
  className = "",
}: FrameMeasurementsProps) {
  const hasFrontMeasurements = lensWidth != null || bridgeWidth != null;
  const hasSideMeasurement = templeLength != null;
  if (!hasFrontMeasurements && !hasSideMeasurement) return null;

  // With only one figure, a two-column grid would leave half the row empty.
  const columns =
    hasFrontMeasurements && hasSideMeasurement
      ? "sm:grid-cols-2"
      : "max-w-md";

  const stroke = "#C09C6C";
  const dim = "#8A8377";
  const label = "#F5F1E8";

  return (
    <div className={className}>
      <div className={`grid gap-6 ${columns}`}>
        {/* ---------- Front view: lens width + bridge ---------- */}
        {hasFrontMeasurements && (
          <figure className="rounded-xl border border-gray-3 bg-gray-2 p-4">
            <svg
              viewBox="0 0 320 150"
              className="w-full h-auto"
              role="img"
              aria-label={`Front view. Lens width ${lensWidth ?? "unspecified"} millimetres, bridge width ${bridgeWidth ?? "unspecified"} millimetres.`}
            >
              {/* temples (arms folded back at the hinges) */}
              <path
                d="M14 60 L34 66 M306 60 L286 66"
                stroke={stroke}
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                opacity="0.7"
              />
              {/* left lens */}
              <rect
                x="34"
                y="52"
                width="104"
                height="62"
                rx="16"
                fill="none"
                stroke={stroke}
                strokeWidth="3"
              />
              {/* right lens */}
              <rect
                x="182"
                y="52"
                width="104"
                height="62"
                rx="16"
                fill="none"
                stroke={stroke}
                strokeWidth="3"
              />
              {/* bridge */}
              <path
                d="M138 66 Q160 56 182 66"
                fill="none"
                stroke={stroke}
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* lens width dimension */}
              {lensWidth != null && (
                <g>
                  <line
                    x1="34"
                    y1="34"
                    x2="138"
                    y2="34"
                    stroke={dim}
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <path
                    d="M34 30 L34 38 M138 30 L138 38"
                    stroke={dim}
                    strokeWidth="1.5"
                  />
                  <text
                    x="86"
                    y="24"
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="600"
                    fill={label}
                  >
                    {lensWidth} mm
                  </text>
                </g>
              )}

              {/* bridge width dimension */}
              {bridgeWidth != null && (
                <g>
                  <line
                    x1="138"
                    y1="34"
                    x2="182"
                    y2="34"
                    stroke={dim}
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <path
                    d="M182 30 L182 38"
                    stroke={dim}
                    strokeWidth="1.5"
                  />
                  <text
                    x="160"
                    y="130"
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="600"
                    fill={label}
                  >
                    {bridgeWidth} mm
                  </text>
                  <line
                    x1="160"
                    y1="72"
                    x2="160"
                    y2="116"
                    stroke={dim}
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                </g>
              )}
            </svg>
            <figcaption className="mt-2 text-center text-custom-xs text-body">
              {lensWidth != null && <span>Lens width</span>}
              {lensWidth != null && bridgeWidth != null && <span> · </span>}
              {bridgeWidth != null && <span>Bridge width</span>}
            </figcaption>
          </figure>
        )}

        {/* ---------- Side view: temple length ---------- */}
        {hasSideMeasurement && (
          <figure className="rounded-xl border border-gray-3 bg-gray-2 p-4">
            <svg
              viewBox="0 0 320 150"
              className="w-full h-auto"
              role="img"
              aria-label={`Side view. Temple length ${templeLength} millimetres.`}
            >
              {/* temple arm with the bend that sits over the ear */}
              <path
                d="M20 74 L228 74 Q262 74 276 96 L286 120"
                fill="none"
                stroke={stroke}
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M20 74 L20 86 L228 84 Q258 84 270 104 L280 126"
                fill="none"
                stroke={stroke}
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.45"
              />

              <line
                x1="20"
                y1="44"
                x2="286"
                y2="44"
                stroke={dim}
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <path
                d="M20 40 L20 48 M286 40 L286 48"
                stroke={dim}
                strokeWidth="1.5"
              />
              <text
                x="153"
                y="32"
                textAnchor="middle"
                fontSize="13"
                fontWeight="600"
                fill={label}
              >
                {templeLength} mm
              </text>
            </svg>
            <figcaption className="mt-2 text-center text-custom-xs text-body">
              Temple length
            </figcaption>
          </figure>
        )}
      </div>

      <p className="mt-3 text-custom-xs text-dark-5">
        Diagram is illustrative and not to scale. Measurements are in
        millimetres.
      </p>
    </div>
  );
}
