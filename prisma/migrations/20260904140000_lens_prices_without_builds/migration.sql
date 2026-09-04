-- The price list drops the "build" layer: prices hang off the lens itself,
-- and bifocal-or-progressive becomes part of the block a row prices.
--
-- The shop keeps one sheet per lens, seven blocks down the side:
--
--   SPH, CYL, SPH+CYL                      one power, no addition
--   SPH+ADD  · bifocal | progressive       an addition, two ways to make it
--   SPH+CYL+ADD · bifocal | progressive    the same with astigmatism
--
-- `lens_designs` existed so a shop could name and price two bifocals (a round
-- top and a flat top) separately. It does not, so the table was a level of
-- indirection that cost a join, a name to invent and a choice to explain, and
-- earned nothing back. How a pair is made is now one of three values, held on
-- the basket line and frozen onto the invoice.
--
-- Existing rows are CARRIED OVER where the old build says unambiguously which
-- block they belong to. A row that cannot be placed - a sphere row that was
-- sitting on a bifocal build, or one whose build has already gone - is
-- deleted rather than guessed at: a wrong price is worse than a missing one,
-- and the block it belonged to is re-generated in one click.

-- ---------------------------------------------------------------- prices --

-- Prices hang off the lens now, not off one of its builds.
ALTER TABLE "lens_power_prices" ADD COLUMN "lensTypeId" INTEGER;

UPDATE "lens_power_prices" AS p
SET "lensTypeId" = d."lensTypeId"
FROM "lens_designs" AS d
WHERE d."id" = p."lensDesignId";

-- Work the new block out from the old category and the build it hung off.
ALTER TABLE "lens_power_prices" ADD COLUMN "category_new" TEXT;

UPDATE "lens_power_prices" AS p
SET "category_new" = CASE
  WHEN d."kind" = 'SINGLE_VISION' AND p."category"::text IN ('SPH', 'CYL', 'SPH_CYL')
    THEN p."category"::text
  WHEN d."kind" = 'BIFOCAL' AND p."category"::text = 'SPH_ADD'
    THEN 'SPH_ADD_BIFOCAL'
  WHEN d."kind" = 'BIFOCAL' AND p."category"::text = 'SPH_CYL_ADD'
    THEN 'SPH_CYL_ADD_BIFOCAL'
  WHEN d."kind" = 'PROGRESSIVE' AND p."category"::text = 'SPH_ADD'
    THEN 'SPH_ADD_PROGRESSIVE'
  WHEN d."kind" = 'PROGRESSIVE' AND p."category"::text = 'SPH_CYL_ADD'
    THEN 'SPH_CYL_ADD_PROGRESSIVE'
  ELSE NULL
END
FROM "lens_designs" AS d
WHERE d."id" = p."lensDesignId";

DELETE FROM "lens_power_prices"
WHERE "category_new" IS NULL OR "lensTypeId" IS NULL;

-- Swap the enum. Postgres cannot drop a value from one, so the column is
-- moved onto a new type and the old one is thrown away behind it.
CREATE TYPE "LensPowerCategory_new" AS ENUM (
  'SPH',
  'CYL',
  'SPH_CYL',
  'SPH_ADD_BIFOCAL',
  'SPH_ADD_PROGRESSIVE',
  'SPH_CYL_ADD_BIFOCAL',
  'SPH_CYL_ADD_PROGRESSIVE'
);

ALTER TABLE "lens_power_prices" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "lens_power_prices"
  ALTER COLUMN "category" TYPE "LensPowerCategory_new"
  USING "category_new"::"LensPowerCategory_new";
DROP TYPE "LensPowerCategory";
ALTER TYPE "LensPowerCategory_new" RENAME TO "LensPowerCategory";
ALTER TABLE "lens_power_prices" ALTER COLUMN "category" SET DEFAULT 'SPH';
ALTER TABLE "lens_power_prices" DROP COLUMN "category_new";

DROP INDEX IF EXISTS "lens_power_prices_lensDesignId_category_sortOrder_idx";
DROP INDEX IF EXISTS "lens_power_prices_lensDesignId_sortOrder_idx";

ALTER TABLE "lens_power_prices" DROP COLUMN "lensDesignId";
ALTER TABLE "lens_power_prices" ALTER COLUMN "lensTypeId" SET NOT NULL;
ALTER TABLE "lens_power_prices"
  ADD CONSTRAINT "lens_power_prices_lensTypeId_fkey"
  FOREIGN KEY ("lensTypeId") REFERENCES "lens_types"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "lens_power_prices_lensTypeId_category_sortOrder_idx"
  ON "lens_power_prices"("lensTypeId", "category", "sortOrder");

-- --------------------------------------------------- baskets and invoices --

ALTER TABLE "cart_items" ADD COLUMN "lensDesignKind" "LensDesignKind";

UPDATE "cart_items" AS c
SET "lensDesignKind" = d."kind"
FROM "lens_designs" AS d
WHERE d."id" = c."lensDesignId";

ALTER TABLE "cart_items" DROP COLUMN "lensDesignId";

ALTER TABLE "order_items" ADD COLUMN "lensDesignKind" "LensDesignKind";

UPDATE "order_items" AS o
SET "lensDesignKind" = d."kind"
FROM "lens_designs" AS d
WHERE d."id" = o."lensDesignId";

-- An order whose build was already deleted still printed a name on the
-- invoice, and that name says how the pair was made. Read it rather than
-- leave the line unable to say what the customer actually bought.
UPDATE "order_items"
SET "lensDesignKind" = CASE
  WHEN "lensDesignName" ILIKE '%progress%' OR "lensDesignName" ILIKE '%vari%'
    OR "lensDesignName" ILIKE '%free form%' OR "lensDesignName" ILIKE '%freeform%'
    OR "lensDesignName" ILIKE '%pal%'
    THEN 'PROGRESSIVE'::"LensDesignKind"
  WHEN "lensDesignName" ILIKE '%bifocal%' OR "lensDesignName" ILIKE '%top%'
    OR "lensDesignName" ILIKE '%kryptok%' OR "lensDesignName" ILIKE '%executive%'
    THEN 'BIFOCAL'::"LensDesignKind"
  ELSE 'SINGLE_VISION'::"LensDesignKind"
END
WHERE "lensDesignKind" IS NULL AND "lensDesignName" IS NOT NULL;

ALTER TABLE "order_items" DROP COLUMN "lensDesignId";

-- ---------------------------------------------------------------- the table --

DROP TABLE "lens_designs";
