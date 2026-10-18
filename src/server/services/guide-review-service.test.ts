import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GuideApplicationStatus,
  UserRole,
} from "@/src/server/db/generated/enums";
import type { AuthenticatedPrincipal } from "@/src/features/auth/types";
import { getPrismaClient } from "@/src/server/db/prisma";
import { reviewExperience } from "./guide-review-service";

const mocks = vi.hoisted(() => ({ hasMfa: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/src/server/db/prisma", () => ({ getPrismaClient: vi.fn() }));
vi.mock("@/src/features/auth/lib/privileged-mfa", () => ({
  hasVerifiedAuthenticator: mocks.hasMfa,
}));

const prismaMock = vi.mocked(getPrismaClient);
const admin: AuthenticatedPrincipal = {
  id: "admin-user",
  email: "admin@example.com",
  name: "Admin",
  role: UserRole.ADMIN,
  sessionVersion: 1,
  mfaVerified: true,
};

let experienceRecord: Record<string, unknown>;
let experienceUpdate: ReturnType<typeof vi.fn>;

function setup() {
  experienceRecord = {
    id: "experience-id",
    verificationStatus: GuideApplicationStatus.DRAFT,
    title: "Local heritage walk",
    description: "A guided walk exploring the local history, culture, and neighbourhood.",
    durationMinutes: 120,
    meetingPoint: "Visitor centre entrance",
    minGuests: 1,
    maxGuests: 8,
    inclusions: ["Guide"],
    exclusions: ["Transport"],
    cancellationPolicy: "Cancel at least 48 hours before the scheduled experience.",
    price: { gt: vi.fn().mockReturnValue(true) },
    guide: {
      verificationStatus: GuideApplicationStatus.APPROVED,
      user: { isActive: true, deletedAt: null },
    },
  };
  experienceUpdate = vi.fn().mockResolvedValue(undefined);
  const transaction = {
    experience: {
      findUnique: vi.fn().mockImplementation(() => Promise.resolve(experienceRecord)),
      update: experienceUpdate,
    },
    auditLog: { create: vi.fn().mockResolvedValue(undefined) },
  };
  prismaMock.mockReturnValue({
    $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
  } as never);
  mocks.hasMfa.mockReturnValue(true);
}

beforeEach(() => {
  vi.clearAllMocks();
  setup();
});

describe("experience verification review", () => {
  it("does not approve an experience until its guide is approved", async () => {
    experienceRecord.guide = {
      verificationStatus: GuideApplicationStatus.SUBMITTED,
      user: { isActive: true, deletedAt: null },
    };

    await expect(
      reviewExperience(admin, "experience-id", GuideApplicationStatus.APPROVED, ""),
    ).rejects.toMatchObject({
      status: 409,
      message: "Approve the guide account before approving this experience.",
    });
    expect(experienceUpdate).not.toHaveBeenCalled();
  });

  it("publishes a complete draft listing only after an explicit administrator approval", async () => {
    await reviewExperience(admin, "experience-id", GuideApplicationStatus.APPROVED, "");

    expect(experienceUpdate).toHaveBeenCalledWith({
      where: { id: "experience-id" },
      data: { verificationStatus: GuideApplicationStatus.APPROVED, status: "PUBLISHED" },
    });
  });

  it("blocks approved listings when the administrator suspends them", async () => {
    experienceRecord.verificationStatus = GuideApplicationStatus.APPROVED;

    await reviewExperience(admin, "experience-id", GuideApplicationStatus.SUSPENDED, "Review required.");

    expect(experienceUpdate).toHaveBeenCalledWith({
      where: { id: "experience-id" },
      data: { verificationStatus: GuideApplicationStatus.SUSPENDED },
    });
  });
});
