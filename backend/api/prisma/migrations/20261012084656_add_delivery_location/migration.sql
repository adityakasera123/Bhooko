-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "riderLatitude" DOUBLE PRECISION,
ADD COLUMN     "riderLocationAccuracyMeters" DOUBLE PRECISION,
ADD COLUMN     "riderLocationReceivedAt" TIMESTAMP(3),
ADD COLUMN     "riderLocationRecordedAt" TIMESTAMP(3),
ADD COLUMN     "riderLongitude" DOUBLE PRECISION;
