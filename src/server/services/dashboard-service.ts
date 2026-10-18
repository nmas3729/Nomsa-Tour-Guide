import "server-only";

import {
  BookingStatus,
  GuideApplicationStatus,
  PaymentStatus,
  PayoutStatus,
  ReviewStatus,
  UserRole,
} from "@/src/server/db/generated/enums";
import { getPrismaClient } from "@/src/server/db/prisma";
import type { AuthenticatedPrincipal } from "@/src/features/auth/types";
import { customRequestOfferSnapshotSchema } from "@/src/features/booking/custom-request-schemas";
import { hasVerifiedAuthenticator } from "@/src/features/auth/lib/privileged-mfa";
import { scheduledExperienceEnd } from "@/src/server/services/booking-financial-service";

function readOfferSnapshot(value: unknown) {
  if (value === null) return null;
  const parsed = customRequestOfferSnapshotSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("A stored custom itinerary offer is invalid.");
  }
  return parsed.data;
}

const bookingSummary = {
  id: true,
  experienceDate: true,
  status: true,
  paymentStatus: true,
  totalPrice: true,
  baseAmount: true,
  optionalExtrasAmount: true,
  transportAmount: true,
  platformFeeAmount: true,
  taxAmount: true,
  bookingType: true,
  cancellationPolicySnapshot: true,
  serviceCompletedAt: true,
  currency: true,
  travellerCount: true,
  timeSlot: true,
  payments: {
    select: { refundedAmount: true },
    orderBy: { createdAt: "desc" },
    take: 1,
  },
  review: { select: { id: true, status: true } },
  experience: {
    select: {
      title: true,
      slug: true,
      meetingPoint: true,
      durationMinutes: true,
      destination: {
        select: {
          name: true,
          city: { select: { province: { select: { name: true } } } },
        },
      },
    },
  },
} as const;

