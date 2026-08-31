import type { RimType, FrameSizeBucket } from "@/features/products/types/product";

export type TryOnSource = "TEMPLATE" | "SCAN" | "VENDOR" | "PHOTO";

/** One colourway's try-on files, as stored. Filenames only  see storageUtils. */
export type TryOnAsset = {
  id: number;
  productId: number;
  colour: string;
  overlayImage: string | null;
  modelGlb: string | null;
  frameWidthMm: number | null;
  source: TryOnSource;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TryOnAssetInput = {
  colour: string;
  overlayImage?: string | null;
  modelGlb?: string | null;
  frameWidthMm?: number | null;
  source?: TryOnSource;
  isActive?: boolean;
};

/** The two ways a frame can be drawn. 3D needs a model; 2D needs a cut-out. */
export type TryOnTier = "3d" | "2d";

/** What the engine needs for one colourway, with URLs already resolved. */
export type TryOnFrameAsset = {
  colour: string;
  overlayUrl: string | null;
  modelUrl: string | null;
  frameWidthMm: number | null;
  source: TryOnSource;
};

/** The frame measurements the fit engine reads  a subset of the product. */
export type FrameFitSpec = {
  lensWidth?: number | null;
  bridgeWidth?: number | null;
  templeLength?: number | null;
  rimType?: RimType | null;
  weightGrams?: number | null;
  /** Caliper reading across the hinges; wins over the derived width. */
  frameWidthMm?: number | null;
};

export type FitStatus = "good" | "note" | "poor";

export type FitCheck = {
  key: "width" | "optical" | "weight";
  label: string;
  status: FitStatus;
  /** One plain sentence with the millimetres in it. */
  detail: string;
  frameMm?: number;
  faceMm?: number;
};

export type FitVerdict = {
  overall: FitStatus | "unknown";
  headline: string;
  checks: FitCheck[];
  /** The size bucket that would suit this face, for the alternatives link. */
  recommendedSize: FrameSizeBucket | null;
  /** True once the customer has calibrated with a card. */
  calibrated: boolean;
};
