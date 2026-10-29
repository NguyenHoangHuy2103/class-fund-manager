-- Migration GĐ2: Thêm snapshot ngân hàng và trường idempotencyKey cho PaymentProof và Payment

-- 1. AlterTable: PaymentProof
ALTER TABLE "PaymentProof" ADD COLUMN IF NOT EXISTS "bankSnapshot" JSONB;
ALTER TABLE "PaymentProof" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
ALTER TABLE "PaymentProof" ADD COLUMN IF NOT EXISTS "requestHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentProof_idempotencyKey_key" ON "PaymentProof"("idempotencyKey");

-- 2. AlterTable: Payment
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "requestHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