export async function getDashboardData(user: AuthenticatedPrincipal) {
  if (!hasVerifiedAuthenticator(user)) {
    throw new Error("Two-factor authentication is required for this account.");
  }
  const prisma = getPrismaClient();

  if (user.role === UserRole.CUSTOMER) {
    const now = new Date();
    const [
      upcomingBookings,
      completedBookings,
      attentionBookings,
      historyBookings,
      wishlist,
      savedExperienceCount,
      unreadNotifications,
      notifications,
      reviews,
      customRequests,
    ] =
      await Promise.all([
        prisma.booking.findMany({
          where: {
            customerId: user.id,
            experienceDate: { gte: now },
            status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
          },
          select: bookingSummary,
          orderBy: { experienceDate: "asc" },
          take: 5,
        }),
        prisma.booking.findMany({
          where: { customerId: user.id, status: BookingStatus.COMPLETED },
          select: bookingSummary,
          orderBy: { experienceDate: "desc" },
          take: 5,
        }),
        prisma.booking.findMany({
          where: {
            customerId: user.id,
            OR: [
              { status: BookingStatus.PENDING },
              { status: BookingStatus.AWAITING_PAYMENT },
              { status: BookingStatus.CANCELLED },
              { status: BookingStatus.REFUND_REQUESTED },
              { status: BookingStatus.REFUNDED },
              { paymentStatus: PaymentStatus.PENDING },
              { paymentStatus: PaymentStatus.PROCESSING },
              { paymentStatus: PaymentStatus.FAILED },
              { paymentStatus: PaymentStatus.PARTIALLY_REFUNDED },
              { paymentStatus: PaymentStatus.DISPUTED },
              { paymentStatus: PaymentStatus.REFUND_PENDING },
              { paymentStatus: PaymentStatus.REFUNDED },
            ],
          },
          select: bookingSummary,
          orderBy: { experienceDate: "desc" },
          take: 8,
        }),
        prisma.booking.findMany({
          where: { customerId: user.id },
          select: bookingSummary,
          orderBy: { experienceDate: "desc" },
          take: 8,
        }),
        prisma.wishlist.findMany({
          where: { customerId: user.id, experience: { deletedAt: null } },
          select: {
            experience: {
              select: {
                title: true,
                slug: true,
                destination: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.wishlist.count({ where: { customerId: user.id, experience: { deletedAt: null } } }),
        prisma.notification.count({ where: { userId: user.id, readAt: null } }),
        prisma.notification.findMany({
          where: { userId: user.id },
          select: { id: true, title: true, body: true, readAt: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.review.findMany({
          where: { customerId: user.id, deletedAt: null },
          select: {
            id: true,
            rating: true,
            reviewText: true,
            experience: { select: { title: true, slug: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.customRequest.findMany({
          where: { customerId: user.id },
          select: {
            id: true,
            bookingType: true,
            status: true,
            destinationText: true,
            travellerCount: true,
            travelStartDate: true,
            travelEndDate: true,
            flexibleDates: true,
            quotedAmount: true,
            quotedCurrency: true,
            offeredDate: true,
            offeredTimeSlot: true,
            offeredTravellerCount: true,
            offerSnapshot: true,
            offerVersion: true,
            offeredAt: true,
            acceptedAt: true,
            assignedGuide: { select: { user: { select: { name: true } } } },
            offeredExperience: { select: { title: true, slug: true } },
            booking: { select: { id: true, status: true, paymentStatus: true } },
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

    return {
      role: UserRole.CUSTOMER,
      upcomingBookings,
      completedBookings,
      attentionBookings,
      historyBookings,
      wishlist: wishlist.map(({ experience }) => experience),
      savedExperienceCount,
      unreadNotifications,
      notifications,
      reviews,
      customRequests: customRequests.map((item) => ({
        ...item,
        travelStartDate: item.travelStartDate?.toISOString().slice(0, 10) ?? null,
        travelEndDate: item.travelEndDate?.toISOString().slice(0, 10) ?? null,
        quotedAmount: item.quotedAmount?.toString() ?? null,
        offeredDate: item.offeredDate?.toISOString().slice(0, 10) ?? null,
        offerSnapshot: readOfferSnapshot(item.offerSnapshot),
      })),
    };
  }

  if (user.role === UserRole.GUIDE) {
    const [profile, application] = await Promise.all([
      prisma.guideProfile.findUnique({
        where: { userId: user.id },
        select: { id: true, verificationStatus: true },
      }),
      prisma.guideApplication.findFirst({
        where: { applicantId: user.id },
        select: { status: true },
        orderBy: { submittedAt: "desc" },
      }),
    ]);
    if (!profile) {
      throw new Error("The signed-in guide does not have a guide profile.");
    }
    const applicationStatus = application?.status ?? profile.verificationStatus;
    if (
      profile.verificationStatus !== GuideApplicationStatus.APPROVED ||
      applicationStatus !== GuideApplicationStatus.APPROVED
    ) {
      return {
        role: UserRole.GUIDE,
        onboardingOnly: true as const,
        applicationStatus,
      };
    }

    const now = new Date();
    const [
      upcomingBookings,
      upcomingBookingCount,
      attentionBookings,
      completedBookings,
      cancelledBookings,
      completionBookings,
      availabilityCount,
      paidPayouts,
      payouts,
      reviews,
      experienceReviews,
      customRequests,
      offerableExperiences,
    ] = await Promise.all([
      prisma.booking.findMany({
        where: {
          guideId: profile.id,
          experienceDate: { gte: now },
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
        },
        select: bookingSummary,
        orderBy: { experienceDate: "asc" },
        take: 8,
      }),
      prisma.booking.count({
        where: {
          guideId: profile.id,
          experienceDate: { gte: now },
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
        },
      }),
      prisma.booking.findMany({
        where: {
          guideId: profile.id,
          status: { not: BookingStatus.CANCELLED },
          OR: [
            { status: BookingStatus.PENDING },
            { status: BookingStatus.AWAITING_PAYMENT },
            { status: BookingStatus.REFUND_REQUESTED },
            { status: BookingStatus.REFUNDED },
            { paymentStatus: PaymentStatus.PENDING },
            { paymentStatus: PaymentStatus.PROCESSING },
            { paymentStatus: PaymentStatus.FAILED },
            { paymentStatus: PaymentStatus.PARTIALLY_REFUNDED },
            { paymentStatus: PaymentStatus.DISPUTED },
            { paymentStatus: PaymentStatus.REFUND_PENDING },
            { paymentStatus: PaymentStatus.REFUNDED },
          ],
        },
        select: bookingSummary,
        orderBy: { experienceDate: "desc" },
        take: 8,
      }),
      prisma.booking.findMany({
        where: { guideId: profile.id, status: BookingStatus.COMPLETED },
        select: bookingSummary,
        orderBy: { experienceDate: "desc" },
        take: 8,
      }),
      prisma.booking.findMany({
        where: { guideId: profile.id, status: BookingStatus.CANCELLED },
        select: bookingSummary,
        orderBy: { experienceDate: "desc" },
        take: 8,
      }),
      prisma.booking.findMany({
        where: {
          guideId: profile.id,
          experienceDate: { lt: now },
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
        },
        select: bookingSummary,
        orderBy: { experienceDate: "desc" },
        take: 8,
      }),
      prisma.availability.count({
        where: {
          experience: { guideId: profile.id, deletedAt: null },
          date: { gte: now },
          remainingCapacity: { gt: 0 },
        },
      }),
      prisma.payout.aggregate({
        where: { guideId: profile.id, status: PayoutStatus.PAID },
        _sum: { amount: true },
      }),
      prisma.payout.findMany({
        where: { guideId: profile.id },
        select: {
          id: true,
          amount: true,
          grossAmount: true,
          commissionAmount: true,
          commissionRate: true,
          eligibleAt: true,
          currency: true,
          status: true,
          paidAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.review.findMany({
        where: { guideId: profile.id, status: ReviewStatus.APPROVED, deletedAt: null },
        select: {
          id: true,
          rating: true,
          reviewText: true,
          experience: { select: { title: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.experience.findMany({
        where: { guideId: profile.id, deletedAt: null },
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          verificationStatus: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
      }),
      prisma.customRequest.findMany({
        where: {
          assignedGuideId: profile.id,
          status: { in: ["ASSIGNED", "QUOTED"] },
        },
        select: {
          id: true,
          destinationText: true,
          travelStartDate: true,
          travelEndDate: true,
          flexibleDates: true,
          travellerCount: true,
          budget: true,
          budgetCurrency: true,
          interests: true,
          languages: true,
          accommodationNeeded: true,
          transportNeeded: true,
          notes: true,
          status: true,
          quotedAmount: true,
          quotedCurrency: true,
          offeredDate: true,
          offeredTimeSlot: true,
          offeredTravellerCount: true,
          offerVersion: true,
          customer: { select: { name: true } },
          offeredExperience: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 20,
      }),
      prisma.experience.findMany({
        where: {
          guideId: profile.id,
          status: "PUBLISHED",
          verificationStatus: GuideApplicationStatus.APPROVED,
          currency: "ZAR",
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          currency: true,
          minGuests: true,
          maxGuests: true,
          price: true,
          availability: {
            where: { date: { gte: now }, remainingCapacity: { gt: 0 } },
            select: { date: true, timeSlot: true, remainingCapacity: true },
            orderBy: { date: "asc" },
            take: 20,
          },
        },
        orderBy: { title: "asc" },
      }),
    ]);

    return {
      role: UserRole.GUIDE,
      onboardingOnly: false as const,
      applicationStatus,
      upcomingBookings,
      upcomingBookingCount,
      attentionBookings,
      completedBookings,
      cancelledBookings,
      completionBookings: completionBookings.map((booking) => {
        const scheduledEnd = scheduledExperienceEnd(
          booking.experienceDate,
          booking.timeSlot,
          booking.experience.durationMinutes,
        );
        return { ...booking, canMarkComplete: Boolean(scheduledEnd && scheduledEnd <= now) };
      }),
      availabilityCount,
      paidPayouts: Number(paidPayouts._sum.amount ?? 0),
      payouts,
      reviews,
      experienceReviews,
      customRequests: customRequests.map((item) => ({
        ...item,
        budget: item.budget?.toString() ?? null,
        quotedAmount: item.quotedAmount?.toString() ?? null,
        travelStartDate: item.travelStartDate?.toISOString().slice(0, 10) ?? null,
        travelEndDate: item.travelEndDate?.toISOString().slice(0, 10) ?? null,
        offeredDate: item.offeredDate?.toISOString().slice(0, 10) ?? null,
      })),
      offerableExperiences: offerableExperiences.map((experience) => ({
        ...experience,
        price: experience.price.toString(),
        availability: experience.availability.map((slot) => ({
          date: slot.date.toISOString().slice(0, 10),
          timeSlot: slot.timeSlot,
          remainingCapacity: slot.remainingCapacity,
        })),
      })),
    };
  }

  if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
    const now = new Date();
    const [
      users,
      guides,
      destinations,
      experiences,
      bookings,
      pendingPayments,
      pendingPayouts,
      moderationQueue,
      revenue,
      pendingPayoutRecords,
      recentPaymentCases,
      customRequests,
      pendingServiceCompletions,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.guideProfile.count({ where: { deletedAt: null } }),
      prisma.destination.count({ where: { deletedAt: null } }),
      prisma.experience.count({ where: { deletedAt: null } }),
      prisma.booking.count(),
      prisma.payment.count({
        where: { status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] } },
      }),
      prisma.payout.count({ where: { status: PayoutStatus.PENDING } }),
      prisma.review.count({ where: { status: ReviewStatus.PENDING, deletedAt: null } }),
      prisma.payment.aggregate({
        where: { status: PaymentStatus.SUCCEEDED },
        _sum: { amount: true },
      }),
      prisma.payout.findMany({
        where: { status: PayoutStatus.PENDING },
        include: {
          booking: {
            select: {
              status: true,
              paymentStatus: true,
              serviceCompletedAt: true,
              experience: { select: { title: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
        take: 20,
      }),
      prisma.booking.findMany({
        where: {
          paymentStatus: {
            in: [
              PaymentStatus.SUCCEEDED,
              PaymentStatus.PARTIALLY_REFUNDED,
              PaymentStatus.DISPUTED,
              PaymentStatus.REFUND_PENDING,
            ],
          },
        },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          totalPrice: true,
          currency: true,
          experience: { select: { title: true } },
          payments: {
            select: { amount: true, refundedAmount: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
      }),
      prisma.customRequest.findMany({
        where: { status: { in: ["SUBMITTED", "ASSIGNED", "QUOTED"] } },
        select: {
          id: true,
          assignedGuideId: true,
          assignedGuide: { select: { user: { select: { name: true } } } },
          destinationText: true,
          travellerCount: true,
          travelStartDate: true,
          travelEndDate: true,
          flexibleDates: true,
          status: true,
          bookingType: true,
          budget: true,
          budgetCurrency: true,
          interests: true,
          accommodationNeeded: true,
          transportNeeded: true,
          languages: true,
          notes: true,
          quotedAmount: true,
          quotedCurrency: true,
          offeredDate: true,
          offeredTimeSlot: true,
          offeredTravellerCount: true,
          offerVersion: true,
          createdAt: true,
          customer: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 20,
      }),
      prisma.booking.findMany({
        where: {
          experienceDate: { lt: now },
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
        },
        select: bookingSummary,
        orderBy: { experienceDate: "asc" },
        take: 20,
      }),
    ]);

    return {
      role: user.role,
      users,
      guides,
      destinations,
      experiences,
      bookings,
      pendingPayments,
      pendingPayouts,
      moderationQueue,
      revenue: Number(revenue._sum.amount ?? 0),
      pendingPayoutRecords: pendingPayoutRecords.map((payout) => ({
        ...payout,
        amount: payout.amount.toString(),
        grossAmount: payout.grossAmount?.toString() ?? null,
        commissionAmount: payout.commissionAmount?.toString() ?? null,
        commissionRate: payout.commissionRate?.toString() ?? null,
        eligibleAt: payout.eligibleAt?.toISOString() ?? null,
        paidAt: payout.paidAt?.toISOString() ?? null,
        canRelease:
          payout.status === PayoutStatus.PENDING &&
          Boolean(payout.grossAmount && payout.commissionAmount && payout.commissionRate) &&
          Boolean(payout.eligibleAt && payout.eligibleAt <= now) &&
          payout.booking.status === BookingStatus.COMPLETED &&
          Boolean(payout.booking.serviceCompletedAt) &&
          (payout.booking.paymentStatus === PaymentStatus.SUCCEEDED ||
            payout.booking.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED),
        booking: {
          ...payout.booking,
          serviceCompletedAt: payout.booking.serviceCompletedAt?.toISOString() ?? null,
        },
      })),
      recentPaymentCases: recentPaymentCases.map((booking) => ({
        ...booking,
        totalPrice: booking.totalPrice.toString(),
        payments: booking.payments.map((payment) => ({
          amount: payment.amount.toString(),
          refundedAmount: payment.refundedAmount.toString(),
        })),
      })),
      pendingServiceCompletions: pendingServiceCompletions.map((booking) => {
        const scheduledEnd = scheduledExperienceEnd(
          booking.experienceDate,
          booking.timeSlot,
          booking.experience.durationMinutes,
        );
        return { ...booking, canMarkComplete: Boolean(scheduledEnd && scheduledEnd <= now) };
      }),
      customRequests: customRequests.map((item) => ({
        ...item,
        quotedAmount: item.quotedAmount?.toString() ?? null,
        budget: item.budget?.toString() ?? null,
        offeredDate: item.offeredDate?.toISOString().slice(0, 10) ?? null,
      })),
    };
  }

  throw new Error("The signed-in account has no dashboard.");
}
