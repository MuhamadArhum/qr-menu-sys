-- DropIndex
DROP INDEX "qr_codes_tableId_key";

-- CreateIndex
CREATE INDEX "qr_codes_tableId_idx" ON "qr_codes"("tableId");
