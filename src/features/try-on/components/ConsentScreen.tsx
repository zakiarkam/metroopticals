"use client";

import React, { useRef } from "react";
import { Camera, ImagePlus, Loader2, ShieldCheck } from "lucide-react";
import type { CameraFailure } from "@/features/try-on/engine/camera";
import { PHOTO_MODE_ENABLED } from "@/features/try-on/config";

type Props = {
  stage: "consent" | "starting" | "camera-error" | "load-error";
  cameraError: CameraFailure | null;
  busy: boolean;
  onStartCamera: () => void;
  onPhoto: (file: File) => void;
  onRetry: () => void;
};

const CAMERA_ERROR_COPY: Record<CameraFailure, string> = {
  denied:
    "Camera access was refused. Allow the camera in your browser's site settings and try again.",
  unavailable: "No camera could be started on this device.",
  insecure: "The camera only works over a secure connection (https).",
  unknown: "The camera could not be started. Please try again.",
};
const PHOTO_FALLBACK = " You can also try the frame on a photo.";

/**
 * The screen before the camera opens. Says exactly what happens to the
 * picture  it never leaves the phone  because customers who know that
 * are far more willing to press the button.
 */
export default function ConsentScreen({
  stage,
  cameraError,
  busy,
  onStartCamera,
  onPhoto,
  onRetry,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const pickPhoto = () => fileRef.current?.click();

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPhoto(file);
          event.target.value = "";
        }}
      />

      {stage === "starting" ? (
        <>
          <Loader2 className="h-9 w-9 animate-spin text-blue" />
          <p className="mt-5 text-[15px] font-bold text-dark">
            Starting the try-on
          </p>
          <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-body">
            The first time takes a few seconds while the face tracking loads.
            After that it is instant.
          </p>
        </>
      ) : (
        <>
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-light-5 text-blue">
            <ShieldCheck className="h-7 w-7" />
          </div>

          <h3 className="mt-5 text-[1.2rem] font-bold text-dark">
            {stage === "camera-error"
              ? "Camera not available"
              : stage === "load-error"
                ? "Something went wrong"
                : "See these frames on your face"}
          </h3>

          <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-body">
            {stage === "camera-error" && cameraError
              ? CAMERA_ERROR_COPY[cameraError] + (PHOTO_MODE_ENABLED ? PHOTO_FALLBACK : "")
              : stage === "load-error"
                ? "The try-on could not be loaded. Check your connection and try again."
                : "Your camera picture stays on your phone. Nothing is uploaded, recorded or seen by us  the frame is drawn on your face right here in your browser."}
          </p>

          <div className="mt-7 flex w-full max-w-sm flex-col gap-3">
            {stage === "load-error" ? (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue text-[14px] font-bold text-white transition-colors hover:bg-blue-dark"
              >
                Try again
              </button>
            ) : (
              <button
                type="button"
                onClick={onStartCamera}
                disabled={busy}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue text-[14px] font-bold text-white transition-colors hover:bg-blue-dark disabled:opacity-60"
              >
                <Camera className="h-[18px] w-[18px]" />
                {stage === "camera-error" ? "Try the camera again" : "Start camera"}
              </button>
            )}

            {PHOTO_MODE_ENABLED && (
              <button
                type="button"
                onClick={pickPhoto}
                disabled={busy}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-gray-3 bg-gray-2 text-[14px] font-semibold text-dark transition-colors hover:border-blue hover:text-blue disabled:opacity-60"
              >
                <ImagePlus className="h-[18px] w-[18px]" />
                Use a photo instead
              </button>
            )}
          </div>

          <p className="mt-6 text-[12px] leading-relaxed text-dark-5">
            Best in even light, phone at arm&apos;s length, looking straight at
            the camera.
          </p>
        </>
      )}
    </div>
  );
}
