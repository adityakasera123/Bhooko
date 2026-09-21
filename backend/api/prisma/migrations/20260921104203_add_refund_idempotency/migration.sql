/*
  Warnings:

  - A unique constraint covering the columns `[paymentTransactionId,idempotencyKey]` on the table `Refund` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `idempotencyKey` to the `Refund` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Refund" ADD COLUMN     "idempotencyKey" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Refund_paymentTransactionId_idempotencyKey_key" ON "Refund"("paymentTransactionId", "idempotencyKey");
