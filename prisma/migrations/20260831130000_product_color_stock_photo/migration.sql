-- A colourway can now carry its gallery photo, and its count becomes
-- optional.
--
-- "image" names one of products.images — the photo the gallery jumps to when
-- the shopper picks the colour. "stock" loses NOT NULL (and its default): a
-- NULL count means the colour has not been counted and falls back to the
-- product total, so a colour can be given a photo before anyone has counted
-- it. Existing counted rows keep their values.

-- AlterTable
ALTER TABLE "product_color_stocks" ALTER COLUMN "stock" DROP NOT NULL,
ALTER COLUMN "stock" DROP DEFAULT;

-- AlterTable
ALTER TABLE "product_color_stocks" ADD COLUMN "image" TEXT;
