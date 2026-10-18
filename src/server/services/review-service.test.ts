import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingStatus, ReviewStatus, UserRole } from "@/src/server/db/generated/enums";
import type { AuthenticatedPrincipal } from "@/src/features/auth/types";
import { getPrismaClient } from "@/src/server/db/prisma";
import {
  getReviewModerationQueue,
  moderateBookingReview,
  ReviewSubmissionError,
  submitBookingReview,
} from "./review-service";

const mocks = vi.hoisted(() => ({
  hasMfa: vi.fn(),
  findBooking: vi.fn(),
  createReview: vi.fn(),
  findReview: vi.fn(),
  updateReview: vi.fn(),
  aggregateReviews: vi.fn(),
  updateGuide: vi.fn(),
  createAudit: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/src/server/db/prisma", () => ({ getPrismaClient: vi.fn() }));
vi.mock("@/src/features/auth/lib/privileged-mfa", () => ({
  hasVerifiedAuthenticator: mocks.hasMfa,
}));

const prismaMock = vi.mocked(getPrismaClient);
const customer: AuthenticatedPrincipal = {
  id: "customer-id",
  email: "customer@example.com",
  name: "Traveller",
  role: UserRole.CUSTOMER,
  sessionVersion: 1,
  mfaVerified: false,
};
const admin: AuthenticatedPrincipal = {
  ...customer,
  id: "admin-id",
  role: UserRole.ADMIN,
  mfaVerified: true,
};

function setup() {
  mocks.findBooking.mockResolvedValue({
    id: "booking-id",
    customerId: customer.id,
    guideId: "guide-id",
    experienceId: "experience-id",
    status: BookingStatus.COMPLETED,
    serviceCompletedAt: new Date(),
    review: null,
  });
  mocks.createReview.mockResolvedValue({
    id: "review-id",
    rating: 5,
    status: ReviewStatus.PENDING,
    createdAt: new Date(),
  });
  mocks.findReview.mockResolvedValue({
    id: "review-id",
    guideId: "guide-id",
    status: ReviewStatus.PENDING,
  });
  mocks.updateReview.mockResolvedValue({ count: 1 });
  mocks.aggregateReviews.mockResolvedValue({ _avg: { rating: 5 }, _count: { _all: 1 } });
  mocks.updateGuide.mockResolvedValue(undefined);
  mocks.createAudit.mockResolvedValue(undefined);
  mocks.findMany.mockResolvedValue([]);
  const transaction = {
    booking: { findUnique: mocks.findBooking },
    review: {
      create: mocks.createReview,
      findUnique: mocks.findReview,
      updateMany: mocks.updateReview,
      aggregate: mocks.aggregateReviews,
      findMany: mocks.findMany,
    },
    guideProfile: { update: mocks.updateGuide },
    auditLog: { create: mocks.createAudit },
  };
  prismaMock.mockReturnValue({
    review: { findMany: mocks.findMany },
    $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
  } as never);
  mocks.hasMfa.mockReturnValue(true);
}

beforeEach(() => {
  vi.clearAllMocks();
  setup();
});

describe("booking reviews", () => {
  it("accepts a review only from the customer after service completion", async () => {
    await submitBookingReview(customer, "booking-id", 5, "A thoughtful and enjoyable local experience.");

    expect(mocks.createReview).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ bookingId: "booking-id", customerId: customer.id, status: ReviewStatus.PENDING }),
    }));
  });

  it("rejects reviews before completion without saving", async () => {
    mocks.findBooking.mockResolvedValue({
      id: "booking-id",
      customerId: customer.id,
      status: BookingStatus.CONFIRMED,
      serviceCompletedAt: null,
    });

    await expect(
      submitBookingReview(customer, "booking-id", 5, "A thoughtful and enjoyable local experience."),
    ).rejects.toMatchObject({ status: 409 });
    expect(mocks.createReview).not.toHaveBeenCalled();
  });

  it("does not allow another customer to review a booking", async () => {
    mocks.findBooking.mockResolvedValue({
      id: "booking-id",
      customerId: "different-customer",
      status: BookingStatus.COMPLETED,
      serviceCompletedAt: new Date(),
    });

    await expect(
      submitBookingReview(customer, "booking-id", 5, "A thoughtful and enjoyable local experience."),
    ).rejects.toMatchObject({ status: 404 });
    expect(mocks.createReview).not.toHaveBeenCalled();
  });

  it("does not create a second review for the same booking", async () => {
    mocks.findBooking.mockResolvedValue({
      id: "booking-id",
      customerId: customer.id,
      status: BookingStatus.COMPLETED,
      serviceCompletedAt: new Date(),
      review: { id: "existing-review" },
    });

    await expect(
      submitBookingReview(customer, "booking-id", 5, "A thoughtful and enjoyable local experience."),
    ).rejects.toMatchObject({ status: 409 });
    expect(mocks.createReview).not.toHaveBeenCalled();
  });

  it("requires two-factor authentication for moderation", async () => {
    mocks.hasMfa.mockReturnValue(false);

    await expect(getReviewModerationQueue(admin)).rejects.toBeInstanceOf(ReviewSubmissionError);
    await expect(moderateBookingReview(admin, "review-id", ReviewStatus.APPROVED)).rejects.toMatchObject({
      status: 403,
    });
  });

  it("approves only pending reviews and refreshes the guide's approved-review aggregate", async () => {
    const result = await moderateBookingReview(admin, "review-id", ReviewStatus.APPROVED);

    expect(result).toEqual({ id: "review-id", status: ReviewStatus.APPROVED });
    expect(mocks.updateReview).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "review-id", status: ReviewStatus.PENDING, deletedAt: null },
      data: expect.objectContaining({ status: ReviewStatus.APPROVED }),
    }));
    expect(mocks.updateGuide).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "guide-id" },
      data: { averageRating: 5, totalReviews: 1 },
    }));
    expect(mocks.createAudit).toHaveBeenCalled();
  });
});
