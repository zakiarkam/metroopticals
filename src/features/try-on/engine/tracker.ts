import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { TRYON_RUNTIME } from "@/features/try-on/config";
import { parseFaceMatrix } from "./matrix";
import type { Point3, Rotation } from "./measure";

/**
 * Face tracking, wrapped so nothing else in the app touches MediaPipe.
 * Loaded on demand  the runtime is ~20 MB of WebAssembly  and only ever
 * imported dynamically, so no try-on code reaches the shop bundle.
 */

export type TrackerMode = "VIDEO" | "IMAGE";

export type FacePose = {
  /** 478 landmarks in source pixels; z is on the same scale as x. */
  landmarks: Point3[];
  rotation: Rotation | null;
  /** 3×3 column-major rotation, when the tracker supplied a matrix. */
  rotationMatrix: number[] | null;
  /** The tracker's raw 4×4, untouched, for diagnosis. */
  rawMatrix: number[] | null;
  width: number;
  height: number;
};

const toPose = (
  result: FaceLandmarkerResult,
  width: number,
  height: number,
): FacePose | null => {
  const face = result.faceLandmarks?.[0];
  if (!face?.length) return null;

  const landmarks: Point3[] = face.map((p) => ({
    x: p.x * width,
    y: p.y * height,
    z: p.z * width,
  }));
  const raw = result.facialTransformationMatrixes?.[0]?.data;
  const matrix = parseFaceMatrix(raw);

  return {
    landmarks,
    rotation: matrix?.euler ?? null,
    rotationMatrix: matrix?.rotation ?? null,
    rawMatrix: raw ? Array.from(raw) : null,
    width,
    height,
  };
};

export class FaceTracker {
  private lastTimestamp = 0;

  private constructor(
    private landmarker: FaceLandmarker,
    private mode: TrackerMode,
  ) {}

  static async load(): Promise<FaceTracker> {
    const fileset = await FilesetResolver.forVisionTasks(TRYON_RUNTIME.mediapipe);

    const create = (delegate: "GPU" | "CPU") =>
      FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: TRYON_RUNTIME.model, delegate },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFacialTransformationMatrixes: true,
        outputFaceBlendshapes: false,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

    // The GPU path is several times faster on phones but is refused by some
    // drivers; the CPU path is the one that always works.
    let landmarker: FaceLandmarker;
    try {
      landmarker = await create("GPU");
    } catch {
      landmarker = await create("CPU");
    }

    return new FaceTracker(landmarker, "VIDEO");
  }

  /** The mesh edges, from which the occluder's triangles are derived. */
  static tesselation() {
    return FaceLandmarker.FACE_LANDMARKS_TESSELATION;
  }

  async setMode(mode: TrackerMode) {
    if (mode === this.mode) return;
    await this.landmarker.setOptions({ runningMode: mode });
    this.mode = mode;
  }

  detectVideo(video: HTMLVideoElement, now: number): FacePose | null {
    // The video API insists on strictly increasing timestamps.
    const timestamp = Math.max(now, this.lastTimestamp + 1);
    this.lastTimestamp = timestamp;
    const result = this.landmarker.detectForVideo(video, timestamp);
    return toPose(result, video.videoWidth, video.videoHeight);
  }

  detectImage(
    image: HTMLImageElement | HTMLCanvasElement,
    width: number,
    height: number,
  ): FacePose | null {
    return toPose(this.landmarker.detect(image), width, height);
  }

  close() {
    this.landmarker.close();
  }
}
