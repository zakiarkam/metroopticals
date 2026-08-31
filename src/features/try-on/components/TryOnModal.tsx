"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera,
  CreditCard,
  Download,
  ImagePlus,
  Loader2,
  Play,
  Share2,
  ShoppingBag,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Toast } from "@/lib/utils/toast";
import { PHOTO_MODE_ENABLED } from "@/features/try-on/config";
import { getColorSwatch } from "@/features/products/utils/colors";
import type { FrameShape } from "@/features/products/types/product";
import type { FrameFitSpec, TryOnFrameAsset } from "@/features/try-on/types";
import { useTryOn } from "@/features/try-on/hooks/use-try-on";
import ConsentScreen from "./ConsentScreen";
import FitVerdictPanel from "./FitVerdictPanel";
import FrameFitPanel from "./FrameFitPanel";
import LensTintPicker from "./LensTintPicker";
import CardCalibration from "./CardCalibration";

export type TryOnModalProps = {
  open: boolean;
  onClose: () => void;
  productId: number;
  title: string;
  frameSpec: FrameFitSpec;
  frameShape?: FrameShape | null;
  assets: TryOnFrameAsset[];
  initialColour?: string;
  /** Admin preview: same component, labelled as a check rather than a sale. */
  adminPreview?: boolean;
  /** Buying from inside the try-on. Omitted when the frame cannot be bought. */
  onAddToCart?: () => void | Promise<void>;
  priceLabel?: string;
  /** Where "view similar styles" goes. */
  similarHref?: string;
};

const TIER_COPY = {
  "3d": "3D try-on  turn your head to see the sides.",
  "2d": "Look straight at the camera for the truest picture.",
} as const;

