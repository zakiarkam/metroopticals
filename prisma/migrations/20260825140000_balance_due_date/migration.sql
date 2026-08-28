-- When the balance on a counter bill is expected.
--
-- An optical shop takes an advance, orders the lenses, and the customer comes
-- back a week later to settle and collect. Without a date, "part paid" is a
-- state nobody can act on: the shop cannot tell whose money is late, and the bill
-- sits in the outstanding list forever. With one, the counter can sort by who
-- owes what and since when, and the printed bill tells the customer when to
-- come back.
ALTER TABLE "orders" ADD COLUMN "balanceDueDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "orders_balanceDueDate_idx" ON "orders"("balanceDueDate");
