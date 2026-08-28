-- Indexes for the lists that are read most often.
--
-- "My orders" is a scan of every order in the table filtered down to one
-- account, and the admin status tabs scan the whole table to count six
-- statuses. Stock is read the same way for the low-stock list. Each of these
-- grows slower with every order taken until the column is indexed.
CREATE INDEX "orders_userId_createdAt_idx" ON "orders"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "products_stock_idx" ON "products"("stock");
