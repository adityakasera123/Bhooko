-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('CREATED', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'CREATED',
    "restaurantName" TEXT NOT NULL,
    "deliveryAddressLabel" TEXT NOT NULL,
    "deliveryContactName" TEXT NOT NULL,
    "deliveryContactPhone" TEXT NOT NULL,
    "deliveryAddressLine1" TEXT NOT NULL,
    "deliveryAddressLine2" TEXT,
    "deliveryAddressArea" TEXT NOT NULL,
    "deliveryAddressCity" TEXT NOT NULL,
    "deliveryAddressState" TEXT NOT NULL,
    "deliveryAddressPincode" TEXT NOT NULL,
    "deliveryLatitude" DOUBLE PRECISION NOT NULL,
    "deliveryLongitude" DOUBLE PRECISION NOT NULL,
    "deliveryInstructions" TEXT,
    "itemSubtotalInPaise" INTEGER NOT NULL,
    "deliveryFeeInPaise" INTEGER NOT NULL DEFAULT 0,
    "platformFeeInPaise" INTEGER NOT NULL DEFAULT 0,
    "taxInPaise" INTEGER NOT NULL DEFAULT 0,
    "discountInPaise" INTEGER NOT NULL DEFAULT 0,
    "totalInPaise" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "foodItemId" TEXT,
    "foodItemName" TEXT NOT NULL,
    "unitPriceInPaise" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "itemSubtotalInPaise" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_restaurantId_idx" ON "Order"("restaurantId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_foodItemId_idx" ON "OrderItem"("foodItemId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_foodItemId_fkey" FOREIGN KEY ("foodItemId") REFERENCES "FoodItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
