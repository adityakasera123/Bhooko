-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORDER_PLACED', 'ORDER_CONFIRMED', 'ORDER_ACCEPTED', 'ORDER_REJECTED', 'ORDER_CANCELLED', 'ORDER_READY', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'REFUND_INITIATED', 'REFUND_COMPLETED', 'REFUND_FAILED', 'RIDER_ASSIGNED', 'RIDER_ACCEPTED', 'ARRIVED_AT_RESTAURANT', 'ORDER_PICKED_UP', 'OUT_FOR_DELIVERY', 'ORDER_DELIVERED', 'DELIVERY_FAILED');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_recipientUserId_idx" ON "Notification"("recipientUserId");

-- CreateIndex
CREATE INDEX "Notification_recipientUserId_isRead_idx" ON "Notification"("recipientUserId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_recipientUserId_createdAt_idx" ON "Notification"("recipientUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
