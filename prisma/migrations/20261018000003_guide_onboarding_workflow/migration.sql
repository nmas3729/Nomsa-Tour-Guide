ALTER TABLE "GuideProfile"
  ALTER COLUMN "verificationStatus" SET DEFAULT 'DRAFT';

ALTER TABLE "GuideApplication"
  ALTER COLUMN "status" SET DEFAULT 'DRAFT',
  ADD COLUMN "qualifications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "bankName" TEXT,
  ADD COLUMN "bankAccountHolder" TEXT,
  ADD COLUMN "bankBranchCode" TEXT,
  ADD COLUMN "bankAccountType" TEXT,
  ADD COLUMN "bankAccountNumberEncrypted" TEXT,
  ADD COLUMN "permitsRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "serviceTitle" TEXT,
  ADD COLUMN "serviceDescription" TEXT,
  ADD COLUMN "serviceCategoryId" UUID,
  ADD COLUMN "serviceDestinationId" UUID,
  ADD COLUMN "serviceCancellationPolicy" TEXT,
  ADD COLUMN "proposedExperienceSlug" TEXT UNIQUE,
  ADD COLUMN "serviceDurationMinutes" INTEGER,
  ADD COLUMN "serviceMeetingPoint" TEXT,
  ADD COLUMN "serviceMinGuests" INTEGER,
  ADD COLUMN "serviceMaxGuests" INTEGER,
  ADD COLUMN "serviceInclusions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "serviceExclusions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "servicePrice" DECIMAL(12,2),
  ADD COLUMN "serviceCurrency" CHAR(3);

ALTER TABLE "GuideApplicationDocument"
  ADD COLUMN "encryptedContent" BYTEA,
  ADD COLUMN "encryptionIv" BYTEA,
  ADD COLUMN "encryptionTag" BYTEA;

ALTER TABLE "Experience"
  ADD COLUMN "verificationStatus" "GuideApplicationStatus" NOT NULL DEFAULT 'DRAFT';

ALTER TABLE "Experience"
  ADD COLUMN "minGuests" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX "Experience_verificationStatus_status_deletedAt_idx"
  ON "Experience"("verificationStatus", "status", "deletedAt");
