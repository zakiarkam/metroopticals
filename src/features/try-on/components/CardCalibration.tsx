"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ID1_CARD_WIDTH_MM } from "@/features/try-on/config";

type Props = {
  /** Displayed width of the picture area. */
  displayWidth: number;
  /** How many source pixels one displayed pixel covers (object-fit aware). */
  sourcePxPerDisplayPx: number;
  onApply: (pxPerMm: number) => void;
  onCancel: () => void;
};

/**
 * Two markers dragged to the edges of a bank card held against the
 * forehead. Every card is 85.6 mm wide, so the pixels between the markers
 * give a true scale at the face  about ±1 mm, against ±5 mm from the iris
 * estimate. Deliberately manual: a person aligning two dots is more reliable
 * than edge detection on a phone in shop lighting.
 */
export default function CardCalibration({
  displayWidth,
  sourcePxPerDisplayPx,
  onApply,
  onCancel,
}: Props) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState(0.34);
  const [right, setRight] = useState(0.66);
  const [y, setY] = useState(0.28);
  const dragging = useRef<"left" | "right" | null>(null);

  const toFraction = useCallback((clientX: number, clientY: number) => {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    };
  }, []);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!dragging.current) return;
      const point = toFraction(event.clientX, event.clientY);
      if (!point) return;
      if (dragging.current === "left") setLeft(Math.min(point.x, right - 0.02));
      else setRight(Math.max(point.x, left + 0.02));
      setY(point.y);
    };
    const up = () => {
      dragging.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [left, right, toFraction]);

  const apply = () => {
    const displayPx = (right - left) * displayWidth;
    const sourcePx = displayPx * sourcePxPerDisplayPx;
    if (sourcePx < 20) return;
    onApply(sourcePx / ID1_CARD_WIDTH_MM);
  };

  const handle = (side: "left" | "right", x: number) => (
    <button
      type="button"
      aria-label={`${side} edge of the card`}
      onPointerDown={(event) => {
        event.preventDefault();
        dragging.current = side;
      }}
      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
      className="absolute z-20 h-11 w-11 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-[3px] border-white bg-blue/90 shadow-2 ring-4 ring-blue/25"
    />
  );

  return (
    <div ref={areaRef} className="absolute inset-0 z-20 select-none">
      <div
        className="pointer-events-none absolute z-10 border-y-2 border-dashed border-white/90"
        style={{
          left: `${left * 100}%`,
          width: `${(right - left) * 100}%`,
          top: `${y * 100}%`,
          height: 0,
        }}
      />
      {handle("left", left)}
      {handle("right", right)}

      <div className="absolute inset-x-0 bottom-0 z-20 bg-dark/80 p-4 text-white backdrop-blur-sm">
        <p className="text-[13px] font-bold">Hold any bank card flat against your forehead</p>
        <p className="mt-1 text-[12px] leading-relaxed text-white/80">
          Drag the two markers to the card&apos;s left and right edges, then
          confirm. The card must be at the same distance as your face.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={apply}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-blue text-[13px] font-bold text-white hover:bg-blue-dark"
          >
            Use this measurement
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-white/40 px-4 text-[13px] font-semibold text-white hover:bg-white/10"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
