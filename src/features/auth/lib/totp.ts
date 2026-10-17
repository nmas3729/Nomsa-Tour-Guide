import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1;
const TOTP_ISSUER = "Nomsa Tour Guides";

export function generateTotpSecret(): string {
  const bytes = randomBytes(20);
  let bits = 0;
  let value = 0;
  let encoded = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      encoded += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    encoded += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return encoded;
}

function decodeBase32(secret: string): Buffer {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const character of secret.toUpperCase().replace(/=+$/, "")) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index < 0) {
      throw new Error("Authenticator secret is invalid.");
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function codeAtStep(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac("sha1", decodeBase32(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

export function verifyTotpCode(
  secret: string,
  code: string,
  now = Date.now(),
): number | null {
  if (!/^\d{6}$/.test(code)) {
    return null;
  }
  const currentStep = Math.floor(now / 1000 / TOTP_STEP_SECONDS);
  const suppliedCode = Buffer.from(code);

  for (let offset = -TOTP_WINDOW; offset <= TOTP_WINDOW; offset += 1) {
    const step = currentStep + offset;
    if (step < 0) {
      continue;
    }
    const expectedCode = Buffer.from(codeAtStep(secret, step));
    if (timingSafeEqual(suppliedCode, expectedCode)) {
      return step;
    }
  }
  return null;
}

export function authenticatorSetupDetails(secret: string, email: string) {
  const label = `${TOTP_ISSUER}:${email}`;
  const uri = new URL(`otpauth://totp/${encodeURIComponent(label)}`);
  uri.searchParams.set("secret", secret);
  uri.searchParams.set("issuer", TOTP_ISSUER);
  uri.searchParams.set("algorithm", "SHA1");
  uri.searchParams.set("digits", String(TOTP_DIGITS));
  uri.searchParams.set("period", String(TOTP_STEP_SECONDS));
  return { secret, uri: uri.toString() };
}
