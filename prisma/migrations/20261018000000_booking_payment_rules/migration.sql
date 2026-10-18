CREATE TYPE "BookingType" AS ENUM ('INSTANT', 'REQUEST_TO_BOOK');

ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_REFUNDED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'DISPUTED';

ALTER TABLE "Booking"
  ADD COLUMN "baseAmount" DECIMAL(12,2),
  ADD COLUMN "optionalExtrasAmount" DECIMAL(12,2),
  ADD COLUMN "transportAmount" DECIMAL(12,2),
  ADD COLUMN "platformFeeAmount" DECIMAL(12,2),
  ADD COLUMN "taxAmount" DECIMAL(12,2),
  ADD COLUMN "bookingType" "BookingType" NOT NULL DEFAULT 'INSTANT',
  ADD COLUMN "cancellationPolicySnapshot" TEXT,
  ADD COLUMN "serviceCompletedAt" TIMESTAMPTZ(3);

ALTER TABLE "Payment"
  ADD COLUMN "refundedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

UPDATE "Payment"
SET "refundedAmount" = "amount"
WHERE "status" = 'REFUNDED';

ALTER TABLE "Payout"
  ADD COLUMN "grossAmount" DECIMAL(12,2),
  ADD COLUMN "commissionAmount" DECIMAL(12,2),
  ADD COLUMN "commissionRate" DECIMAL(5,4),
  ADD COLUMN "eligibleAt" TIMESTAMPTZ(3);

ALTER TABLE "CustomRequest"
  ADD COLUMN "bookingType" "BookingType" NOT NULL DEFAULT 'REQUEST_TO_BOOK';
