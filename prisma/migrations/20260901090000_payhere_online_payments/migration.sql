-- Online card payments through PayHere.
--
-- Two columns, both additive and both defaulted, so every bill written before
-- the gateway existed reads exactly as it did:
--
--   orders.paymentFee         the surcharge for paying by card, kept out of
--                              the subtotal so an invoice can name it rather
--                              than bury it in the goods. Zero for cash, bank
--                              transfer and every counter bill.
--   payments.gatewayPaymentId  PayHere's own id for the charge. Unique
--                              because the gateway retries its notification
--                              until it is acknowledged, and the second
--                              delivery of the same payment must not be able
--                              to write a second row and double the takings.

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "paymentFee" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "gatewayPaymentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payments_gatewayPaymentId_key" ON "payments"("gatewayPaymentId");
