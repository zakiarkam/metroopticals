"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { logClientAction } from "@/lib/client-logger";
import { LENS_TINTS, PD_RANGE, PERF, type LensTint } from "@/features/try-on/config";
import type {
  FrameFitSpec,
  TryOnFrameAsset,
  TryOnTier,
} from "@/features/try-on/types";
import {
  detectCapabilities,
  type Capabilities,
} from "@/features/try-on/engine/capability";
import type { CameraFailure } from "@/features/try-on/engine/camera";
import type { EngineSnapshot, TryOnEngine } from "@/features/try-on/engine";

/**
 * Everything the try-on dialog needs, in one hook: consent, the camera or a
 * photo, the engine's lifecycle, colour switching, card calibration, idle
 * pausing and the snapshot. The engine itself is imported only when the
 * customer starts, so the product page carries none of it.
 */

export type TryOnStage =
  | "consent"
  | "starting"
  | "live"
  | "photo"
  | "camera-error"
  | "load-error";

export type UseTryOnOptions = {
  open: boolean;
  productId: number;
  frameSpec: FrameFitSpec;
  assets: TryOnFrameAsset[];
  initialColour?: string;
};

const IDLE_STATE: EngineSnapshot = {
  status: "idle",
  tier: null,
  fps: 0,
  metrics: null,
  verdict: null,
  error: null,
  degraded: false,
  modelWidthMm: null,
  corsBlocked: false,
  canTint: false,
};

/** Photos are shrunk before tracking; a 12-megapixel selfie helps nothing. */
const MAX_STILL_EDGE = 1280;
/** The full photo is kept at this size so a crop can be cut from real pixels. */
const MAX_PHOTO_EDGE = 2400;
/** Zoom in when the face is narrower than this fraction of the picture… */
const PHOTO_ZOOM_BELOW = 0.34;
/** …to a crop this many face-widths wide: head and shoulders. */
const PHOTO_ZOOM_FACES = 3.0;
/** Window zooms tried, in order, when the whole photo shows no face. */
const PHOTO_SCAN_ZOOMS = [2, 3];

