import { PERF, type LensTint } from "@/features/try-on/config";
import { frameFrontWidthMm } from "@/features/products/utils/eyewear";
import type {
  FitVerdict,
  FrameFitSpec,
  TryOnFrameAsset,
  TryOnTier,
} from "@/features/try-on/types";
import type { Capabilities } from "./capability";
import { assessFit } from "./fit";
import { measureFace, type Calibration, type FaceMetrics } from "./measure";
import { trianglesFromConnections } from "./mesh-triangles";
import { Overlay2D } from "./overlay2d";
import type { Scene3D } from "./scene3d";
import { FaceTracker, type FacePose } from "./tracker";

/**
 * The try-on engine: camera frames in, a frame on a face out, and a fit
 * verdict on the side. Owns the tracker, both renderers and the frame loop.
 * React only ever sees the snapshot it emits.
 *
 * Tier resolution is decided per asset: a model plus WebGL2 gives 3D; a
 * cut-out gives 2D; a sustained low frame rate steps 3D down to 2D, then
 * halves the tracking rate. Nothing here ever shows a stuttering camera when
 * a simpler thing would work.
 */

export type EngineStatus =
  | "idle"
  | "loading"
  | "ready"
  | "no-face"
  | "paused"
  | "error";

export type EngineSnapshot = {
  status: EngineStatus;
  tier: TryOnTier | null;
  fps: number;
  metrics: FaceMetrics | null;
  verdict: FitVerdict | null;
  error: string | null;
  /** True once performance forced a step down the ladder. */
  degraded: boolean;
  /** Width of the loaded 3D model as built, for checking against the caliper. */
  modelWidthMm: number | null;
  /** The bucket served the cut-out without CORS: snapshots and tints are off. */
  corsBlocked: boolean;
  /** Whether a lens tint can be shown on the current asset. */
  canTint: boolean;
};

export type EngineOptions = {
  video: HTMLVideoElement;
  overlayCanvas: HTMLCanvasElement;
  glCanvas: HTMLCanvasElement;
  frameSpec: FrameFitSpec;
  capabilities: Capabilities;
  onChange: (snapshot: EngineSnapshot) => void;
};

