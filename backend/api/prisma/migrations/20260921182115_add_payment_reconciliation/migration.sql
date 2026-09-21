-- CreateEnum
CREATE TYPE "ReconciliationMode" AS ENUM ('SCHEDULED', 'TARGETED');

-- CreateEnum
CREATE TYPE "ReconciliationRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReconciliationEntityType" AS ENUM ('PAYMENT', 'REFUND');

-- CreateEnum
CREATE TYPE "ReconciliationResultStatus" AS ENUM ('MATCHED', 'MISMATCH', 'AUTO_RESOLVED', 'REVIEW_REQUIRED', 'ERROR');

-- CreateEnum
CREATE TYPE "ReconciliationMismatchType" AS ENUM ('NONE', 'STATUS_MISMATCH', 'AMOUNT_MISMATCH', 'CURRENCY_MISMATCH', 'MISSING_EXTERNAL_REFERENCE', 'EXTERNAL_RECORD_MISSING', 'LOCAL_RECORD_MISSING', 'REFUND_STATUS_MISMATCH', 'REFUND_AMOUNT_MISMATCH', 'DUPLICATE_CONFLICT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ReconciliationAction" AS ENUM ('NONE', 'AUTO_RESOLVE', 'FLAG_REVIEW');

-- CreateTable
CREATE TABLE "ReconciliationRun" (
    "id" TEXT NOT NULL,
    "mode" "ReconciliationMode" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" "ReconciliationRunStatus" NOT NULL,
    "windowStart" TIMESTAMP(3),
    "windowEnd" TIMESTAMP(3),
    "totalChecked" INTEGER NOT NULL DEFAULT 0,
    "matchedCount" INTEGER NOT NULL DEFAULT 0,
    "mismatchCount" INTEGER NOT NULL DEFAULT 0,
    "autoResolvedCount" INTEGER NOT NULL DEFAULT 0,
    "reviewRequiredCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReconciliationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationRecord" (
    "id" TEXT NOT NULL,
    "reconciliationRunId" TEXT NOT NULL,
    "paymentTransactionId" TEXT,
    "refundId" TEXT,
    "entityType" "ReconciliationEntityType" NOT NULL,
    "entityExternalId" TEXT NOT NULL,
    "mismatchType" "ReconciliationMismatchType" NOT NULL,
    "localState" TEXT,
    "externalState" TEXT,
    "localAmountInPaise" INTEGER,
    "externalAmountInPaise" INTEGER,
    "localCurrency" TEXT,
    "externalCurrency" TEXT,
    "action" "ReconciliationAction" NOT NULL,
    "resolutionStatus" "ReconciliationResultStatus" NOT NULL,
    "oldLocalState" TEXT,
    "newLocalState" TEXT,
    "resolutionRule" TEXT,
    "resolutionReason" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ReconciliationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReconciliationRun_status_idx" ON "ReconciliationRun"("status");

-- CreateIndex
CREATE INDEX "ReconciliationRun_mode_idx" ON "ReconciliationRun"("mode");

-- CreateIndex
CREATE INDEX "ReconciliationRun_startedAt_idx" ON "ReconciliationRun"("startedAt");

-- CreateIndex
CREATE INDEX "ReconciliationRun_windowStart_windowEnd_idx" ON "ReconciliationRun"("windowStart", "windowEnd");

-- CreateIndex
CREATE INDEX "ReconciliationRecord_paymentTransactionId_idx" ON "ReconciliationRecord"("paymentTransactionId");

-- CreateIndex
CREATE INDEX "ReconciliationRecord_refundId_idx" ON "ReconciliationRecord"("refundId");

-- CreateIndex
CREATE INDEX "ReconciliationRecord_entityType_entityExternalId_idx" ON "ReconciliationRecord"("entityType", "entityExternalId");

-- CreateIndex
CREATE INDEX "ReconciliationRecord_resolutionStatus_idx" ON "ReconciliationRecord"("resolutionStatus");

-- CreateIndex
CREATE INDEX "ReconciliationRecord_mismatchType_idx" ON "ReconciliationRecord"("mismatchType");

-- CreateIndex
CREATE INDEX "ReconciliationRecord_createdAt_idx" ON "ReconciliationRecord"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReconciliationRecord_reconciliationRunId_entityType_entityE_key" ON "ReconciliationRecord"("reconciliationRunId", "entityType", "entityExternalId");

-- AddForeignKey
ALTER TABLE "ReconciliationRecord" ADD CONSTRAINT "ReconciliationRecord_reconciliationRunId_fkey" FOREIGN KEY ("reconciliationRunId") REFERENCES "ReconciliationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationRecord" ADD CONSTRAINT "ReconciliationRecord_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "PaymentTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationRecord" ADD CONSTRAINT "ReconciliationRecord_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE SET NULL ON UPDATE CASCADE;
