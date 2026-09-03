-- Prescription lenses.
--
-- A frame is a product with a shelf count; the lenses ground for it are not.
-- Their price comes from the power that has to be made up, so they get their
-- own small price list (lens_types -> lens_power_prices, plus lens_tints for
-- the colour surcharges) which the shop maintains from the admin.
--
-- Nothing here changes an existing row. Every new column on cart_items and
-- order_items is nullable or defaulted, so a frame bought bare behaves today
-- exactly as it did yesterday.

-- CreateEnum
CREATE TYPE "PrescriptionSource" AS ENUM ('MANUAL', 'UPLOAD', 'STAFF');

-- CreateTable
CREATE TABLE "lens_types" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "groupLabel" TEXT,
    "requiresPrescription" BOOLEAN NOT NULL DEFAULT true,
    "supportsAdd" BOOLEAN NOT NULL DEFAULT false,
    "basePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lens_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lens_power_prices" (
    "id" SERIAL NOT NULL,
    "lensTypeId" INTEGER NOT NULL,
    "label" TEXT,
    "sphMin" DOUBLE PRECISION NOT NULL,
    "sphMax" DOUBLE PRECISION NOT NULL,
    "cylMin" DOUBLE PRECISION NOT NULL,
    "cylMax" DOUBLE PRECISION NOT NULL,
    "addMin" DOUBLE PRECISION,
    "addMax" DOUBLE PRECISION,
    "price" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lens_power_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lens_tints" (
    "id" SERIAL NOT NULL,
    "lensTypeId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "hex" TEXT,
    "description" TEXT,
    "surcharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lens_tints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'My prescription',
    "version" INTEGER NOT NULL DEFAULT 1,
    "rootId" INTEGER,
    "source" "PrescriptionSource" NOT NULL DEFAULT 'MANUAL',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "imageFile" TEXT,
    "ocrConfidence" DOUBLE PRECISION,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "rightSph" DOUBLE PRECISION,
    "rightCyl" DOUBLE PRECISION,
    "rightAxis" INTEGER,
    "rightAdd" DOUBLE PRECISION,
    "rightPrism" DOUBLE PRECISION,
    "rightBase" TEXT,
    "leftSph" DOUBLE PRECISION,
    "leftCyl" DOUBLE PRECISION,
    "leftAxis" INTEGER,
    "leftAdd" DOUBLE PRECISION,
    "leftPrism" DOUBLE PRECISION,
    "leftBase" TEXT,
    "pdSingle" DOUBLE PRECISION,
    "pdRight" DOUBLE PRECISION,
    "pdLeft" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_extractions" (
    "id" SERIAL NOT NULL,
    "fileHash" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "raw" JSONB NOT NULL,
    "parsed" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prescription_extractions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lens_types_slug_key" ON "lens_types"("slug");
CREATE INDEX "lens_types_isActive_sortOrder_idx" ON "lens_types"("isActive", "sortOrder");
CREATE INDEX "lens_power_prices_lensTypeId_sortOrder_idx" ON "lens_power_prices"("lensTypeId", "sortOrder");
CREATE UNIQUE INDEX "lens_tints_lensTypeId_name_key" ON "lens_tints"("lensTypeId", "name");
CREATE INDEX "lens_tints_lensTypeId_sortOrder_idx" ON "lens_tints"("lensTypeId", "sortOrder");
CREATE INDEX "prescriptions_userId_isArchived_idx" ON "prescriptions"("userId", "isArchived");
CREATE INDEX "prescriptions_rootId_idx" ON "prescriptions"("rootId");
CREATE UNIQUE INDEX "prescription_extractions_fileHash_key" ON "prescription_extractions"("fileHash");

-- AddForeignKey
ALTER TABLE "lens_power_prices" ADD CONSTRAINT "lens_power_prices_lensTypeId_fkey" FOREIGN KEY ("lensTypeId") REFERENCES "lens_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lens_tints" ADD CONSTRAINT "lens_tints_lensTypeId_fkey" FOREIGN KEY ("lensTypeId") REFERENCES "lens_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Cart lines carry the lens choice.
-- ---------------------------------------------------------------------------
ALTER TABLE "cart_items" ADD COLUMN "lensTypeId" INTEGER;
ALTER TABLE "cart_items" ADD COLUMN "lensTintId" INTEGER;
ALTER TABLE "cart_items" ADD COLUMN "prescriptionId" INTEGER;
ALTER TABLE "cart_items" ADD COLUMN "lensPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "cart_items" ADD COLUMN "lensSignature" TEXT NOT NULL DEFAULT '';

-- The line's identity gains the lens choice. Every existing row defaults to
-- an empty signature, so the new index collapses exactly the same rows the
-- old one did; what it additionally allows is a second pair of the same frame
-- and colour made to a different prescription.
DROP INDEX "cart_items_userId_productId_color_key";
CREATE UNIQUE INDEX "cart_items_userId_productId_color_lensSignature_key" ON "cart_items"("userId", "productId", "color", "lensSignature");
CREATE INDEX "cart_items_prescriptionId_idx" ON "cart_items"("prescriptionId");

ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_lensTypeId_fkey" FOREIGN KEY ("lensTypeId") REFERENCES "lens_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_lensTintId_fkey" FOREIGN KEY ("lensTintId") REFERENCES "lens_tints"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Order lines freeze what was sold. Names and money are copied, never joined:
-- the price list is edited and prescriptions gain new versions, and neither
-- may rewrite an invoice already issued.
-- ---------------------------------------------------------------------------
ALTER TABLE "order_items" ADD COLUMN "lensTypeId" INTEGER;
ALTER TABLE "order_items" ADD COLUMN "lensName" TEXT;
ALTER TABLE "order_items" ADD COLUMN "lensTintName" TEXT;
ALTER TABLE "order_items" ADD COLUMN "lensPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "order_items" ADD COLUMN "lensRx" JSONB;
ALTER TABLE "order_items" ADD COLUMN "prescriptionId" INTEGER;

CREATE INDEX "order_items_prescriptionId_idx" ON "order_items"("prescriptionId");

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_lensTypeId_fkey" FOREIGN KEY ("lensTypeId") REFERENCES "lens_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
