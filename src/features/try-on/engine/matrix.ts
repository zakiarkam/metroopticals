import type { Rotation } from "./measure";

/**
 * The tracker's face transformation matrix, read into something the scene
 * can use. MediaPipe's metric space is right-handed with X right, Y up and
 * Z towards the camera  the same handedness as the render scene, so the
 * rotation applies directly.
 */

export type FacePoseMatrix = {
  /** 3×3 rotation, column-major, columns normalised. */
  rotation: number[];
  euler: Rotation;
  /** Position of the face in the tracker's metric space (centimetres). */
  translation: [number, number, number];
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

export function parseFaceMatrix(data: number[] | undefined): FacePoseMatrix | null {
  if (!data || data.length !== 16) return null;

  // The array is documented only as "flattened". Translation is tens of
  // centimetres while the bottom row of an affine matrix is 0 0 0 1, so
  // whichever slot holds the larger magnitude tells the layout apart.
  const columnMajor = Math.abs(data[14]) > Math.abs(data[11]);
  const te = columnMajor
    ? data
    : [
        data[0], data[4], data[8], data[12],
        data[1], data[5], data[9], data[13],
        data[2], data[6], data[10], data[14],
        data[3], data[7], data[11], data[15],
      ];

  const rotation: number[] = [];
  for (let c = 0; c < 3; c += 1) {
    const x = te[c * 4];
    const y = te[c * 4 + 1];
    const z = te[c * 4 + 2];
    const len = Math.hypot(x, y, z) || 1;
    rotation.push(x / len, y / len, z / len);
  }

  // YXZ decomposition, as three.js orders it: yaw about Y, then pitch, then roll.
  const m13 = rotation[6];
  const m23 = rotation[7];
  const m33 = rotation[8];
  const m21 = rotation[1];
  const m22 = rotation[4];
  const m31 = rotation[2];
  const m11 = rotation[0];

  const pitch = Math.asin(-clamp(m23, -1, 1));
  const gimbal = Math.abs(m23) >= 0.9999999;
  const yaw = gimbal ? Math.atan2(-m31, m11) : Math.atan2(m13, m33);
  const roll = gimbal ? 0 : Math.atan2(m21, m22);

  return {
    rotation,
    euler: { yaw, pitch, roll },
    translation: [te[12], te[13], te[14]],
  };
}
