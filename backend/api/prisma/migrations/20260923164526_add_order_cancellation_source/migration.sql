-- CreateEnum
CREATE TYPE "OrderCancellationSource" AS ENUM ('CUSTOMER', 'RESTAURANT', 'ADMIN', 'SYSTEM');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cancellationSource" "OrderCancellationSource";
