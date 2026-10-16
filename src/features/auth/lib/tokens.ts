import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { AuthTokenType } from "@/src/server/db/generated/enums";

export const AUTH_TOKEN_EXPIRY = {
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
} satisfies Record<AuthTokenType, number>;

export function createOpaqueToken(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString("base64url");
  return {
    rawToken,
    tokenHash: createHash("sha256").update(rawToken).digest("hex"),
  };
}

export function hashOpaqueToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function createAuthEventLogger(event: string, properties: Record<string, unknown> = {}) {
  console.info(JSON.stringify({ event: `auth.${event}`, ...properties }));
}
