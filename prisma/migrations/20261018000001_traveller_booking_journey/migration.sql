ALTER TABLE "Booking"
  ADD COLUMN "agreedTermsSnapshot" JSONB,
  ADD COLUMN "customRequestId" UUID;

ALTER TABLE "CustomRequest"
  ADD COLUMN "idempotencyKeyHash" TEXT,
  ADD COLUMN "requestHash" TEXT,
  ADD COLUMN "offeredExperienceId" UUID,
  ADD COLUMN "offeredDate" DATE,
  ADD COLUMN "offeredTimeSlot" TEXT,
  ADD COLUMN "offeredTravellerCount" INTEGER,
  ADD COLUMN "offerSnapshot" JSONB,
  ADD COLUMN "offerVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "offeredAt" TIMESTAMPTZ(3),
  ADD COLUMN "acceptedAt" TIMESTAMPTZ(3);

CREATE UNIQUE INDEX "Booking_customRequestId_key"
  ON "Booking"("customRequestId");

CREATE UNIQUE INDEX "CustomRequest_idempotencyKeyHash_key"
  ON "CustomRequest"("idempotencyKeyHash");

CREATE INDEX "CustomRequest_offeredExperienceId_status_idx"
  ON "CustomRequest"("offeredExperienceId", "status");

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_customRequestId_fkey"
  FOREIGN KEY ("customRequestId") REFERENCES "CustomRequest"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CustomRequest"
  ADD CONSTRAINT "CustomRequest_offeredExperienceId_fkey"
  FOREIGN KEY ("offeredExperienceId") REFERENCES "Experience"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