export default function TryOnModal({
  open,
  onClose,
  productId,
  title,
  frameSpec,
  frameShape,
  assets,
  initialColour,
  adminPreview = false,
  onAddToCart,
  priceLabel,
  similarHref,
}: TryOnModalProps) {
  const tryOn = useTryOn({ open, productId, frameSpec, assets, initialColour });
  const {
    refs,
    stage,
    snapshot,
    cameraError,
    sourceSize,
    mirrored,
    busy,
    colours,
    colour,
    asset,
    setColour,
    startCamera,
    tryPhoto,
    backToCamera,
    calibration,
    knownPd,
    setKnownPd,
    tint,
    setTint,
    noteInteraction,
    takeSnapshot,
  } = tryOn;

  const viewportRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [display, setDisplay] = useState({ width: 0, height: 0 });
  const [sharing, setSharing] = useState(false);
  const [adding, setAdding] = useState(false);

  const showing = stage === "live" || stage === "photo";
  const status = snapshot.status;

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const update = () => {
      const rect = element.getBoundingClientRect();
      setDisplay({ width: rect.width, height: rect.height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // The layers are object-fit: cover, so one displayed pixel covers this many
  // source pixels  needed to turn a dragged distance into millimetres.
  const sourcePxPerDisplayPx =
    sourceSize.width && display.width && display.height
      ? 1 / Math.max(display.width / sourceSize.width, display.height / sourceSize.height)
      : 1;

  const share = useCallback(async () => {
    setSharing(true);
    try {
      const blob = await takeSnapshot();
      if (!blob) {
        Toast.error("A snapshot isn't available for this frame yet.");
        return;
      }
      const file = new File([blob], `metro-try-on-${productId}.jpg`, { type: "image/jpeg" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: `${title}  Metro Opticals` });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") {
        Toast.error("Could not save the snapshot.");
      }
    } finally {
      setSharing(false);
    }
  }, [productId, takeSnapshot, title]);

  const addToCart = useCallback(async () => {
    if (!onAddToCart) return;
    setAdding(true);
    try {
      await onAddToCart();
    } finally {
      setAdding(false);
    }
  }, [onAddToCart]);

  const mirrorClass = mirrored ? "-scale-x-100" : "";
  const toolButton =
    "inline-flex h-9 items-center gap-1.5 rounded-full bg-white/15 px-3.5 text-[12.5px] font-semibold text-white backdrop-blur-sm hover:bg-white/25 disabled:opacity-40";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        hideClose
        className="flex max-h-[96vh] w-[calc(100%-1rem)] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:p-0"
        onPointerMove={noteInteraction}
        onPointerDown={noteInteraction}
        onKeyDown={noteInteraction}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-3 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <DialogTitle className="truncate text-[15px] font-bold text-dark">
              {adminPreview ? "Preview on a face" : "Try on"}  {title}
            </DialogTitle>
            <DialogDescription className="mt-0.5 truncate text-[12px] text-dark-5">
              {snapshot.tier
                ? TIER_COPY[snapshot.tier]
                : "Your picture never leaves this device."}
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close try-on"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-dark-4 transition-colors hover:bg-gray-1 hover:text-dark"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)] lg:overflow-hidden">
          {/* ------------------------------ viewport ------------------------------ */}
          <div className="relative h-[62vh] min-h-[340px] bg-dark lg:h-auto lg:min-h-[520px]">
            <div ref={viewportRef} className="absolute inset-0 overflow-hidden">
              <video
                ref={refs.video}
                autoPlay
                muted
                playsInline
                className={`absolute inset-0 h-full w-full object-cover ${mirrorClass} ${
                  stage === "photo" ? "invisible" : ""
                }`}
              />
              <canvas
                ref={refs.still}
                className={`absolute inset-0 h-full w-full object-cover ${mirrorClass} ${
                  stage === "photo" || calibration.active ? "" : "invisible"
                }`}
              />
              <canvas
                ref={refs.overlay}
                className={`pointer-events-none absolute inset-0 h-full w-full object-cover ${mirrorClass} ${
                  snapshot.tier === "2d" && !calibration.active ? "" : "invisible"
                }`}
              />
              <canvas
                ref={refs.gl}
                className={`pointer-events-none absolute inset-0 h-full w-full object-cover ${mirrorClass} ${
                  snapshot.tier === "3d" && !calibration.active ? "" : "invisible"
                }`}
              />

              {showing && calibration.active && (
                <CardCalibration
                  displayWidth={display.width}
                  sourcePxPerDisplayPx={sourcePxPerDisplayPx}
                  onApply={calibration.apply}
                  onCancel={calibration.cancel}
                />
              )}

              {showing && !calibration.active && status === "no-face" && (
                <div className="pointer-events-none absolute inset-x-0 top-0 p-3">
                  <p className="mx-auto w-fit rounded-full bg-dark/75 px-4 py-1.5 text-[12.5px] font-semibold text-white backdrop-blur-sm">
                    Can&apos;t see your face  move into the light, arm&apos;s length away
                  </p>
                </div>
              )}

              {showing && status === "paused" && (
                <button
                  type="button"
                  onClick={noteInteraction}
                  className="absolute inset-0 z-10 grid place-items-center bg-dark/60 text-white"
                >
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-2.5 text-[13.5px] font-bold backdrop-blur-sm">
                    <Play className="h-4 w-4" /> Tap to resume
                  </span>
                </button>
              )}

              {(busy || status === "loading") && showing && (
                <div className="pointer-events-none absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-dark/70 text-white">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}

              {showing && !calibration.active && (
                <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 bg-gradient-to-t from-dark/85 to-dark/0 px-3 pb-3 pt-8">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) tryPhoto(file);
                      event.target.value = "";
                    }}
                  />
                  <button type="button" onClick={share} disabled={sharing || status !== "ready"} className={toolButton}>
                    {sharing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : typeof navigator !== "undefined" && "share" in navigator ? (
                      <Share2 className="h-4 w-4" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Save picture
                  </button>
                  {!calibration.done && (
                    <button type="button" onClick={calibration.begin} disabled={status !== "ready"} className={toolButton}>
                      <CreditCard className="h-4 w-4" /> Card calibration
                    </button>
                  )}
                  <span className="flex-1" />
                  {stage === "photo" ? (
                    <button type="button" onClick={backToCamera} className={toolButton}>
                      <Camera className="h-4 w-4" /> Use camera
                    </button>
                  ) : PHOTO_MODE_ENABLED ? (
                    <button type="button" onClick={() => photoInputRef.current?.click()} className={toolButton}>
                      <ImagePlus className="h-4 w-4" /> Use a photo
                    </button>
                  ) : null}
                </div>
              )}

              {!showing && (
                <div className="absolute inset-0 overflow-y-auto bg-gray-1">
                  <ConsentScreen
                    stage={
                      stage === "starting"
                        ? "starting"
                        : stage === "camera-error"
                          ? "camera-error"
                          : stage === "load-error"
                            ? "load-error"
                            : "consent"
                    }
                    cameraError={cameraError}
                    busy={busy}
                    onStartCamera={startCamera}
                    onPhoto={tryPhoto}
                    onRetry={backToCamera}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ------------------------------ side panel ----------------------------- */}
          <aside className="min-h-0 space-y-4 bg-gray-1 p-4 sm:p-5 lg:overflow-y-auto">
            {colours.length > 1 && (
              <div>
                <p className="text-[13px] font-semibold text-dark">
                  Colour <span className="font-normal text-dark-4">{colour}</span>
                </p>
                <div role="radiogroup" aria-label="Frame colour" className="mt-2.5 flex flex-wrap gap-2">
                  {colours.map((option) => {
                    const swatch = getColorSwatch(option);
                    const selected = option === colour;
                    return (
                      <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={busy}
                        onClick={() => void setColour(option)}
                        className={`inline-flex min-h-[38px] items-center gap-2 rounded-xl border px-3 py-1.5 text-[12.5px] font-semibold transition-all ${
                          selected
                            ? "border-blue bg-blue/[0.07] text-dark shadow-[0_0_0_1px_rgba(143,106,55,0.35)]"
                            : "border-gray-3 bg-gray-2 text-dark-2 hover:border-blue/45"
                        }`}
                      >
                        {swatch && (
                          <span
                            aria-hidden
                            className={`h-4 w-4 rounded-full ${swatch.needsBorder ? "ring-1 ring-inset ring-dark/20" : ""}`}
                            style={{ background: swatch.background }}
                          />
                        )}
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <LensTintPicker value={tint} onChange={setTint} disabled={!showing || !snapshot.canTint} />

            {snapshot.degraded && (
              <p className="rounded-xl border border-yellow-light-2 bg-yellow-light-4 px-3 py-2 text-[12px] leading-relaxed text-yellow-dark">
                Switched to the flat picture to keep things smooth on this device.
              </p>
            )}

            {adminPreview && (
              <div className="space-y-2">
                {snapshot.corsBlocked && (
                  <p className="rounded-xl border border-red-light-3 bg-red-light-6 px-3 py-2 text-[12px] leading-relaxed text-red-dark">
                    <strong>The bucket has no CORS rule for this site.</strong> The cut-out
                    still draws, but snapshots, lens tints and 3D models will not work
                    for customers until it is added  see RAILWAY.md § Virtual try-on.
                  </p>
                )}
                {showing && snapshot.tier === "2d" && !asset?.modelUrl && (
                  <p className="rounded-xl border border-gray-3 bg-gray-2 px-3 py-2 text-[12px] leading-relaxed text-body">
                    This colour has no 3D model, so the arms are not shown when the head
                    turns. Upload a <code>.glb</code> to add them.
                  </p>
                )}
                {snapshot.modelWidthMm != null && (
                  <p className="rounded-xl border border-gray-3 bg-gray-2 px-3 py-2 text-[12px] leading-relaxed text-body">
                    Model measures {Math.round(snapshot.modelWidthMm)} mm as built
                    {asset?.frameWidthMm != null && (
                      <>
                        ; caliper says {asset.frameWidthMm} mm
                        {Math.abs(snapshot.modelWidthMm - asset.frameWidthMm) / asset.frameWidthMm > 0.05 && (
                          <strong className="text-red-dark">  more than 5% apart, check the model&apos;s scale.</strong>
                        )}
                      </>
                    )}
                    .
                  </p>
                )}
              </div>
            )}

            <FrameFitPanel
              metrics={snapshot.metrics}
              knownPd={knownPd}
              onKnownPd={setKnownPd}
              disabled={!showing}
            />

            <FitVerdictPanel
              status={status}
              verdict={showing ? snapshot.verdict : null}
              metrics={snapshot.metrics}
              calibrated={calibration.done}
              scaleSource={snapshot.metrics?.scaleSource ?? (knownPd != null ? "pd" : "iris")}
              source={asset?.source ?? null}
              frameShape={frameShape}
              onCalibrate={calibration.begin}
              canCalibrate={showing && status === "ready"}
            />

            {(onAddToCart || similarHref) && !adminPreview && (
              <div className="flex flex-col gap-2 border-t border-gray-3 pt-4">
                {onAddToCart && (
                  <button
                    type="button"
                    onClick={() => void addToCart()}
                    disabled={adding}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue text-[14px] font-bold text-white transition-colors hover:bg-blue-dark disabled:opacity-60"
                  >
                    {adding ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <ShoppingBag className="h-[18px] w-[18px]" />}
                    Add to cart{priceLabel ? `  ${priceLabel}` : ""}
                  </button>
                )}
                {similarHref && (
                  <Link
                    href={similarHref}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-blue bg-blue-light-5 text-[13.5px] font-bold text-blue transition-colors hover:bg-blue-light-4"
                  >
                    View similar styles
                  </Link>
                )}
              </div>
            )}
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