export function useTryOn({
  open,
  productId,
  frameSpec,
  assets,
  initialColour,
}: UseTryOnOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const stillRef = useRef<HTMLCanvasElement>(null);

  const engineRef = useRef<TryOnEngine | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastInteractionRef = useRef(0);
  const trackedOnceRef = useRef(false);

  const [stage, setStage] = useState<TryOnStage>("consent");
  const [snapshot, setSnapshot] = useState<EngineSnapshot>(IDLE_STATE);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [cameraError, setCameraError] = useState<CameraFailure | null>(null);
  const [sourceSize, setSourceSize] = useState({ width: 0, height: 0 });
  const [calibrating, setCalibrating] = useState(false);
  const [calibrated, setCalibrated] = useState(false);
  const [knownPd, setKnownPdState] = useState<number | null>(null);
  const [tint, setTintState] = useState<LensTint>(LENS_TINTS[0]);
  const [busy, setBusy] = useState(false);

  const colours = useMemo(() => assets.map((a) => a.colour), [assets]);
  const [colour, setColourState] = useState(() =>
    initialColour && colours.includes(initialColour) ? initialColour : colours[0] ?? "",
  );
  const asset = useMemo(
    () => assets.find((a) => a.colour === colour) ?? assets[0] ?? null,
    [assets, colour],
  );

  const mirrored = stage !== "photo";

  /* ------------------------------ lifecycle ------------------------------ */

  const teardown = useCallback(() => {
    engineRef.current?.dispose();
    engineRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (open) return;
    teardown();
    setStage("consent");
    setSnapshot(IDLE_STATE);
    setCameraError(null);
    setCalibrating(false);
    setCalibrated(false);
    setKnownPdState(null);
    setTintState(LENS_TINTS[0]);
    trackedOnceRef.current = false;
  }, [open, teardown]);

  useEffect(() => () => teardown(), [teardown]);

  const ensureEngine = useCallback(async () => {
    if (engineRef.current) return engineRef.current;
    const video = videoRef.current;
    const overlay = overlayRef.current;
    const gl = glRef.current;
    if (!video || !overlay || !gl) throw new Error("Try-on surfaces not mounted");

    const caps = detectCapabilities();
    setCapabilities(caps);

    const { TryOnEngine } = await import("@/features/try-on/engine");
    const engine = new TryOnEngine({
      video,
      overlayCanvas: overlay,
      glCanvas: gl,
      frameSpec,
      capabilities: caps,
      onChange: (next) => {
        setSnapshot(next);
        if (next.status === "ready" && !trackedOnceRef.current) {
          trackedOnceRef.current = true;
          logClientAction("tryon_face_tracked", { productId, tier: next.tier });
        }
      },
    });
    engineRef.current = engine;
    // Reachable from the console on a dev build, for the first-run checklist.
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __metroTryOn?: TryOnEngine }).__metroTryOn = engine;
    }
    await engine.load();
    return engine;
  }, [frameSpec, productId]);

  /* -------------------------------- camera -------------------------------- */

  const startCamera = useCallback(async () => {
    setStage("starting");
    setCameraError(null);
    lastInteractionRef.current = performance.now();
    logClientAction("tryon_open", { productId, mode: "camera" });

    try {
      const video = videoRef.current;
      if (!video) throw new Error("Video element missing");

      const { openFrontCamera } = await import("@/features/try-on/engine/camera");
      // Camera permission and the runtime download run side by side; the
      // permission prompt is what the customer is actually waiting on.
      const [stream, engine] = await Promise.all([
        openFrontCamera(video),
        ensureEngine(),
      ]);
      streamRef.current = stream;

      engine.setSourceSize(video.videoWidth, video.videoHeight);
      setSourceSize({ width: video.videoWidth, height: video.videoHeight });
      await engine.setAsset(asset);
      engine.start();
      setStage("live");
    } catch (error) {
      const reason = (error as { reason?: CameraFailure })?.reason;
      if (reason) {
        setCameraError(reason);
        setStage("camera-error");
      } else {
        console.error("Try-on failed to start", error);
        setStage("load-error");
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, [asset, ensureEngine, productId]);

  /* --------------------------------- photo -------------------------------- */

  const tryPhoto = useCallback(
    async (file: File) => {
      const still = stillRef.current;
      if (!still) return;
      setBusy(true);
      setStage("starting");
      logClientAction("tryon_open", { productId, mode: "photo" });

      try {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const bitmap = await createImageBitmap(file);
        // Keep a full-size copy so a crop around the face can be taken from
        // the original pixels rather than from an already shrunken picture.
        const fullScale = Math.min(1, MAX_PHOTO_EDGE / Math.max(bitmap.width, bitmap.height));
        const full = document.createElement("canvas");
        full.width = Math.round(bitmap.width * fullScale);
        full.height = Math.round(bitmap.height * fullScale);
        full.getContext("2d")?.drawImage(bitmap, 0, 0, full.width, full.height);
        bitmap.close();

        const fit = (sw: number, sh: number) => {
          const scale = Math.min(1, MAX_STILL_EDGE / Math.max(sw, sh));
          return { width: Math.round(sw * scale), height: Math.round(sh * scale) };
        };

        const engine = await ensureEngine();
        await engine.setAsset(asset);

        // Where is the face, in full-photo pixels? First the whole picture;
        // if the detector cannot see a face that small, zoomed windows.
        const scratch = document.createElement("canvas");
        const probeRegion = async (sx: number, sy: number, sw: number, sh: number) => {
          const size = fit(sw, sh);
          scratch.width = size.width;
          scratch.height = size.height;
          scratch.getContext("2d")?.drawImage(full, sx, sy, sw, sh, 0, 0, size.width, size.height);
          const m = await engine.probe(scratch, size.width, size.height);
          if (!m) return null;
          const k = sw / size.width;
          return { cx: sx + m.centre.x * k, cy: sy + m.anchor.y * k, faceWidthPx: m.faceWidthPx * k };
        };

        let face = await probeRegion(0, 0, full.width, full.height);
        for (const zoom of PHOTO_SCAN_ZOOMS) {
          if (face) break;
          const w = full.width / zoom;
          const h = full.height / zoom;
          for (let y = 0; y + h <= full.height + 1 && !face; y += h / 2) {
            for (let x = 0; x + w <= full.width + 1 && !face; x += w / 2) {
              face = await probeRegion(x, y, w, h);
            }
          }
        }

        // Crop to head and shoulders around it when it is small; otherwise
        // use the photo as it is.
        let sx = 0;
        let sy = 0;
        let sw = full.width;
        let sh = full.height;
        if (face && face.faceWidthPx < full.width * PHOTO_ZOOM_BELOW) {
          sw = Math.min(full.width, face.faceWidthPx * PHOTO_ZOOM_FACES);
          sh = Math.min(full.height, sw * (full.height / full.width));
          sx = Math.max(0, Math.min(full.width - sw, face.cx - sw / 2));
          sy = Math.max(0, Math.min(full.height - sh, face.cy + sh * 0.12 - sh / 2));
        }
        const size = fit(sw, sh);
        still.width = size.width;
        still.height = size.height;
        still.getContext("2d")?.drawImage(full, sx, sy, sw, sh, 0, 0, size.width, size.height);
        setSourceSize(size);
        await engine.processStill(still, size.width, size.height);
        setStage("photo");
      } catch (error) {
        console.error("Try-on photo failed", error);
        setStage("load-error");
      } finally {
        setBusy(false);
      }
    },
    [asset, ensureEngine, productId],
  );

  /* -------------------------------- colour -------------------------------- */

  const setColour = useCallback(
    async (next: string) => {
      setColourState(next);
      const engine = engineRef.current;
      const nextAsset = assets.find((a) => a.colour === next);
      if (!engine || !nextAsset) return;
      setBusy(true);
      try {
        await engine.setAsset(nextAsset);
      } finally {
        setBusy(false);
      }
    },
    [assets],
  );

  /* ------------------------------ calibration ----------------------------- */

  const applyCalibration = useCallback((pxPerMm: number | null) => {
    engineRef.current?.setCalibration(pxPerMm);
    setCalibrated(pxPerMm != null);
    setCalibrating(false);
    if (stage === "live") engineRef.current?.start();
  }, [stage]);

  const beginCalibration = useCallback(() => {
    // Freeze the live picture so the card can be marked on a still frame.
    if (stage === "live") {
      const video = videoRef.current;
      const still = stillRef.current;
      if (video && still) {
        still.width = video.videoWidth;
        still.height = video.videoHeight;
        still.getContext("2d")?.drawImage(video, 0, 0);
      }
      engineRef.current?.stop();
    }
    setCalibrating(true);
  }, [stage]);

  const cancelCalibration = useCallback(() => {
    setCalibrating(false);
    if (stage === "live") engineRef.current?.start();
  }, [stage]);

  /* ------------------------------- known PD ------------------------------- */

  const setKnownPd = useCallback((mm: number | null) => {
    const value =
      mm == null ? null : Math.min(PD_RANGE.max, Math.max(PD_RANGE.min, Math.round(mm)));
    setKnownPdState(value);
    engineRef.current?.setKnownPd(value);
    if (value != null) logClientAction("tryon_pd_entered", { productId });
  }, [productId]);

  /* --------------------------------- tint --------------------------------- */

  const setTint = useCallback((next: LensTint) => {
    setTintState(next);
    engineRef.current?.setLensTint(next);
  }, []);

  /* ---------------------------------- idle -------------------------------- */

  const noteInteraction = useCallback(() => {
    lastInteractionRef.current = performance.now();
    if (snapshot.status === "paused") engineRef.current?.start();
  }, [snapshot.status]);

  useEffect(() => {
    if (stage !== "live" || calibrating) return;
    const timer = window.setInterval(() => {
      const idleFor = performance.now() - lastInteractionRef.current;
      if (idleFor > PERF.idlePauseMs && engineRef.current?.state.status !== "paused") {
        engineRef.current?.pause();
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [stage, calibrating]);

  // Leaving the tab stops the camera work; coming back resumes it.
  useEffect(() => {
    if (stage !== "live") return;
    const onVisibility = () => {
      if (document.hidden) engineRef.current?.pause();
      else {
        lastInteractionRef.current = performance.now();
        engineRef.current?.start();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [stage]);

  /* -------------------------------- snapshot ------------------------------ */

  const takeSnapshot = useCallback(async (): Promise<Blob | null> => {
    const engine = engineRef.current;
    const background = stage === "photo" ? stillRef.current : videoRef.current;
    if (!engine || !background) return null;
    try {
      const canvas = engine.composeSnapshot(background, mirrored);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92),
      );
      logClientAction("tryon_snapshot", { productId, colour });
      return blob;
    } catch (error) {
      // A cut-out served without CORS taints the canvas; nothing else fails here.
      console.warn("Snapshot unavailable", error);
      return null;
    }
  }, [colour, mirrored, productId, stage]);

  const backToCamera = useCallback(() => {
    setStage("consent");
    setSnapshot(IDLE_STATE);
  }, []);

  return {
    refs: { video: videoRef, overlay: overlayRef, gl: glRef, still: stillRef },
    stage,
    snapshot,
    capabilities,
    cameraError,
    sourceSize,
    mirrored,
    busy,
    colours,
    colour,
    asset,
    tier: snapshot.tier as TryOnTier | null,
    setColour,
    startCamera,
    tryPhoto,
    backToCamera,
    calibration: {
      active: calibrating,
      done: calibrated || knownPd != null,
      begin: beginCalibration,
      cancel: cancelCalibration,
      apply: applyCalibration,
    },
    knownPd,
    setKnownPd,
    tint,
    setTint,
    noteInteraction,
    takeSnapshot,
  };
}
