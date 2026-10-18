import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getServerEnvironment } from "@/src/config/env";
import { getCurrentUser } from "@/src/lib/auth/session";
import { enforceAuthRateLimit } from "@/src/features/auth/lib/rate-limit";
import { getPrismaClient } from "@/src/server/db/prisma";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  rateLimit: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/src/config/env", () => ({
  getServerEnvironment: vi.fn(() => ({ NEXT_PUBLIC_APP_URL: "https://nomsa.test" })),
}));
vi.mock("@/src/lib/auth/session", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/src/features/auth/lib/rate-limit", () => ({
  enforceAuthRateLimit: mocks.rateLimit,
  RateLimitExceededError: class RateLimitExceededError extends Error {},
}));
vi.mock("@/src/server/db/prisma", () => ({
  getPrismaClient: vi.fn(),
}));

const userMock = vi.mocked(getCurrentUser);
const rateLimitMock = vi.mocked(enforceAuthRateLimit);
const prismaMock = vi.mocked(getPrismaClient);

const customer = {
  id: "customer-id",
  email: "customer@example.com",
  name: "Customer",
  role: "CUSTOMER" as const,
  sessionVersion: 1,
  mfaVerified: false,
};

function request(body: unknown, origin = "https://nomsa.test") {
  return new Request("https://nomsa.test/api/custom-requests", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      "idempotency-key": "3c762c4b-2c77-499b-8667-40a20c501edb",
    },
    body: JSON.stringify(body),
  });
}

function requestBody() {
  const start = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  const end = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
  return {
    destinationText: "Cape Town and the Winelands",
    travelStartDate: start,
    travelEndDate: end,
    flexibleDates: false,
    travellerCount: 3,
    budget: "12000.00",
    budgetCurrency: "ZAR",
    interests: ["food", "culture"],
    accommodationNeeded: false,
    transportNeeded: true,
    languages: ["English"],
    notes: "A relaxed itinerary.",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getServerEnvironment).mockReturnValue({
    NEXT_PUBLIC_APP_URL: "https://nomsa.test",
  } as ReturnType<typeof getServerEnvironment>);
  userMock.mockResolvedValue(customer);
  rateLimitMock.mockResolvedValue(undefined);
  mocks.create.mockResolvedValue({
    id: "request-id",
    status: "SUBMITTED",
    bookingType: "REQUEST_TO_BOOK",
  });
  mocks.findUnique.mockResolvedValue(null);
  mocks.audit.mockResolvedValue(undefined);
  prismaMock.mockReturnValue({
    $transaction: vi.fn(async (callback) => callback({
      customRequest: { create: mocks.create, findUnique: mocks.findUnique },
      auditLog: { create: mocks.audit },
    })),
  } as never);
});

describe("POST /api/custom-requests", () => {
  it("persists a custom request as request-to-book without creating a paid booking", async () => {
    const response = await POST(request(requestBody()));

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      request: { id: "request-id", status: "SUBMITTED", bookingType: "REQUEST_TO_BOOK" },
      message: "Request submitted. No booking, quote, or payment has been confirmed.",
    });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        customerId: customer.id,
        bookingType: "REQUEST_TO_BOOK",
        budget: expect.objectContaining({ toString: expect.any(Function) }),
      }),
    }));
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "custom_itinerary.request_submitted" }),
    }));
  });

  it("requires a signed-in customer account", async () => {
    userMock.mockResolvedValue(null);

    const response = await POST(request(requestBody()));

    expect(response.status).toBe(401);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects non-customer roles", async () => {
    userMock.mockResolvedValue({ ...customer, role: "GUIDE" });

    const response = await POST(request(requestBody()));

    expect(response.status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects cross-origin submissions", async () => {
    const response = await POST(request(requestBody(), "https://other.test"));

    expect(response.status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("requires a valid idempotency key", async () => {
    const invalidRequest = new Request("https://nomsa.test/api/custom-requests", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://nomsa.test" },
      body: JSON.stringify(requestBody()),
    });

    const response = await POST(invalidRequest);

    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("returns the existing request for a matching idempotency retry", async () => {
    const body = requestBody();
    const requestHash = createHash("sha256").update(JSON.stringify(body)).digest("hex");
    mocks.findUnique.mockResolvedValue({
      id: "request-id",
      customerId: customer.id,
      status: "SUBMITTED",
      bookingType: "REQUEST_TO_BOOK",
      requestHash,
    });

    const response = await POST(request(body));

    expect(response.status).toBe(200);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("does not disclose an existing request when another customer reuses its key", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "another-customers-request",
      customerId: "another-customer-id",
      status: "SUBMITTED",
      bookingType: "REQUEST_TO_BOOK",
      requestHash: createHash("sha256").update(JSON.stringify(requestBody())).digest("hex"),
    });

    const response = await POST(request(requestBody()));

    expect(response.status).toBe(409);
    expect(await response.json()).not.toHaveProperty("request");
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
