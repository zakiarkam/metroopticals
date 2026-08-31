import { getTryOnModelUrl, getTryOnOverlayUrl } from "@/lib/storageUtils";
import type { TryOnAsset, TryOnFrameAsset } from "@/features/try-on/types";

/** Stored rows → what the engine draws, with bucket URLs resolved. */
export const toFrameAsset = (asset: TryOnAsset): TryOnFrameAsset => ({
  colour: asset.colour,
  overlayUrl: getTryOnOverlayUrl(asset.overlayImage),
  modelUrl: getTryOnModelUrl(asset.modelGlb),
  frameWidthMm: asset.frameWidthMm,
  source: asset.source,
});

export const toFrameAssets = (assets: TryOnAsset[]): TryOnFrameAsset[] =>
  assets
    .filter((a) => a.isActive && (a.overlayImage || a.modelGlb))
    .map(toFrameAsset);
