/**
 * Try-on settings that are tuned rather than derived. Everything a person on
 * a real device might want to nudge lives here, with the reason beside it.
 */

/** Global kill switch  hides every Try On button without a database change. */
export const TRYON_ENABLED = process.env.NEXT_PUBLIC_TRYON_ENABLED !== "false";

/**
 * Try on a photo from the gallery instead of the live camera. Built and
 * working (finds and crops to the face), but hidden for launch at the
 * owner's request  live camera only. Flip to true to offer it again.
 */
export const PHOTO_MODE_ENABLED = false;

// The face-tracking runtime is ~20 MB of WebAssembly plus a 3.7 MB landmark
// model. Locally it is copied under public/ by `npm run tryon:runtime`; in
// production it is published to the bucket once, which charges nothing per
// download, and this points at it.
const runtimeBase = (
  process.env.NEXT_PUBLIC_TRYON_RUNTIME_URL || "/tryon-runtime"
).replace(/\/+$/, "");

export const TRYON_RUNTIME = {
  base: runtimeBase,
  mediapipe: `${runtimeBase}/mediapipe`,
  model: `${runtimeBase}/models/face_landmarker.task`,
  draco: `${runtimeBase}/draco/`,
  basis: `${runtimeBase}/basis/`,
};

/**
 * The human iris is remarkably constant at 11.7 mm across adults (±0.5 mm),
 * which is what turns pixels into millimetres without a reference object.
 * Roughly ±4% on a face width, which is ±5 mm; a card calibration replaces it.
 */
export const IRIS_DIAMETER_MM = 11.7;

/** ISO/IEC 7810 ID-1: every bank and ID card in the world is this wide. */
export const ID1_CARD_WIDTH_MM = 85.6;

/**
 * Fit tolerances in millimetres, frame minus face. A frame a touch wider
 * than the face sits comfortably; one narrower presses at the temples.
 * Starting values  to be tuned with the optician against real customers.
 */
export const FIT = {
  widthGood: { min: -2, max: 4 },
  widthNote: { min: -5, max: 7 },
  /** Optical centre distance minus PD. Lenses should centre on the pupils. */
  opticalGood: { min: 0, max: 6 },
  opticalNote: { min: -3, max: 9 },
  /** A frame this heavy earns a comfort note. */
  heavyGrams: 28,
};

/** Where the frame sits on the face, in millimetres and fractions. */
export const PLACEMENT = {
  /** Frames sit a little below the pupil line. Positive is down. */
  verticalOffsetMm: 1.5,
  /**
   * Vertex distance: lenses sit about 12 mm in front of the cornea. The 3D
   * frame is anchored that far ahead of the pupils so its front clears the
   * brow and cheeks  anchored on the pupils it sat inside the face and the
   * depth occluder clipped the inner halves of the rims.
   */
  forwardOffsetMm: 14,
  /** A flat cut-out foreshortens with head turn; never thinner than this. */
  minYawScale: 0.35,
  /** Temple splay is clamped to keep an odd measurement from looking broken. */
  maxSplayDeg: 8,
};

/**
 * Head occluder: an invisible ellipsoid behind the tracked face mesh so the
 * temple tips disappear behind the ears. Fractions of face width.
 */
export const OCCLUDER = {
  /** Narrower than the head on purpose: the temples rest on the skin and must render outside it. */
  radiusX: 0.42,
  radiusY: 0.62,
  radiusZ: 0.5,
  centreBack: 0.55,
  centreUp: 0.05,
  /** The face mesh is pushed back a touch so it never z-fights the frame where they touch. */
  faceRecessMm: 2,
};

export const PERF = {
  /** Below this the frame visibly lags the head; step down instead. */
  minFps: 12,
  /** How long a low frame rate must persist before stepping down. */
  degradeAfterMs: 5000,
  /** Camera plus WebGL heats a phone; pause after this long untouched. */
  idlePauseMs: 90_000,
  /** How long without a face before the "can't see you" hint appears. */
  noFaceAfterMs: 700,
  /** Verdicts are re-issued no faster than this so the text does not flicker. */
  verdictIntervalMs: 500,
  /** Exponential smoothing on measurements, per frame. */
  smoothing: 0.12,
};

/** One lens look the customer can preview on the frame. */
export type LensTint = {
  id: string;
  label: string;
  /** Key of the LENS_GROUPS entry it belongs to. */
  group: string;
  /** CSS colour; null means clear. */
  color: string | null;
  opacity: number;
  /** Fades to clear towards the bottom of the lens. */
  gradient: boolean;
};

/**
 * The lens types the shop sells, as they appear in the lens guide
 * (src/config/lenses.ts), each linking to its page. Only types with a
 * visible look are listed; bifocal, progressive and the branded ranges all
 * look clear on the face and are covered by "Clear".
 */
export type LensGroup = {
  key: string;
  label: string;
  /** Lens-guide page, /lenses/<slug>. */
  slug: string;
  /** One line under the swatches. */
  note: string;
};

export const LENS_GROUPS: LensGroup[] = [
  { key: "clear", label: "Clear", slug: "uncoated", note: "Uncoated, bifocal, progressive and branded lenses all look like this." },
  { key: "blue-cut", label: "Blue cut", slug: "blue-cut", note: "The strongest blue filtering we stock  a faint warm cast is normal." },
  { key: "blue-filter", label: "Blue filter", slug: "blue-filter", note: "Gentler filtering with a barely-there blue reflection; colours stay true." },
  { key: "photochromic", label: "Photochromic", slug: "photochromic", note: "Clear indoors. Shown fully darkened, as it goes in the sun  six tints." },
  { key: "polarized", label: "Polarized", slug: "polarized", note: "Cuts reflected glare from roads and water  three tints." },
];

export const LENS_TINTS: LensTint[] = [
  { id: "clear", label: "Clear", group: "clear", color: null, opacity: 0, gradient: false },
  { id: "blue-cut", label: "Blue cut", group: "blue-cut", color: "#e9d98a", opacity: 0.16, gradient: false },
  { id: "blue-filter", label: "Blue filter", group: "blue-filter", color: "#9fb4ff", opacity: 0.1, gradient: false },
  { id: "photo-grey", label: "Photochromic grey", group: "photochromic", color: "#3a3d42", opacity: 0.66, gradient: false },
  { id: "photo-green", label: "Photochromic green", group: "photochromic", color: "#3f5a45", opacity: 0.64, gradient: false },
  { id: "photo-blue", label: "Photochromic blue", group: "photochromic", color: "#2f5aa8", opacity: 0.6, gradient: false },
  { id: "photo-yellow", label: "Photochromic yellow", group: "photochromic", color: "#d9b021", opacity: 0.5, gradient: false },
  { id: "photo-purple", label: "Photochromic purple", group: "photochromic", color: "#6b3f9a", opacity: 0.58, gradient: false },
  { id: "photo-pink", label: "Photochromic pink", group: "photochromic", color: "#d0648f", opacity: 0.52, gradient: false },
  { id: "polar-grey", label: "Polarized black / grey", group: "polarized", color: "#1e2023", opacity: 0.8, gradient: false },
  { id: "polar-brown", label: "Polarized brown", group: "polarized", color: "#4a3120", opacity: 0.78, gradient: false },
  { id: "polar-yellow", label: "Polarized yellow", group: "polarized", color: "#d3a521", opacity: 0.58, gradient: false },
];

/** Range a typed-in PD is accepted in, mm. Outside it is a typo, not a person. */
export const PD_RANGE = { min: 50, max: 80, default: 63 };
