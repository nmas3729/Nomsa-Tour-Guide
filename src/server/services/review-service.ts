import "server-only";

import { BookingStatus, ReviewStatus, UserRole } from "@/src/server/db/generated/enums";
import type { AuthenticatedPrincipal } from "@/src/features/auth/types";
import { hasVerifiedAuthenticator } from "@/src/features/auth/lib/privileged-mfa";
import { Prisma } from "@/src/server/db/generated/client";
import { getPrismaClient } from "@/src/server/db/prisma";

export class ReviewSubmissionError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 403 | 404 | 409,
  ) {
    super(message);
    this.name = "ReviewSubmissionError";
  }
}

export async function submitBookingReview(
  principal: AuthenticatedPrincipal,
  bookingId: string,
  rating: number,
  reviewText: string,
) {
  if (principal.role !== UserRole.CUSTOMER) {
    throw new ReviewSubmissionError("Only the traveller who booked can review this experience.", 403);
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ReviewSubmissionError("Choose a rating from 1 to 5.", 400);
  }
  const normalizedText = reviewText.trim();
  if (normalizedText.length < 20 || normalizedText.length > 2000) {
    throw new ReviewSubmissionError("Write between 20 and 2,000 characters for your review.", 400);
  }

  try {
    return await getPrismaClient().$transaction(async (transaction) => {
      const booking = await transaction.booking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          customerId: true,
          guideId: true,
          experienceId: true,
          status: true,
          serviceCompletedAt: true,
          review: { select: { id: true } },
        },
      });
      if (!booking || booking.customerId !== principal.id) {
        throw new ReviewSubmissionError("Booking not found.", 404);
      }
      if (booking.status !== BookingStatus.COMPLETED || !booking.serviceCompletedAt) {
        throw new ReviewSubmissionError("A review can be submitted only after the booked experience is completed.", 409);
      }
      if (booking.review) {
        throw new ReviewSubmissionError("A review has already been submitted for this booking.", 409);
      }
      const review = await transaction.review.create({
        data: {
          bookingId: booking.id,
          customerId: booking.customerId,
          guideId: booking.guideId,
          experienceId: booking.experienceId,
          rating,
          reviewText: normalizedText,
          status: ReviewStatus.PENDING,
        },
        select: { id: true, rating: true, status: true, createdAt: true },
      });
      await transaction.auditLog.create({
        data: {
          userId: principal.id,
          action: "booking.review_submitted",
          entity: "Review",
          entityId: review.id,
          metadata: { bookingId: booking.id, rating },
        },
      });
      return review;
    });
  } catch (error) {
    if (error instanceof ReviewSubmissionError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ReviewSubmissionError("A review has already been submitted for this booking.", 409);
    }
    throw error;
  }
}

function assertReviewModerator(principal: AuthenticatedPrincipal) {
  if (
    (principal.role !== UserRole.ADMIN && principal.role !== UserRole.SUPER_ADMIN) ||
    !hasVerifiedAuthenticator(principal)
  ) {
    throw new ReviewSubmissionError("Administrator access with two-factor authentication is required.", 403);
  }
}

export async function getReviewModerationQueue(principal: AuthenticatedPrincipal) {
  assertReviewModerator(principal);
  return getPrismaClient().review.findMany({
    where: { status: ReviewStatus.PENDING, deletedAt: null },
    select: {
      id: true,
      rating: true,
      reviewText: true,
      createdAt: true,
      experience: { select: { title: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
}

export async function moderateBookingReview(
  principal: AuthenticatedPrincipal,
  reviewId: string,
  status: typeof ReviewStatus.APPROVED | typeof ReviewStatus.REJECTED,
) {
  assertReviewModerator(principal);
  return getPrismaClient().$transaction(async (transaction) => {
    const review = await transaction.review.findUnique({
      where: { id: reviewId },
      select: { id: true, guideId: true, status: true },
    });
    if (!review || review.status !== ReviewStatus.PENDING) {
      throw new ReviewSubmissionError("Pending review not found.", 404);
    }
    const updated = await transaction.review.updateMany({
      where: { id: review.id, status: ReviewStatus.PENDING, deletedAt: null },
      data: { status, moderatedAt: new Date() },
    });
    if (updated.count !== 1) {
      throw new ReviewSubmissionError("The review status changed before moderation completed.", 409);
    }
    const summary = await transaction.review.aggregate({
      where: { guideId: review.guideId, status: ReviewStatus.APPROVED, deletedAt: null },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await transaction.guideProfile.update({
      where: { id: review.guideId },
      data: {
        averageRating: summary._avg.rating ?? 0,
        totalReviews: summary._count._all,
      },
    });
    await transaction.auditLog.create({
      data: {
        userId: principal.id,
        action: status === ReviewStatus.APPROVED ? "review.approved" : "review.rejected",
        entity: "Review",
        entityId: review.id,
        metadata: { previousStatus: review.status, status },
      },
    });
    return { id: review.id, status };
  });
}
