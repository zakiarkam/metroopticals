-- Virtual try-on assets.
--
-- What the try-on draws on a customer's face lives apart from the product
-- gallery: `products.images` is the ordered set of photos, and a frame has a
-- try-on asset per colourway, which the bare `frameColors` list cannot hold.
-- One row per product per colour carries the transparent cut-out (2D tier),
-- the real-scale model (3D tier) and the caliper width that scales either.
--
-- `isActive` defaults to false so an asset uploaded mid-session is never seen
-- by a customer until it has been checked; it is also the per-product rollout
-- switch, because a product with no active row shows no Try On button.

-- CreateEnum
CREATE TYPE "TryOnSource" AS ENUM ('TEMPLATE', 'SCAN', 'VENDOR', 'PHOTO');

-- CreateTable
CREATE TABLE "product_tryon_assets" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "colour" TEXT NOT NULL,
    "overlayImage" TEXT,
    "modelGlb" TEXT,
    "frameWidthMm" DOUBLE PRECISION,
    "source" "TryOnSource" NOT NULL DEFAULT 'PHOTO',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_tryon_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_tryon_assets_productId_idx" ON "product_tryon_assets"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_tryon_assets_productId_colour_key" ON "product_tryon_assets"("productId", "colour");

-- AddForeignKey
-- Deleting a product takes its try-on rows with it; the bucket files are
-- removed by the product service, which knows their folders.
ALTER TABLE "product_tryon_assets" ADD CONSTRAINT "product_tryon_assets_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
