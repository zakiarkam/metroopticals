-- Point of sale: billing at the shop counter.
--
-- A counter bill is an `orders` row with `channel = 'POS'`, not a table of its
-- own. One sales table means stock, the dashboard and the monthly report count
-- shop sales and website sales together, with no second set of queries and no
-- way for the two to disagree about how many frames are left.

-- CreateEnum
CREATE TYPE "OrderChannel" AS ENUM ('ONLINE', 'POS');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'ONLINE');

-- CreateEnum
CREATE TYPE "StockReason" AS ENUM ('SALE', 'ONLINE_ORDER', 'RETURN', 'VOID', 'PURCHASE', 'ADJUSTMENT');

-- The shop's own customer book. A walk-in customer has no login and no cart,
-- only a phone number the cashier types to pull up their details.
-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- One collection against a bill. Rows rather than a single column on the order,
-- because a bill can be settled half in cash and half by card, or as an advance
-- now with the balance paid on collection. A refund is a negative amount.
-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- The history behind `products.stock`: every change and the reason for it, so a
-- count that looks wrong can be traced to the sale, return or correction.
-- CreateTable
CREATE TABLE "stock_movements" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "StockReason" NOT NULL,
    "orderId" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- Shop identifiers. `barcode` is what a scanner reads at the counter: scanning
-- types the digits into the POS search box and an exact match adds the line.
-- AlterTable
ALTER TABLE "products" ADD COLUMN     "sku" TEXT,
ADD COLUMN     "barcode" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "channel" "OrderChannel" NOT NULL DEFAULT 'ONLINE',
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidReason" TEXT,
ADD COLUMN     "customerId" INTEGER,
ADD COLUMN     "createdById" INTEGER;

-- A walk-in customer has no account, so the order need not point at one; the
-- bill still names them through `customerId` and the billing fields. Existing
-- website orders keep their user, and deleting an account now blanks the link
-- instead of deleting the sale, which accounts must keep.
ALTER TABLE "orders" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "billingEmail" DROP NOT NULL;

-- Nothing is shipped from a counter sale, and a walk-in customer gives a phone
-- number at most, so the address columns stop being mandatory. Website
-- checkout still collects and stores all of them.
ALTER TABLE "orders" ALTER COLUMN "billingAddress" DROP NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "billingCity" DROP NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "billingCountry" DROP NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "shippingName" DROP NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "shippingEmail" DROP NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "shippingPhone" DROP NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "shippingAddress" DROP NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "shippingCity" DROP NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "shippingCountry" DROP NOT NULL;
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_userId_fkey";

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "title" TEXT,
ADD COLUMN     "lineDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "returnedQty" INTEGER NOT NULL DEFAULT 0;

-- A counter line can be a service that is not in the catalogue at all (an eye
-- test, a lens fitting, a repair). The product link also had to stop cascading:
-- deleting a frame used to delete every record of having sold it.
ALTER TABLE "order_items" ALTER COLUMN "productId" DROP NOT NULL;
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_productId_fkey";

-- Name the product on every line already recorded, so old bills reprint with
-- the item names even after the catalogue changes.
UPDATE "order_items" AS oi
SET "title" = p."title"
FROM "products" AS p
WHERE oi."productId" = p."id" AND oi."title" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_key" ON "products"("barcode");

-- CreateIndex
CREATE INDEX "orders_channel_createdAt_idx" ON "orders"("channel", "createdAt");

-- CreateIndex
CREATE INDEX "orders_paymentStatus_idx" ON "orders"("paymentStatus");

-- CreateIndex
CREATE INDEX "orders_customerId_idx" ON "orders"("customerId");

-- CreateIndex
CREATE INDEX "orders_createdById_idx" ON "orders"("createdById");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");

-- CreateIndex
CREATE INDEX "stock_movements_productId_createdAt_idx" ON "stock_movements"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_movements_orderId_idx" ON "stock_movements"("orderId");

-- CreateIndex
CREATE INDEX "stock_movements_reason_idx" ON "stock_movements"("reason");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Website orders that have already been paid for or delivered should not show
-- up as unpaid on the new payment columns.
UPDATE "orders"
SET "paymentStatus" = 'PAID', "amountPaid" = "totalAmount"
WHERE "status" = 'DELIVERED';
