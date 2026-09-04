-- Price rows carry the SHAPE of prescription they price, and whether the
-- power is one the shop has to order in.
--
-- A printed price sheet is organised by shape and takes it for granted: the
-- SPH block, the CYL block, the TORIC block, then the same again with a
-- reading addition. Software cannot take it for granted. Without a shape a
-- toric row whose cylinder range happens to span zero will quote a plain
-- -2.00 sphere at the toric price, which is money the customer did not owe.
--
-- Existing rows are classified from the ranges they already hold, which is
-- exactly what they already meant:
--   * a row with an addition range   -> an ADD category
--   * a row whose cylinder spans 0   -> no cylinder priced into it
--   * a row whose sphere is exactly 0 -> cylinder only
-- Nothing is repriced and no row is dropped.

-- CreateEnum
CREATE TYPE "LensPowerCategory" AS ENUM ('SPH', 'CYL', 'SPH_CYL', 'SPH_ADD', 'SPH_CYL_ADD');

-- AlterTable: lens price rows
ALTER TABLE "lens_power_prices"
  ADD COLUMN "category" "LensPowerCategory" NOT NULL DEFAULT 'SPH',
  ADD COLUMN "isOrderLens" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "leadTimeDays" INTEGER;

-- Backfill the shape of every row already on the price list.
UPDATE "lens_power_prices"
SET "category" = CASE
  -- Rows that price a reading addition.
  WHEN "addMin" IS NOT NULL OR "addMax" IS NOT NULL THEN
    CASE
      -- A cylinder range that includes zero covers a sphere-only eye, so it
      -- is the sphere+add row; one that excludes zero is the toric+add row.
      WHEN "cylMin" <= 0 AND "cylMax" >= 0 THEN 'SPH_ADD'::"LensPowerCategory"
      ELSE 'SPH_CYL_ADD'::"LensPowerCategory"
    END
  -- Rows with no addition: sphere only, cylinder only, or both.
  WHEN "cylMin" <= 0 AND "cylMax" >= 0 THEN 'SPH'::"LensPowerCategory"
  WHEN "sphMin" = 0 AND "sphMax" = 0 THEN 'CYL'::"LensPowerCategory"
  ELSE 'SPH_CYL'::"LensPowerCategory"
END;

-- A sphere-only row prices no cylinder, and a cylinder-only row no sphere.
-- Making that true in the data as well as in the category keeps the matcher's
-- range check honest for rows written before the category existed.
UPDATE "lens_power_prices"
SET "cylMin" = 0, "cylMax" = 0
WHERE "category" IN ('SPH', 'SPH_ADD') AND ("cylMin" <> 0 OR "cylMax" <> 0);

UPDATE "lens_power_prices"
SET "sphMin" = 0, "sphMax" = 0
WHERE "category" = 'CYL' AND ("sphMin" <> 0 OR "sphMax" <> 0);

-- Index: rows are now looked up one category at a time.
DROP INDEX IF EXISTS "lens_power_prices_lensDesignId_sortOrder_idx";
CREATE INDEX "lens_power_prices_lensDesignId_category_sortOrder_idx"
  ON "lens_power_prices"("lensDesignId", "category", "sortOrder");

-- AlterTable: the basket and the invoice both remember an order lens.
ALTER TABLE "cart_items"
  ADD COLUMN "lensIsOrderLens" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lensLeadTimeDays" INTEGER;

ALTER TABLE "order_items"
  ADD COLUMN "lensIsOrderLens" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lensLeadTimeDays" INTEGER;
