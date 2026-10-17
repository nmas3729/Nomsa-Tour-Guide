import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { requireMfaEncryptionKey } from "@/src/config/env";

const ALGORITHM = "aes-256-gcm";

function encryptionKey(): Buffer {
  return createHash("sha256").update(requireMfaEncryptionKey()).digest();
}

export function encryptTotpSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptTotpSecret(encryptedSecret: string): string {
  const [encodedIv, encodedTag, encodedCiphertext, ...extra] = encryptedSecret.split(".");
  if (!encodedIv || !encodedTag || !encodedCiphertext || extra.length > 0) {
    throw new Error("Stored authenticator secret is invalid.");
  }

  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(encodedIv, "base64url"));
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
