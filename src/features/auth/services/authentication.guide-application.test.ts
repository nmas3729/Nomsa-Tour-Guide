import { beforeEach, describe, expect, it, vi } from "vitest";
import { GuideApplicationStatus } from "@/src/server/db/generated/enums";
import { getPrismaClient } from "@/src/server/db/prisma";
import { sendGuideApplicationReviewEmail } from "./guide-application-email";
import { sendVerificationEmail } from "./email";
import { registerAccount } from "./authentication";

const mocks = vi.hoisted(() => ({
  createUser: vi.fn(),
  deleteTokens: vi.fn(),
  createToken: vi.fn(),
  createOpaqueToken: vi.fn(),
  hashPassword: vi.fn(),
  sendGuideApplicationReviewEmail: vi.fn(),
  sendVerificationEmail: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/src/server/db/prisma", () => ({
  getPrismaClient: vi.fn(),
}));
vi.mock("@/src/features/auth/lib/password", () => ({
  hashPassword: mocks.hashPassword,
  verifyPassword: vi.fn(),
}));
vi.mock("@/src/features/auth/lib/tokens", () => ({
  AUTH_TOKEN_EXPIRY: { EMAIL_VERIFICATION: 86_400_000, PASSWORD_RESET: 3_600_000 },
  createAuthEventLogger: vi.fn(),
  createOpaqueToken: mocks.createOpaqueToken,
  hashOpaqueToken: vi.fn(),
}));
vi.mock("./email", () => ({
  sendPasswordResetEmail: vi.fn(),
  sendVerificationEmail: mocks.sendVerificationEmail,
  sendWelcomeEmail: vi.fn(),
}));
vi.mock("./guide-application-email", () => ({
  sendGuideApplicationReviewEmail: mocks.sendGuideApplicationReviewEmail,
}));

const prismaMock = vi.mocked(getPrismaClient);
const guideEmailMock = vi.mocked(sendGuideApplicationReviewEmail);
const verificationEmailMock = vi.mocked(sendVerificationEmail);

const guideRegistration = {
  role: "GUIDE" as const,
  name: "Nomsa Applicant",
  email: "nomsa@example.com",
  password: "SecurePass123!",
  confirmPassword: "SecurePass123!",
  phone: "+27 66 123 4567",
  biography: "I have guided visitors through my home region for many years.",
  yearsExperience: 8,
  emergencyContactName: "Emergency Person",
  emergencyContactPhone: "+27 82 123 4567",
  businessName: "Local Journeys",
  businessRegistration: "REG-123",
  specialties: "Heritage, food",
  languages: "English, isiXhosa",
  operatingAreas: "Cape Town",
};

let createdUserData: Record<string, unknown>;

beforeEach(() => {
  vi.clearAllMocks();
  createdUserData = {};
  mocks.hashPassword.mockResolvedValue("password-hash");
  mocks.createOpaqueToken.mockReturnValue({
    rawToken: "verification-token",
    tokenHash: "verification-hash",
  });
  mocks.sendGuideApplicationReviewEmail.mockResolvedValue(undefined);
  mocks.sendVerificationEmail.mockResolvedValue(undefined);

  const transaction = {
    user: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        createdUserData = data;
        return { id: "user-id" };
      }),
    },
  };
  const client = {
    $transaction: vi.fn(async (callback: unknown) => {
      if (typeof callback === "function") {
        return callback(transaction);
      }
      return Promise.all(callback as Promise<unknown>[]);
    }),
    authToken: {
      deleteMany: vi.fn(async () => undefined),
      create: vi.fn(async () => undefined),
    },
  };
  prismaMock.mockReturnValue(client as never);
});

describe("guide application registration", () => {
  it("persists a private draft and waits for onboarding submission before notifying reviewers", async () => {
    const result = await registerAccount(guideRegistration);

    expect(result).toMatchObject({
      success: true,
      message: expect.stringContaining("manual review"),
    });
    expect(guideEmailMock).not.toHaveBeenCalled();
    expect(verificationEmailMock).toHaveBeenCalledWith(
      guideRegistration.name,
      guideRegistration.email,
      "verification-token",
    );
    expect(createdUserData).toMatchObject({
      isActive: false,
      guideProfile: {
        create: { verificationStatus: GuideApplicationStatus.DRAFT },
      },
      guideApplications: {
        create: { status: GuideApplicationStatus.DRAFT },
      },
    });
  });

  it("does not notify the review inbox when only saving a draft", async () => {
    const result = await registerAccount(guideRegistration);

    expect(result).toMatchObject({
      success: true,
      message: expect.stringContaining("private draft"),
    });
    expect(guideEmailMock).not.toHaveBeenCalled();
    expect(createdUserData).toMatchObject({
      guideApplications: {
        create: { status: GuideApplicationStatus.DRAFT },
      },
    });
  });
});
