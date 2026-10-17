import "server-only";

import {
  BookingStatus,
  PaymentStatus,
  PayoutStatus,
  ReviewStatus,
  UserRole,
} from "@/src/server/db/generated/enums";
import { getPrismaClient } from "@/src/server/db/prisma";
import type { AuthenticatedPrincipal } from "@/src/features/auth/types";

const bookingSummary = {
  id: true,
  experienceDate: true,
  status: true,
  paymentStatus: true,
  totalPrice: true,
  currency: true,
  travellerCount: true,
  experience: {
    select: {
      title: true,
      slug: true,
      meetingPoint: true,
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
    };
  }

  if (user.role === UserRole.GUIDE) {
    const profile = await prisma.guideProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, verificationStatus: true },
    });
    if (!profile) {
      throw new Error("The signed-in guide does not have a guide profile.");
    }

    const now = new Date();
    const [
      upcomingBookings,
      upcomingBookingCount,
      attentionBookings,
      completedBookings,
      cancelledBookings,
      availabilityCount,
      paidPayouts,
      payouts,
      reviews,
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
        select: { id: true, amount: true, currency: true, status: true, createdAt: true },
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
    ]);

    return {
      role: UserRole.GUIDE,
      verificationStatus: profile.verificationStatus,
      upcomingBookings,
      upcomingBookingCount,
      attentionBookings,
      completedBookings,
      cancelledBookings,
      availabilityCount,
      paidPayouts: Number(paidPayouts._sum.amount ?? 0),
      payouts,
      reviews,
    };
  }

  if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
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
    };
  }

  throw new Error("The signed-in account has no dashboard.");
}
