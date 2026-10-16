import "server-only";

import { createHmac } from "node:crypto";
import { requireAuthEnvironment } from "@/src/config/env";
import { getPrismaClient } from "@/src/server/db/prisma";

export class RateLimitExceededError extends Error {
  constructor() {
    super("Too many attempts. Please wait a while and try again.");
    this.name = "RateLimitExceededError";
  }
}

export async function enforceAuthRateLimit({
  action,
  identifier,
  clientAddress,
  limit,
  windowMs,
}: {
  action: string;
  identifier: string;
  clientAddress: string;
  limit: number;
  windowMs: number;
}): Promise<void> {
  const { AUTH_TOKEN_SECRET } = requireAuthEnvironment();
  const key = createHmac("sha256", AUTH_TOKEN_SECRET)
    .update(`${action}:${identifier.toLowerCase()}:${clientAddress}`)
    .digest("hex");
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);
  const prisma = getPrismaClient();
  const buckets = await prisma.$queryRaw<Array<{ attempts: number }>>`
    INSERT INTO "AuthRateLimit" ("key", "attempts", "windowStartedAt", "createdAt", "updatedAt")
    VALUES (${key}, 1, ${now}, ${now}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE
        WHEN "AuthRateLimit"."windowStartedAt" <= ${windowStart} THEN 1
        ELSE "AuthRateLimit"."attempts" + 1
      END,
      "windowStartedAt" = CASE
        WHEN "AuthRateLimit"."windowStartedAt" <= ${windowStart} THEN ${now}
        ELSE "AuthRateLimit"."windowStartedAt"
      END,
      "updatedAt" = ${now}
    RETURNING "attempts"
  `;

  if ((buckets[0]?.attempts ?? limit + 1) > limit) {
    throw new RateLimitExceededError();
  }

  if (Math.random() < 0.01) {
    await prisma.authRateLimit.deleteMany({
      where: { windowStartedAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
    });
  }
}

export async function enforceAuthRateLimits({
  action,
  identifier,
  clientAddress,
  limit,
  addressLimit,
  windowMs,
}: {
  action: string;
  identifier: string;
  clientAddress: string;
  limit: number;
  addressLimit: number;
  windowMs: number;
}): Promise<void> {
  await enforceAuthRateLimit({
    action: `${action}:address`,
    identifier: "all",
    clientAddress,
    limit: addressLimit,
    windowMs,
  });
  await enforceAuthRateLimit({
    action: `${action}:identity`,
    identifier,
    clientAddress,
    limit,
    windowMs,
  });
}
