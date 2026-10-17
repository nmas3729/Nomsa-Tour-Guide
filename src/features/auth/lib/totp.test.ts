import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@/src/server/db/generated/enums";
import { canAccessMfaProtectedSurface } from "./privileged-mfa";
import {
  authenticatorSetupDetails,
  generateTotpSecret,
  verifyTotpCode,
} from "./totp";
import { decryptTotpSecret, encryptTotpSecret } from "./totp-crypto";

beforeEach(() => {
  vi.stubEnv("MFA_ENCRYPTION_KEY", "test-encryption-key-that-is-at-least-32-characters");
});

describe("authenticator TOTP", () => {
  const rfcSecret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

  it("accepts an RFC 6238 six-digit vector", () => {
    expect(verifyTotpCode(rfcSecret, "287082", 59_000)).toBe(1);
  });

  it("accepts the adjacent time step but rejects codes outside the configured window", () => {
    expect(verifyTotpCode(rfcSecret, "287082", 60_000)).toBe(1);
    expect(verifyTotpCode(rfcSecret, "287082", 150_000)).toBeNull();
  });

  it("rejects malformed codes and generates a valid manual setup URI", () => {
    expect(verifyTotpCode(rfcSecret, "28708", 59_000)).toBeNull();
    const secret = generateTotpSecret();
    const setup = authenticatorSetupDetails(secret, "guide@example.com");
    const uri = new URL(setup.uri);

    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(setup.secret).toBe(secret);
    expect(uri.protocol).toBe("otpauth:");
    expect(uri.searchParams.get("secret")).toBe(secret);
    expect(uri.searchParams.get("issuer")).toBe("Nomsa Tour Guides");
  });
});

describe("authenticator seed encryption", () => {
  it("round-trips seeds and rejects tampering", () => {
    const encrypted = encryptTotpSecret("JBSWY3DPEHPK3PXP");
    expect(decryptTotpSecret(encrypted)).toBe("JBSWY3DPEHPK3PXP");

    const [iv, tag, ciphertext] = encrypted.split(".");
    const replacementTag = `${tag[0] === "A" ? "B" : "A"}${tag.slice(1)}`;
    expect(() => decryptTotpSecret(`${iv}.${replacementTag}.${ciphertext}`)).toThrow();
  });
});

describe("privileged account MFA access", () => {
  it.each([UserRole.GUIDE, UserRole.ADMIN, UserRole.SUPER_ADMIN])(
    "requires verification for %s outside enrollment",
    (role) => {
      expect(canAccessMfaProtectedSurface(role, false, false)).toBe(false);
      expect(canAccessMfaProtectedSurface(role, true, false)).toBe(true);
      expect(canAccessMfaProtectedSurface(role, false, true)).toBe(true);
    },
  );

  it("does not require MFA for customers", () => {
    expect(canAccessMfaProtectedSurface(UserRole.CUSTOMER, false, false)).toBe(true);
  });
});
