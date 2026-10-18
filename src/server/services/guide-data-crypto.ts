import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { requireGuideDataEncryptionKey } from "@/src/config/env";

const ALGORITHM = "aes-256-gcm";

function encryptionKey(): Buffer {
  return createHash("sha256").update(requireGuideDataEncryptionKey()).digest();
}

export function encryptGuideData(plaintext: Buffer): {
  encryptedContent: Buffer;
  encryptionIv: Buffer;
  encryptionTag: Buffer;
} {
  const encryptionIv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), encryptionIv);
  const encryptedContent = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { encryptedContent, encryptionIv, encryptionTag: cipher.getAuthTag() };
}

export function encryptGuideText(plaintext: string): string {
  const encrypted = encryptGuideData(Buffer.from(plaintext, "utf8"));
  return [encrypted.encryptionIv, encrypted.encryptionTag, encrypted.encryptedContent]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function decryptGuideData(
  encryptedContent: Uint8Array<ArrayBufferLike>,
  encryptionIv: Uint8Array<ArrayBufferLike>,
  encryptionTag: Uint8Array<ArrayBufferLike>,
): Buffer {
  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(encryptionIv));
  decipher.setAuthTag(Buffer.from(encryptionTag));
  return Buffer.concat([decipher.update(encryptedContent), decipher.final()]);
}
