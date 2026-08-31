import { IRIS_DIAMETER_MM } from "@/features/try-on/config";

/**
 * Face measurements from tracked landmarks. Pure: takes points in pixels,
 * returns millimetres and a pose. Nothing here touches the DOM.
 */

export type Point3 = { x: number; y: number; z: number };

/** Head pose in radians. Yaw is turn, pitch is nod, roll is tilt. */
export type Rotation = { yaw: number; pitch: number; roll: number };

/**
 * Landmark indices from MediaPipe's 478-point face mesh. The first 468 are
 * the face; 468477 are the two irises, which are what give the scale.
 */
export const LM = {
  rightEyeOuter: 33,
  leftEyeOuter: 263,
  rightIrisCentre: 468,
  rightIrisRing: [469, 470, 471, 472],
  leftIrisCentre: 473,
  leftIrisRing: [474, 475, 476, 477],
  betweenEyes: 168,
  noseTip: 1,
  /** The sides of the face at ear level  where a frame's width has to fit. */
  faceRight: 234,
  faceLeft: 454,
  chin: 152,
  forehead: 10,
} as const;

export const FACE_LANDMARK_COUNT = 468;
export const TOTAL_LANDMARK_COUNT = 478;

export type ScaleSource = "iris" | "card" | "pd";

export type Calibration = {
  /** Pixels per millimetre measured against a card of known width. */
  pxPerMm?: number | null;
  /** The customer's own PD, which fixes the scale exactly for them. */
  knownPdMm?: number | null;
};

export type FaceMetrics = {
  /** Pixels per millimetre at the face  the scale everything is drawn at. */
  pxPerMm: number;
  /** True when the scale came from a card or a known PD, not the iris estimate. */
  calibrated: boolean;
  scaleSource: ScaleSource;
  /** Midpoint between the pupils  where the bridge of a frame sits. */
  anchor: Point3;
  /** Midpoint between the sides of the face. */
  centre: Point3;
  rotation: Rotation;
  /** Roughly facing the camera  the only pose worth measuring in. */
  frontal: boolean;
  irisDiameterPx: number;
  faceWidthPx: number;
  faceWidthMm: number;
  pdPx: number;
  pdMm: number;
};

const dist2 = (a: Point3, b: Point3) => Math.hypot(a.x - b.x, a.y - b.y);
const dist3 = (a: Point3, b: Point3) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const mid = (a: Point3, b: Point3): Point3 => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
  z: (a.z + b.z) / 2,
});
const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/** Mean of the two diameters across the iris ring. */
const irisDiameter = (lm: Point3[], ring: readonly number[]) =>
  (dist2(lm[ring[0]], lm[ring[2]]) + dist2(lm[ring[1]], lm[ring[3]])) / 2;

const FRONTAL_YAW = (20 * Math.PI) / 180;
const FRONTAL_PITCH = (15 * Math.PI) / 180;

/**
 * Pose from the landmarks alone, for when the tracker gives no matrix. Roll
 * comes from the eye line. Yaw comes from how far the nose tip has swung
 * from the centre of the face  the tip sits about a third of a face-width
 * in front, so its sideways travel is that depth times sin(yaw).
 */
export const rotationFromLandmarks = (lm: Point3[]): Rotation => {
  const r = lm[LM.rightEyeOuter];
  const l = lm[LM.leftEyeOuter];
  const roll = Math.atan2(l.y - r.y, l.x - r.x);
  const faceWidth = dist2(lm[LM.faceRight], lm[LM.faceLeft]);
  const centre = mid(lm[LM.faceRight], lm[LM.faceLeft]);
  const swing = (lm[LM.noseTip].x - centre.x) / (0.35 * faceWidth || 1);
  return { yaw: Math.asin(clamp(swing, -1, 1)), pitch: 0, roll };
};

export function measureFace(
  lm: Point3[],
  rotation: Rotation | null,
  calibration: Calibration = {},
): FaceMetrics | null {
  if (lm.length < TOTAL_LANDMARK_COUNT) return null;

  const irisDiameterPx =
    (irisDiameter(lm, LM.rightIrisRing) + irisDiameter(lm, LM.leftIrisRing)) /
    2;
  if (!(irisDiameterPx > 1)) return null;

  const pose = rotation ?? rotationFromLandmarks(lm);

  // Distances are taken in 3D so a slightly turned head does not read as a
  // narrower face; the verdict still waits for a frontal pose.
  const faceWidthPx = dist3(lm[LM.faceRight], lm[LM.faceLeft]);
  const pdPx = dist3(lm[LM.rightIrisCentre], lm[LM.leftIrisCentre]);

  // A PD the customer knows is the best scale there is  it is their own
  // millimetres against their own pixels. A card is next. The iris is the
  // estimate everyone gets without doing anything.
  let pxPerMm = irisDiameterPx / IRIS_DIAMETER_MM;
  let scaleSource: ScaleSource = "iris";
  if (calibration.knownPdMm && pdPx > 1) {
    pxPerMm = pdPx / calibration.knownPdMm;
    scaleSource = "pd";
  } else if (calibration.pxPerMm) {
    pxPerMm = calibration.pxPerMm;
    scaleSource = "card";
  }

  return {
    pxPerMm,
    calibrated: scaleSource !== "iris",
    scaleSource,
    anchor: mid(lm[LM.rightIrisCentre], lm[LM.leftIrisCentre]),
    centre: mid(lm[LM.faceRight], lm[LM.faceLeft]),
    rotation: pose,
    frontal:
      Math.abs(pose.yaw) < FRONTAL_YAW && Math.abs(pose.pitch) < FRONTAL_PITCH,
    irisDiameterPx,
    faceWidthPx,
    faceWidthMm: faceWidthPx / pxPerMm,
    pdPx,
    pdMm: pdPx / pxPerMm,
  };
}
