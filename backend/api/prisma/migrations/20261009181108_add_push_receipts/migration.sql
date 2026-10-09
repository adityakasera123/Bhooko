-- CreateEnum
CREATE TYPE "PushReceiptStatus" AS ENUM ('PENDING', 'OK', 'ERROR');

-- CreateTable
CREATE TABLE "PushReceipt" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "pushDeviceId" TEXT NOT NULL,
    "expoTicketId" TEXT,
    "status" "PushReceiptStatus" NOT NULL DEFAULT 'PENDING',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "ticketCreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receiptCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PushReceipt_status_ticketCreatedAt_idx" ON "PushReceipt"("status", "ticketCreatedAt");

-- CreateIndex
CREATE INDEX "PushReceipt_notificationId_idx" ON "PushReceipt"("notificationId");

-- CreateIndex
CREATE INDEX "PushReceipt_pushDeviceId_idx" ON "PushReceipt"("pushDeviceId");

-- CreateIndex
CREATE INDEX "PushReceipt_expoTicketId_idx" ON "PushReceipt"("expoTicketId");

-- AddForeignKey
ALTER TABLE "PushReceipt" ADD CONSTRAINT "PushReceipt_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushReceipt" ADD CONSTRAINT "PushReceipt_pushDeviceId_fkey" FOREIGN KEY ("pushDeviceId") REFERENCES "PushDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
