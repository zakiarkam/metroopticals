-- Advertisement artwork becomes optional.
--
-- A product-driven placement renders the linked product's own photo, so an ad
-- is publishable with artwork alone, with a product alone, or with both. The
-- column was NOT NULL, which forced an upload onto every campaign.
ALTER TABLE "advertisements" ALTER COLUMN "imageUrl" DROP NOT NULL;

-- The colourway a shopper picked, carried from the product page to the order.
--
-- Empty string rather than NULL on the cart line: the unique index below has to
-- collapse repeat adds of the same colour, and Postgres treats NULLs as
-- distinct, which would let one frame stack up as several identical rows.
ALTER TABLE "cart_items" ADD COLUMN "color" TEXT NOT NULL DEFAULT '';
ALTER TABLE "order_items" ADD COLUMN "color" TEXT;

-- One cart row per colourway: black and tortoise of the same frame are two
-- lines, not one line with a lost choice.
DROP INDEX IF EXISTS "cart_items_userId_productId_key";
CREATE UNIQUE INDEX "cart_items_userId_productId_color_key" ON "cart_items"("userId", "productId", "color");
