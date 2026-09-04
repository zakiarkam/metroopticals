-- Lens designs: single vision, bifocal, progressive.
--
-- The shop's price list is a grid. Coatings run across the top (uncoated,
-- multicoat, photogrey, blue cut); down the side the SAME three designs repeat
-- for every one of them - CR SV, CR R/TOP, CR F/TOP, CR PROGR/FREE FORM,
-- CR PROGR/VISION MAX. So a "blue cut progressive" is not a lens type of its
-- own, it is the blue cut lens built as a progressive.
--
-- Modelling it as a second dimension keeps that grid: six coatings and five
-- designs are 6 + 5 rows to maintain, where folding them into one list would
-- have been 30. The shop sells more than one of each kind (round top and flat
-- top; free form and Vision Max), so a design is a named row rather than a
-- fixed enum.
--
-- Every existing price row is moved onto a Single Vision design for its lens,
-- which is what those rows already meant.

-- CreateEnum
CREATE TYPE "LensDesignKind" AS ENUM ('SINGLE_VISION', 'BIFOCAL', 'PROGRESSIVE');

-- CreateTable
CREATE TABLE "lens_designs" (
    "id" SERIAL NOT NULL,
    "lensTypeId" INTEGER NOT NULL,
    "kind" "LensDesignKind" NOT NULL DEFAULT 'SINGLE_VISION',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lens_designs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lens_designs_lensTypeId_name_key" ON "lens_designs"("lensTypeId", "name");
CREATE INDEX "lens_designs_lensTypeId_sortOrder_idx" ON "lens_designs"("lensTypeId", "sortOrder");

ALTER TABLE "lens_designs" ADD CONSTRAINT "lens_designs_lensTypeId_fkey"
  FOREIGN KEY ("lensTypeId") REFERENCES "lens_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Give every lens a Single Vision design, and move its existing prices onto it.
-- ---------------------------------------------------------------------------
INSERT INTO "lens_designs" ("lensTypeId", "kind", "name", "sortOrder", "isActive", "updatedAt")
SELECT "id", 'SINGLE_VISION', 'Single Vision', 0, true, CURRENT_TIMESTAMP
FROM "lens_types";

ALTER TABLE "lens_power_prices" ADD COLUMN "lensDesignId" INTEGER;

UPDATE "lens_power_prices" p
SET "lensDesignId" = d."id"
FROM "lens_designs" d
WHERE d."lensTypeId" = p."lensTypeId" AND d."name" = 'Single Vision';

-- Any row whose lens vanished mid-migration has nothing to belong to.
DELETE FROM "lens_power_prices" WHERE "lensDesignId" IS NULL;

ALTER TABLE "lens_power_prices" ALTER COLUMN "lensDesignId" SET NOT NULL;

CREATE INDEX "lens_power_prices_lensDesignId_sortOrder_idx"
  ON "lens_power_prices"("lensDesignId", "sortOrder");

ALTER TABLE "lens_power_prices" ADD CONSTRAINT "lens_power_prices_lensDesignId_fkey"
  FOREIGN KEY ("lensDesignId") REFERENCES "lens_designs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A price row's lens type follows from its design, so keeping it here as well
-- would be a second copy of the same fact and free to drift out of step.
DROP INDEX IF EXISTS "lens_power_prices_lensTypeId_sortOrder_idx";
ALTER TABLE "lens_power_prices" DROP CONSTRAINT IF EXISTS "lens_power_prices_lensTypeId_fkey";
ALTER TABLE "lens_power_prices" DROP COLUMN "lensTypeId";

-- ---------------------------------------------------------------------------
-- The design a line was sold as.
-- ---------------------------------------------------------------------------
ALTER TABLE "cart_items" ADD COLUMN "lensDesignId" INTEGER;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_lensDesignId_fkey"
  FOREIGN KEY ("lensDesignId") REFERENCES "lens_designs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "order_items" ADD COLUMN "lensDesignId" INTEGER;
ALTER TABLE "order_items" ADD COLUMN "lensDesignName" TEXT;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_lensDesignId_fkey"
  FOREIGN KEY ("lensDesignId") REFERENCES "lens_designs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- `supportsAdd` belonged to the lens type; whether a reading addition is
-- needed is a property of the DESIGN, and `kind` now says so.
ALTER TABLE "lens_types" DROP COLUMN "supportsAdd";
