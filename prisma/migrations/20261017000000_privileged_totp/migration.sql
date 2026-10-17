ALTER TABLE "User"
ADD COLUMN "totpSecretEncrypted" TEXT,
ADD COLUMN "totpEnabledAt" TIMESTAMPTZ(3),
ADD COLUMN "totpLastUsedStep" BIGINT;