const INITIAL: EngineSnapshot = {
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

export class TryOnEngine {
  private tracker: FaceTracker | null = null;
  private overlay: Overlay2D;
  private scene: Scene3D | null = null;

  private asset: TryOnFrameAsset | null = null;
  private tier: TryOnTier | null = null;
  private snapshot: EngineSnapshot = INITIAL;
  private sourceSize = { width: 0, height: 0 };

  private running = false;
  private raf = 0;
  private lastVideoTime = -1;
  private frameCounter = 0;
  private trackEvery = 1;

  private fps = 0;
  private lastFrameAt = 0;
  private lowFpsSince: number | null = null;
  private noFaceSince: number | null = null;

  private calibration: Calibration = {};
  private tint: LensTint | null = null;
  /**
   * Scale is only trustworthy face-on: the irises and the pupil distance
   * foreshorten as the head turns, and a frame that shrank with every turn
   * would look pasted on. The last frontal reading is held until the next.
   */
  private stable: { pxPerMm: number; faceWidthPx: number } | null = null;
  private smoothed: { faceWidthMm: number; pdMm: number } | null = null;
  private lastVerdictAt = 0;

  private lastPose: FacePose | null = null;
  private lastMetrics: FaceMetrics | null = null;

  constructor(private opts: EngineOptions) {
    this.overlay = new Overlay2D(opts.overlayCanvas);
  }

  private emit(patch: Partial<EngineSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.opts.onChange(this.snapshot);
  }

  get state() {
    return this.snapshot;
  }

  /** Measurements from the last tracked frame, if any. */
  getMetrics(): FaceMetrics | null {
    return this.lastMetrics;
  }

  /**
   * Looks for a face in a still without drawing or reporting anything 
   * used to search a photo in zoomed windows when the face is too small
   * for the detector to find in the whole picture.
   */
  async probe(
    image: HTMLImageElement | HTMLCanvasElement,
    width: number,
    height: number,
  ): Promise<FaceMetrics | null> {
    if (!this.tracker) return null;
    await this.tracker.setMode("IMAGE");
    const pose = this.tracker.detectImage(image, width, height);
    return pose ? measureFace(pose.landmarks, pose.rotation, this.calibration) : null;
  }

  /** The last tracked pose, for the lab and device tuning. */
  debug() {
    const pose = this.lastPose;
    const metrics = this.lastMetrics;
    return {
      tier: this.tier,
      hasMatrix: !!pose?.rotationMatrix,
      rotationMatrix: pose?.rotationMatrix ?? null,
      rawMatrix: pose?.rawMatrix ?? null,
      eulerDeg: pose?.rotation
        ? {
            yaw: (pose.rotation.yaw * 180) / Math.PI,
            pitch: (pose.rotation.pitch * 180) / Math.PI,
            roll: (pose.rotation.roll * 180) / Math.PI,
          }
        : null,
      landmarkYawDeg: metrics ? (metrics.rotation.yaw * 180) / Math.PI : null,
      pxPerMm: metrics?.pxPerMm ?? null,
      faceWidthMm: metrics?.faceWidthMm ?? null,
      anchor: metrics?.anchor ?? null,
      frontal: metrics?.frontal ?? null,
    };
  }

  /** Loads the face tracker. The 3D scene is created only when first needed. */
  async load() {
    this.emit({ status: "loading", error: null });
    try {
      this.tracker = await FaceTracker.load();
      this.emit({ status: "ready" });
    } catch (error) {
      this.emit({
        status: "error",
        error:
          "The try-on could not be loaded. Check your connection and try again.",
      });
      throw error;
    }
  }

  setSourceSize(width: number, height: number) {
    this.sourceSize = { width, height };
    this.overlay.resize(width, height);
    this.scene?.resize(width, height);
  }

  /**
   * Chooses what to draw for a colourway and loads it. Returns the tier that
   * will actually be used, which the UI states plainly.
   */
  async setAsset(
    asset: TryOnFrameAsset | null,
    preferred: TryOnTier | null = null,
  ): Promise<TryOnTier | null> {
    this.asset = asset;
    this.smoothed = null;
    this.emit({ verdict: null });

    if (!asset) return this.useTier(null);

    const want3d =
      !!asset.modelUrl &&
      this.opts.capabilities.webgl2 &&
      preferred !== "2d" &&
      !this.snapshot.degraded;

    if (want3d && asset.modelUrl) {
      try {
        if (!this.scene) {
          const { Scene3D } = await import("./scene3d");
          const triangles = trianglesFromConnections(FaceTracker.tesselation());
          this.scene = new Scene3D(this.opts.glCanvas, triangles);
          if (this.sourceSize.width) {
            this.scene.resize(this.sourceSize.width, this.sourceSize.height);
          }
        }
        const { widthMm } = await this.scene.loadModel(asset.modelUrl);
        this.scene.setLensTint(this.tint?.color ?? null, this.tint?.opacity);
        this.emit({ modelWidthMm: widthMm, canTint: true, corsBlocked: false });
        return this.useTier("3d");
      } catch (error) {
        console.warn("3D try-on model failed; falling back to 2D", error);
      }
    }

    if (asset.overlayUrl) {
      try {
        const { corsBlocked } = await this.overlay.setImage(asset.overlayUrl);
        this.overlay.setTint(this.tint);
        this.emit({ corsBlocked, canTint: this.overlay.canTint, modelWidthMm: null });
        return this.useTier("2d");
      } catch (error) {
        console.warn("2D try-on image failed", error);
      }
    }

    return this.useTier(null);
  }

  private useTier(tier: TryOnTier | null) {
    this.tier = tier;
    if (tier !== "2d") this.overlay.clear();
    if (tier !== "3d") this.scene?.clear();
    this.emit({ tier });
    this.redraw();
    return tier;
  }

  start() {
    if (this.running || !this.tracker) return;
    this.running = true;
    this.lastVideoTime = -1;
    this.lastFrameAt = 0;
    void this.tracker.setMode("VIDEO").then(() => {
      if (this.running) this.raf = requestAnimationFrame(this.loop);
    });
    if (this.snapshot.status === "paused") this.emit({ status: "ready" });
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  pause() {
    this.stop();
    this.emit({ status: "paused" });
  }

  /** Pixels per millimetre from a card, or null to go back to the iris estimate. */
  setCalibration(pxPerMm: number | null) {
    this.calibration = { ...this.calibration, pxPerMm };
    this.recalibrate();
  }

  /** The customer's own PD in mm, or null to go back to the estimate. */
  setKnownPd(knownPdMm: number | null) {
    this.calibration = { ...this.calibration, knownPdMm };
    this.recalibrate();
  }

  private recalibrate() {
    this.smoothed = null;
    this.stable = null;
    this.lastVerdictAt = 0;
    this.redraw();
  }

  private stabilise(metrics: FaceMetrics): FaceMetrics {
    if (metrics.frontal) {
      const a = 0.35;
      this.stable = this.stable
        ? {
            pxPerMm: this.stable.pxPerMm + (metrics.pxPerMm - this.stable.pxPerMm) * a,
            faceWidthPx:
              this.stable.faceWidthPx + (metrics.faceWidthPx - this.stable.faceWidthPx) * a,
          }
        : { pxPerMm: metrics.pxPerMm, faceWidthPx: metrics.faceWidthPx };
    }
    if (!this.stable) return metrics;
    const { pxPerMm, faceWidthPx } = this.stable;
    return {
      ...metrics,
      pxPerMm,
      faceWidthPx,
      faceWidthMm: faceWidthPx / pxPerMm,
      pdMm: metrics.pdPx / pxPerMm,
    };
  }

  /** A lens colour to preview on the current asset; null for clear. */
  setLensTint(tint: LensTint | null) {
    this.tint = tint?.color ? tint : null;
    this.overlay.setTint(this.tint);
    this.scene?.setLensTint(this.tint?.color ?? null, this.tint?.opacity);
    this.redraw();
  }

  private loop = (now: number) => {
    if (!this.running) return;
    const { video } = this.opts;

    if (video.readyState >= 2 && video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = video.currentTime;
      this.frameCounter += 1;

      if (this.frameCounter % this.trackEvery === 0) {
        const pose = this.tracker!.detectVideo(video, now);
        this.handlePose(pose, now);
      }

      if (this.lastFrameAt) {
        const instant = 1000 / Math.max(1, now - this.lastFrameAt);
        this.fps = this.fps ? this.fps * 0.9 + instant * 0.1 : instant;
      }
      this.lastFrameAt = now;
      this.checkPerformance(now);
    }

    this.raf = requestAnimationFrame(this.loop);
  };

  private handlePose(pose: FacePose | null, now: number) {
    if (!pose) {
      this.lastPose = null;
      this.lastMetrics = null;
      if (this.noFaceSince == null) {
        this.noFaceSince = now;
      } else if (
        now - this.noFaceSince > PERF.noFaceAfterMs &&
        this.snapshot.status !== "no-face"
      ) {
        this.overlay.clear();
        this.scene?.clear();
        this.emit({ status: "no-face", metrics: null });
      }
      return;
    }

    this.noFaceSince = null;
    const measured = measureFace(pose.landmarks, pose.rotation, this.calibration);
    if (!measured) return;
    const metrics = this.stabilise(measured);

    this.lastPose = pose;
    this.lastMetrics = metrics;
    this.draw(pose, metrics);
    if (this.snapshot.status !== "ready") this.emit({ status: "ready" });
    this.updateVerdict(metrics, now);
  }

  private fitSpec(): FrameFitSpec {
    return {
      ...this.opts.frameSpec,
      frameWidthMm: this.asset?.frameWidthMm ?? this.opts.frameSpec.frameWidthMm,
    };
  }

  private draw(pose: FacePose, metrics: FaceMetrics) {
    const spec = this.fitSpec();
    const frameWidthMm = frameFrontWidthMm(spec);
    if (this.tier === "3d" && this.scene) {
      this.scene.render(pose, metrics, {
        frameWidthMm,
        templeLengthMm: spec.templeLength ?? null,
      });
    } else if (this.tier === "2d" && frameWidthMm) {
      this.overlay.draw(metrics, frameWidthMm);
    }
  }

  /** Redraws the last tracked frame  after a calibration or asset change. */
  redraw() {
    if (!this.lastPose) return;
    const measured = measureFace(
      this.lastPose.landmarks,
      this.lastPose.rotation,
      this.calibration,
    );
    if (!measured) return;
    const metrics = this.stabilise(measured);
    this.lastMetrics = metrics;
    this.draw(this.lastPose, metrics);
    if (!this.running) {
      this.emit({
        metrics,
        verdict: metrics.frontal
          ? assessFit(
              this.fitSpec(),
              { faceWidthMm: metrics.faceWidthMm, pdMm: metrics.pdMm },
              metrics.calibrated,
            )
          : null,
      });
    }
  }

  private updateVerdict(metrics: FaceMetrics, now: number) {
    // Only a face that is looking at the camera is worth measuring.
    if (!metrics.frontal) return;

    const a = PERF.smoothing;
    this.smoothed = this.smoothed
      ? {
          faceWidthMm:
            this.smoothed.faceWidthMm + (metrics.faceWidthMm - this.smoothed.faceWidthMm) * a,
          pdMm: this.smoothed.pdMm + (metrics.pdMm - this.smoothed.pdMm) * a,
        }
      : { faceWidthMm: metrics.faceWidthMm, pdMm: metrics.pdMm };

    if (now - this.lastVerdictAt < PERF.verdictIntervalMs) return;
    this.lastVerdictAt = now;

    this.emit({
      metrics: { ...metrics, ...this.smoothed },
      verdict: assessFit(this.fitSpec(), this.smoothed, metrics.calibrated),
      fps: Math.round(this.fps),
    });
  }

  private checkPerformance(now: number) {
    if (this.fps && this.fps < PERF.minFps) {
      if (this.lowFpsSince == null) {
        this.lowFpsSince = now;
      } else if (now - this.lowFpsSince > PERF.degradeAfterMs) {
        this.lowFpsSince = null;
        void this.degrade();
      }
    } else {
      this.lowFpsSince = null;
    }
  }

  private async degrade() {
    if (this.tier === "3d" && this.asset?.overlayUrl) {
      // The only step the customer can see, so the only one that is announced.
      this.emit({ degraded: true });
      await this.setAsset(this.asset, "2d");
    } else if (this.trackEvery < 2) {
      this.trackEvery = 2;
    }
  }

  /** One photo instead of a live feed: the same pipeline, run once. */
  async processStill(
    image: HTMLImageElement | HTMLCanvasElement,
    width: number,
    height: number,
  ): Promise<boolean> {
    if (!this.tracker) return false;
    this.stop();
    this.setSourceSize(width, height);
    await this.tracker.setMode("IMAGE");

    const pose = this.tracker.detectImage(image, width, height);
    const metrics = pose
      ? measureFace(pose.landmarks, pose.rotation, this.calibration)
      : null;

    if (!pose || !metrics) {
      this.lastPose = null;
      this.lastMetrics = null;
      this.overlay.clear();
      this.scene?.clear();
      this.emit({ status: "no-face", metrics: null, verdict: null });
      return false;
    }

    this.lastPose = pose;
    this.lastMetrics = metrics;
    this.draw(pose, metrics);
    this.emit({
      status: "ready",
      metrics,
      verdict: metrics.frontal
        ? assessFit(
            this.fitSpec(),
            { faceWidthMm: metrics.faceWidthMm, pdMm: metrics.pdMm },
            metrics.calibrated,
          )
        : null,
    });
    return true;
  }

  /** The current picture with the frame on it, as one canvas. */
  composeSnapshot(background: CanvasImageSource, mirrored: boolean) {
    const { width, height } = this.sourceSize;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx || !width) return canvas;

    if (mirrored) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(background, 0, 0, width, height);
    ctx.drawImage(
      this.tier === "3d" ? this.opts.glCanvas : this.opts.overlayCanvas,
      0,
      0,
    );
    return canvas;
  }

  dispose() {
    this.stop();
    this.tracker?.close();
    this.tracker = null;
    this.scene?.dispose();
    this.scene = null;
    this.overlay.clear();
  }
}
