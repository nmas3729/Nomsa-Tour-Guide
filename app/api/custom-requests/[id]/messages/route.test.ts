import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/src/lib/auth/session";
import { getPrismaClient } from "@/src/server/db/prisma";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  requestFindUnique: vi.fn(),
  guideFindUnique: vi.fn(),
  messageFindMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/src/lib/auth/session", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/src/server/db/prisma", () => ({ getPrismaClient: vi.fn() }));
vi.mock("@/src/features/auth/lib/privileged-mfa", () => ({
  hasVerifiedAuthenticator: vi.fn(() => true),
}));

const prismaMock = vi.mocked(getPrismaClient);
const userMock = vi.mocked(getCurrentUser);
const requestId = "95e5fbd0-03b8-40f7-ad9c-8f2ab9da2bbd";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requestFindUnique.mockResolvedValue({
    id: requestId,
    customerId: "customer-id",
    assignedGuideId: "guide-profile-id",
  });
  mocks.guideFindUnique.mockResolvedValue({ id: "guide-profile-id" });
  mocks.messageFindMany.mockResolvedValue([]);
  prismaMock.mockReturnValue({
    customRequest: { findUnique: mocks.requestFindUnique },
    guideProfile: { findUnique: mocks.guideFindUnique },
    requestReply: { findMany: mocks.messageFindMany },
  } as never);
});

describe("GET /api/custom-requests/[id]/messages", () => {
  it("does not disclose messages to a different traveller", async () => {
    userMock.mockResolvedValue({
      id: "other-customer-id",
      email: "other@example.com",
      name: "Other traveller",
      role: "CUSTOMER",
      sessionVersion: 1,
      mfaVerified: false,
    });

    const response = await GET(new Request("https://nomsa.test"), {
      params: Promise.resolve({ id: requestId }),
    });

    expect(response.status).toBe(404);
    expect(mocks.messageFindMany).not.toHaveBeenCalled();
  });

  it("requires the guide to have an active approved profile assigned to the request", async () => {
    userMock.mockResolvedValue({
      id: "guide-user-id",
      email: "guide@example.com",
      name: "Guide",
      role: "GUIDE",
      sessionVersion: 1,
      mfaVerified: true,
    });
    mocks.guideFindUnique.mockResolvedValue(null);

    const response = await GET(new Request("https://nomsa.test"), {
      params: Promise.resolve({ id: requestId }),
    });

    expect(response.status).toBe(404);
    expect(mocks.guideFindUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        verificationStatus: "APPROVED",
        deletedAt: null,
      }),
    }));
    expect(mocks.messageFindMany).not.toHaveBeenCalled();
  });

  it("allows the requesting traveller to read messages for their own request", async () => {
    userMock.mockResolvedValue({
      id: "customer-id",
      email: "customer@example.com",
      name: "Traveller",
      role: "CUSTOMER",
      sessionVersion: 1,
      mfaVerified: false,
    });

    const response = await GET(new Request("https://nomsa.test"), {
      params: Promise.resolve({ id: requestId }),
    });

    expect(response.status).toBe(200);
    expect(mocks.messageFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { customRequestId: requestId },
    }));
  });
});
