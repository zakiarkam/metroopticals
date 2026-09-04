-- Per-colour stock counts.
--
-- `products.stock` stays the authoritative total - the POS, the reports and
-- the stock ledger all read it - and these rows split that total per colour
-- so the storefront can grey out a sold-out colourway and cap the quantity a
-- shopper can order of it. A product with no rows behaves as before: every
-- colour is treated as available while the total is above zero, so nothing
-- changes for existing products until their colours are given counts.

-- CreateTable
CREATE TABLE "product_color_stocks" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_color_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_color_stocks_productId_idx" ON "product_color_stocks"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_color_stocks_productId_color_key" ON "product_color_stocks"("productId", "color");

-- AddForeignKey
ALTER TABLE "product_color_stocks" ADD CONSTRAINT "product_color_stocks_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
