-- AlterTable
ALTER TABLE "PaymentTransaction" ADD COLUMN     "refundId" TEXT,
ADD COLUMN     "refundReason" TEXT,
ADD COLUMN     "refundedAmountInPaise" INTEGER;
