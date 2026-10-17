import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuideApplicationStatus, UserRole } from "@/src/server/db/generated/enums";
import { getPrismaClient } from "@/src/server/db/prisma";
import {
  authenticateCredentials,
  confirmAuthenticatorSetup,
  validateActivePrincipal,
} from "./authentication";

const mocks = vi.hoisted(() => ({
  decryptTotpSecret: vi.fn(() => "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"),
  encryptTotpSecret: vi.fn(() => "encrypted-secret"),
  verifyPassword: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/src/server/db/prisma", () => ({
  getPrismaClient: vi.fn(),
}));
vi.mock("@/src/features/auth/lib/password", () => ({
  hashPassword: vi.fn(),
  verifyPassword: mocks.verifyPassword,
}));
vi.mock("@/src/features/auth/lib/totp-crypto", () => ({
  decryptTotpSecret: mocks.decryptTotpSecret,
  encryptTotpSecret: mocks.encryptTotpSecret,
}));
vi.mock("@/src/features/auth/lib/tokens", () => ({
  AUTH_TOKEN_EXPIRY: { EMAIL_VERIFICATION: 86_400_000, PASSWORD_RESET: 3_600_000 },
  createAuthEventLogger: vi.fn(),
  createOpaqueToken: vi.fn(),
  hashOpaqueToken: vi.fn(),
}));
vi.mock("./email", () => ({
  sendPasswordResetEmail: vi.fn(),
  sendVerificationEmail: vi.fn(),
  sendWelcomeEmail: vi.fn(),
}));
vi.mock("./guide-application-email", () => ({
  sendGuideApplicationReviewEmail: vi.fn(),
}));

const prismaMock = vi.mocked(getPrismaClient);

function account(role: UserRole, overrides: Record<string, unknown> = {}) {
  return {
    id: "user-id",
    name: "Nomsa User",
    email: "nomsa@example.com",
    role,
    passwordHash: "password-hash",
    emailVerified: true,
    isActive: true,
    deletedAt: null,
    sessionVersion: 2,
    guideProfile:
      role === UserRole.GUIDE
        ? { verificationStatus: GuideApplicationStatus.APPROVED }
        : null,
    totpEnabledAt: null,
    totpSecretEncrypted: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(59_000);
  mocks.verifyPassword.mockResolvedValue(true);
  mocks.findUnique.mockResolvedValue(account(UserRole.ADMIN));
  mocks.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.mockReturnValue({
    user: {
      findUnique: mocks.findUnique,
      updateMany: mocks.updateMany,
    },
  } as never);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("privileged sign-in MFA", () => {
  it("requires and consumes a valid single-use authenticator code", async () => {
    mocks.findUnique.mockResolvedValue(
      account(UserRole.ADMIN, {
        totpEnabledAt: new Date(0),
        totpSecretEncrypted: "encrypted-secret",
      }),
    );

    await expect(authenticateCredentials("nomsa@example.com", "password")).rejects.toThrow(
      "Enter a valid code from your authenticator app.",
    );
    await expect(
      authenticateCredentials("nomsa@example.com", "password", "000000"),
    ).rejects.toThrow("Enter a valid code from your authenticator app.");

    await expect(
      authenticateCredentials("nomsa@example.com", "password", "287082"),
    ).resolves.toMatchObject({ role: UserRole.ADMIN, mfaVerified: true });
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "user-id" }),
        data: { totpLastUsedStep: BigInt(1) },
      }),
    );
  });

  it("rejects replayed authenticator steps", async () => {
    mocks.findUnique.mockResolvedValue(
      account(UserRole.ADMIN, {
        totpEnabledAt: new Date(0),
        totpSecretEncrypted: "encrypted-secret",
      }),
    );
    mocks.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      authenticateCredentials("nomsa@example.com", "password", "287082"),
    ).rejects.toThrow("Enter a valid code from your authenticator app.");
  });

  it("preserves customer login and limits unenrolled privileged accounts to setup", async () => {
    mocks.findUnique.mockResolvedValue(account(UserRole.CUSTOMER));
    await expect(authenticateCredentials("nomsa@example.com", "password")).resolves.toMatchObject({
      role: UserRole.CUSTOMER,
      mfaVerified: false,
    });

    mocks.findUnique.mockResolvedValue(account(UserRole.ADMIN));
    await expect(authenticateCredentials("nomsa@example.com", "password")).resolves.toMatchObject({
      role: UserRole.ADMIN,
      mfaVerified: false,
    });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});

describe("authenticator enrollment", () => {
  it("enables MFA only after code confirmation and invalidates existing sessions", async () => {
    mocks.findUnique.mockResolvedValue({
      totpSecretEncrypted: "encrypted-secret",
      totpEnabledAt: null,
    });

    await confirmAuthenticatorSetup(
      {
        id: "user-id",
        name: "Nomsa User",
        email: "nomsa@example.com",
        role: UserRole.ADMIN,
        sessionVersion: 2,
        mfaVerified: false,
      },
      "287082",
    );

    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "user-id",
          totpEnabledAt: null,
          totpSecretEncrypted: "encrypted-secret",
        }),
        data: expect.objectContaining({
          totpEnabledAt: expect.any(Date),
          totpLastUsedStep: BigInt(1),
          sessionVersion: { increment: 1 },
        }),
      }),
    );
  });
});

describe("active session role validation", () => {
  it("does not carry a customer's MFA flag into a newly privileged role", async () => {
    mocks.findUnique.mockResolvedValue(account(UserRole.ADMIN));

    await expect(
      validateActivePrincipal({
        id: "user-id",
        name: "Nomsa User",
        email: "nomsa@example.com",
        role: UserRole.CUSTOMER,
        sessionVersion: 2,
        mfaVerified: true,
      }),
    ).resolves.toMatchObject({
      role: UserRole.ADMIN,
      mfaVerified: false,
    });
  });
});
