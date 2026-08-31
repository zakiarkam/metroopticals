import { prisma } from "@/lib/db/prisma";
import { deleteFile } from "@/lib/storage/r2";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { frameFrontWidthMm } from "@/features/products/utils/eyewear";
import type { UpsertTryOnAssetInput } from "@/features/try-on/validators/asset";

/**
 * The colour as the product spells it. The admin types colours as free text,
 * so "Matte Black" and "matte black" are the same colourway and the asset is
 * stored under the product's own spelling.
 */
const canonicalColour = (frameColors: string[], colour: string) => {
  const wanted = colour.trim().toLowerCase();
  return frameColors.find((c) => c.trim().toLowerCase() === wanted) ?? null;
};

export async function listTryOnAssets(
  productId: number,
  { activeOnly }: { activeOnly: boolean },
) {
  return prisma.productTryOnAsset.findMany({
    where: { productId, ...(activeOnly ? { isActive: true } : {}) },
    orderBy: { colour: "asc" },
  });
}

export async function upsertTryOnAsset(
  productId: number,
  input: UpsertTryOnAssetInput,
) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      frameColors: true,
      lensWidth: true,
      bridgeWidth: true,
      rimType: true,
    },
  });
  if (!product) throw new NotFoundError("Product not found");

  const colour = canonicalColour(product.frameColors, input.colour);
  if (!colour) {
    throw new ValidationError(
      "Colour must be one of the colours listed on the product",
    );
  }

  const existing = await prisma.productTryOnAsset.findUnique({
    where: { productId_colour: { productId, colour } },
  });

  // A field left out of the request keeps its stored value; null clears it.
  const next = {
    overlayImage:
      input.overlayImage === undefined
        ? (existing?.overlayImage ?? null)
        : input.overlayImage,
    modelGlb:
      input.modelGlb === undefined ? (existing?.modelGlb ?? null) : input.modelGlb,
    frameWidthMm:
      input.frameWidthMm === undefined
        ? (existing?.frameWidthMm ?? null)
        : input.frameWidthMm,
    source: input.source ?? existing?.source ?? "PHOTO",
    isActive: input.isActive ?? existing?.isActive ?? false,
  };

  // An active asset is what a customer sees, so it must be drawable: at
  // least one file, and a width to draw it at  the caliper reading, or the
  // catalogue millimetres it can be derived from.
  if (next.isActive) {
    if (!next.overlayImage && !next.modelGlb) {
      throw new ValidationError(
        "Upload a cut-out image or a 3D model before activating this colour",
      );
    }
    if (next.frameWidthMm == null && frameFrontWidthMm(product) == null) {
      throw new ValidationError(
        "Enter the frame width in mm (or the lens and bridge widths on the product) before activating",
      );
    }
  }

  const asset = await prisma.productTryOnAsset.upsert({
    where: { productId_colour: { productId, colour } },
    create: { productId, colour, ...next },
    update: next,
  });

  // A replaced or cleared file is removed from the bucket once the row is
  // safely pointing elsewhere. A failed delete only leaves an orphan behind.
  const orphans: Promise<void>[] = [];
  if (existing?.overlayImage && existing.overlayImage !== next.overlayImage) {
    orphans.push(deleteFile("product/tryon-2d", existing.overlayImage));
  }
  if (existing?.modelGlb && existing.modelGlb !== next.modelGlb) {
    orphans.push(deleteFile("product/tryon-3d", existing.modelGlb));
  }
  await Promise.all(orphans.map((p) => p.catch(() => {})));

  return asset;
}

export async function deleteTryOnAsset(productId: number, colourInput: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { frameColors: true },
  });
  if (!product) throw new NotFoundError("Product not found");

  // The colour may have been removed from the product since the asset was
  // made, so fall back to the raw value rather than refusing to clean up.
  const colour = canonicalColour(product.frameColors, colourInput) ?? colourInput.trim();

  const asset = await prisma.productTryOnAsset.findUnique({
    where: { productId_colour: { productId, colour } },
  });
  if (!asset) throw new NotFoundError("Try-on asset not found");

  await prisma.productTryOnAsset.delete({ where: { id: asset.id } });
  await removeAssetFiles([asset]);
}

/** Called when a product is deleted: the rows cascade, the files do not. */
export async function deleteTryOnFilesForProduct(productId: number) {
  const assets = await prisma.productTryOnAsset.findMany({
    where: { productId },
    select: { overlayImage: true, modelGlb: true },
  });
  await removeAssetFiles(assets);
}

const removeAssetFiles = async (
  assets: { overlayImage: string | null; modelGlb: string | null }[],
) => {
  const deletions: Promise<void>[] = [];
  for (const asset of assets) {
    if (asset.overlayImage)
      deletions.push(deleteFile("product/tryon-2d", asset.overlayImage));
    if (asset.modelGlb)
      deletions.push(deleteFile("product/tryon-3d", asset.modelGlb));
  }
  await Promise.all(deletions.map((p) => p.catch(() => {})));
};
