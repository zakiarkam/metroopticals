-- The customer book becomes something the shop can market from.
--
-- A phone number given so a bill can be collected is not permission to send
-- offers to it, so consent is a separate, explicit yes that defaults to no.
-- The last-visit date is kept on the row so the book can be read as "who to
-- call" without joining every bill each time.
ALTER TABLE "customers" ADD COLUMN "marketingOptIn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "customers" ADD COLUMN "lastVisitAt" TIMESTAMP(3);

-- Customers already in the book get their last visit from the bills on file.
UPDATE "customers" AS c
SET "lastVisitAt" = latest."at"
FROM (
  SELECT "customerId", MAX("createdAt") AS "at"
  FROM "orders"
  WHERE "customerId" IS NOT NULL AND "status" <> 'CANCELLED'
  GROUP BY "customerId"
) AS latest
WHERE c."id" = latest."customerId";

-- CreateIndex
CREATE INDEX "customers_marketingOptIn_idx" ON "customers"("marketingOptIn");

-- CreateIndex
CREATE INDEX "customers_lastVisitAt_idx" ON "customers"("lastVisitAt");
